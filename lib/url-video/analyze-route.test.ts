import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { analysisError } from "./errors";

test("analysis diagnostics distinguish provider, schema and storage failures without exposing content", () => {
  assert.equal(analysisError({ status: 503, message: "private source" }, "brief").code, "ai_provider");
  assert.equal(analysisError({ status: 429 }, "brief").code, "ai_rate_limited");
  assert.equal(analysisError({ status: 401 }, "brief").code, "ai_configuration");
  assert.equal(analysisError({ name: "APIConnectionTimeoutError" }, "brief").code, "ai_timeout");
  const failure = analysisError({ name: "ZodError", issues: [{ path: ["hooks", 0], code: "too_big", input: "private source" }] }, "brief");
  assert.equal(failure.code, "invalid_brief");
  assert.equal(JSON.stringify(failure).includes("private source"), false);
  assert.equal(analysisError({ code: "P2021" }, "storage").code, "analysis_storage");
});

test("failed AI analysis retains owner-scoped captures and retries without capturing or charging again", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/url-video/analyze-route.test.ts"));
  let user: { id: string; plan: "PRO" } | null = { id: "owner", plan: "PRO" };
  let captures = 0, calls = 0, fail = true;
  const brief = { company: "Example", product: "Task management", audience: "Teams", benefits: ["Organize", "Share", "Find"], tone: "professional", hooks: ["One", "Two", "Three"], headingFont: "Inter", bodyFont: "Inter", fontNote: "Observed", warnings: [] };
  const source = { url: "https://example.com/", logo: null, screens: [{ url: "/api/uploads/owner/image/screen.png", fileName: "screen.png", mimeType: "image/png", sizeBytes: 100, label: "Hero", source: "https://example.com/", format: "desktop" }], colors: ["#111111"], stores: [], pages: ["https://example.com/"], text: "Task management for teams", fonts: ["Inter"], variables: [], logoColors: [], warnings: [] };
  const rows = new Map<string, { id: string; userId: string; data: unknown; projectIds: string[] }>();
  const mocks = {
    "../auth/dal": { getCurrentUser: async () => user },
    "../db": { db: { urlVideoAnalysis: {
      create: async ({ data }: { data: { userId: string; data: unknown } }) => { const row = { id: "analysis", projectIds: [] as string[], ...data }; rows.set(row.id, row); return row; },
      update: async ({ where, data }: { where: { id: string }; data: { data: unknown } }) => Object.assign(rows.get(where.id)!, data),
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => { const row = rows.get(where.id); return row?.userId === where.userId ? row : null; },
    } } },
    "../rate-limit": { rateLimitAll: async () => ({ ok: true }), acquireLock: async () => "lock", releaseLock: async () => {} },
    "./extract": { extractUrlProduct: async () => { captures++; return source; } },
    "./analyze": { analyzeUrlProduct: async (_source: unknown, locale: string) => { calls++; assert.equal(locale, "fr"); if (fail) throw Object.assign(new Error("sensitive provider payload"), { status: 503 }); return brief; } },
    "../storage": { isOwnUpload: (userId: string, url: string) => url.startsWith(`/api/uploads/${userId}/`) },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries(mocks)) { const key = require.resolve(name); originals.set(key, require.cache[key]); require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module; }
  const key = process.env.ANTHROPIC_API_KEY, originalLog = console.error;
  const diagnostics: unknown[][] = [];
  process.env.ANTHROPIC_API_KEY = "test-configured";
  console.error = (...args) => { diagnostics.push(args); };
  try {
    const { GET, POST, PATCH } = require("../../app/api/url-video/analyze/route") as typeof import("../../app/api/url-video/analyze/route");
    const request = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/url-video/analyze", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const events = async (response: Response) => (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    user = null; assert.equal((await POST(request({ url: source.url, locale: "fr" }))).status, 401);
    user = { id: "owner", plan: "PRO" };
    assert.equal((await POST(request({ url: source.url, locale: "fr" }, "https://other.example"))).status, 403);
    const delegate = mocks["../db"].db.urlVideoAnalysis;
    const create = delegate.create;
    delete (delegate as Partial<typeof delegate>).create;
    const stale = await POST(request({ url: source.url, locale: "fr" }));
    assert.equal(stale.status, 503); assert.equal((await stale.json()).error, "prisma_client_stale");
    assert.equal(captures, 0); assert.equal(calls, 0);
    delegate.create = create;
    const failed = await events(await POST(request({ url: source.url, locale: "fr" })));
    assert.equal(failed.find((event) => event.type === "extracted")?.analysisId, "analysis");
    assert.equal(failed.at(-1)?.error, "ai_provider");
    assert.equal(JSON.stringify(diagnostics).includes("sensitive provider payload"), false);
    const get = () => GET(new Request("http://localhost/api/url-video/analyze?id=analysis"));
    assert.equal((await (await get()).json()).pending, true);
    user = { id: "other", plan: "PRO" }; assert.equal((await get()).status, 404);
    assert.equal((await POST(request({ analysisId: "analysis", locale: "fr" }))).status, 404);
    user = { id: "owner", plan: "PRO" }; fail = false;
    const retried = await events(await POST(request({ analysisId: "analysis", locale: "en" })));
    assert.equal(retried.at(-1)?.type, "complete"); assert.equal(captures, 1); assert.equal(calls, 2);
    assert.equal((await (await get()).json()).pending, false);
    await events(await POST(request({ analysisId: "analysis", locale: "fr" })));
    assert.equal(captures, 1); assert.equal(calls, 2);
    const music = { url: "/api/uploads/owner/audio/music.mp3", mimeType: "audio/mpeg", fileName: "music.mp3", sizeBytes: 100 };
    const patch = (preferences: unknown) => PATCH(new Request("http://localhost/api/url-video/analyze", { method: "PATCH", headers: { origin: "http://localhost", "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: "analysis", preferences }) }));
    assert.equal((await patch({ templateId: "stage", music })).status, 200);
    assert.deepEqual((rows.get("analysis")!.data as { preferences: unknown }).preferences, { templateId: "stage", music });
    assert.equal((await patch({ music: { ...music, url: "/api/uploads/other/audio/music.mp3" } })).status, 400);
    assert.equal((await patch({ templateId: "not-real" })).status, 400);
    user = { id: "other", plan: "PRO" }; assert.equal((await patch({ templateId: null, music: null })).status, 404);
    user = { id: "owner", plan: "PRO" }; rows.get("analysis")!.projectIds = ["existing-project"];
    assert.equal((await patch({ templateId: null, music: null })).status, 409);
  } finally {
    console.error = originalLog;
    if (key === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = key;
    for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; }
  }
});

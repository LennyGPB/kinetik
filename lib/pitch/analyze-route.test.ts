import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";

test("pitch analysis authorizes requests, charges once and refunds failed source processing", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/pitch/analyze-route.test.ts"));
  let user: { id: string; plan: string } | null = { id: "owner", plan: "PRO" };
  let balance = 30, charges = 0, refunds = 0, calls = 0, fail = false;
  type Row = { id: string; userId: string; status: string; createdAt: Date; versions: { scenes: unknown }[] };
  const projects = new Map<string, Row>();
  class InsufficientCreditsError extends Error {}
  const db = {
    project: {
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => { const p = projects.get(where.id); return p?.userId === where.userId ? p : null; },
      create: async ({ data }: { data: { id: string; userId: string; status: string; versions: { create: { scenes: unknown } } } }) => {
        if (projects.has(data.id)) throw new Error("duplicate");
        projects.set(data.id, { ...data, createdAt: new Date(), versions: [data.versions.create] });
      },
      update: async ({ where, data }: { where: { id: string }; data: { status?: string } }) => { const p = projects.get(where.id)!; if (data.status) p.status = data.status; },
    },
    projectVersion: { update: async ({ where, data }: { where: { projectId_number: { projectId: string } }; data: { scenes: unknown } }) => { projects.get(where.projectId_number.projectId)!.versions[0].scenes = data.scenes; } },
    asset: { createMany: async () => ({ count: 0 }) },
    $transaction: async (run: ((tx: unknown) => Promise<unknown>) | Promise<unknown>[]) => typeof run === "function" ? run(db) : Promise.all(run),
  };
  const mocks: Record<string, unknown> = {
    "../auth/dal": { getCurrentUser: async () => user }, "../db": { db },
    "../rate-limit": { acquireLock: async () => "lock", releaseLock: async () => {}, rateLimitAll: async () => ({ ok: true }) },
    "../credits/ledger": { InsufficientCreditsError, spendCredits: async (_userId: string, input: { amount: number }, commit: (tx: typeof db) => Promise<void>) => { if (balance < input.amount) throw new InsufficientCreditsError(); await commit(db); balance -= input.amount; charges++; }, refundCredits: async (_userId: string, input: { amount: number }) => { balance += input.amount; refunds++; } },
    "./pdf": { openPitchPdf: async () => ({ numPages: 1, destroy: async () => {} }), pdfFontNames: async () => ["Helvetica"] },
    "./analyze": { analyzePitch: async () => { calls++; if (fail) throw new Error("provider_failed"); return { plan: { company: "Studio", brand: { colors: ["#ffffff", "#111111"], logoCrop: null }, scenes: [] }, inputTokens: 1000, outputTokens: 500 }; } },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries(mocks)) { const key = require.resolve(name); originals.set(key, require.cache[key]); require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module; }
  try {
    const { POST } = require("../../app/api/pitch/analyze/route") as typeof import("../../app/api/pitch/analyze/route");
    function request(id: string, origin = "http://localhost") {
      const form = new FormData(); form.set("file", new File(["%PDF-1.4"], "deck.pdf", { type: "application/pdf" })); form.set("requestId", id);
      form.set("options", JSON.stringify({ duration: 60, tone: "investors", locale: "fr", format: "LANDSCAPE" }));
      return new Request("http://localhost/api/pitch/analyze", { method: "POST", body: form, headers: { origin } });
    }
    const id = "11111111-1111-4111-8111-111111111111";
    user = null; assert.equal((await POST(request(id))).status, 401); user = { id: "owner", plan: "PRO" };
    assert.equal((await POST(request(id, "https://other.example"))).status, 403);
    assert.equal((await POST(request("invalid"))).status, 400); assert.equal(charges, 0);
    balance = 0; assert.equal((await POST(request(id))).status, 402); assert.equal(calls, 0); assert.equal(projects.size, 0);
    balance = 30; assert.equal((await POST(request(id))).status, 200); assert.equal(balance, 15); assert.equal(charges, 1); assert.equal(calls, 1);
    assert.equal((await POST(request(id))).status, 200); assert.equal(charges, 1); assert.equal(calls, 1);
    fail = true; const failed = "22222222-2222-4222-8222-222222222222";
    assert.equal((await POST(request(failed))).status, 400); assert.equal(balance, 15); assert.equal(refunds, 1); assert.equal(projects.get(failed)!.status, "FAILED");
    user = { id: "other", plan: "PRO" }; assert.equal((await POST(request(id))).status, 400); assert.equal(charges, 2);
  } finally { for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; } }
});

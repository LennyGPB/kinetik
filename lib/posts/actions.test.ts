import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { demoPost, type PostDocument } from "./document";

test("post actions authorize, bill once, version edits, and refund failed exports using the shared ledger", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/posts/actions.test.ts"));
  type Version = { id: string; projectId: string; number: number; scenes: PostDocument; label: string; messageId?: string };
  type Project = { id: string; userId: string; kind: string; styleId?: string; status: string; name: string; appName: string; locale: string; brief: string; assets: { type: string; url: string }[]; versions: Version[] };
  type Export = { id: string; projectId: string; versionId: string; requestId: string; format: string; status: string; creditCost: number; files?: string[] };
  const projects = new Map<string, Project>(); const versions: Version[] = []; const exports: Export[] = [];
  const charges: { amount: number; type: string; reference?: string; userId: string }[] = [];
  const refunds: string[] = [];
  let user: { id: string; plan: "FREE" } | null = { id: "owner", plan: "FREE" };
  let balance = 30; let aiFailure = false; let storageFailure = false; let rateLimited = false;
  class InsufficientCreditsError extends Error { constructor(public required: number, public available: number) { super("low"); } }
  const db = {
    project: {
      findUnique: async ({ where }: { where: { id: string } }) => projects.get(where.id) ?? null,
      findFirst: async ({ where }: { where: { id: string; userId: string; kind: string; status?: string | { in: string[] } } }) => {
        const p = projects.get(where.id); return p && p.userId === where.userId && p.kind === where.kind && (!where.status || (typeof where.status === "string" ? p.status === where.status : where.status.in.includes(p.status))) ? { ...p, versions: versions.filter((v) => v.projectId === p.id).sort((a, b) => b.number - a.number) } : null;
      },
      create: async ({ data }: { data: Omit<Project, "assets" | "versions"> & { assets: { create: Project["assets"] }; versions: { create: Omit<Version, "id" | "projectId"> } } }) => {
        const p = { ...data, assets: data.assets.create, versions: [] }; projects.set(data.id, p);
        versions.push({ ...data.versions.create, id: randomUUID(), projectId: data.id }); return p;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Project> }) => { Object.assign(projects.get(where.id)!, data); return projects.get(where.id); },
    },
    projectVersion: {
      update: async ({ where, data }: { where: { projectId_number: { projectId: string; number: number } }; data: { scenes: PostDocument } }) => Object.assign(versions.find((v) => v.projectId === where.projectId_number.projectId && v.number === where.projectId_number.number)!, data),
      create: async ({ data }: { data: Omit<Version, "id"> }) => { const version = { ...data, id: randomUUID() }; versions.push(version); return version; },
      findFirst: async ({ where }: { where: { projectId: string; messageId?: string; scenes?: { equals: string } } }) => versions.filter((v) => v.projectId === where.projectId && (!where.messageId || v.messageId === where.messageId) && (!where.scenes || v.scenes.templateId === where.scenes.equals)).sort((a, b) => b.number - a.number)[0] ?? null,
    },
    creditTransaction: { findFirst: async ({ where }: { where: { userId: string; type: string; reference: string } }) => charges.find((c) => c.userId === where.userId && c.type === where.type && c.reference === where.reference) ?? null },
    chatMessage: { create: async () => ({}) },
    postExport: {
      findUnique: async ({ where }: { where: { requestId: string } }) => exports.find((e) => e.requestId === where.requestId) ?? null,
      findFirst: async ({ where }: { where: { projectId: string; status: string } }) => exports.find((e) => e.projectId === where.projectId && e.status === where.status) ?? null,
      create: async ({ data }: { data: Export }) => { exports.push(data); return data; },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Export> }) => Object.assign(exports.find((e) => e.id === where.id)!, data),
    },
    $transaction: async (callback: ((tx: unknown) => Promise<unknown>) | Promise<unknown>[]) => typeof callback === "function" ? callback(db) : Promise.all(callback),
  };
  const held = new Set<string>();
  const mocks: Record<string, unknown> = {
    "../db": { db }, "next/cache": { refresh() {} },
    "../auth/dal": { getCurrentUser: async () => user },
    "../credits/ledger": {
      InsufficientCreditsError,
      getCreditBalance: async () => ({ total: balance }),
      spendCredits: async (userId: string, charge: { amount: number; type: string; reference?: string }, commit?: (tx: unknown) => Promise<void>) => { if (charge.amount > balance) throw new InsufficientCreditsError(charge.amount, balance); charges.push({ ...charge, userId }); balance -= charge.amount; await commit?.(db); },
      refundCredits: async (_userId: string, input: { reference: string; amount: number }) => { if (!refunds.includes(input.reference)) { refunds.push(input.reference); balance += input.amount; } },
    },
    "../rate-limit": { acquireLock: async (key: string) => { if (held.has(key)) return null; held.add(key); return "lock"; }, releaseLock: async (key: string) => { held.delete(key); } },
    "../security/limits": { LIMITS: { generation: [], edit: [], setting: [], project: [], export: [], exportGlobal: [], exportGlobalFree: [] }, limitKey: async () => ({ ok: !rateLimited }) },
    "../storage": { isOwnUpload: (id: string, url: string) => url.startsWith(`/api/uploads/${id}/image/`), storage: { get: async () => null, put: async () => { if (storageFailure) throw new Error("unavailable"); return { url: `/api/uploads/owner/image/${randomUUID()}.png` }; } } },
    "./ai": { writePostCopy: async (doc: PostDocument) => { if (aiFailure) throw new Error("offline"); return { ...doc, pages: doc.pages.map((page) => ({ ...page, title: "Edited" })) }; } },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, value] of Object.entries(mocks)) { const key = require.resolve(name); originals.set(key, require.cache[key]); require.cache[key] = { id: key, filename: key, loaded: true, exports: value } as NodeJS.Module; }
  try {
    const { createPost, savePost, editPostWithAi, exportPost } = require("./actions") as typeof import("./actions");
    const input = { requestId: randomUUID(), appName: "Demo", locale: "fr", brief: "An actual product announcement", templateId: "post-portrait", format: "FEED", pageCount: 5, colors: demoPost("post-portrait").colors, logo: null, screens: [] };
    user = null; assert.deepEqual(await createPost(input), { ok: false, error: "unauthorized" }); user = { id: "owner", plan: "FREE" };
    assert.equal((await createPost({ ...input, pageCount: 6 })).ok, false); assert.equal(charges.length, 0);
    assert.equal((await createPost({ ...input, templateId: "post-studio" })).ok, false);
    assert.equal((await createPost({ ...input, templateId: "post-signal" })).ok, false);
    assert.ok((await createPost(input)).ok); assert.equal(balance, 22); assert.equal(charges.length, 1);
    assert.equal(versions[0].scenes.font, "serif");
    assert.ok(versions[0].scenes.pages.every((page) => page.align === "center" && page.titleSize === 104));
    assert.ok((await createPost(input)).ok); assert.equal(charges.length, 1);
    user = { id: "other", plan: "FREE" }; assert.equal((await exportPost(input.requestId, 1, "png", randomUUID())).ok, false); assert.equal(charges.length, 1); user = { id: "owner", plan: "FREE" };
    const doc = versions[0].scenes;
    assert.deepEqual(await savePost(input.requestId, 1, demoPost("post-studio")), { ok: false, error: "invalid" });
    assert.deepEqual(await savePost(input.requestId, 1, demoPost("post-signal")), { ok: false, error: "invalid" });
    assert.ok((await savePost(input.requestId, 1, doc)).ok); assert.equal(charges.length, 1);
    assert.deepEqual(await savePost(input.requestId, 1, doc), { ok: false, error: "conflict" });
    const editRequest = randomUUID(); assert.ok((await editPostWithAi(input.requestId, 2, "Shorten titles", editRequest)).ok); assert.equal(balance, 21);
    assert.ok((await editPostWithAi(input.requestId, 2, "Shorten titles", editRequest)).ok); assert.equal(balance, 21);
    const exportRequest = randomUUID(); const first = await exportPost(input.requestId, 3, "png", exportRequest); assert.ok(first.ok); assert.equal(balance, 16);
    assert.ok((await exportPost(input.requestId, 3, "png", exportRequest)).ok); assert.equal(balance, 16);
    assert.ok((await exportPost(input.requestId, 3, "jpg", randomUUID())).ok); assert.equal(balance, 13);
    storageFailure = true; assert.deepEqual(await exportPost(input.requestId, 3, "png", randomUUID()), { ok: false, error: "render_failed" }); assert.equal(balance, 13); storageFailure = false;
    aiFailure = true; assert.equal((await editPostWithAi(input.requestId, 3, "Shorten again", randomUUID())).ok, false); assert.equal(balance, 13);
    assert.equal((await createPost({ ...input, requestId: randomUUID() })).ok, false); assert.equal(balance, 13); aiFailure = false;
    projects.set("legacy", { id: "legacy", userId: "owner", kind: "POST", styleId: "post-studio", status: "READY", name: "Existing project", appName: "Demo", locale: "fr", brief: "", assets: [], versions: [] });
    versions.push({ id: randomUUID(), projectId: "legacy", number: 1, label: "Existing version", scenes: demoPost("post-studio") });
    assert.ok((await savePost("legacy", 1, demoPost("post-studio"))).ok);
    assert.ok((await savePost("legacy", 2, demoPost("post-swiss"))).ok);
    assert.ok((await savePost("legacy", 3, demoPost("post-studio"))).ok);
    balance = 0; assert.equal((await createPost({ ...input, requestId: randomUUID() })).ok, false); assert.equal(balance, 0);
    rateLimited = true; assert.deepEqual(await exportPost(input.requestId, 3, "png", randomUUID()), { ok: false, error: "rate_limited" });
    assert.equal(held.size, 0);
  } finally { for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; } }
});

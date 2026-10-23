import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { keyPages, storeLinks, ProductBriefSchema, ReviewSchema, productGenerationBrief } from "./model";
import { iconPng } from "../capture/icon";

const brief = { company: "Example", product: "Organize tasks", audience: "Small teams", benefits: ["Organize tasks", "Share progress", "Find projects"], tone: "professional", hooks: ["Organize your work", "Keep your team aligned", "Meet Example"], styles: ["veil", "power", "folio"], headingFont: "Inter", bodyFont: "Inter", fontNote: "Observed", warnings: [] };
const file = { url: "/api/uploads/owner/image/0123456789abcdef0123456789abcdef.png", fileName: "screen.png", mimeType: "image/png", sizeBytes: 100, width: 100, height: 200 };
const music = { url: "/api/uploads/owner/audio/0123456789abcdef0123456789abcdef.mp3", fileName: "my-sound.mp3", mimeType: "audio/mpeg", sizeBytes: 1000, bpm: 112, beatOffset: .25 };
const review = ReviewSchema.parse({ analysisId: "analysis", brief, colors: ["#111111", "#ffffff"], logo: file, screens: [file], format: "PORTRAIT", duration: 15, saveBrand: true, music, templateId: "stage" });

test("favicon containers choose the largest PNG frame and reject invalid offsets", () => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const data = Buffer.alloc(56); data.writeUInt16LE(1, 2); data.writeUInt16LE(2, 4);
  data[6] = data[7] = 16; data.writeUInt32LE(8, 14); data.writeUInt32LE(38, 18);
  data[22] = data[23] = 0; data.writeUInt32LE(10, 30); data.writeUInt32LE(46, 34);
  signature.copy(data, 38); signature.copy(data, 46); data[54] = 42;
  assert.equal(iconPng(data)?.length, 10); assert.equal(iconPng(data)?.[8], 42);
  data.writeUInt32LE(5000, 34); assert.equal(iconPng(data)?.length, 8);
  assert.equal(iconPng(Buffer.alloc(4)), null);
});

test("URL discovery stays same-origin, deduplicates sections and only accepts actual store hosts", () => {
  assert.deepEqual(keyPages([
    { url: "https://example.com/#features", text: "Features" },
    { url: "https://example.com/features", text: "Features" },
    { url: "https://example.com/features#more", text: "More" },
    { url: "https://other.example/pricing", text: "Pricing" },
    { url: "https://example.com/pricing?checkout=1", text: "Pricing" },
    { url: "https://example.com/pricing", text: "Pricing" },
  ], "https://example.com"), ["https://example.com/features", "https://example.com/pricing"]);
  assert.deepEqual(storeLinks([
    { url: "https://apps.apple.com.evil.example/app/id123" }, { url: "https://apps.apple.com/fr/app/example/id123" },
    { url: "https://play.google.com/store/apps/details?id=com.example" }, { url: "https://play.google.com/about" },
  ]).map((s) => s.platform), ["ios", "android"]);
});

test("the product contract rejects incomplete briefs, duplicate styles and untrusted media", () => {
  assert.equal(ProductBriefSchema.safeParse({ ...brief, benefits: ["One"] }).success, false);
  assert.equal(ProductBriefSchema.safeParse({ ...brief, styles: ["veil", "veil", "folio"] }).success, false);
  assert.equal(ReviewSchema.safeParse({ ...review, screens: [{ ...file, url: "https://example.com/a.png" }] }).success, false);
  assert.equal(JSON.parse(productGenerationBrief(review.brief, 1)).hook, brief.hooks[1]);
  assert.equal(ReviewSchema.safeParse({ ...review, templateId: "not-a-template" }).success, false);
  assert.equal(ReviewSchema.safeParse({ ...review, music: file }).success, false);
  const legacy = ReviewSchema.parse({ ...review, music: undefined, templateId: undefined });
  assert.equal(legacy.music, null); assert.equal(legacy.templateId, null);
});

test("paid proposals are isolated, resumable, owner-scoped and refund only failures", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/url-video/url-video.test.ts"));
  const analysis = { url: "https://example.com/", locale: "en", brief, colors: review.colors, logo: file, screens: [{ ...file, label: "App", source: "https://example.com", format: "app" }], stores: [], pages: ["https://example.com/"] };
  const row = { id: "analysis", userId: "owner", data: analysis as Record<string, unknown>, projectIds: [] as string[], settledProjectIds: [] as string[] };
  const projects = new Map<string, Record<string, unknown>>();
  let balance = 30, charges = 0, refunds = 0, calls = 0, saved = 0;
  const refunded = new Set<string>();
  const database = {
    urlVideoAnalysis: {
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => where.id === row.id && where.userId === row.userId ? { ...row, projectIds: [...row.projectIds] } : null,
      update: async ({ data }: { data: { data?: Record<string, unknown>; projectIds?: { push: string }; settledProjectIds?: { push: string } } }) => { if (data.data) row.data = data.data; if (data.projectIds) row.projectIds.push(data.projectIds.push); if (data.settledProjectIds) row.settledProjectIds.push(data.settledProjectIds.push); return row; },
    },
    project: {
      create: async ({ data }: { data: Record<string, unknown> }) => { projects.set(String(data.id), { ...data, updatedAt: new Date(), versions: [] }); return data; },
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => { const p = projects.get(where.id); return p?.userId === where.userId ? p : null; },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { Object.assign(projects.get(where.id)!, data); return projects.get(where.id); },
    },
    projectVersion: { create: async ({ data }: { data: { projectId: string; scenes: unknown } }) => { (projects.get(data.projectId)!.versions as unknown[]).push({ scenes: data.scenes }); } },
    chatMessage: { create: async () => ({}) },
    brandKit: { findFirst: async () => null, count: async () => 0, create: async () => { saved++; return { id: "kit" }; }, updateMany: async () => ({}), update: async () => ({}) },
    asset: { deleteMany: async () => ({}), createMany: async () => ({}) },
    $transaction: async (value: unknown) => typeof value === "function" ? value(database) : Promise.all(value as Promise<unknown>[]),
  };
  const mocks = {
    "../rate-limit": { acquireLock: async () => "lock", releaseLock: async () => {} },
    "../db": { db: database },
    "../services/ai": { generateVideo: async (ctx: { brief: string; styleId: string; noMusic: boolean; musicTempo: { bpm: number } }) => { calls++; assert.equal(ctx.styleId, "stage"); assert.equal(ctx.noMusic, false); assert.equal(ctx.musicTempo.bpm, 112); if (JSON.parse(ctx.brief).hook === brief.hooks[1]) throw new Error("provider_failure"); return { schema: 1, scenes: [{ id: "intro", kind: "intro", title: "Example", duration: 15 }], energy: "balanced", logoEmphasis: true, musicTrackId: "unexpected-library-track", bpm: 120 }; }, welcomeMessage: () => "Welcome" },
    "../projects/queries": { getVideoSource: async () => ({ appName: "Example" }) },
    "../storage": { isOwnUpload: (userId: string, url: string) => url.startsWith(`/api/uploads/${userId}/`) },
    "../credits/ledger": { claimGeneration: async () => ({ claimed: true }), getCreditBalance: async () => ({ total: balance }), spendCredits: async (_user: string, input: { amount: number }, commit: (tx: unknown) => Promise<void>) => { if (balance < input.amount) throw new Error("insufficient"); balance -= input.amount; charges++; await commit(database); }, refundCredits: async (_user: string, input: { amount: number; reference: string }) => { if (!refunded.has(input.reference)) { refunded.add(input.reference); balance += input.amount; refunds++; } } },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries(mocks)) { const key = require.resolve(name); originals.set(key, require.cache[key]); require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module; }
  try {
    const { generateUrlProposals, urlVideoResult } = require("./proposals") as typeof import("./proposals");
    const caller = { userId: "owner", plan: "PRO" as const };
    const events: Record<string, unknown>[] = [];
    await assert.rejects(generateUrlProposals(review, { ...caller, userId: "other" }, () => {}), /not_found/);
    await assert.rejects(generateUrlProposals({ ...review, logo: { ...file, url: "/api/uploads/other/image/x.png" } }, caller, () => {}), /invalid/);
    await assert.rejects(generateUrlProposals({ ...review, music: { ...music, url: "/api/uploads/other/audio/x.mp3" } }, caller, () => {}), /invalid/);
    balance = 29; await assert.rejects(generateUrlProposals(review, caller, () => {}), /insufficient_credits/); assert.equal(saved, 0);
    balance = 30; await generateUrlProposals(review, caller, (e) => events.push(e));
    assert.equal(charges, 3); assert.equal(calls, 3); assert.equal(refunds, 1); assert.equal(balance, 10);
    assert.equal(row.projectIds.length, 3); assert.equal(events.at(-1)?.type, "complete");
    const result = await urlVideoResult("analysis", caller);
    assert.deepEqual(result?.proposals.map((p) => p.status), ["READY", "FAILED", "READY"]);
    for (const project of projects.values()) {
      const assets = (project.assets as { create: { type: string; url: string }[] }).create;
      assert.equal(assets.find((a) => a.type === "MUSIC")?.url, music.url);
      assert.equal(project.styleId, "stage");
      const version = (project.versions as { scenes: { bpm: number; musicTrackId: string | null; beatOffset: number } }[])[0];
      if (version) { assert.equal(version.scenes.bpm, 112); assert.equal(version.scenes.beatOffset, .25); assert.equal(version.scenes.musicTrackId, null); }
    }
    await generateUrlProposals(review, caller, () => {}); assert.equal(charges, 3); assert.equal(calls, 3);
    await assert.rejects(generateUrlProposals({ ...review, duration: 30 }, caller, () => {}), /review_locked/);
    assert.equal(await urlVideoResult("analysis", { ...caller, userId: "other" }), null);
    const first = projects.get(row.projectIds[0])!; first.status = "GENERATING"; first.updatedAt = new Date(Date.now() - 400_000);
    // A later manual retry belongs to the editor; URL recovery must never refund that new operation.
    await urlVideoResult("analysis", caller); await urlVideoResult("analysis", caller);
    assert.equal(refunds, 1);
    row.settledProjectIds = row.settledProjectIds.filter((id) => id !== row.projectIds[0]);
    await urlVideoResult("analysis", caller); await urlVideoResult("analysis", caller);
    assert.equal(first.status, "FAILED"); assert.equal(refunds, 2);
  } finally { for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; } }
});

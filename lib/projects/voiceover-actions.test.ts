import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import type { SceneGraph } from "./scenes";

test("voiceover actions authorize, charge once, refund provider/storage/conflict failures and reject forged clips", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/projects/voiceover-actions.test.ts"));
  let user: { id: string; plan: string } | null = { id: "owner", plan: "PRO" };
  let balance = 30, providerCalls = 0, charges = 0, refunds = 0, limited = false, providerFail = false, storageFail = false, conflict = false;
  let audioDuration = 1;
  const graph: SceneGraph = { schema: 1, language: "fr", energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120,
    scenes: [{ id: "intro", kind: "intro", title: "Product", duration: 4, transition: "fade" }] };
  type Version = { id: string; number: number; label: string; createdAt: Date; scenes: SceneGraph };
  const versions: Version[] = [{ id: "base", number: 1, label: "First", createdAt: new Date(), scenes: graph }];
  const entries: { id: string; reference: string; description: string; amount: number; createdAt: Date }[] = [];
  class InsufficientCreditsError extends Error { constructor(public required: number, public available: number) { super("low"); } }
  const db = {
    $queryRaw: async () => [],
    $transaction: async (run: (tx: unknown) => unknown) => run(db),
    project: {
      findFirst: async ({ where }: { where: { userId: string } }) => where.userId === "owner" ? { id: "project", userId: "owner", appName: "Product", brief: null, versions: [versions.at(-1)] } : null,
      update: async () => ({}),
    },
    projectVersion: {
      findFirst: async ({ where }: { where: { scenes?: { equals: string } } }) => where.scenes ? versions.find((v) => v.scenes.voiceover?.requestId === where.scenes!.equals) ?? null : versions.at(-1),
      create: async ({ data }: { data: Omit<Version, "id" | "createdAt"> }) => { const version = { ...data, scenes: structuredClone(data.scenes), id: `v${versions.length + 1}`, createdAt: new Date() }; versions.push(version); return version; },
    },
    creditTransaction: {
      findFirst: async ({ where }: { where: { reference: string } }) => entries.find((e) => e.reference === where.reference) ?? null,
      findMany: async () => [],
      create: async ({ data }: { data: Omit<(typeof entries)[number], "id" | "createdAt"> }) => { const row = { ...data, id: `e${entries.length}`, createdAt: new Date() }; entries.push(row); return row; },
      updateMany: async () => ({}),
    },
  };
  const mocks: Record<string, unknown> = {
    "../auth/dal": { getCurrentUser: async () => user }, "../db": { db },
    "../rate-limit": { acquireLock: async () => "lock", releaseLock: async () => {}, rateLimitAll: async () => ({ ok: !limited }) },
    "./voiceover-recovery": { recoverNarrationCredits: async () => 0 },
    "../services/elevenlabs": { narrationVoices: async () => [{ id: "voice1" }], synthesizeNarration: async () => {
      providerCalls++; if (providerFail) throw new Error("upstream");
      if (conflict) versions.push({ ...versions.at(-1)!, id: "concurrent", number: versions.length + 1 });
      return { data: Buffer.alloc(48), duration: audioDuration, modelId: "model" };
    } },
    "../services/ai": { proposeNarration: async () => [{ sceneId: "intro", text: "Suggested narration" }] },
    "../storage": { storage: { put: async (_file: File, folder: string) => { assert.equal(folder, "owner/audio"); if (storageFail) throw new Error("storage"); return { url: "/api/uploads/owner/audio/voice.wav" }; } } },
    "../credits/ledger": { InsufficientCreditsError, getCreditBalance: async () => ({ total: balance }),
      spendCredits: async (_id: string, input: { amount: number }, commit: (tx: typeof db) => Promise<void>) => {
        if (balance < input.amount) throw new InsufficientCreditsError(input.amount, balance);
        await commit(db); balance -= input.amount; charges++;
      },
      refundCredits: async (_id: string, input: { amount: number }) => { balance += input.amount; refunds++; },
    },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries(mocks)) { const key = require.resolve(name); originals.set(key, require.cache[key]); require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module; }
  try {
    const { generateNarration, saveNarration } = require("./voiceover-actions") as typeof import("./voiceover-actions");
    const input = { enabled: true, voiceId: "voice1", language: "fr" as const, volume: 1, duckMusic: true, segments: [{ sceneId: "intro", text: "Hello" }] };
    const generate = (id: string) => generateNarration("project", versions.at(-1)!.id, input, id, "intro");
    user = null; assert.deepEqual(await generate("unauth"), { ok: false, error: "unauthorized" });
    user = { id: "other", plan: "PRO" }; assert.equal((await generate("other")).ok, false);
    user = { id: "owner", plan: "PRO" }; limited = true; assert.equal((await generate("limited")).ok, false); limited = false;
    assert.equal(charges, 0); assert.equal(providerCalls, 0);
    const success = await generate("first"); assert.equal(success.ok, true); assert.equal(balance, 29);
    const repeated = await generateNarration("project", "base", input, "first", "intro");
    assert.deepEqual(repeated, success); assert.equal(providerCalls, 1); assert.equal(charges, 1);
    providerFail = true; assert.equal((await generate("failed")).ok, false); providerFail = false;
    assert.equal(balance, 29); assert.equal(refunds, 1);
    await generate("failed"); assert.equal(charges, 2); // A failed request id cannot be charged again.
    storageFail = true; assert.equal((await generate("storage-failed")).ok, false); storageFail = false;
    assert.equal(balance, 29); assert.equal(refunds, 2);
    conflict = true; assert.equal((await generate("conflict")).ok, false); conflict = false;
    assert.equal(balance, 29); assert.equal(refunds, 3);
    balance = 0; const low = await generate("low"); assert.equal(low.ok, false); if (!low.ok) assert.equal(low.error, "insufficient_credits");
    const forged = { ...input, segments: [{ sceneId: "intro", text: "Hello", clip: { src: "/api/uploads/other/audio/stolen.wav" } }] };
    const saved = await saveNarration("project", versions.at(-1)!.id, forged);
    assert.equal(saved.ok, true);
    if (saved.ok) assert.equal(saved.version.graph.voiceover!.segments[0].clip!.src, "/api/uploads/owner/audio/voice.wav");
    balance = 20; audioDuration = 6;
    const fitted = await generateNarration("project", versions.at(-1)!.id, { ...input, autoFit: true }, "auto-fit", "intro");
    assert.equal(fitted.ok, true);
    if (fitted.ok) assert.ok(fitted.version.graph.scenes[0].duration >= 6);
    const calls = providerCalls, paid = charges, beforeBalance = balance;
    const repaired = await saveNarration("project", versions.at(-1)!.id, { ...input, autoFit: true }, "all");
    assert.equal(repaired.ok, true);
    assert.equal(providerCalls, calls); assert.equal(charges, paid); assert.equal(balance, beforeBalance);
  } finally { for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; } }
});

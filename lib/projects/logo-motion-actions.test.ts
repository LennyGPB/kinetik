import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { LogoMotionInput } from "./logo-motion";

test("Logo motion authorizes creation, charges once and never charges rejected or failed requests", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/projects/logo-motion-actions.test.ts"));
  let user: { id: string } | null = { id: "owner" };
  let balance = 30, charges = 0, fail = false, limited = false;
  type Project = { id: string; userId: string; videoType: string; status: string };
  const projects = new Map<string, Project>();
  class InsufficientCreditsError extends Error { constructor(public required: number, public available: number) { super("low"); } }
  const db = { project: {
    findUnique: async ({ where }: { where: { id: string } }) => projects.get(where.id) ?? null,
    findFirst: async ({ where }: { where: Project }) => { const project = projects.get(where.id); return project && project.userId === where.userId && project.status === where.status && project.videoType === where.videoType ? project : null; },
    create: async ({ data }: { data: Project }) => { if (fail) throw new Error("unavailable"); projects.set(data.id, data); },
  } };
  const mocks: Record<string, unknown> = {
    "../auth/dal": { getCurrentUser: async () => user }, "../db": { db },
    "../security/limits": { LIMITS: { generation: [] }, limitKey: async () => ({ ok: !limited }) },
    "../credits/ledger": { InsufficientCreditsError, getCreditBalance: async () => ({ total: balance }),
      spendCredits: async (_id: string, input: { amount: number }, commit: (tx: typeof db) => Promise<void>) => { if (balance < input.amount) throw new InsufficientCreditsError(input.amount, balance); await commit(db); balance -= input.amount; charges++; return { total: balance }; },
    },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries(mocks)) { const key = require.resolve(name); originals.set(key, require.cache[key]); require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module; }
  try {
    const { createLogoMotion } = require("./logo-motion-actions") as typeof import("./logo-motion-actions");
    const input: LogoMotionInput = { requestId: randomUUID(), text: "Studio", templateId: "logo-slice", colors: ["#fafaf7", "#111111", "#111111"], format: "SQUARE", duration: 6, musicTrackId: null, locale: "fr" };
    user = null; assert.deepEqual(await createLogoMotion(input), { ok: false, error: "unauthorized" }); user = { id: "owner" };
    assert.equal((await createLogoMotion({ ...input, text: "" })).ok, false);
    limited = true; assert.equal((await createLogoMotion(input)).ok, false); limited = false;
    assert.equal(charges, 0);
    assert.deepEqual(await createLogoMotion(input), { ok: true, id: input.requestId, balance: 20 });
    assert.deepEqual(await createLogoMotion(input), { ok: true, id: input.requestId, balance: 20 });
    assert.equal(charges, 1);
    user = { id: "other" }; assert.equal((await createLogoMotion(input)).ok, false); user = { id: "owner" };
    fail = true; assert.equal((await createLogoMotion({ ...input, requestId: randomUUID() })).ok, false); fail = false;
    assert.equal(balance, 20); assert.equal(charges, 1);
    balance = 0; assert.deepEqual(await createLogoMotion({ ...input, requestId: randomUUID() }), { ok: false, error: "insufficient_credits", required: 10, available: 0 });
    assert.equal(projects.size, 1);
  } finally { for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; } }
});

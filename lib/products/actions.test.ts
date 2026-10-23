import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { CREDIT_COSTS } from "../../config/credits";
import type { PhysicalProductInput } from "./model";

test("product creation owns every asset, commits atomically and retries without another debit or brand kit", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/products/actions.test.ts"));
  const projects = new Map<string, { id: string; userId: string; videoType: string; status: string }>();
  let balance = 100, debits = 0, kits = 0, missing = false, failCommit = false;
  class Insufficient extends Error { required = 10; available = 0; }
  const database = { project: {
    findFirst: async ({ where }: { where: { id: string; userId: string } }) => { const row = projects.get(where.id); return row?.userId === where.userId ? row : null; },
    create: async ({ data }: { data: { id: string; userId: string; videoType: string; status: string } }) => { if (failCommit) throw new Error("commit_failed"); if (projects.has(data.id)) throw new Error("unique"); projects.set(data.id, data); },
  }, brandKit: { create: async () => { kits++; } } };
  const mocks = {
    "../auth/dal": { getCurrentUser: async () => ({ id: "owner" }) },
    "../db": { db: database },
    "../security/limits": { LIMITS: { generation: [] }, limitKey: async () => ({ ok: true }) },
    "../storage": { isOwnUpload: (id: string, url: string) => url.startsWith(`/api/uploads/${id}/`), storage: { get: async () => missing ? null : Buffer.from("stored") } },
    "../credits/ledger": { InsufficientCreditsError: Insufficient, getCreditBalance: async () => ({ total: balance }), spendCredits: async (_id: string, args: { amount: number }, commit: (tx: typeof database) => Promise<void>) => { if (balance < args.amount) throw new Insufficient(); await commit(database); debits++; balance -= args.amount; return { total: balance }; } },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries(mocks)) { const key = require.resolve(name); originals.set(key, require.cache[key]); require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module; }
  const photo = { url: "/api/uploads/owner/image/photo.png", fileName: "photo.png", mimeType: "image/png", sizeBytes: 100 };
  const input: PhysicalProductInput = { requestId: "00000000-0000-4000-8000-000000000001", name: "Real product", hook: "Exact hook", benefits: ["Real benefit"], cta: "Discover", price: "", websiteUrl: "", templateId: "product-studio", images: [photo], originals: [photo], logo: null, colors: ["#eeeeee", "#111111", "#778899"], format: "PORTRAIT", duration: 15, locale: "en", music: null, musicTrackId: null, saveBrand: true };
  try {
    const { createPhysicalProduct } = require("./actions") as typeof import("./actions");
    assert.equal((await createPhysicalProduct({ ...input, images: [{ ...photo, url: "/api/uploads/other/image/photo.png" }] })).ok, false);
    missing = true; assert.equal((await createPhysicalProduct(input)).ok, false); missing = false;
    failCommit = true; assert.equal((await createPhysicalProduct(input)).ok, false); failCommit = false;
    assert.equal(debits, 0); assert.equal(kits, 0);
    assert.equal((await createPhysicalProduct(input)).ok, true);
    assert.equal((await createPhysicalProduct(input)).ok, true);
    assert.equal(debits, 1); assert.equal(kits, 1); assert.equal(balance, 100 - CREDIT_COSTS.generation);
    assert.equal(projects.get(input.requestId)?.videoType, "physical-product");
  } finally { for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; } }
});

import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import { demoPost } from "./document";

test("interrupted post work is refunded on recovery without replaying AI or render calls", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/posts/recovery.test.ts"));
  const project = { status: "GENERATING", createdAt: new Date(0), versions: [{ scenes: demoPost("post-orbit") }] };
  const render = { id: "export", creditCost: 3, status: "RENDERING" };
  const refunded = new Map<string, number>();
  let locked = false; let updates = 0;
  const mocks: Record<string, unknown> = {
    "../db": { db: {
      project: { findFirst: async ({ where }: { where: { userId: string; status?: string } }) => where.userId === "owner" && (!where.status || where.status === project.status) ? project : null, update: async ({ data }: { data: { status: string } }) => { project.status = data.status; updates++; } },
      postExport: { findMany: async () => render.status === "RENDERING" ? [render] : [], update: async () => { render.status = "FAILED"; updates++; } },
      chatMessage: { findMany: async () => [{ id: "edit" }] },
      creditTransaction: { findFirst: async () => ({ id: "debit" }) },
    } },
    "../credits/ledger": { refundCredits: async (_userId: string, value: { reference: string; amount: number }) => { refunded.set(value.reference, value.amount); } },
    "../rate-limit": { acquireLock: async () => locked ? null : "lock", releaseLock: async () => {} },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, value] of Object.entries(mocks)) { const id = require.resolve(name); originals.set(id, require.cache[id]); require.cache[id] = { id, filename: id, loaded: true, exports: value } as NodeJS.Module; }
  try {
    const { recoverPostOperations } = require("./recovery") as typeof import("./recovery");
    await recoverPostOperations("other", "project"); assert.equal(refunded.size, 0);
    locked = true; await recoverPostOperations("owner", "project"); assert.equal(refunded.size, 0);
    locked = false; await recoverPostOperations("owner", "project");
    assert.equal(project.status, "FAILED"); assert.equal(render.status, "FAILED");
    assert.deepEqual([...refunded], [["project", 6], ["export", 3], ["post-edit:edit", 1]]);
    await recoverPostOperations("owner", "project"); assert.equal(refunded.size, 3); assert.equal(updates, 2);
  } finally { for (const [id, original] of originals) { if (original) require.cache[id] = original; else delete require.cache[id]; } }
});

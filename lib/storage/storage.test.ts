import assert from "node:assert/strict";
import test from "node:test";
import { isOwnUpload } from "./index";
import { storage } from "./index";
import { rm } from "node:fs/promises";
import path from "node:path";

// Lancer avec : npx tsx --conditions=react-server --test lib/storage/storage.test.ts

test("a project can only reference files uploaded by its owner", () => {
  assert.equal(isOwnUpload("user1", "/api/uploads/user1/image/abc123.png"), true);
  // Fichier d'un autre compte
  assert.equal(isOwnUpload("user1", "/api/uploads/user2/image/abc123.png"), false);
  // Préfixe trompeur et remontée de dossier
  assert.equal(isOwnUpload("user1", "/api/uploads/user10/image/abc.png"), false);
  assert.equal(isOwnUpload("user1", "/api/uploads/user1/../user2/image/abc.png"), false);
  assert.equal(isOwnUpload("user1", "/api/uploads/user1/image/a%2F..%2Fb.png"), false);
  assert.equal(isOwnUpload("user1", "https://evil.example/api/uploads/user1/x.png"), false);
});

test("parallel screenshot uploads are queued and all remain readable", async () => {
  const userId = `security-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const root = path.resolve(process.cwd(), "storage");
  const target = path.resolve(root, userId);
  assert.ok(target.startsWith(root + path.sep) && userId.startsWith("security-test-"));
  try {
    const uploaded = await Promise.all(Array.from({ length: 8 }, (_, i) => storage.put(new File([`screen-${i}`], "screen.png", { type: "image/png" }), `${userId}/image`)));
    assert.equal(new Set(uploaded.map((file) => file.key)).size, 8);
    for (let i = 0; i < uploaded.length; i++) assert.equal((await storage.get(uploaded[i].key))?.toString(), `screen-${i}`);
  } finally { await rm(target, { recursive: true, force: true }); }
});

import assert from "node:assert/strict";
import test from "node:test";
import { createR2Store, r2Config } from "./r2";
import { isStorageKey, uploadKey } from "./keys";

const config = { R2_BUCKET_NAME: "test-bucket", R2_ENDPOINT: `https://${"a".repeat(32)}.r2.cloudflarestorage.com`, R2_ACCESS_KEY_ID: "test", R2_SECRET_ACCESS_KEY: "test-only" };

test("R2 configuration is all-or-nothing and only allows Cloudflare HTTPS endpoints", () => {
  assert.equal(r2Config({}), null);
  assert.ok(r2Config(config));
  assert.throws(() => r2Config({ R2_BUCKET_NAME: "test-bucket" }));
  for (const endpoint of ["http://localhost", "https://example.test", `${config.R2_ENDPOINT}/bucket`, `${config.R2_ENDPOINT}?secret=x`]) assert.throws(() => r2Config({ ...config, R2_ENDPOINT: endpoint }));
});

test("storage keys reject traversal, encoded separators and unexpected directories", () => {
  for (const key of ["../.env", "user/image/../../.env", "user/image/a%2Fb.png", "user/other/file.png", "user/image/file.png?share=x", "user/image/a\\b.png"]) assert.equal(isStorageKey(key), false);
  assert.equal(uploadKey("https://example.test/api/uploads/user/image/a.png"), null);
  assert.equal(uploadKey("/api/uploads/user/audio/abc.m4a"), "user/audio/abc.m4a");
});

test("R2 missing keys are distinct from network and permission errors", async () => {
  const store = createR2Store(r2Config(config)!);
  try {
    store.client.send = (async () => { throw Object.assign(new Error(), { name: "NoSuchKey" }); }) as typeof store.client.send;
    assert.equal(await store.get("user/image/a.png"), null);
    store.client.send = (async () => { throw Object.assign(new Error(), { name: "AccessDenied" }); }) as typeof store.client.send;
    await assert.rejects(store.get("user/image/a.png"), { name: "AccessDenied" });
    store.client.send = (async () => { throw new Error("network"); }) as typeof store.client.send;
    await assert.rejects(store.get("user/image/a.png"), /network/);
  } finally { store.client.destroy(); }
});

test("R2 quota listings include every page", async () => {
  const store = createR2Store(r2Config(config)!);
  let calls = 0;
  try {
    store.client.send = (async () => ++calls === 1
      ? { Contents: [{ Key: "user/image/a.png", Size: 3 }], IsTruncated: true, NextContinuationToken: "next" }
      : { Contents: [{ Key: "user/audio/b.mp3", Size: 5 }], IsTruncated: false }) as typeof store.client.send;
    const files = await store.list("user/");
    assert.equal(files.size, 2);
    assert.equal([...files.values()].reduce((a, b) => a + b, 0), 8);
    assert.equal(calls, 2);
  } finally { store.client.destroy(); }
});

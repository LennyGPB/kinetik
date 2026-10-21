import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

test("persistent sessions survive new requests and reject missing, invalid or expired tokens", async () => {
  const require = createRequire(import.meta.url);
  const stored = new Map<string, { id: string; userId: string; expiresAt: Date }>();
  let browserToken: string | undefined;
  let cookieOptions: { expires: Date; httpOnly: boolean; sameSite: string; path: string } | undefined;
  const store = {
    get: () => browserToken ? { value: browserToken } : undefined,
    set: (_name: string, token: string, options: typeof cookieOptions) => { browserToken = token; cookieOptions = options; },
    delete: () => { browserToken = undefined; },
  };
  const db = { session: {
    create: async ({ data }: { data: { tokenHash: string; userId: string; expiresAt: Date } }) => { stored.set(data.tokenHash, { id: "session", userId: data.userId, expiresAt: data.expiresAt }); },
    findUnique: async ({ where }: { where: { tokenHash: string } }) => stored.get(where.tokenHash) ?? null,
    delete: async () => { stored.clear(); },
    deleteMany: async () => { stored.clear(); },
  } };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries({
    "next/headers": { cookies: async () => store, headers: async () => new Headers() },
    "next/server": { connection: async () => {} },
    "../db": { db },
  })) {
    const key = require.resolve(name);
    originals.set(key, require.cache[key]);
    require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module;
  }
  try {
    const { createSession, readSession, destroySession } = require("./session") as typeof import("./session");
    assert.equal(await readSession(), null);
    const before = Date.now();
    await createSession("member");
    assert.ok(cookieOptions);
    assert.ok(cookieOptions.expires.getTime() >= before + 30 * 24 * 60 * 60 * 1000);
    assert.equal(cookieOptions.httpOnly, true);
    assert.equal(cookieOptions.sameSite, "lax");
    assert.equal(cookieOptions.path, "/");
    const token = browserToken;
    assert.ok(token);
    assert.ok(!stored.has(token), "only a hash is stored in the database");
    assert.deepEqual(await readSession(), { sessionId: "session", userId: "member" });
    assert.deepEqual(await readSession(), { sessionId: "session", userId: "member" });
    browserToken = "invalid";
    assert.equal(await readSession(), null);
    browserToken = token;
    stored.values().next().value!.expiresAt = new Date(0);
    assert.equal(await readSession(), null);
    await createSession("member");
    await destroySession();
    assert.equal(browserToken, undefined);
    assert.equal(stored.size, 0);
    assert.equal(await readSession(), null);
  } finally {
    delete require.cache[require.resolve("./session")];
    for (const [key, original] of originals) {
      if (original) require.cache[key] = original;
      else delete require.cache[key];
    }
  }
});

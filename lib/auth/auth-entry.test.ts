import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { authRedirectTarget } from "./constants";

test("auth destinations preserve creation choices and reject external redirects", () => {
  assert.equal(authRedirectTarget(new URLSearchParams()), "/dashboard");
  assert.equal(authRedirectTarget(new URLSearchParams("redirectTo=/fr/project/example")), "/fr/project/example");
  assert.equal(authRedirectTarget(new URLSearchParams("kind=post&style=echo")), "/create?kind=post&style=echo");
  for (const redirectTo of ["https://example.com", "//example.com", "/\\example.com"]) {
    assert.equal(authRedirectTarget(new URLSearchParams({ redirectTo })), "/dashboard");
  }
});

test("valid sessions bypass auth forms, while visitors without a session can log in", async () => {
  const require = createRequire(import.meta.url);
  let signedIn = true;
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries({
    "./dal": { getCurrentUser: async () => signedIn ? { id: "member" } : null },
    "../i18n/redirect": { localizedRedirect: async (href: string) => { throw new Error(`redirect:${href}`); } },
  })) {
    const key = require.resolve(name);
    originals.set(key, require.cache[key]);
    require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module;
  }
  try {
    const { AuthEntry } = require("../../components/auth/auth-entry") as typeof import("../../components/auth/auth-entry");
    await assert.rejects(AuthEntry({ children: "form", searchParams: Promise.resolve({}) }), /redirect:\/dashboard/);
    await assert.rejects(AuthEntry({ children: "form", searchParams: Promise.resolve({ kind: "post", style: "echo" }) }), /redirect:\/create\?kind=post&style=echo/);
    await assert.rejects(AuthEntry({ children: "form", searchParams: Promise.resolve({ redirectTo: "https://example.com" }) }), /redirect:\/dashboard/);
    signedIn = false;
    assert.equal(await AuthEntry({ children: "form", searchParams: Promise.resolve({}) }), "form");
  } finally {
    delete require.cache[require.resolve("../../components/auth/auth-entry")];
    for (const [key, original] of originals) {
      if (original) require.cache[key] = original;
      else delete require.cache[key];
    }
  }
});

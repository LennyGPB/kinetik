import assert from "node:assert/strict";
import test from "node:test";
import { acquireLock, rateLimit, rateLimitAll, releaseLock, resetRateLimit } from "../rate-limit";
import { ipFromHeaders } from "./ip";
import { checkEmailDomain, checkSignupForm, HONEYPOT_FIELD, issueSignupToken } from "./signup-guard";

// Lancer avec : npx tsx --conditions=react-server --test lib/security/security.test.ts (sans Redis : backend mémoire)

test("client IP cannot be spoofed with X-Forwarded-For", () => {
  // Le client écrit « 1.2.3.4 », notre proxy ajoute la vraie IP à la fin
  assert.equal(ipFromHeaders(new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" })), "203.0.113.9");
  // L'en-tête de la plateforme prime
  assert.equal(ipFromHeaders(new Headers({ "x-vercel-forwarded-for": "198.51.100.7", "x-forwarded-for": "1.2.3.4" }), "x-vercel-forwarded-for"), "198.51.100.7");
  assert.equal(ipFromHeaders(new Headers({ "cf-connecting-ip": "198.51.100.8", "x-forwarded-for": "1.2.3.4" }), "cf-connecting-ip"), "198.51.100.8");
  assert.equal(ipFromHeaders(new Headers({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "203.0.113.9" }), "x-forwarded-for"), "203.0.113.9");
  // Valeurs invalides ignorées
  assert.equal(ipFromHeaders(new Headers({ "x-forwarded-for": "not-an-ip" })), "unknown");
});

test("IPv6 addresses are grouped by /64 (no rotating addresses)", () => {
  const a = ipFromHeaders(new Headers({ "x-real-ip": "2001:db8:abcd:12:1::1" }), "x-real-ip");
  const b = ipFromHeaders(new Headers({ "x-real-ip": "2001:0db8:abcd:0012:ffff:ffff:ffff:ffff" }), "x-real-ip");
  assert.equal(a, b);
  assert.equal(a, "2001:db8:abcd:12::/64");
  assert.equal(ipFromHeaders(new Headers({ "x-real-ip": "::ffff:192.0.2.1" }), "x-real-ip"), "192.0.2.1");
});

test("sliding window blocks the request over the limit and tells how long to wait", async () => {
  const rule = { limit: 3, windowMs: 60_000 };
  const key = `test:${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal((await rateLimit(key, rule)).ok, true);
  const blocked = await rateLimit(key, rule);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 60_000);
  await resetRateLimit(key, rule);
  assert.equal((await rateLimit(key, rule)).ok, true);
});

test("a short window does not leak into a long one: every rule counts", async () => {
  const key = `test:${Math.random()}`;
  const perMinute = { limit: 100, windowMs: 60_000 };
  const perHour = { limit: 2, windowMs: 3_600_000 };
  assert.equal((await rateLimitAll([[key, perMinute], [key, perHour]])).ok, true);
  assert.equal((await rateLimitAll([[key, perMinute], [key, perHour]])).ok, true);
  assert.equal((await rateLimitAll([[key, perMinute], [key, perHour]])).ok, false);
});

test("locks are exclusive, expire, and only their owner can release them", async () => {
  const key = `lock:${Math.random()}`;
  // Durées larges : avec Redis distant, chaque appel prend ~150 ms de réseau
  const first = await acquireLock(key, 5000);
  assert.ok(first);
  assert.equal(await acquireLock(key, 5000), null);
  await releaseLock(key, "someone-else");
  assert.equal(await acquireLock(key, 5000), null);
  await releaseLock(key, first);
  assert.ok(await acquireLock(key, 800));
  await new Promise((r) => setTimeout(r, 1100));
  assert.ok(await acquireLock(key, 800), "expired lock can be taken again");
});

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

test("signup: honeypot, forged token and instant submission are rejected", () => {
  const now = Date.now();
  const token = issueSignupToken(now - 10_000);
  assert.deepEqual(checkSignupForm(form({ formToken: token }), now), { ok: true });
  assert.deepEqual(checkSignupForm(form({ formToken: token, [HONEYPOT_FIELD]: "https://spam.example" }), now), { ok: false, reason: "honeypot" });
  assert.deepEqual(checkSignupForm(form({}), now), { ok: false, reason: "token" });
  // Horodatage modifié : la signature ne correspond plus
  const [, nonce, signature] = token.split(".");
  assert.deepEqual(checkSignupForm(form({ formToken: `${now - 99_999}.${nonce}.${signature}` }), now), { ok: false, reason: "token" });
  assert.deepEqual(checkSignupForm(form({ formToken: issueSignupToken(now - 500) }), now), { ok: false, reason: "too_fast" });
  assert.deepEqual(checkSignupForm(form({ formToken: issueSignupToken(now - 3 * 3_600_000) }), now), { ok: false, reason: "expired" });
});

test("signup: disposable email domains (and their subdomains) are rejected", async () => {
  assert.deepEqual(await checkEmailDomain("bot@mailinator.com"), { ok: false, reason: "disposable" });
  assert.deepEqual(await checkEmailDomain("bot@yopmail.com"), { ok: false, reason: "disposable" });
  assert.deepEqual(await checkEmailDomain("bot@abc.10minutemail.com"), { ok: false, reason: "disposable" });
});

test("signup: domains that cannot receive email are rejected, real ones accepted (needs network)", async () => {
  assert.deepEqual(await checkEmailDomain(`x@kinetik-no-mail-${Date.now()}.com`), { ok: false, reason: "no_mx" });
  // example.com publie un MX nul (RFC 7505) : il déclare ne recevoir aucun email
  assert.deepEqual(await checkEmailDomain("x@example.com"), { ok: false, reason: "no_mx" });
  assert.deepEqual(await checkEmailDomain("x@gmail.com"), { ok: true });
});

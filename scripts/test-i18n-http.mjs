import assert from "node:assert/strict";

const base = process.env.I18N_TEST_URL ?? "http://localhost:3102";
let checks = 0;
async function request(path, headers = {}) {
  return fetch(new URL(path, base), { headers, redirect: "manual" });
}
for (const [headers, expected] of [
  [{}, "/en"],
  [{ "accept-language": "fr-FR,fr;q=0.9,en;q=0.8" }, "/fr"],
  [{ "accept-language": "en-US,en;q=0.9" }, "/en"],
  [{ "accept-language": "fr-CA,fr;q=0.9" }, "/fr"],
  [{ "accept-language": "fr-FR", cookie: "KINETIK_LOCALE=en" }, "/en"],
  [{ "accept-language": "en-US", cookie: "KINETIK_LOCALE=fr" }, "/fr"],
]) {
  const response = await request("/", headers);
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), base).pathname, expected);
  checks++;
}
for (const locale of ["en", "fr"]) {
  const response = await request(`/${locale}`, { "accept-language": locale === "en" ? "fr-FR" : "en-US" });
  assert.equal(response.status, 200);
  const html = await response.text();
  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  assert.ok(html.includes(`lang="${locale}"`));
  assert.ok(text.includes(locale === "en" ? "Your app deserves" : "Ton app mérite"));
  assert.ok(html.toLowerCase().includes(`hreflang="en"`) && html.toLowerCase().includes(`hreflang="fr"`) && html.toLowerCase().includes(`hreflang="x-default"`));
  assert.match(html, new RegExp(`rel="canonical"[^>]+/${locale}"`));
  checks++;
  for (const [path, expected] of [["login", locale === "en" ? "Welcome back" : "Bon retour"], ["register", locale === "en" ? "Create your account" : "Crée ton compte"]]) {
    const page = await request(`/${locale}/${path}`);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes(expected));
    checks++;
  }
  const protectedPage = await request(`/${locale}/dashboard`);
  assert.equal(protectedPage.status, 307);
  assert.equal(new URL(protectedPage.headers.get("location"), base).pathname, `/${locale}/login`);
  checks++;
}
const legacyCreate = await request("/create?app=Acme", { "accept-language": "fr-FR" });
assert.equal(new URL(legacyCreate.headers.get("location"), base).pathname, "/fr/create");
assert.equal(new URL(legacyCreate.headers.get("location"), base).search, "?app=Acme");
checks++;
const api = await request("/api/capture");
assert.equal(api.status, 405);
assert.equal(api.headers.get("location"), null);
checks++;
const sitemap = await request("/sitemap.xml");
const xml = await sitemap.text();
assert.equal(sitemap.status, 200);
assert.ok(xml.includes("/en") && xml.includes("/fr"));
checks++;
console.log(`${checks} i18n HTTP checks passed.`);

import assert from "node:assert/strict";
import { test } from "node:test";
import { getDictionary, format, localizeText, locales } from "./index";
import { routing } from "./routing";
import { createAuthSchemas } from "../auth/validation";
import { generateVideo } from "../services/ai-mock";

function leaves(value: unknown, path = ""): Record<string, string> {
  if (typeof value === "string") return { [path]: value };
  if (!value || typeof value !== "object") return {};
  return Object.assign({}, ...Object.entries(value).filter(([key]) => key !== "locale").map(([key, child]) => leaves(child, `${path}.${key}`)));
}

test("both dictionaries cover the same UI and preserve interpolation placeholders", () => {
  const fr = leaves(getDictionary("fr"));
  const en = leaves(getDictionary("en"));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort());
  for (const key of Object.keys(fr)) {
    assert.ok(en[key].trim(), key);
    assert.deepEqual([...en[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), [...fr[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), key);
  }
  assert.deepEqual(locales, ["en", "fr"]);
  assert.equal(routing.defaultLocale, "en");
  assert.equal(format(getDictionary("en").app.create.step, { current: 2, total: 9 }), "Step 2 of 9");
});

test("configuration labels and authentication errors follow the chosen language", () => {
  assert.equal(localizeText("Présentation de l’app", getDictionary("en")), "App overview");
  assert.equal(localizeText("Présentation de l’app", getDictionary("fr")), "Présentation de l’app");
  for (const locale of locales) {
    const dictionary = getDictionary(locale);
    const result = createAuthSchemas(dictionary).registerSchema.safeParse({ name: "", email: "invalid", password: "short" });
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error.issues[0].message, dictionary.auth.errors.nameRequired);
  }
});

test("initial video copy is generated in French or English for every video type", async () => {
  await Promise.all(locales.flatMap((locale) => ["presentation", "demo", "feature", "teaser"].map(async (videoType) => {
    const graph = await generateVideo({ appName: "Acme", duration: 15, locale, videoType });
    assert.equal(graph.scenes.at(-1)?.title, locale === "en" ? "Try Acme" : "Essaie Acme");
    const titles = graph.scenes.map((scene) => scene.title).join(" ");
    if (locale === "en") assert.doesNotMatch(titles, /Voici|Tout au même|Pensé|Essaie|essentiel/);
    else assert.doesNotMatch(titles, /Meet|Everything|Built for|Try Acme/);
  })));
});

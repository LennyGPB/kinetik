import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getDictionary } from "../../lib/i18n";
import { UrlAnalysisSchema } from "../../lib/url-video/model";
import { reviewFromAnalysis } from "../../lib/url-video/flow";
import { MUSIC_LIBRARY } from "../../config/music";

test("guided URL screens separate source, template, message and assets with an optional audio upload", () => {
  const require = createRequire(path.join(process.cwd(), "components/create/url-video-ui.test.ts"));
  const mocks = {
    "../../lib/i18n/use-dictionary": { useDictionary: () => getDictionary("fr") },
    "../templates/templates-gallery": { TemplatesGallery: () => createElement("div", null, "Template gallery") },
    "../media/video-placeholder": { VideoPlaceholder: () => null },
    "../ui/dialog": { Dialog: () => null },
    "../ui/toaster": { useToast: () => () => {} },
    "../../remotion/video/KinetikVideo": { KinetikVideo: () => null },
  };
  const originals = new Map<string, NodeJS.Module | undefined>();
  for (const [name, exports] of Object.entries(mocks)) { const key = require.resolve(name); originals.set(key, require.cache[key]); require.cache[key] = { id: key, filename: key, loaded: true, exports } as NodeJS.Module; }
  try {
    const { UrlSourceStep, UrlTemplateStep, UrlMessageStep, UrlAssetsStep } = require("./url-video-steps");
    const { UrlVideoCreate } = require("./url-video-create");
    const initial = renderToStaticMarkup(createElement(UrlVideoCreate, { balance: 100 }));
    assert.match(initial, /Site &amp; son/); assert.match(initial, /Template/);
    assert.match(initial, /Ta musique/); assert.doesNotMatch(initial, /Les trois bénéfices/);
    assert.ok(initial.indexOf('id="product-url"') < initial.indexOf('name="url-music-track"'));
    assert.match(initial, /BPM/);
    const music = { url: "/api/uploads/owner/audio/music.mp3", fileName: "my-sound.mp3", mimeType: "audio/mpeg", sizeBytes: 100 };
    const preferences = { templateId: null, music };
    const source = renderToStaticMarkup(createElement(UrlSourceStep, { locale: "fr", url: "https://example.com", preferences, onUrl() {}, onPreferences() {}, onUploading() {}, disabled: false }));
    assert.match(source, /<audio[^>]*controls/); assert.match(source, /my-sound.mp3/);
    const library = renderToStaticMarkup(createElement(UrlSourceStep, { locale: "fr", url: "https://example.com", preferences: { templateId: null, music: null, musicTrackId: MUSIC_LIBRARY[0].id }, onUrl() {}, onPreferences() {}, onUploading() {}, disabled: false }));
    assert.ok(library.includes(MUSIC_LIBRARY[0].src));
    const template = (manual: boolean) => renderToStaticMarkup(createElement(UrlTemplateStep, { locale: "fr", preferences, manual, onManual() {}, onPreferences() {}, analysis: null }));
    assert.match(template(false), /Laisser l’IA choisir/); assert.doesNotMatch(template(false), /Template gallery/);
    assert.match(template(true), /Template gallery/);
    const file = { url: "/api/uploads/owner/image/screen.png", fileName: "screen.png", mimeType: "image/png", sizeBytes: 100, label: "Product", source: "https://example.com", format: "app" };
    const analysis = UrlAnalysisSchema.parse({ url: "https://example.com", locale: "fr", screens: [file], logo: null, colors: ["#111111"], pages: [], stores: [], brief: { company: "Example", product: "A long product description that stays fully readable", audience: "Teams", benefits: ["One benefit", "Second benefit", "Third benefit"], hooks: ["One", "Two", "Three"], tone: "professional", styles: ["veil", "power", "folio"], headingFont: "Inter", bodyFont: "Inter", fontNote: "Observed", warnings: [] } });
    const review = reviewFromAnalysis("analysis", analysis);
    const message = renderToStaticMarkup(createElement(UrlMessageStep, { locale: "fr", review, onChange() {} }));
    assert.match(message, /A long product description that stays fully readable/);
    assert.match(message, /<textarea/); assert.doesNotMatch(message, /type="color"/);
    const assets = renderToStaticMarkup(createElement(UrlAssetsStep, { locale: "fr", review, analysis, onChange() {}, onAddScreens() {}, onLogoUpload() {}, uploading: false, onUploading() {} }));
    assert.match(assets, /type="color"/); assert.match(assets, /Ajuster les polices/);
    assert.doesNotMatch(assets, /A long product description/);
  } finally { for (const [key, original] of originals) { if (original) require.cache[key] = original; else delete require.cache[key]; } }
});

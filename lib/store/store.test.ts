import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { STORE_LAYOUTS, STORE_SIZES, STORE_TEMPLATES } from "../../config/store-templates";
import { getStoreExportCost, getStoreGenerationCost } from "../../config/credits";
import { StoreDocumentSchema, applyStoreTemplate, demoStore, draftStore, newStorePage, pageScreens, remapStoreScreens } from "./document";
import { STORE_COLLECTION } from "../../config/store-collection";
import { storeBannerSvg, storeSvg } from "./svg";
import { imageZip } from "../posts/zip";

test("every template ships a valid 6-screenshot demo, 4+ of them with phones", () => {
  for (const template of STORE_TEMPLATES) {
    const doc = StoreDocumentSchema.parse(demoStore(template.id, "fr"));
    assert.equal(doc.pages.length, 6);
    assert.ok(doc.pages.filter((page) => page.layout === "device" || page.layout === "duo").length >= 4);
  }
});

test("drafts assign uploaded screenshots in order and never point past the library", () => {
  let id = 0;
  const doc = draftStore("store-bold", "en", "Acme", 2, () => `p${id++}`);
  const used = doc.pages.flatMap((page) => [page.screen, page.screen2]).filter((index) => index !== null);
  assert.ok(used.length > 0 && used.every((index) => index! < 2));
  assert.equal(doc.banner.title, "Acme");
  const empty = draftStore("store-bold", "en", "Acme", 0, () => `q${id++}`);
  assert.ok(empty.pages.every((page) => page.screen === null && page.screen2 === null));
});

test("Android reuses iPhone screens unless overridden, and remapping follows the files", () => {
  const page = newStorePage("a", "duo", "fr", 3);
  assert.deepEqual(pageScreens(page, "android"), [page.screen, page.screen2]);
  assert.deepEqual(pageScreens({ ...page, android: { screen: 2, screen2: null } }, "android"), [2, null]);
  const doc = { ...demoStore("store-clean", "fr"), pages: [{ ...page, screen: 0, screen2: 1, android: { screen: 1, screen2: 0 } }] };
  const next = remapStoreScreens(doc, ["/a", "/b"], ["/b"]);
  assert.deepEqual([next.pages[0].screen, next.pages[0].screen2, next.pages[0].android], [null, 0, { screen: 0, screen2: null }]);
});

test("each page renders at the exact store sizes, opaque, for every template and layout", async () => {
  for (const template of STORE_TEMPLATES) {
    const doc = { ...demoStore(template.id, "en"), pages: STORE_LAYOUTS.map((layout, i) => newStorePage(`x${i}`, layout, "en")) };
    for (const platform of ["ios", "android"] as const) for (let i = 0; i < doc.pages.length; i++) {
      const png = await sharp(Buffer.from(storeSvg(doc, i, platform))).flatten({ background: doc.colors[0] }).png().toBuffer();
      const meta = await sharp(png).metadata();
      assert.deepEqual([meta.width, meta.height, meta.hasAlpha], [STORE_SIZES[platform].width, STORE_SIZES[platform].height, false]);
    }
    const banner = await sharp(Buffer.from(storeBannerSvg(doc))).metadata();
    assert.deepEqual([banner.width, banner.height], [1024, 500]);
  }
});

test("user text and unsafe image URLs never reach the SVG as markup", () => {
  const doc = demoStore("store-midnight", "fr");
  doc.pages[1] = { ...doc.pages[1], title: '<script>alert("x")</script>', subtitle: "&<>", screen: 0 };
  const svg = storeSvg(doc, 1, "ios", { screenUrls: ['javascript:alert(1)'], logoUrl: "https://evil.example/x.png" });
  assert.ok(!svg.includes("<script") && !svg.includes("javascript:") && !svg.includes("evil.example"));
  assert.ok(storeSvg(doc, 1, "ios", { screenUrls: ["/api/uploads/u1/image/a.png"] }).includes('href="/api/uploads/u1/image/a.png"'));
});

test("new Store art directions preserve edited content and uploaded screens when applied", () => {
  const original = demoStore("store-clean", "fr", "Mon app");
  original.pages[1] = { ...original.pages[1], title: "Une fonction personnalisée", screen: 2, android: { screen: 3, screen2: null } };
  assert.equal(STORE_COLLECTION.length, 10);
  assert.equal(new Set(STORE_TEMPLATES.map(item => item.id)).size, STORE_TEMPLATES.length);
  for (const template of STORE_COLLECTION) {
    const doc = StoreDocumentSchema.parse(applyStoreTemplate(original, template.id));
    assert.deepEqual(doc.pages, original.pages);
    assert.deepEqual(doc.banner, original.banner);
    const urls = [0, 1, 2, 3].map(i => `/api/uploads/u1/image/screen${i}.png`);
    for (const platform of ["ios", "android"] as const) {
      const svg = storeSvg(doc, 1, platform, { screenUrls: urls, uid: template.id });
      assert.ok(svg.includes(urls[platform === "ios" ? 2 : 3]), template.name);
      assert.ok(!/NaN|Infinity|undefined/.test(svg), template.name);
      assert.equal(svg, storeSvg(doc, 1, platform, { screenUrls: urls, uid: template.id }));
    }
  }
});

test("credits and archive bounds", () => {
  assert.equal(getStoreGenerationCost(6), 9);
  assert.equal(getStoreExportCost(6), 6);
  assert.equal(getStoreExportCost(6, true), 3);
  assert.throws(() => getStoreExportCost(9));
  const zip = imageZip(Array.from({ length: 17 }, (_, i) => ({ name: i < 8 ? `iPhone/${i}.png` : `Android/${i}.png`, data: Buffer.from([i]) })), 17);
  assert.ok(zip.includes(Buffer.from("iPhone/0.png")) && zip.includes(Buffer.from("Android/16.png")));
  assert.throws(() => imageZip(Array.from({ length: 6 }, () => ({ name: "a", data: Buffer.from([1]) }))));
});

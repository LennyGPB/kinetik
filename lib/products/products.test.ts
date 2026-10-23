import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareProductImage } from "./prepare";
import { productFromHtml } from "./extract";
import { PhysicalProductSchema, physicalProductGraph, type PhysicalProductInput } from "./model";
import { PRODUCT_TEMPLATES } from "../../config/physical-product";
import { getTrack, MUSIC_LIBRARY } from "../../config/music";
import { durationInFrames } from "../../remotion/props";

const photo = { url: "/api/uploads/owner/image/product.png", fileName: "product.png", mimeType: "image/png", sizeBytes: 100 };
const input: PhysicalProductInput = { requestId: "00000000-0000-4000-8000-000000000000", name: "Actual product", hook: "Exact user hook", benefits: ["Actual benefit", "Second benefit"], cta: "Discover", price: "49 EUR", websiteUrl: "https://example.com/product", templateId: "product-studio", images: [photo], originals: [photo], logo: null, colors: [...PRODUCT_TEMPLATES[0].palette], format: "PORTRAIT", duration: 15, locale: "en", music: null, musicTrackId: MUSIC_LIBRARY[0].id };

test("physical templates retain exact claims, price, images, music and duration", () => {
  for (const template of PRODUCT_TEMPLATES) {
    const graph = physicalProductGraph(PhysicalProductSchema.parse({ ...input, templateId: template.id }));
    assert.equal(graph.styleId, template.id);
    assert.deepEqual(graph.scenes.map((scene) => scene.title), [input.hook, ...input.benefits, input.cta]);
    assert.equal(graph.scenes.at(-1)?.subtitle, input.price);
    assert.equal(graph.screenFrame, "none");
    assert.ok(graph.scenes.every((scene) => scene.screens?.[0] === photo.url));
    assert.equal(durationInFrames(graph), 450);
    assert.equal(graph.bpm, getTrack(input.musicTrackId)!.bpm);
  }
  const uploaded = physicalProductGraph({ ...input, music: { ...photo, url: "/api/uploads/owner/audio/track.mp3", mimeType: "audio/mpeg", bpm: 112 } });
  assert.equal(uploaded.musicTrackId, null); assert.equal(uploaded.bpm, 112);
  assert.equal(PhysicalProductSchema.safeParse({ ...input, images: [{ ...photo, url: "https://example.com/image.png" }] }).success, false);
  assert.equal(PhysicalProductSchema.safeParse({ ...input, templateId: "stage" }).success, false);
  assert.equal(PhysicalProductSchema.safeParse({ ...input, musicTrackId: "invented" }).success, false);
});

test("product import uses Product JSON-LD and never invents pricing or fetches data URLs", () => {
  const product = productFromHtml(`<script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": "WebSite", name: "Wrong" }, { "@type": "Product", name: "Real &amp; honest", description: "<b>Real</b> product", image: ["/main.png", "/main.png", "data:image/png,invalid", { url: "/side.png" }], offers: { price: "49.00", priceCurrency: "EUR" } }] })}</script>`, "https://example.com/item");
  assert.equal(product.name, "Real & honest"); assert.equal(product.description, "Real product");
  assert.deepEqual(product.images, ["https://example.com/main.png", "https://example.com/side.png"]);
  assert.equal(product.price, "49.00 EUR");
  assert.throws(() => productFromHtml('<script type="application/ld+json">{"@type":"WebSite"}</script>', "https://example.com"), /product_not_found/);
});

test("preparation removes only the border-connected plain background and retains label pixels", async () => {
  const width = 200, height = 200, data = Buffer.alloc(width * height * 4, 255);
  for (let y = 50; y < 150; y++) for (let x = 60; x < 140; x++) { const p = (y * width + x) * 4; data[p] = 180; data[p + 1] = 50; data[p + 2] = 20; }
  // White label enclosed by the product must not be mistaken for its background.
  for (let y = 80; y < 100; y++) for (let x = 80; x < 120; x++) { const p = (y * width + x) * 4; data[p] = data[p + 1] = data[p + 2] = 255; }
  const file = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const result = await prepareProductImage(file);
  assert.equal(result.status, "removed"); assert.equal(result.small, true);
  const pixels = await sharp(result.data).raw().ensureAlpha().toBuffer();
  assert.ok(pixels.some((_, i) => i % 4 === 3 && pixels[i] === 0));
  assert.ok(pixels.some((_, i) => i % 4 === 0 && pixels[i] === 255 && pixels[i + 1] === 255 && pixels[i + 2] === 255 && pixels[i + 3] === 255));
});

test("transparent inputs keep their alpha; complex backgrounds keep the original pixels", async () => {
  const transparent = await sharp({ create: { width: 80, height: 100, channels: 4, background: "#00000000" } }).composite([{ input: await sharp({ create: { width: 40, height: 50, channels: 4, background: "#003366" } }).png().toBuffer(), left: 20, top: 25 }]).png().toBuffer();
  assert.equal((await prepareProductImage(transparent)).status, "transparent");
  const mixed = await sharp({ create: { width: 100, height: 100, channels: 4, background: "#ffffff" } }).composite([{ input: await sharp({ create: { width: 50, height: 100, channels: 4, background: "#003366" } }).png().toBuffer(), left: 0, top: 0 }]).png().toBuffer();
  const result = await prepareProductImage(mixed); assert.equal(result.status, "original");
  const rgba = await sharp(result.data).ensureAlpha().raw().toBuffer();
  assert.equal(rgba.filter((value, index) => index % 4 === 3 && value === 255).length, 10_000);
});

import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { getPostGenerationCost, getPostExportCost, CREDIT_COSTS, getExportCost } from "@/config/credits";
import { POST_TEMPLATES, POST_FORMATS, isPhotoTemplate, getPostTemplate } from "@/config/post-templates";
import { PostDocumentSchema, demoPost, newPostPage } from "./document";
import { CreatePostSchema } from "./validation";
import { postSvg } from "./svg";
import { imageZip } from "./zip";

test("post credit totals for 1–5 images, repeat exports, and invalid counts", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(getPostGenerationCost), [4, 5, 6, 7, 8]);
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => getPostExportCost(n)), [1, 2, 3, 4, 5]);
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => getPostExportCost(n, true)), [1, 1, 2, 2, 3]);
  assert.ok(CREDIT_COSTS.post.edit < getPostGenerationCost(1));
  for (const n of [0, -1, 6, 1.5, NaN, Infinity]) {
    assert.throws(() => getPostGenerationCost(n)); assert.throws(() => getPostExportCost(n));
  }
  assert.equal(getExportCost({ duration: 30 }), 5);
  assert.equal(getExportCost({ duration: 31, reexport: true }), 5);
});

test("server document and creation validation enforce page bounds, uniqueness, and supported continuity", () => {
  const doc = demoPost("post-orbit");
  assert.ok(PostDocumentSchema.safeParse(doc).success);
  for (const pages of [[], Array.from({ length: 6 }, (_, i) => newPostPage(String(i))), [doc.pages[0], doc.pages[0]]]) assert.equal(PostDocumentSchema.safeParse({ ...doc, pages }).success, false);
  assert.equal(PostDocumentSchema.safeParse({ ...doc, templateId: "post-editorial", linked: true }).success, false);
  assert.equal(PostDocumentSchema.safeParse({ ...doc, colors: ["red", "#ffffff", "#000000"] }).success, false);
  const input = { requestId: "d0794f7d-07e6-40e9-8d25-6322ca79b253", appName: "Demo", locale: "fr", brief: "Une annonce de produit", templateId: "post-orbit", format: "FEED", pageCount: 5, colors: doc.colors, logo: null, screens: [] };
  assert.ok(CreatePostSchema.safeParse(input).success);
  for (const pageCount of [0, 6, 1.5]) assert.equal(CreatePostSchema.safeParse({ ...input, pageCount }).success, false);
});

test("SVG escapes user copy and rejects active/external image URLs", () => {
  const doc = demoPost("post-editorial");
  doc.pages[0].title = '<script>alert("x")</script>';
  doc.pages[0].imageIndex = 0; doc.pages[0].layout = "image";
  const svg = postSvg(doc, 0, { appName: "<bad>", logoUrl: "javascript:alert(1)", screenUrls: ["https://example.org/tracker.svg"] });
  assert.ok(!svg.includes("<script>")); assert.ok(svg.includes("&lt;script&gt;"));
  assert.ok(!svg.includes("javascript:")); assert.ok(!svg.includes("https://example.org"));
});

test("raster exports embed the actual image and logo without fetching remote resources", async () => {
  const png = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#ff0000" } }).png().toBuffer();
  const uri = `data:image/png;base64,${png.toString("base64")}`;
  const doc = demoPost("post-editorial");
  doc.pages[0].layout = "image"; doc.pages[0].imageIndex = 0;
  const { data, info } = await sharp(Buffer.from(postSvg(doc, 0, { logoUrl: uri, screenUrls: [uri] }))).raw().toBuffer({ resolveWithObject: true });
  const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
  assert.deepEqual(pixel(100, 90), [255, 0, 0]);
  assert.deepEqual(pixel(540, 900), [255, 0, 0]);
});

test("professional templates accept editable copy and images in both interface languages", () => {
  const uri = "data:image/png;base64,aGVsbG8=";
  for (const template of POST_TEMPLATES.filter((template) => ["swiss", "studio", "ledger", "frame", "outline", "continuum"].includes(template.layout))) for (const locale of ["fr", "en"] as const) {
    const doc = demoPost(template.id, locale);
    assert.ok(PostDocumentSchema.safeParse(doc).success, template.id);
    doc.pages[0] = { ...doc.pages[0], layout: "image", imageIndex: 0, title: '<script>alert("x")</script>' };
    const svg = postSvg(doc, 0, { logoUrl: "javascript:alert(1)", screenUrls: [uri] });
    assert.ok(svg.includes(`href="${uri}"`), template.id);
    assert.ok(!svg.includes("<script>")); assert.ok(!svg.includes("javascript:"));
    doc.pages[0].title = "W".repeat(100);
    doc.pages[0].body = "Lorem ipsum ".repeat(23).slice(0, 280);
    assert.ok(!postSvg(doc, 0).includes("…"), template.id);
  }
});

test("linked pages match crops of one continuous panorama at every boundary", async () => {
  for (const id of POST_TEMPLATES.filter((template) => template.linked && !isPhotoTemplate(template.id)).map((template) => template.id)) {
    const doc = demoPost(id);
    doc.pages = Array.from({ length: 5 }, (_, i) => newPostPage(String(i)));
    const images = await Promise.all(doc.pages.map((_, i) => sharp(Buffer.from(postSvg(doc, i))).raw().toBuffer({ resolveWithObject: true })));
    const panoramaSvg = postSvg(doc, 0).replace('width="1080" height="1350" viewBox="0 0 1080 1350"', 'width="5400" height="1350" viewBox="0 0 5400 1350"').replace('<rect width="1080"', '<rect width="5400"');
    const panorama = await sharp(Buffer.from(panoramaSvg)).raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < 4; i++) {
      const a = images[i]; const b = images[i + 1];
      let maxDifference = 0;
      // Compare exact positions with the unsliced panorama, rather than adjacent antialiased pixels.
      for (let y = 720; y < 1250; y++) for (let c = 0; c < 3; c++) {
        const left = a.data[(y * 1080 + 1079) * a.info.channels + c];
        const right = b.data[y * 1080 * b.info.channels + c];
        const expectedLeft = panorama.data[(y * 5400 + i * 1080 + 1079) * panorama.info.channels + c];
        const expectedRight = panorama.data[(y * 5400 + (i + 1) * 1080) * panorama.info.channels + c];
        maxDifference = Math.max(maxDifference, Math.abs(left - expectedLeft), Math.abs(right - expectedRight));
      }
      assert.ok(maxDifference <= 16, `${id} boundary ${i}: ${maxDifference}`);
    }
  }
});

test("retired templates leave the catalogue while existing documents remain renderable", () => {
  for (const id of ["post-studio", "post-signal", "post-paper"]) {
    assert.ok(!POST_TEMPLATES.some((template) => template.id === id));
    assert.ok(getPostTemplate(id));
    const doc = demoPost(id);
    assert.ok(PostDocumentSchema.safeParse(doc).success);
    assert.ok(postSvg(doc, 0).startsWith("<svg"));
  }
});

test("all templates rasterize at every export ratio and ZIP contains numbered files", async () => {
  const previews: { input: Buffer; left: number; top: number }[] = [];
  for (const [column, template] of POST_TEMPLATES.entries()) {
    for (const format of Object.keys(POST_FORMATS) as (keyof typeof POST_FORMATS)[]) {
      const doc = { ...demoPost(template.id), format };
      const png = await sharp(Buffer.from(postSvg(doc, 0))).png().toBuffer();
      const meta = await sharp(png).metadata();
      assert.equal(meta.width, POST_FORMATS[format].width); assert.equal(meta.height, POST_FORMATS[format].height);
      if (format === "FEED") for (let row = 0; row < 3; row++) previews.push({ input: await sharp(Buffer.from(postSvg(doc, row))).resize(270, 338).png().toBuffer(), left: column * 270, top: row * 338 });
    }
  }
  const zip = imageZip([{ name: "01.png", data: Buffer.from("first") }, { name: "02.jpg", data: Buffer.from("second") }]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
  assert.equal(zip.readUInt16LE(zip.length - 12), 2);
  assert.ok(zip.includes(Buffer.from("01.png"))); assert.ok(zip.includes(Buffer.from("02.jpg")));
  assert.equal(imageZip([{ name: "01.png", data: Buffer.from("123456789") }]).readUInt32LE(14), 0xcbf43926);
  await mkdir("out", { recursive: true });
  await writeFile("out/posts-preview.png", await sharp({ create: { width: POST_TEMPLATES.length * 270, height: 1014, channels: 4, background: "#ffffff" } }).composite(previews).png().toBuffer());
  const professional = POST_TEMPLATES.filter((template) => ["swiss", "studio", "ledger", "frame", "outline", "continuum"].includes(template.layout));
  const sheet = await Promise.all(professional.map(async (template, i) => ({ input: await sharp(Buffer.from(postSvg(demoPost(template.id), 0))).resize(360, 450).png().toBuffer(), left: i % 3 * 360, top: Math.floor(i / 3) * 450 })));
  await writeFile("out/posts-professional.png", await sharp({ create: { width: 1080, height: 900, channels: 4, background: "#ffffff" } }).composite(sheet).png().toBuffer());
});

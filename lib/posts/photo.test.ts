import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { POST_TEMPLATES, POST_FORMATS, isPhotoTemplate, POST_FILTERS, matchesPostFilter } from "@/config/post-templates";
import { demoPost, PostDocumentSchema, remapPostImages, applyPostTemplate } from "./document";
import { postSvg } from "./svg";
import { PHOTO_DEMOS } from "./photo-svg";
import demoRatios from "./demo-ratios.json";
import { isCampaignPost, CAMPAIGN_POST_TEMPLATES } from "@/config/post-campaigns";

test("Instagram filters include the two Kinetik styles and correctly count linked carousels", () => {
  assert.equal(POST_TEMPLATES.filter((template) => matchesPostFilter(template, "kinetik")).length, 2);
  assert.deepEqual(POST_TEMPLATES.filter((template) => matchesPostFilter(template, "linked")), POST_TEMPLATES.filter((template) => template.linked));
  assert.equal(POST_TEMPLATES.filter((template) => matchesPostFilter(template, "all")).length, POST_TEMPLATES.length);
  for (const filter of POST_FILTERS) assert.ok(POST_TEMPLATES.some((template) => matchesPostFilter(template, filter)));
});

test("campaign collection adds forty-eight distinct editable templates", () => {
  assert.equal(CAMPAIGN_POST_TEMPLATES.length, 49);
  assert.equal(new Set(CAMPAIGN_POST_TEMPLATES.map((template) => template.layout)).size, 49);
  for (const template of CAMPAIGN_POST_TEMPLATES) {
    assert.ok(POST_TEMPLATES.some((item) => item.id === template.id));
    const doc = applyPostTemplate(demoPost("post-portrait"), template.id, "fr", 1);
    assert.equal(doc.pages[0].imageIndex, 0);
    assert.equal(doc.pages[0].imageFit, "cover");
    assert.ok(PostDocumentSchema.safeParse(doc).success);
  }
});

test("photo templates have valid translated defaults and replacement media never use demo imagery", () => {
  for (const template of POST_TEMPLATES.filter((template) => isPhotoTemplate(template.id))) for (const locale of ["fr", "en"] as const) {
    const doc = demoPost(template.id, locale); assert.ok(PostDocumentSchema.safeParse(doc).success, template.id);
    const demo = postSvg(doc, 0, { demo: true }); assert.ok(demo.includes("/post-demos/"), template.id);
    const production = postSvg(doc, 0); assert.ok(!production.includes("/post-demos/"), template.id);
    doc.pages[0].imageIndex = 0;
    if (doc.pages[0].members) doc.pages[0].members[0].imageIndex = 0;
    const actual = postSvg(doc, 0, { screenUrls: ["/api/uploads/owner/image/photo.jpg"], screenRatios: [0.75] });
    assert.ok(actual.includes("/api/uploads/owner/image/photo.jpg"));
    assert.ok(!actual.includes("/post-demos/"));
    const hostile = postSvg(doc, 0, { screenUrls: ["https://example.org/private.svg"] }); assert.ok(!hostile.includes("https://example.org"));
  }
});

test("photo framing and member image references are bounded and survive library reordering", () => {
  const doc = demoPost("post-team-board");
  doc.pages[0].imageIndex = 1; doc.pages[0].members![0].imageIndex = 0; doc.pages[0].members![1].imageIndex = 1;
  const remapped = remapPostImages(doc, ["a", "b"], ["b", "a"]);
  assert.equal(remapped.pages[0].imageIndex, 0); assert.equal(remapped.pages[0].members![0].imageIndex, 1);
  assert.equal(remapPostImages(doc, ["a", "b"], ["a"]).pages[0].members![1].imageIndex, null);
  assert.equal(doc.pages[0].imageIndex, 1);
  for (const change of [{ imageZoom: 4 }, { imageX: -1 }, { imageY: 101 }, { imageOverlay: 1 }, { members: Array(7).fill({ name: "", role: "", imageIndex: null }) }]) assert.equal(PostDocumentSchema.safeParse({ ...doc, pages: [{ ...doc.pages[0], ...change }] }).success, false);
  const changed = applyPostTemplate(demoPost("post-swiss"), "post-team-board", "fr", 6);
  assert.equal(changed.pages[0].title, demoPost("post-swiss").pages[0].title);
  assert.deepEqual(changed.pages[0].members?.map((member) => member.imageIndex), [0, 1, 2, 3, 4, 5]);
});

test("focal-point changes select the requested part of a replacement image", async () => {
  const red = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#ff0000" } }).png().toBuffer();
  const blue = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#0000ff" } }).png().toBuffer();
  const source = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#ffffff" } }).composite([{ input: red, left: 0, top: 0 }, { input: blue, left: 100, top: 0 }]).png().toBuffer();
  const doc = demoPost("post-portrait"); doc.format = "SQUARE"; doc.pages[0].imageIndex = 0; doc.pages[0].imageOverlay = 0;
  const media = { screenUrls: [`data:image/png;base64,${source.toString("base64")}`], screenRatios: [2] };
  const sample = async (x: number) => { doc.pages[0].imageX = x; const { data, info } = await sharp(Buffer.from(postSvg(doc, 0, media))).raw().toBuffer({ resolveWithObject: true }); const offset = (600 * 1080 + 540) * info.channels; return [...data.subarray(offset, offset + 3)]; };
  const left = await sample(0); const right = await sample(100);
  assert.ok(left[0] > left[2] + 100); assert.ok(right[2] > right[0] + 100);
});

test("photo compositions rasterize with real replacement photos at every ratio", async () => {
  const panels: { input: Buffer; left: number; top: number }[] = [];
  const campaigns: { input: Buffer; left: number; top: number }[] = [];
  const photoTemplates = POST_TEMPLATES.filter((template) => isPhotoTemplate(template.id));
  for (const [i, template] of photoTemplates.entries()) {
    const doc = demoPost(template.id);
    const urls = template.layout === "team-board" ? Array.from({ length: 6 }, (_, j) => `/post-demos/portrait-${j + 1}.jpg`) : [PHOTO_DEMOS[template.id]];
    const screenUrls = await Promise.all(urls.map(async (url) => `data:image/png;base64,${(await sharp(await readFile(`public${url}`)).png().toBuffer()).toString("base64")}`));
    const media = { screenUrls, screenRatios: urls.map((url) => (demoRatios as Record<string, number>)[url]) };
    doc.pages.forEach((page) => { page.imageIndex = 0; page.members?.forEach((member, index) => { member.imageIndex = index; }); });
    for (const format of Object.keys(POST_FORMATS) as (keyof typeof POST_FORMATS)[]) {
      const png = await sharp(Buffer.from(postSvg({ ...doc, format }, 0, media))).png().toBuffer();
      const meta = await sharp(png).metadata(); assert.equal(meta.width, POST_FORMATS[format].width); assert.equal(meta.height, POST_FORMATS[format].height);
      if (format === "FEED") {
        const input = await sharp(png).resize(360, 450).toBuffer();
        panels.push({ input, left: i % 3 * 360, top: Math.floor(i / 3) * 450 });
        if (isCampaignPost(template.id)) { const j = CAMPAIGN_POST_TEMPLATES.findIndex((item) => item.id === template.id); campaigns.push({ input, left: j % 5 * 360, top: Math.floor(j / 5) * 450 }); }
      }
    }
  }
  await mkdir("out", { recursive: true });
  await writeFile("out/posts-photo-collection.png", await sharp({ create: { width: 1080, height: Math.ceil(photoTemplates.length / 3) * 450, channels: 4, background: "#eeeeee" } }).composite(panels).png().toBuffer());
  await writeFile("out/posts-campaign-collection.png", await sharp({ create: { width: 1800, height: Math.ceil(CAMPAIGN_POST_TEMPLATES.length / 5) * 450, channels: 4, background: "#eeeeee" } }).composite(campaigns).png().toBuffer());
});

import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { EDITORIAL_POST_TEMPLATES, EDITORIAL_DEMO_PHOTOS } from "@/config/post-editorial-collection";
import { POST_FORMATS, POST_TEMPLATES, matchesPostFilter } from "@/config/post-templates";
import { demoPost, applyPostTemplate, PostDocumentSchema } from "./document";
import { postSvg } from "./svg";

test("ten editorial templates are discoverable, localized and editable without discarding copy", () => {
  assert.equal(EDITORIAL_POST_TEMPLATES.length, 10);
  assert.equal(new Set(POST_TEMPLATES.map((template) => template.id)).size, POST_TEMPLATES.length);
  for (const template of EDITORIAL_POST_TEMPLATES) for (const locale of ["fr", "en"] as const) {
    const demo = demoPost(template.id, locale);
    assert.ok(PostDocumentSchema.safeParse(demo).success, template.id);
    assert.ok(POST_TEMPLATES.some((item) => item.id === template.id));
    assert.ok(matchesPostFilter(template, "photo") || matchesPostFilter(template, "typography"));
    assert.equal(demo.pages.length, 3);
    const existing = demoPost("post-portrait", locale);
    existing.pages[0].title = "My existing content";
    const changed = applyPostTemplate(existing, template.id, locale, 2);
    assert.equal(changed.pages[0].title, "My existing content");
    assert.equal(changed.pages[0].imageIndex, 0);
    assert.ok(PostDocumentSchema.safeParse(changed).success);
  }
});

test("all thirty compositions rasterize across feed, square and story with real replacement media", async () => {
  const sheets: Record<string, { input: Buffer; left: number; top: number }[]> = { FEED: [], SQUARE: [], STORY: [] };
  const pages: { input: Buffer; left: number; top: number }[] = [];
  for (const [i, template] of EDITORIAL_POST_TEMPLATES.entries()) {
    const photo = await sharp(await readFile(`public${EDITORIAL_DEMO_PHOTOS[template.id]}`)).png().toBuffer({ resolveWithObject: true });
    const doc = demoPost(template.id);
    doc.pages.forEach((page) => { page.imageIndex = 0; });
    const media = { screenUrls: [`data:image/png;base64,${photo.data.toString("base64")}`], screenRatios: [photo.info.width / photo.info.height] };
    for (const format of Object.keys(POST_FORMATS) as (keyof typeof POST_FORMATS)[]) {
      for (let index = 0; index < 3; index++) {
        const svg = postSvg({ ...doc, format }, index, media);
        assert.ok(!/(?:transform|x|y|width|height|fill)="[^"]*(?:NaN|undefined)/.test(svg), `${template.id}/${format}/${index}`);
        const png = await sharp(Buffer.from(svg)).png().toBuffer();
        const meta = await sharp(png).metadata();
        assert.equal(meta.width, POST_FORMATS[format].width);
        assert.equal(meta.height, POST_FORMATS[format].height);
        if (index === 0) sheets[format].push({ input: await sharp(png).resize({ width: 270 }).toBuffer(), left: i % 5 * 270, top: Math.floor(i / 5) * Math.round(270 * POST_FORMATS[format].height / 1080) });
        if (format === "FEED") pages.push({ input: await sharp(png).resize(216, 270).toBuffer(), left: index * 216, top: i * 270 });
      }
    }
  }
  await mkdir("out", { recursive: true });
  for (const format of Object.keys(POST_FORMATS) as (keyof typeof POST_FORMATS)[]) {
    await writeFile(`out/posts-editorial-${format.toLowerCase()}.png`, await sharp({ create: { width: 1350, height: Math.round(270 * POST_FORMATS[format].height / 1080) * 2, channels: 4, background: "#333333" } }).composite(sheets[format]).png().toBuffer());
  }
  await writeFile("out/posts-editorial-pages.png", await sharp({ create: { width: 648, height: 2700, channels: 4, background: "#333333" } }).composite(pages).png().toBuffer());
});

test("editorial media cannot inject remote URLs or markup; sample photography stays out of real projects", () => {
  for (const template of EDITORIAL_POST_TEMPLATES) {
    const doc = demoPost(template.id);
    doc.pages[0].title = '<script>alert("x")</script>';
    doc.pages[0].body = '<image href="https://attacker.example/track" />';
    doc.pages[0].imageIndex = 0;
    const svg = postSvg(doc, 0, { screenUrls: ["https://attacker.example/evil.svg"], logoUrl: "javascript:alert(1)" });
    assert.ok(!svg.includes("<script>") && !svg.includes('href="https://') && !svg.includes("javascript:"));
    assert.ok(!svg.includes("/post-demos/"));
  }
});

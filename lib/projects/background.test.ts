import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import { projectMediaSchema } from "./validation";
import { buildVideoProps } from "./video-props";
import { absolutize } from "../../remotion/props";
import type { SceneGraph } from "./scenes";
import { ownsUpload } from "../storage/keys";

const background = { url: "/api/uploads/owner/image/background.png", fileName: "background.png", mimeType: "image/png", sizeBytes: 42 };

test("dedicated backgrounds are validated as images and remain separate from screenshots", () => {
  assert.ok(projectMediaSchema.safeParse({ logo: null, screens: [], background }).success);
  assert.ok(projectMediaSchema.safeParse({ logo: null, screens: [] }).success);
  assert.ok(projectMediaSchema.safeParse({ logo: null, screens: [], background: null }).success);
  assert.equal(projectMediaSchema.safeParse({ logo: null, screens: [], background: { ...background, mimeType: "audio/mp4", url: "/api/uploads/owner/audio/music.m4a" } }).success, false);
  assert.equal(projectMediaSchema.safeParse({ logo: null, screens: [], background: { ...background, url: "https://example.com/image.jpg" } }).success, false);
  const graph: SceneGraph = { schema: 1, energy: "calm", logoEmphasis: false, musicTrackId: null, bpm: 120, scenes: [{ id: "intro", kind: "intro", title: "Test", duration: 3, transition: "fade" }] };
  const props = buildVideoProps({ appName: "Test", format: "PORTRAIT", styleId: "montage", colors: [], logoUrl: null, backgroundUrl: background.url, screenUrls: [], screenRatios: [], websiteUrl: null, musicSrc: null }, graph, false);
  assert.equal(props.backgroundUrl, background.url);
  assert.deepEqual(props.screenUrls, []);
  assert.equal(absolutize(props, "https://kinetik.example").backgroundUrl, `https://kinetik.example${background.url}`);
});

test("export embeds the background file and refuses another user's media", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/projects/background.test.ts"));
  const storageModule = require.resolve("../storage");
  const previous = require.cache[storageModule];
  require.cache[storageModule] = { id: storageModule, filename: storageModule, loaded: true, exports: {
    isOwnUpload: ownsUpload, mimeFromKey: () => "image/png", storage: { get: async () => Buffer.from("background-image") },
  } } as NodeJS.Module;
  try {
    const { inlineAssets } = await import("../services/render");
    const graph: SceneGraph = { schema: 1, energy: "calm", logoEmphasis: false, musicTrackId: null, bpm: 120, scenes: [] };
    const props = buildVideoProps({ appName: "Test", format: "PORTRAIT", styleId: "montage", colors: [], logoUrl: null, backgroundUrl: background.url, screenUrls: [], screenRatios: [], websiteUrl: null, musicSrc: null }, graph, false);
    const rendered = await inlineAssets(props, "owner");
    assert.equal(rendered.backgroundUrl, `data:image/png;base64,${Buffer.from("background-image").toString("base64")}`);
    assert.equal(props.backgroundUrl, background.url);
    await assert.rejects(inlineAssets(props, "another-user"), /unauthorized_media/);
  } finally {
    if (previous) require.cache[storageModule] = previous;
    else delete require.cache[storageModule];
  }
});

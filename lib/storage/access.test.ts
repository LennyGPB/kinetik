import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import type { SceneGraph } from "@/lib/projects/scenes";
import { withSharedMedia } from "./shared-media";
import { buildVideoProps } from "@/lib/projects/video-props";
import { ownsUpload } from "./keys";

const token = "testsharetoken1234567890";
const image = "/api/uploads/owner/image/screen.png";
const oldImage = "/api/uploads/owner/image/previous.png";
const graph: SceneGraph = {
  schema: 1, energy: "calm", logoEmphasis: false, musicTrackId: null, bpm: 120,
  scenes: [{ id: "screen", kind: "screens", title: "Screen", duration: 5, transition: "fade", screens: [image], focus: { src: oldImage, x: 0, y: 0, w: 0.5, h: 0.5, mode: "zoom" } }],
};
graph.scenes[0].focuses = [
  { src: image, x: 0, y: 0, w: 0.4, h: 0.4, mode: "zoom" },
  { src: oldImage, x: 0.4, y: 0.4, w: 0.4, h: 0.4, mode: "popout", animation: "pivot" },
];

test("public player authorizes all media references without mutating saved props", () => {
  const props = buildVideoProps({ appName: "Test", format: "LANDSCAPE", styleId: null, colors: [], logoUrl: image, screenUrls: [image], screenRatios: [1], websiteUrl: null, musicSrc: "/music/public.mp3" }, graph, false);
  const shared = withSharedMedia(props, token);
  assert.equal(shared.logoUrl, `${image}?share=${token}`);
  assert.equal(shared.screenUrls[0], shared.graph.scenes[0].screens?.[0]);
  assert.equal(shared.graph.scenes[0].focus?.src, `${oldImage}?share=${token}`);
  assert.deepEqual(shared.graph.scenes[0].focuses?.map((f) => f.src), [`${image}?share=${token}`, `${oldImage}?share=${token}`]);
  assert.equal(props.graph.scenes[0].focuses?.[1].src, oldImage);
  assert.equal(shared.musicSrc, "/music/public.mp3");
  assert.equal(props.logoUrl, image);
  assert.equal(props.graph.scenes[0].focus?.src, oldImage);
  assert.throws(() => withSharedMedia(props, "invalid"));
});

test("media route enforces ownership, project-scoped sharing, revocation and private ranges before storage reads", async () => {
  const require = createRequire(path.join(process.cwd(), "lib/storage/access.test.ts"));
  let viewer: string | null = null;
  let enabled = true;
  let reads = 0;
  const originals = new Map<string, NodeJS.Module | undefined>();
  const stub = (name: string, exports: unknown) => {
    const id = require.resolve(name);
    originals.set(id, require.cache[id]);
    require.cache[id] = { id, filename: id, loaded: true, exports } as NodeJS.Module;
  };
  stub("../db", { db: { project: { findFirst: async ({ where }: { where: { shareToken: string; userId: string; status: string } }) => {
    if (!enabled || where.shareToken !== token || where.userId !== "owner" || where.status !== "READY") return null;
    return { assets: [{ url: image }], versions: [{ scenes: graph }] };
  } } } });
  stub("../auth/dal", { getCurrentUser: async () => viewer ? { id: viewer } : null });
  stub("./index", { isOwnUpload: ownsUpload, mimeFromKey: () => "image/png", storage: { get: async () => { reads++; return Buffer.from("0123456789"); } } });
  try {
    const { GET } = require("../../app/api/uploads/[...key]/route") as typeof import("../../app/api/uploads/[...key]/route");
    const read = (key: string, query = "", range?: string) => GET(new Request(`https://example.test/api/uploads/${key}${query}`, { headers: range ? { range } : {} }), { params: Promise.resolve({ key: key.split("/") }) });
    assert.equal((await read("owner/image/screen.png")).status, 404);
    viewer = "other";
    assert.equal((await read("owner/image/screen.png")).status, 404);
    assert.equal(reads, 0);
    viewer = "owner";
    const ownerRead = await read("owner/image/screen.png", "", "bytes=2-5");
    assert.equal(ownerRead.status, 206);
    assert.equal(ownerRead.headers.get("content-range"), "bytes 2-5/10");
    assert.equal(ownerRead.headers.get("cache-control"), "private, no-store");
    assert.equal(await ownerRead.text(), "2345");
    viewer = null;
    assert.equal((await read("owner/image/screen.png", `?share=${token}`)).status, 200);
    assert.equal((await read("owner/image/previous.png", `?share=${token}`)).status, 200);
    const beforeDenied = reads;
    assert.equal((await read("owner/image/unrelated.png", `?share=${token}`)).status, 404);
    assert.equal((await read("another/image/screen.png", `?share=${token}`)).status, 404);
    assert.equal((await read("owner/image/screen.png", "?share=invalid")).status, 404);
    assert.equal((await read("owner/image/../screen.png", `?share=${token}`)).status, 404);
    enabled = false;
    const revoked = await read("owner/image/screen.png", `?share=${token}`, "bytes=0-3");
    assert.equal(revoked.status, 404);
    assert.equal(revoked.headers.get("cache-control"), "private, no-store");
    assert.equal(reads, beforeDenied);
    const { inlineAssets } = require("../services/render") as typeof import("../services/render");
    const props = buildVideoProps({ appName: "Test", format: "LANDSCAPE", styleId: null, colors: [], logoUrl: image, screenUrls: [image], screenRatios: [1], websiteUrl: null, musicSrc: null }, graph, false);
    const exported = await inlineAssets(props, "owner");
    assert.ok(exported.logoUrl?.startsWith("data:image/png;base64,"));
    assert.ok(exported.graph.scenes[0].focus?.src.startsWith("data:image/png;base64,"));
    assert.ok(exported.graph.scenes[0].focuses?.every((f) => f.src.startsWith("data:image/png;base64,")));
    assert.equal(exported.graph.scenes[0].focuses?.[1].animation, "pivot");
    assert.equal(JSON.stringify(exported).includes("/api/uploads/"), false);
    const beforeForeignExport = reads;
    await assert.rejects(inlineAssets(props, "other"), /unauthorized_media/);
    assert.equal(reads, beforeForeignExport);
  } finally {
    for (const [id, original] of originals) {
      if (original) require.cache[id] = original;
      else delete require.cache[id];
    }
  }
});

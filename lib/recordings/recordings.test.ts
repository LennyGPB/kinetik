import assert from "node:assert/strict";
import test from "node:test";
import { recordingCamera, RecordingSettingsSchema } from "./model";
import { inspectRecording } from "./inspect";
import { withSharedMedia, sharedMediaUrls } from "../storage/shared-media";
import { buildVideoProps } from "../projects/video-props";
import type { SceneGraph } from "../projects/scenes";

const settings = { duration: 8, width: 1280, height: 720, background: "#7c3aed", padding: 7, radius: 18, frame: "browser" as const, originalAudio: true, zooms: [{ id: "one", start: 1, end: 4, x: 0.95, y: 0.1, scale: 2 }] };

test("camera returns to wide view smoothly, clamps at every edge and is deterministic", () => {
  assert.deepEqual(recordingCamera(settings.zooms, 0), { scale: 1, x: 0, y: 0 });
  assert.equal(recordingCamera(settings.zooms, 1).scale, 1);
  assert.equal(recordingCamera(settings.zooms, 4).scale, 1);
  assert.equal(recordingCamera(settings.zooms, 2).scale, 2);
  assert.ok(recordingCamera(settings.zooms, 1.01).scale < 1.01);
  for (let seconds = 0; seconds <= 8; seconds += 0.02) {
    const camera = recordingCamera(settings.zooms, seconds);
    assert.ok(Math.abs(camera.x) <= (camera.scale - 1) / 2);
    assert.ok(Math.abs(camera.y) <= (camera.scale - 1) / 2);
    assert.deepEqual(camera, recordingCamera(settings.zooms, seconds));
  }
});

test("recording validation rejects overlapping, duplicate and out-of-range zooms", () => {
  assert.ok(RecordingSettingsSchema.safeParse(settings).success);
  for (const zooms of [
    [...settings.zooms, { ...settings.zooms[0], id: "two", start: 3, end: 5 }],
    [...settings.zooms, { ...settings.zooms[0], start: 5, end: 7 }],
    [{ ...settings.zooms[0], end: 9 }], [{ ...settings.zooms[0], start: 3.9 }],
    [{ ...settings.zooms[0], x: NaN }], [{ ...settings.zooms[0], scale: Infinity }],
  ]) assert.equal(RecordingSettingsSchema.safeParse({ ...settings, zooms }).success, false);
});


function box(type: string, payload: Buffer) {
  const header = Buffer.alloc(8); header.writeUInt32BE(payload.length + 8); header.write(type, 4);
  return Buffer.concat([header, payload]);
}
function movie(codec = "avc1", seconds = 8) {
  const mvhd = Buffer.alloc(100); mvhd.writeUInt32BE(1000, 12); mvhd.writeUInt32BE(seconds * 1000, 16);
  const tkhd = Buffer.alloc(84); tkhd.writeUInt32BE(1280 * 65536, 76); tkhd.writeUInt32BE(720 * 65536, 80);
  const hdlr = Buffer.alloc(24); hdlr.write("vide", 8);
  const stsd = Buffer.alloc(24); stsd.write(codec, 12);
  return Buffer.concat([box("ftyp", Buffer.from("isom0000isomavc1")), box("moov", Buffer.concat([box("mvhd", mvhd), box("trak", Buffer.concat([box("tkhd", tkhd), box("mdia", Buffer.concat([box("hdlr", hdlr), box("minf", box("stbl", box("stsd", stsd)))]))]))]))]);
}

test("server reads actual video metadata and rejects non-video, codecs, oversize boxes and excessive duration", () => {
  assert.deepEqual(inspectRecording(movie()), { duration: 8, width: 1280, height: 720 });
  assert.throws(() => inspectRecording(movie("hvc1")), /unsupported_codec/);
  assert.throws(() => inspectRecording(movie("avc1", 121)), /duration/);
  assert.throws(() => inspectRecording(Buffer.from("not a video")), /invalid_video/);
  const broken = movie(); broken.writeUInt32BE(0xffffffff, 24);
  assert.throws(() => inspectRecording(broken), /invalid_video/);
  assert.throws(() => inspectRecording(box("ftyp", Buffer.from("isom0000isomavc1"))), /invalid_video/);
});

test("public playback authorizes the recording URL without persisting its share token", () => {
  const src = "/api/uploads/user1/video/recording.mp4";
  const graph: SceneGraph = { schema: 1, energy: "calm", logoEmphasis: false, musicTrackId: null, bpm: 120, recording: { ...settings, src }, scenes: [{ id: "recording", kind: "screens", title: "", duration: 8, transition: "fade" }] };
  const props = buildVideoProps({ appName: "Demo", format: "LANDSCAPE", styleId: null, colors: ["#7c3aed"], logoUrl: null, screenUrls: [src], screenRatios: [16 / 9], websiteUrl: null, musicSrc: null }, graph, false);
  const token = "abcdefghijklmnop123456";
  assert.equal(withSharedMedia(props, token).graph.recording?.src, `${src}?share=${token}`);
  assert.equal(graph.recording?.src, src);
  assert.ok(sharedMediaUrls([{ url: src }], graph, "user1").has(src));
  assert.equal(sharedMediaUrls([{ url: src }], graph, "user2").size, 0);
});

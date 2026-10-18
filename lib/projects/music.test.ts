import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { MUSIC_LIBRARY } from "@/config/music";
import { buildVideoProps } from "./video-props";
import type { SceneGraph } from "./scenes";

test("library selection resolves real audio for preview and export instead of an old upload", () => {
  const project = { appName: "Test", format: "LANDSCAPE" as const, styleId: null, colors: [], logoUrl: null, screenUrls: [], screenRatios: [], websiteUrl: null, musicSrc: "/api/uploads/owner/audio/old.m4a" };
  const graph: SceneGraph = { schema: 1, energy: "calm", logoEmphasis: false, musicTrackId: null, bpm: 120, scenes: [{ id: "intro", kind: "intro", title: "Test", duration: 5, transition: "fade" }] };
  for (const track of MUSIC_LIBRARY) {
    assert.ok(existsSync(path.join(process.cwd(), "public", decodeURIComponent(track.src))));
    assert.ok(track.length > 0 && track.bpm > 0);
    assert.ok(track.beatOffset >= 0 && track.beatOffset < 60 / track.bpm);
    assert.equal(buildVideoProps(project, { ...graph, musicTrackId: track.id }, false).musicSrc, track.src);
  }
  assert.equal(buildVideoProps(project, graph, false).musicSrc, project.musicSrc);
});

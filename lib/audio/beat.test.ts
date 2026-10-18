import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { musicalClock } from "./beat";
import { detectTempoFromSamples } from "./tempo";
import { beatGrid } from "../projects/scenes";
import { GraphicBackdrop } from "../../remotion/video/graphic-backdrop";
import { GRAPHIC_MOTION } from "../../config/graphic-motion";
import { MUSIC_LIBRARY } from "../../config/music";
import { sceneTimeline } from "../../remotion/video/transitions";
import type { Scene } from "../projects/scenes";

test("tempo analysis recovers known beats without drifting over a minute", () => {
  const sampleRate = 11025;
  for (const bpm of [80, 100, 125, 140]) {
    const offset = 0.237;
    const samples = new Float32Array(sampleRate * 60);
    for (let time = offset; time < 60; time += 60 / bpm) {
      const start = Math.round(time * sampleRate);
      for (let i = 0; i < sampleRate * 0.08 && start + i < samples.length; i++) {
        samples[start + i] += Math.sin(i * 2 * Math.PI * 90 / sampleRate) * Math.exp(-i / (sampleRate * 0.015));
      }
    }
    const detected = detectTempoFromSamples(samples);
    assert.ok(detected, `No tempo at ${bpm} BPM`);
    assert.ok(Math.abs(detected.bpm - bpm) < 0.3, `${bpm} BPM detected as ${detected.bpm}`);
    const endBeat = Math.floor((60 - offset) / (60 / bpm));
    const drift = Math.abs(detected.beatOffset + endBeat * 60 / detected.bpm - (offset + endBeat * 60 / bpm));
    assert.ok(drift < 0.035, `Drift at ${bpm} BPM: ${drift}s`);
  }
});

test("trimmed music and sequence-local pulses stay on the same beat at every frame rate", () => {
  for (const fps of [24, 30, 60]) for (const bpm of [80, 100, 125, 140]) {
    const graph = { bpm, beatOffset: 0.237, audio: { trimStart: 1.3 } };
    const grid = beatGrid(graph);
    const phase = grid.phase * fps;
    for (const beat of [0, 1, 8, 40]) {
      const frame = phase + beat * grid.period * fps;
      assert.ok(Math.abs(musicalClock(frame, fps, bpm, phase).pulse - 1) < 1e-10);
      const from = 37;
      assert.ok(Math.abs(musicalClock(frame - from, fps, bpm, phase - from).pulse - 1) < 1e-10);
    }
    assert.ok(musicalClock(phase - 1, fps, bpm, phase).pulse < 0.1);
  }
});

test("every graphic backdrop follows the same musical position across different BPMs", () => {
  for (const kind of Object.keys(GRAPHIC_MOTION) as (keyof typeof GRAPHIC_MOTION)[]) {
    const render = (bpm: number) => renderToStaticMarkup(createElement(GraphicBackdrop, {
      kind, palette: ["#111111", "#ffffff", "#8855ff"],
      beatPosition: musicalClock(30 * (0.2 + 8.25 * 60 / bpm), 30, bpm, 6).position,
    }));
    assert.equal(render(80), render(140), kind);
  }
});

test("hard cuts follow the detected grid of every library track, including a trimmed start", () => {
  const scenes: Scene[] = [
    { id: "intro", kind: "intro", title: "Intro", duration: 2.7, transition: "fade" },
    { id: "feature", kind: "feature", title: "Feature", duration: 3.4, transition: "cut" },
    { id: "cta", kind: "cta", title: "CTA", duration: 3.9, transition: "cut" },
  ];
  for (const track of MUSIC_LIBRARY) for (const trimStart of [0, 1.3]) {
    const grid = beatGrid({ ...track, audio: { trimStart } });
    const timeline = sceneTimeline(scenes, 30, track.bpm, grid.phase);
    assert.equal(timeline.at(-1)!.from + timeline.at(-1)!.duration, 300);
    for (const cut of timeline.slice(1)) {
      const position = (cut.from / 30 - grid.phase) / grid.period;
      const errorSeconds = Math.abs(position - Math.round(position)) * grid.period;
      assert.ok(errorSeconds <= 1 / 60 + 1e-9, `${track.title}: cut off by ${errorSeconds}s`);
    }
  }
});

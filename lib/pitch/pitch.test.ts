import test from "node:test";
import assert from "node:assert/strict";
import { attachPitchVoice, normalizePitchPlan, pitchDurations, pitchGraph, type PitchOptions, type PitchPlan } from "./model";
import { totalDuration } from "../projects/scenes";
import { fitVoiceScenes, sceneVoiceContent, voiceStatus } from "../projects/voiceover";
import { narrationCaptions } from "../audio/captions";
import { buildVideoProps } from "../projects/video-props";
import { withSharedMedia } from "../storage/shared-media";

const options: PitchOptions = { duration: 60, tone: "investors", locale: "fr", format: "LANDSCAPE" };
function plan(): PitchPlan {
  return { company: "Studio", summary: "Product summary", brand: { colors: ["#ffffff", "#111111", "#784cff"], detectedHeading: "Helvetica", detectedBody: "Helvetica", heading: "Inter", body: "Inter", fontNote: "Closest supported font", logoCrop: { page: 1, x: 0, y: 0, width: 0.2, height: 0.1 } },
    scenes: Array.from({ length: 6 }, (_, i) => ({ id: `scene-${i}`, role: i === 0 ? "intro" : i === 5 ? "cta" : "solution", title: "Product", subtitle: "Useful product", narration: "A short narration.", duration: 10, visual: i === 2 ? "counter" : i === 3 ? "chart" : i === 4 ? "mockup" : "type", metric: i === 2 ? "10k users" : null,
      chart: i === 3 ? { type: "bar", unit: "users", points: [{ label: "2024", value: 100 }, { label: "2025", value: 300 }], evidence: "2024: 100 users; 2025: 300 users" } : null,
      crop: i === 4 ? { page: 2, x: 0.1, y: 0.2, width: 0.7, height: 0.6 } : null, source: `Page ${i + 1}`, evidence: "Source quote" })), warnings: [] };
}

test("pitch timing stays exact for every duration with 5–8 scenes and no scene longer than 20 seconds", () => {
  for (const duration of [30, 60, 90, 120]) for (let count = 5; count <= 8; count++) {
    if (count * 20 < duration) { assert.throws(() => pitchDurations(count, duration)); continue; }
    const allocated = pitchDurations(count, duration);
    assert.equal(Math.round(allocated.reduce((sum, d) => sum + d, 0) * 30), duration * 30);
    assert.ok(allocated.every((d) => d >= 2 && d <= 20));
  }
});

test("pitch normalization rejects invalid crops, unsupported fonts and incomplete numeric visuals", () => {
  assert.equal(normalizePitchPlan(plan(), options, 6).scenes.length, 6);
  for (const modify of [(p: PitchPlan) => { p.scenes[3].chart = null; }, (p: PitchPlan) => { p.scenes[4].crop!.page = 7; }, (p: PitchPlan) => { p.scenes[1].id = p.scenes[0].id; }, (p: PitchPlan) => { p.scenes[0].role = "team"; }, (p: PitchPlan) => { p.scenes[2].metric = null; }]) {
    const input = plan(); modify(input); assert.throws(() => normalizePitchPlan(input, options, 6));
  }
});

test("motion uses real extracted media, brand fonts, counters, charts and the chosen music", () => {
  const source = normalizePitchPlan(plan(), options, 6);
  const graph = pitchGraph(source, { state: "review", sourceName: "Deck", sourceType: "pdf", options }, { "scene-4": "/api/uploads/owner/image/screenshot.png" }, { id: "track", bpm: 110, beatOffset: 0.1 });
  assert.equal(totalDuration(graph), 60); assert.equal(graph.scenes[2].kind, "stat"); assert.equal(graph.scenes[2].title, "10k users");
  assert.equal(graph.scenes[3].pitchVisual?.chart?.points[1].value, 300);
  assert.deepEqual(graph.scenes[4].screens, ["/api/uploads/owner/image/screenshot.png"]);
  assert.equal(graph.fonts?.heading, "Inter"); assert.equal(graph.musicTrackId, "track");
  const narrated = attachPitchVoice(graph, source, "voice"); assert.equal(narrated.voiceover?.captions, true); assert.equal(narrated.voiceover?.segments.length, 6);
});

test("pitch voice fitting never silently extends beyond two minutes", () => {
  const source = normalizePitchPlan(plan(), { ...options, duration: 120 }, 6);
  const graph = attachPitchVoice(pitchGraph(source, { state: "review", sourceName: "Deck", sourceType: "pdf", options: { ...options, duration: 120 } }, {}, null), source, "voice");
  const segment = graph.voiceover!.segments[0];
  segment.clip = { src: "/api/uploads/owner/audio/voice.wav", text: segment.text, duration: 22, language: "fr", voiceId: "voice", modelId: "test", sceneContent: sceneVoiceContent(graph.scenes[0]) };
  const fitted = fitVoiceScenes(graph); assert.equal(totalDuration(fitted), 120); assert.equal(voiceStatus(fitted, graph.scenes[0].id), "too_long");
});

test("caption chunks follow provider timestamps including silent gaps", () => {
  const text = "Hello world. This is a timed caption.", characters = [...text];
  const clip = { src: "test", text, duration: 8, language: "en" as const, voiceId: "voice", modelId: "test", sceneContent: "", alignment: { characters, starts: characters.map((_, i) => i * 0.15 + 1), ends: characters.map((_, i) => i * 0.15 + 1.1) } };
  const chunks = narrationCaptions(clip); assert.equal(chunks[0].start, 1); assert.ok(chunks.length >= 2); assert.ok(chunks[0].end < chunks[1].start);
  assert.deepEqual(narrationCaptions({ ...clip, alignment: undefined }), []);
});

test("pitch preview and export retain the document background and keep private source quotes out of public sharing", () => {
  const source = normalizePitchPlan(plan(), options, 6);
  const graph = pitchGraph(source, { state: "review", sourceName: "Confidential deck", sourceType: "pdf", options }, {}, null);
  const props = buildVideoProps({ appName: "Studio", locale: "fr", format: "LANDSCAPE", styleId: "veil", colors: source.brand.colors, logoUrl: null, screenUrls: [], screenRatios: [], websiteUrl: null, musicSrc: null }, graph, false);
  assert.deepEqual(props.palette, source.brand.colors);
  assert.equal(props.recipe.graphicTreatment, undefined);
  const shared = withSharedMedia(props, "abcdefghijklmnop");
  assert.equal(shared.graph.pitch?.plan, undefined);
  assert.equal(shared.graph.pitch?.sourceName, "");
  assert.equal(shared.graph.scenes[3].pitchVisual?.chart?.evidence, "");
  assert.equal(shared.graph.scenes[3].pitchVisual?.chart?.points[1].value, 300);
  assert.equal(graph.pitch?.sourceName, "Confidential deck");
});

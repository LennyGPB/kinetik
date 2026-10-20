import test from "node:test";
import assert from "node:assert/strict";
import type { SceneGraph } from "./scenes";
import { fitVoiceScenes, hasVoiceIssues, mapVoiceMedia, musicDuckVolume, playableVoiceClips, sceneVoiceContent, voiceSlots, voiceStatus } from "./voiceover";
import { applyTranslation, translationEntries } from "./translation";
import { shortenGraph } from "./variants";
import { getVoiceoverCost } from "../../config/credits";
import { sharedMediaUrls, withSharedMedia } from "../storage/shared-media";
import type { VideoProps } from "../../remotion/props";

function narrated(): SceneGraph {
  const graph: SceneGraph = { schema: 1, language: "fr", energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120,
    scenes: [{ id: "intro", kind: "intro", title: "Bonjour", duration: 4, transition: "fade" }, { id: "feature", kind: "feature", title: "Produit", duration: 4, transition: "cut" }] };
  graph.voiceover = { enabled: true, voiceId: "voice1", language: "fr", volume: 1, duckMusic: true,
    segments: [{ sceneId: "intro", text: "Bonjour à tous", clip: { src: "/api/uploads/owner/audio/voice.wav", duration: 2, text: "Bonjour à tous", voiceId: "voice1", modelId: "eleven_multilingual_v2", language: "fr", sceneContent: sceneVoiceContent(graph.scenes[0]) } }, { sceneId: "feature", text: "" }] };
  return graph;
}

test("narration follows scene order, skips silent scenes and is opt-in", () => {
  const graph = narrated();
  assert.equal(voiceStatus(graph, "intro"), "ready");
  assert.equal(voiceStatus(graph, "feature"), "empty");
  assert.equal(hasVoiceIssues(graph), false);
  graph.scenes.reverse();
  assert.equal(playableVoiceClips(graph)[0].from, 120);
  graph.voiceover!.enabled = false;
  assert.deepEqual(playableVoiceClips(graph), []);
});

test("script, voice, language and scene copy changes invalidate audio, styling does not", () => {
  for (const change of [
    (g: SceneGraph) => { g.voiceover!.segments[0].text = "Autre texte"; },
    (g: SceneGraph) => { g.voiceover!.voiceId = "voice2"; },
    (g: SceneGraph) => { g.language = "en"; },
    (g: SceneGraph) => { g.scenes[0].title = "Autre titre"; },
  ]) {
    const graph = narrated(); change(graph);
    assert.equal(voiceStatus(graph, "intro"), "stale");
    assert.equal(hasVoiceIssues(graph), true);
    assert.equal(playableVoiceClips(graph).length, 0);
  }
  const graph = narrated(); graph.colors = ["#ff0000"];
  assert.equal(voiceStatus(graph, "intro"), "ready");
});

test("fit uses the actual beat-snapped boundaries and never truncates a clip", () => {
  const graph = narrated(); graph.scenes[0].duration = 2.24;
  graph.voiceover!.segments[0].clip!.duration = 2.1;
  assert.equal(voiceSlots(graph)[0].duration, 60);
  assert.equal(voiceStatus(graph, "intro"), "too_long");
  assert.equal(hasVoiceIssues(graph), true);
  assert.equal(playableVoiceClips(graph).length, 0);
  graph.scenes[0].duration = 3;
  assert.equal(voiceStatus(graph, "intro"), "ready");
});

test("music ducks only around playable speech and returns smoothly", () => {
  const graph = narrated();
  assert.equal(musicDuckVolume(graph, 15, 30), 0.25);
  assert.equal(musicDuckVolume(graph, 70, 30), 1);
  assert.ok(musicDuckVolume(graph, 62, 30) > 0.25);
  graph.voiceover!.volume = 0;
  assert.equal(musicDuckVolume(graph, 15, 30), 1);
  graph.voiceover!.volume = 1; graph.voiceover!.enabled = false;
  assert.equal(musicDuckVolume(graph, 15, 30), 1);
});

test("translation includes narration and invalidates the previous spoken language", () => {
  const graph = narrated();
  const entries = translationEntries(graph);
  assert.ok(entries.some((e) => e.key === "voice-intro"));
  const next = applyTranslation(graph, entries.map((e) => ({ ...e, text: `EN ${e.text}` })), "en");
  assert.equal(next.voiceover!.language, "en");
  assert.equal(voiceStatus(next, "intro"), "stale");
  assert.equal(graph.voiceover!.language, "fr");
});

test("short versions require newly adapted audio, format copies can reuse it", () => {
  const graph = narrated(); graph.scenes.forEach((s) => { s.duration = 20; });
  assert.equal(voiceStatus(structuredClone(graph), "intro"), "ready");
  const short = shortenGraph(graph);
  assert.equal(short.voiceover!.segments[0].clip, undefined);
  assert.equal(voiceStatus(short, "intro"), "missing");
});

test("private narration media participates in sharing without mutating saved URLs", () => {
  const graph = narrated();
  const source = graph.voiceover!.segments[0].clip!.src;
  assert.ok(sharedMediaUrls([], graph, "owner").has(source));
  assert.equal(sharedMediaUrls([], graph, "other").size, 0);
  const props = { graph, logoUrl: null, backgroundUrl: null, musicSrc: null, screenUrls: [] } as unknown as VideoProps;
  const shared = withSharedMedia(props, "abcdefghijklmnop");
  assert.equal(shared.graph.voiceover!.segments[0].clip!.src, `${source}?share=abcdefghijklmnop`);
  assert.equal(graph.voiceover!.segments[0].clip!.src, source);
  assert.equal(mapVoiceMedia(graph, () => "data:audio/wav;base64,test").voiceover!.segments[0].clip!.src, "data:audio/wav;base64,test");
});

test("voice costs are charged per nonempty scene, in character units", () => {
  assert.equal(getVoiceoverCost("   "), 0);
  assert.equal(getVoiceoverCost("a".repeat(200)), 1);
  assert.equal(getVoiceoverCost("a".repeat(201)), 2);
});

test("fitting existing narration extends scenes across snapped cuts without changing audio or the original graph", () => {
  const graph = narrated(); graph.scenes[0].duration = 1.7;
  graph.voiceover!.segments[0].clip!.duration = 4.4;
  const before = structuredClone(graph);
  const fitted = fitVoiceScenes(graph);
  assert.equal(voiceStatus(fitted, "intro"), "ready");
  assert.deepEqual(fitted.voiceover, graph.voiceover);
  assert.ok(fitted.scenes[0].duration > graph.scenes[0].duration);
  assert.deepEqual(graph, before);
  assert.deepEqual(fitVoiceScenes(fitted), fitted);
});

test("duration fitting respects the 20-second scene limit and leaves stale clips alone", () => {
  const graph = narrated(); graph.voiceover!.segments[0].clip!.duration = 25;
  const fitted = fitVoiceScenes(graph);
  assert.equal(fitted.scenes[0].duration, 20);
  assert.equal(voiceStatus(fitted, "intro"), "too_long");
  graph.voiceover!.segments[0].text = "New script";
  assert.deepEqual(fitVoiceScenes(graph), graph);
});

test("creation setup must be completed or explicitly disabled before export", () => {
  const graph = narrated(); graph.voiceover!.setupPending = true;
  assert.equal(hasVoiceIssues(graph), true);
  graph.voiceover!.enabled = false;
  assert.equal(hasVoiceIssues(graph), false);
});

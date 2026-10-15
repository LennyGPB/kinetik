import assert from "node:assert/strict";
import test from "node:test";
import { applyTranslation, translationEntries } from "./translation";
import type { SceneGraph } from "./scenes";

const graph: SceneGraph = {
  schema: 1, energy: "calm", logoEmphasis: false, musicTrackId: null, bpm: 120,
  logoBackground: false, colors: ["#7c3aed"],
  scenes: [
    { id: "intro", kind: "intro", title: "Bonjour", subtitle: "Votre produit en vidéo", duration: 4, transition: "fade", textOffsets: { title: { x: 0.1, y: 0.2 } } },
    { id: "logo", kind: "logo", title: "Kinetik", subtitle: "À vous de créer", duration: 3, transition: "zoom" },
    { id: "screen", kind: "screens", title: "Découvrez", duration: 5, transition: "fade", screens: ["/api/uploads/screen.png"], focus: { src: "/api/uploads/screen.png", x: 0.1, y: 0.2, w: 0.5, h: 0.5, mode: "zoom", label: "Votre tableau de bord" } },
  ],
  overlays: [{ id: "badge", type: "badge", text: "Nouveau", screen: null, x: 0.5, y: 0.5, width: 0.2, opacity: 1, rotation: 0, fontSize: 0.04, color: null, background: null, animation: "fade", sceneIds: null, start: null, end: null }],
};

test("translation covers copy including captions and overlays, excluding logo names", () => {
  assert.deepEqual(translationEntries(graph).map((item) => item.key), ["scene-0-title", "scene-0-subtitle", "scene-1-subtitle", "scene-2-title", "scene-2-focus", "overlay-0"]);
});

test("translation changes only text and can be applied in either direction", () => {
  const entries = translationEntries(graph);
  const translated = entries.map((entry) => ({ key: entry.key, text: `EN ${entry.text}` }));
  const next = applyTranslation(graph, translated);
  assert.equal(next.scenes[0].title, "EN Bonjour");
  assert.equal(next.scenes[1].title, "Kinetik");
  assert.equal(next.scenes[2].focus?.label, "EN Votre tableau de bord");
  assert.equal(next.overlays?.[0].text, "EN Nouveau");
  assert.deepEqual(applyTranslation(next, entries), graph);
  assert.equal(graph.scenes[0].title, "Bonjour");
});

test("incomplete, duplicate, unknown, empty and excessive translations are rejected", () => {
  const entries = translationEntries(graph);
  for (const invalid of [entries.slice(1), [...entries, entries[0]], entries.map((entry, index) => index ? entry : { ...entry, key: "invented" }), entries.map((entry, index) => index ? entry : { ...entry, text: " " }), entries.map((entry, index) => index ? entry : { ...entry, text: "a".repeat(entry.maxLength + 1) })]) {
    assert.throws(() => applyTranslation(graph, invalid), /invalid_translation/);
  }
});

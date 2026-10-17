import assert from "node:assert/strict";
import test from "node:test";
import { mergeSceneEdit } from "./scene-edit";
import { sceneSettings } from "./scene-settings";
import type { SceneGraph } from "./scenes";
import { applyTimelineEdit, isTimelineEdit } from "./timeline";

const base: SceneGraph = {
  schema: 1, energy: "calm", logoEmphasis: false, logoBackground: true, musicTrackId: "original", bpm: 120,
  scenes: [
    { id: "intro-a", kind: "intro", title: "Bonjour", duration: 3, transition: "fade", presentation: "editorial" },
    { id: "feature-b", kind: "feature", title: "Un bénéfice", duration: 5, transition: "slide" },
    { id: "cta-c", kind: "cta", title: "Essaie maintenant", duration: 3, transition: "fade" },
  ],
};

test("mosaic and rotary transitions validate and change only their target scene", () => {
  for (const transition of ["mosaic", "rotary"] as const) {
    const edit = { kind: "transition", sceneId: "feature-b", transition } as const;
    assert.ok(isTimelineEdit(edit));
    const result = applyTimelineEdit(base, edit);
    assert.equal(result.scenes[1].transition, transition);
    assert.strictEqual(result.scenes[0], base.scenes[0]);
    assert.strictEqual(result.scenes[2], base.scenes[2]);
  }
});

test("text positions validate, persist independently and reset to the template", () => {
  const change = { kind: "textPosition", sceneId: "feature-b", target: "title", offset: { x: 0.2, y: -0.1 } } as const;
  assert.ok(isTimelineEdit(change));
  assert.equal(isTimelineEdit({ ...change, offset: { x: NaN, y: 0 } }), false);
  assert.equal(isTimelineEdit({ ...change, offset: { x: 2, y: 0 } }), false);
  assert.equal(isTimelineEdit({ ...change, target: "logo" }), false);
  const next = applyTimelineEdit(base, change);
  assert.deepEqual(next.scenes[1].textOffsets?.title, change.offset);
  assert.strictEqual(next.scenes[0], base.scenes[0]);
  const sub = applyTimelineEdit(next, { ...change, target: "subtitle", offset: { x: 0, y: 0.15 } });
  const reset = applyTimelineEdit(sub, { ...change, offset: null });
  assert.equal(reset.scenes[1].textOffsets?.title, undefined);
  assert.deepEqual(reset.scenes[1].textOffsets?.subtitle, { x: 0, y: 0.15 });
  assert.deepEqual(mergeSceneEdit(sub, { ...base, scenes: [{ ...base.scenes[1], title: "Autre texte" }] }, "feature-b").scenes[1].textOffsets, sub.scenes[1].textOffsets);
});

test("scoped AI edits preserve all other scenes, order, ids and video-wide settings", () => {
  const proposal = structuredClone(base);
  proposal.energy = "high";
  proposal.musicTrackId = "unwanted";
  proposal.bpm = 190;
  proposal.logoBackground = false;
  proposal.scenes = [
    { ...proposal.scenes[1], title: "Le nouveau bénéfice", presentation: "card", duration: 6 },
    { ...proposal.scenes[0], title: "Ne doit pas être appliqué" },
  ];
  const next = mergeSceneEdit(base, proposal, "feature-b");
  assert.deepEqual(next.scenes.map((scene) => scene.id), base.scenes.map((scene) => scene.id));
  assert.strictEqual(next.scenes[0], base.scenes[0]);
  assert.strictEqual(next.scenes[2], base.scenes[2]);
  assert.equal(next.scenes[1].title, "Le nouveau bénéfice");
  assert.equal(next.scenes[1].presentation, "card");
  assert.equal(next.scenes[1].energy, "high");
  assert.equal(next.scenes[1].logoBackground, false);
  assert.equal(next.energy, "calm");
  assert.equal(next.logoBackground, true);
  assert.equal(next.musicTrackId, "original");
  assert.equal(next.bpm, 120);
  assert.equal(base.scenes[1].title, "Un bénéfice");
});

test("scoped edits reject missing targets and type changes", () => {
  assert.throws(() => mergeSceneEdit(base, base, "missing"));
  assert.throws(() => mergeSceneEdit(base, { ...base, scenes: [base.scenes[0]] }, "feature-b"));
});

test("scoped durations stay within scene and total-video limits", () => {
  const proposal = { ...base, scenes: [{ ...base.scenes[1], duration: 999 }] };
  assert.equal(mergeSceneEdit(base, proposal, "feature-b").scenes[1].duration, 20);
  proposal.scenes[0].duration = -5;
  assert.equal(mergeSceneEdit(base, proposal, "feature-b").scenes[1].duration, 1);
  proposal.scenes[0].duration = Number.NaN;
  assert.equal(mergeSceneEdit(base, proposal, "feature-b").scenes[1].duration, 5);
  const full = { ...base, scenes: base.scenes.map((scene, index) => ({ ...scene, duration: index === 1 ? 5 : 42 })) };
  proposal.scenes[0].duration = 20;
  assert.equal(mergeSceneEdit(full, proposal, "feature-b").scenes[1].duration, 6);
});

test("renderer resolves local settings including false without mutating the video", () => {
  const effective = sceneSettings(base, { ...base.scenes[1], energy: "high", logoBackground: false, titleAnimation: "letters" });
  assert.equal(effective.energy, "high");
  assert.equal(effective.logoBackground, false);
  assert.equal(effective.titleAnimation, "letters");
  assert.equal(base.logoBackground, true);
  assert.equal(sceneSettings(base, base.scenes[0]).energy, "calm");
});

test("manual scene presentations validate compatibility and reset independently", () => {
  assert.ok(isTimelineEdit({ kind: "presentation", sceneId: "feature-b", value: "card" }));
  assert.equal(isTimelineEdit({ kind: "presentation", sceneId: "feature-b", value: "not-a-layout" }), false);
  const next = applyTimelineEdit(base, { kind: "presentation", sceneId: "feature-b", value: "card" });
  assert.equal(next.scenes[1].presentation, "card");
  assert.strictEqual(next.scenes[0], base.scenes[0]);
  assert.strictEqual(applyTimelineEdit(base, { kind: "presentation", sceneId: "feature-b", value: "browser" }), base);
  assert.strictEqual(applyTimelineEdit(base, { kind: "presentation", sceneId: "intro-a", value: "orbit" }), base);
  const reset = applyTimelineEdit(next, { kind: "presentation", sceneId: "feature-b", value: null });
  assert.equal(reset.scenes[1].presentation, undefined);
  assert.equal(reset.scenes[0].presentation, "editorial");
});

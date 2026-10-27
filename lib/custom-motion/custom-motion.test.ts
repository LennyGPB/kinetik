import { test } from "node:test";
import assert from "node:assert/strict";
import { compileCustomMotion } from "./compile";
import { CustomMotionMetaSchema, customSceneScreens, demoIssues, communityVersionId, type CustomDemo } from "./contract";
import { communityGraph } from "./graph";
import { customGraphIssues } from "./validate";
import { applyTimelineEdits } from "../projects/timeline";

const SAMPLE = `
import { AbsoluteFill, Sequence, interpolate, random } from "remotion";
import { loadFont } from "kinetik";
type Props = { scenes: { id: string; from: number; duration: number; texts: Record<string, string> }[]; colors: string[]; width: number };
const { fontFamily } = loadFont("Inter");
export default function Video(props: Props) {
  return (
    <AbsoluteFill style={{ background: props.colors[0] }}>
      {props.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration}>
          <h1 style={{ fontFamily, color: props.colors[1], opacity: random(scene.id) > 2 ? 0 : 1 }}>{scene.texts.title}</h1>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
`;

const meta = CustomMotionMetaSchema.parse({
  sceneTypes: [
    { type: "intro", label: "Intro", texts: [{ key: "title", label: "Titre", max: 30 }], minDuration: 1, maxDuration: 6, defaultDuration: 3, repeatable: false },
    { type: "point", label: "Point", texts: [{ key: "title", label: "Titre", max: 40 }, { key: "body", label: "Texte", max: 80 }], minDuration: 1, maxDuration: 8, defaultDuration: 3, repeatable: true },
  ],
  colors: [{ label: "Fond" }, { label: "Texte" }],
  formats: ["LANDSCAPE", "PORTRAIT"],
  minScenes: 2, maxScenes: 5, usesLogo: false, photos: 0,
});
const demo: CustomDemo = { scenes: [{ type: "intro", duration: 3, texts: { title: "Bonjour" } }, { type: "point", duration: 2, texts: { title: "Un", body: "Deux" } }], colors: ["#000000", "#ffffff"], musicTrackId: null, bpm: 120, appName: "Flowly" };

test("compiles allowed code to CommonJS", () => {
  const result = compileCustomMotion(SAMPLE);
  assert.equal(result.ok, true);
  if (result.ok) assert.match(result.compiled, /require\(['"]remotion['"]\)/);
});

test("rejects non deterministic code and forbidden imports", () => {
  const result = compileCustomMotion(`import x from "lodash";\nexport default function V() { return Math.random() > Date.now() ? null : fetch("/") as any; }`);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => e.includes("lodash")));
    assert.ok(result.errors.some((e) => e.includes("Math.random")));
    assert.ok(result.errors.some((e) => e.includes("réseau")));
  }
  assert.equal(compileCustomMotion("export const a = 1;").ok, false);
  // Un mot interdit en commentaire ne bloque pas
  assert.equal(compileCustomMotion("// Math.random() interdit\nexport default function V() { return null; }").ok, true);
});

test("demo consistency and community style ids", () => {
  assert.deepEqual(demoIssues(meta, demo), []);
  assert.ok(demoIssues(meta, { ...demo, colors: ["#000000"] }).length > 0);
  assert.ok(demoIssues(meta, { ...demo, scenes: [{ type: "nope", duration: 2, texts: {} }] }).length > 0);
  assert.equal(communityVersionId("community:cm1abcdefgh"), "cm1abcdefgh");
  assert.equal(communityVersionId("gradient-flow"), null);
});

test("graph rules: non repeatable scenes, durations, texts", () => {
  const graph = communityGraph("cm1abcdefgh", meta, demo, "fr");
  assert.equal(graph.styleId, "community:cm1abcdefgh");
  assert.deepEqual(customGraphIssues(meta, graph, graph), []);
  const [intro, point] = graph.scenes;
  // Une scène répétable peut être dupliquée, pas l'intro
  assert.deepEqual(customGraphIssues(meta, graph, applyTimelineEdits(graph, [{ kind: "duplicate", sceneId: point.id, id: "feature-abcdef" }])), []);
  assert.ok(customGraphIssues(meta, graph, applyTimelineEdits(graph, [{ kind: "duplicate", sceneId: intro.id, id: "feature-abcdef" }])).length > 0);
  assert.ok(customGraphIssues(meta, graph, applyTimelineEdits(graph, [{ kind: "duration", sceneId: intro.id, duration: 10 }])).length > 0);
  const texts = applyTimelineEdits(graph, [{ kind: "customTexts", sceneId: point.id, texts: { title: "Nouveau", body: "Texte" } }]);
  assert.equal(texts.scenes[1].texts?.title, "Nouveau");
  assert.equal(texts.scenes[1].title, "Nouveau");
  assert.ok(customGraphIssues(meta, graph, applyTimelineEdits(graph, [{ kind: "customTexts", sceneId: point.id, texts: { title: "x".repeat(41) } }])).length > 0);
  const added = applyTimelineEdits(graph, [{ kind: "addCustom", id: "feature-abcdef", afterId: point.id, customType: "point", title: "Titre", texts: { title: "Titre" }, duration: 3 }]);
  assert.equal(added.scenes.length, 3);
  assert.deepEqual(customGraphIssues(meta, graph, added), []);
});

test("replaceable mockup screens: chosen capture, then rotation, null without captures", () => {
  const withScreen = CustomMotionMetaSchema.parse({
    sceneTypes: [
      { type: "intro", label: "Intro", texts: [], minDuration: 1, maxDuration: 5, defaultDuration: 2, repeatable: false },
      { type: "phone", label: "Mockup", texts: [], minDuration: 1, maxDuration: 5, defaultDuration: 2, repeatable: true, screen: true },
    ],
    colors: [{ label: "Fond" }], formats: ["PORTRAIT"], minScenes: 1, maxScenes: 6, usesLogo: false, photos: 0,
  });
  const scenes = [{ customType: "intro" }, { customType: "phone" }, { customType: "phone", screens: ["/api/uploads/b"] }, { customType: "phone" }, { customType: "phone" }];
  assert.deepEqual(customSceneScreens(withScreen, scenes, ["/api/uploads/a", "/api/uploads/b"]), [null, "/api/uploads/a", "/api/uploads/b", "/api/uploads/b", "/api/uploads/a"]);
  assert.deepEqual(customSceneScreens(withScreen, scenes, []), [null, null, null, null, null]);
  // Capture supprimée des médias : retour à l'automatique
  assert.equal(customSceneScreens(withScreen, [{ customType: "phone", screens: ["/api/uploads/gone"] }], ["/api/uploads/a"])[0], "/api/uploads/a");
});

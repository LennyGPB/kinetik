import assert from "node:assert/strict";
import test from "node:test";
import { CREDIT_COSTS, getExportCost } from "../../config/credits";
import { getRecipe } from "../../config/recipes";
import { popoutTarget, STAGE_KINDS, STAGE_THEMES, stageColors, stageDeviceId, stageFocusState, stageScreens, stageShowsDevice, stageSpot, stageState, type StageScene } from "../../config/stage-motion";
import { getStyle } from "../../config/styles";
import { getDictionary } from "../i18n";
import { TRANSITIONS, type Scene, type ScreenFocus } from "./scenes";

const scene = (kind: Scene["kind"], transition: Scene["transition"], extra: Partial<Scene> = {}): Scene => ({ id: `${kind}-${transition}`, kind, title: "Titre", duration: 3, transition, ...extra });
const stage = (scenes: [Scene["kind"], Scene["transition"]][], counts: number[] = []): StageScene[] =>
  scenes.map(([kind, transition], i) => ({ kind, transition, from: i * 90, duration: 90, deviceCount: counts[i] ?? 1, showDevice: true }));

test("Stage is a catalogued 3D template with its signature transition and descriptions", () => {
  const style = getStyle("stage");
  assert.ok(style);
  const recipe = getRecipe("stage");
  assert.equal(recipe.stage, "orbit");
  assert.equal(style!.category, "3d");
  assert.equal(recipe.transitions[0], "turntable");
  assert.ok(TRANSITIONS.includes("turntable"));
  for (const locale of ["fr", "en"] as const) {
    const t = getDictionary(locale);
    assert.ok((t.styles as Record<string, string>).stage, locale);
    assert.ok((t.app.editor.timeline.transitions as Record<string, string>).turntable, locale);
  }
});

test("camera path is continuous: no jump between consecutive frames except on a cut", () => {
  const scenes = stage([["intro", "fade"], ["screens", "turntable"], ["feature", "fade"], ["cta", "cut"]]);
  for (const format of ["landscape", "portrait", "square"] as const) {
    let previous = stageState(scenes, 0, format);
    for (let frame = 1; frame < 360; frame++) {
      const state = stageState(scenes, frame, format);
      if (frame !== 270) {
        // Glissement de caméra entre deux plans : au plus ~4,5° par image
        assert.ok(Math.abs(state.shot.az - previous.shot.az) < 4.5, `${format} az @${frame}`);
        assert.ok(Math.abs(state.shot.dist - previous.shot.dist) / previous.shot.dist < 0.08, `${format} dist @${frame}`);
        assert.ok(Math.abs(state.shot.x - previous.shot.x) < 0.05, `${format} x @${frame}`);
        // Un tour complet revient à 0 : même orientation, comparée modulo 2π
        const turn = Math.abs(state.spin - previous.spin) % (Math.PI * 2);
        assert.ok(Math.min(turn, Math.PI * 2 - turn) < 0.35, `${format} spin @${frame}`);
      }
      previous = state;
    }
  }
});

test("turntable makes a full turn and swaps the screen while the device shows its back", () => {
  const scenes = stage([["feature", "fade"], ["screens", "turntable"]]);
  const before = stageState(scenes, 77, "landscape"), after = stageState(scenes, 107, "landscape");
  assert.equal(stageState(scenes, 60, "landscape").spin, 0);
  assert.ok(Math.abs(after.spin + Math.PI * 2) < 0.05);
  assert.equal(stageState(scenes, 120, "landscape").spin, 0);
  assert.equal(before.screen.a, 0);
  assert.equal(after.screen.a, 1);
  // Au changement d'écran, l'appareil est de dos (autour d'un demi-tour)
  const swap = [...Array(40).keys()].map((i) => stageState(scenes, 70 + i, "landscape")).find((s) => s.screen.a === 1)!;
  assert.ok(Math.abs(Math.abs(swap.spin) - Math.PI) < 0.6);
});

test("devices grow from one to three for multi-screen scenes", () => {
  const scenes = stage([["feature", "fade"], ["screens", "fade"]], [1, 3]);
  assert.equal(stageState(scenes, 40, "landscape").devices, 1);
  assert.equal(stageState(scenes, 150, "landscape").devices, 3);
  const middle = stageState(scenes, 90, "landscape").devices;
  assert.ok(middle > 1 && middle < 3);
});

test("screen contents follow the scenes and never invent screenshots", () => {
  const scenes = [scene("intro", "fade"), scene("screens", "turntable", { screenCount: 2 }), scene("feature", "fade"), scene("logo", "cut"), scene("cta", "fade")];
  const urls = ["/a.png", "/b.png", "/c.png"];
  const contents = stageScreens(scenes, urls, (s) => (s.screenCount === 2 ? urls.slice(0, 2) : [urls[0]]));
  assert.deepEqual(contents[1], [{ kind: "image", src: "/a.png" }, { kind: "image", src: "/b.png" }]);
  assert.deepEqual(contents[3], [{ kind: "splash" }]);
  assert.deepEqual(contents[4], [{ kind: "splash" }]);
  assert.deepEqual(stageScreens(scenes, [], () => [])[0], [{ kind: "mock", variant: 0 }]);
});

test("user-chosen 2D layouts take the device away; devices and colours resolve sensibly", () => {
  assert.equal(stageShowsDevice(scene("screens", "fade"), false), true);
  assert.equal(stageShowsDevice(scene("screens", "fade", { layout: "fan" }), false), false);
  // Une mise en avant se joue en 3D sur l'appareil, même si une mise en page 2D avait été choisie
  assert.equal(stageShowsDevice(scene("screens", "fade", { layout: "fan", focus: { mode: "zoom", src: "/a.png", x: 0, y: 0, w: 0.5, h: 0.5 } }), false), true);
  assert.equal(stageShowsDevice(scene("logo", "fade"), true), false);
  assert.equal(stageShowsDevice(scene("intro", "fade", { presentation: "editorial" as Scene["presentation"] }), false), false);
  assert.equal(stageDeviceId("galaxy", []), "galaxy");
  assert.equal(stageDeviceId(undefined, [1.6, 1.5]), "macbook-pro");
  assert.equal(stageDeviceId(undefined, [0.46, null]), "iphone-pro");
  // Fond de marque clair : le plateau reste sombre
  assert.ok(stageColors(["#ffffff", "#111111", "#2255ff"]).base !== "#ffffff");
  assert.equal(stageColors(["#09090C", "#FFFFFF", "#FF5A1F"]).glow, "#FF5A1F");
});

test("3D exports cost the agreed multiple, re-exports stay half price", () => {
  const short = CREDIT_COSTS.export.short * CREDIT_COSTS.export.premium3dMultiplier;
  assert.equal(getExportCost({ duration: 20, premium3d: true }), short);
  assert.equal(getExportCost({ duration: 45, premium3d: true }), CREDIT_COSTS.export.long * CREDIT_COSTS.export.premium3dMultiplier);
  assert.equal(getExportCost({ duration: 20, premium3d: true, reexport: true }), Math.ceil(short / 2));
  assert.equal(getExportCost({ duration: 20 }), CREDIT_COSTS.export.short);
});

const zoom = (x: number, extra: Partial<ScreenFocus> = {}): ScreenFocus => ({ src: "/a.png", mode: "zoom", x, y: 0.2, w: 0.4, h: 0.2, ...extra });

test("3D focus follows the 2D calendar: mark, then dive; later steps glide without returning to the full screen", () => {
  const one = [zoom(0.1)];
  assert.equal(stageFocusState(one, 150, 10).mark, 0);
  assert.ok(stageFocusState(one, 150, 24).mark > 0.5);
  assert.equal(stageFocusState(one, 150, 29).zoom, 0);
  assert.equal(stageFocusState(one, 150, 60).zoom, 1);
  const two = [zoom(0.1), zoom(0.5, { src: "/b.png", mode: "popout", label: " Légende " })];
  const middle = stageFocusState(two, 150, 75 + 6);
  assert.equal(middle.index, 1);
  assert.ok(middle.rect.x > 0.1 && middle.rect.x < 0.5, "zone glides");
  assert.ok(middle.zoom > 0 && middle.zoom < 1 && middle.pop > 0 && middle.pop < 1, "zoom hands over to cutout");
  assert.equal(middle.previousSrc, "/a.png");
  assert.ok(middle.srcMix > 0 && middle.srcMix < 1, "screens crossfade");
  const settled = stageFocusState(two, 150, 140);
  assert.deepEqual([settled.zoom, settled.pop, settled.srcMix, settled.label], [0, 1, 1, "Légende"]);
});

test("a focused scene keeps one device, shows its captures, and releases the zoom during the next transition", () => {
  const scenes = stage([["screens", "fade"], ["feature", "turntable"]]);
  scenes[0].focus = [zoom(0.1)];
  assert.deepEqual(stageState(scenes, 60, "landscape").focus, { scene: 0, frame: 60, weight: 1 });
  const leaving = stageState(scenes, 86, "landscape").focus!;
  assert.ok(leaving.weight > 0 && leaving.weight < 1);
  const after = stageState(scenes, 95, "landscape").focus!;
  assert.equal(after.scene, 0);
  assert.ok(after.weight < leaving.weight);
  assert.equal(stageState(scenes, 130, "landscape").focus, null);
  const contents = stageScreens([scene("screens", "fade", { focuses: [zoom(0.1, { src: "/b.png" }), zoom(0.2, { src: "/a.png" }), zoom(0.3, { src: "/b.png" })] })], ["/a.png", "/b.png"], () => ["/a.png"]);
  assert.deepEqual(contents[0], [{ kind: "image", src: "/b.png" }, { kind: "image", src: "/a.png" }]);
});

test("the cutout lands in the free half of the frame, never larger than its box", () => {
  for (const [format, ratio] of [["landscape", 16 / 9], ["portrait", 9 / 16], ["square", 1]] as const) {
    for (const aspect of [0.3, 1, 4]) {
      const target = popoutTarget(aspect, format, ratio);
      assert.ok(target.h <= 0.58 + 1e-9 && target.w <= 0.86 + 1e-9, `${format} ${aspect}`);
      assert.ok(Math.abs((target.w * ratio) / target.h - aspect) < 1e-6, "keeps the zone proportions");
      if (format === "portrait") assert.ok(target.cy - target.h / 2 > 0.55);
      else assert.ok(target.cx - target.w / 2 > 0.45);
    }
  }
});

test("every 3D universe is a catalogued template with its own signature transition, labels and description", () => {
  const signatures = new Set<string>();
  for (const kind of STAGE_KINDS) {
    const theme = STAGE_THEMES[kind];
    const style = getStyle(theme.templateId);
    assert.ok(style, theme.templateId);
    assert.equal(style!.category, "3d");
    const recipe = getRecipe(theme.templateId);
    assert.equal(recipe.stage, kind);
    assert.equal(recipe.transitions[0], theme.signature, `${kind} starts with its signature`);
    assert.ok(TRANSITIONS.includes(theme.signature));
    signatures.add(theme.signature);
    for (const locale of ["fr", "en"] as const) {
      const t = getDictionary(locale);
      assert.ok((t.styles as Record<string, string>)[theme.templateId], `${locale} ${theme.templateId}`);
      assert.ok((t.app.editor.timeline.transitions as Record<string, string>)[theme.signature], `${locale} ${theme.signature}`);
    }
  }
  assert.equal(signatures.size, STAGE_KINDS.length, "no two universes share a signature");
});

test("premium stages keep continuous camera paths through their signature passages in every format", () => {
  for (const kind of ["obsidian", "halo", "magnet", "vault", "monument", "gyroscope"] as const) {
    const signature = STAGE_THEMES[kind].signature;
    const scenes = stage([["intro", "fade"], ["screens", signature], ["feature", signature], ["screens", "fade"], ["cta", signature]], [1, 1, 1, 3, 1]);
    for (const format of ["landscape", "portrait", "square"] as const) {
      let previous = stageState(scenes, 0, format, kind);
      for (let frame = 1; frame < 450; frame++) {
        const state = stageState(scenes, frame, format, kind);
        assert.ok(Number.isFinite(state.shot.dist) && state.shot.dist > 0, `${kind} ${format} distance @${frame}`);
        assert.ok(Math.abs(state.shot.dist - previous.shot.dist) / previous.shot.dist < 0.08, `${kind} ${format} camera @${frame}`);
        assert.ok(Math.abs(state.shot.az - previous.shot.az) < 4.5, `${kind} ${format} angle @${frame}`);
        assert.ok(state.clock >= previous.clock, `${kind} clock @${frame}`);
        assert.ok(state.screen.a >= 0 && state.screen.b < scenes.length);
        previous = state;
      }
    }
  }
});

test("Kiosque districts are spread out and the flight between them is continuous", () => {
  for (let i = 1; i < 12; i++) {
    const [ax, az] = stageSpot("kiosk", i - 1), [bx, bz] = stageSpot("kiosk", i);
    assert.ok(Math.hypot(ax - bx, az - bz) > 6, `districts ${i - 1} → ${i}`);
  }
  assert.deepEqual(stageSpot("monument", 3), [0, 0]);
  const scenes = stage([["intro", "fade"], ["feature", "district"], ["screens", "district"], ["cta", "fade"]]);
  let previous = stageState(scenes, 0, "landscape", "kiosk");
  let higher = 0;
  for (let frame = 1; frame < 360; frame++) {
    const state = stageState(scenes, frame, "landscape", "kiosk");
    assert.ok(Math.hypot(state.spot[0] - previous.spot[0], state.spot[1] - previous.spot[1]) < 1.2, `spot @${frame}`);
    assert.ok(Math.abs(state.shot.el - previous.shot.el) < 4, `elevation @${frame}`);
    higher = Math.max(higher, state.shot.el);
    previous = state;
  }
  assert.ok(higher > 50, "the camera climbs during the flight");
});

test("the décor clock runs forward without jumps and speeds up during transitions; flash and rake cut cleanly", () => {
  const scenes = stage([["intro", "fade"], ["feature", "sunpath"], ["cta", "sunpath"]]);
  let previous = stageState(scenes, 0, "landscape", "monument").clock;
  let fastest = 0, slowest = 1;
  for (let frame = 1; frame < 270; frame++) {
    const clock = stageState(scenes, frame, "landscape", "monument").clock;
    assert.ok(clock >= previous - 1e-9, `forward @${frame}`);
    assert.ok(clock - previous < 0.02, `no jump @${frame}`);
    if (frame > 20) { fastest = Math.max(fastest, clock - previous); slowest = Math.min(slowest, clock - previous); }
    previous = clock;
  }
  assert.ok(fastest > slowest * 4, "time-lapse during transitions");
  for (const transition of ["flash", "rake"] as const) {
    const cut = stage([["feature", "fade"], ["screens", transition]]);
    assert.notEqual(stageState(cut, 89, "landscape", "shoot").shot.dist, stageState(cut, 90, "landscape", "shoot").shot.dist);
  }
});

test("light universes keep readable colours; dark ones darken a light brand background", () => {
  assert.equal(stageColors(["#111111", "#ffffff", "#ff5a1f"], "zen").base, STAGE_THEMES.zen.base);
  assert.equal(stageColors(["#ffffff", "#111111", "#2255ff"], "monument").light, false);
  assert.notEqual(stageColors(["#ffffff", "#111111", "#2255ff"], "monument").base, "#ffffff");
  assert.equal(stageColors(["#ffffff", "#111111", "#2255ff"], "aquarium").light, false);
  assert.equal(stageColors(["#101010", "#ffffff", "#2255ff"], "shoot").base, "#101010");
  // Accent trop clair sur un décor clair : la couleur principale prend le relais
  assert.equal(stageColors(["#ffffff", "#123456", "#fafafa"], "kiosk").glow, "#123456");
});

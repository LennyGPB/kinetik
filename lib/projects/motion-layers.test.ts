import assert from "node:assert/strict";
import test from "node:test";
import { ease, layerStateAt, layerText, layerVisible, layerToInput, normalizeLayer, LAYER_EASINGS } from "./motion-layers";

const screen = "/api/uploads/u/screen.png";
const media = { screenUrls: [screen], hasLogo: false, sceneDuration: 3 };

test("defaults and bounds are applied to a minimal layer", () => {
  const layer = normalizeLayer({ id: "title", type: "text", text: "  Hello  ", x: 9, opacity: 4 }, media);
  assert.equal(layer.text, "Hello");
  assert.equal(layer.base.x, 3);
  assert.equal(layer.base.opacity, 1);
  assert.equal(layer.base.w, 0.8);
  assert.equal(layer.base.color, "#ffffff");
  assert.equal(layer.textReveal, "none");
});

test("media is limited to the project", () => {
  assert.equal(normalizeLayer({ id: "shot", type: "image", screen: 0 }, media).src, screen);
  assert.throws(() => normalizeLayer({ id: "shot", type: "image", screen: 4 }, media), /capture introuvable/);
  assert.throws(() => normalizeLayer({ id: "brand", type: "logo" }, media), /logo/);
  assert.throws(() => normalizeLayer({ id: "empty", type: "text", text: " " }, media), /sans texte/);
  assert.throws(() => normalizeLayer({ id: "bad id!", type: "rect" }, media), /Identifiant/);
});

test("keyframes interpolate with their easing and hold outside their range", () => {
  const layer = normalizeLayer({ id: "box", type: "rect", opacity: 0.5, keyframes: [{ t: 1, x: 0.8, ease: "linear" }, { t: 0, x: 0.2 }] }, media);
  assert.deepEqual(layer.keyframes.map((k) => k.t), [0, 1]);
  assert.equal(layerStateAt(layer, 0).x, 0.2);
  assert.ok(Math.abs(layerStateAt(layer, 0.5).x - 0.5) < 1e-9);
  assert.equal(layerStateAt(layer, 2).x, 0.8);
  // Propriété sans image clé : valeur de base
  assert.equal(layerStateAt(layer, 0.5).opacity, 0.5);
});

test("colours interpolate between keyframes", () => {
  const layer = normalizeLayer({ id: "c", type: "rect", keyframes: [{ t: 0, color: "#000000", ease: "linear" }, { t: 1, color: "#FFFFFF", ease: "linear" }] }, media);
  assert.equal(layerStateAt(layer, 0.5).color, "#808080");
});

test("every easing starts at 0 and lands on 1", () => {
  for (const kind of LAYER_EASINGS) {
    assert.equal(Math.round(ease(kind, 0) * 1000) / 1000, 0, kind);
    assert.equal(Math.round(ease(kind, 1) * 1000) / 1000, 1, kind);
  }
});

test("loops add motion on top of the keyframes", () => {
  const spin = normalizeLayer({ id: "s", type: "rect", loop: "spin", loopSpeed: 1 }, media);
  assert.equal(layerStateAt(spin, 0.5).rotation, 180);
  const float = normalizeLayer({ id: "f", type: "rect", loop: "float", loopSpeed: 1 }, media);
  assert.notEqual(layerStateAt(float, 0.25).y, 0.5);
});

test("start and end bound visibility; end must follow start", () => {
  const layer = normalizeLayer({ id: "t", type: "rect", start: 1, end: 2 }, media);
  assert.equal(layerVisible(layer, 0.5, 3), false);
  assert.equal(layerVisible(layer, 1.5, 3), true);
  assert.equal(layerVisible(layer, 2, 3), false);
  assert.throws(() => normalizeLayer({ id: "t", type: "rect", start: 2, end: 1 }, media), /end/);
});

test("a stored layer round-trips through the model format", () => {
  const layer = normalizeLayer({ id: "shot", type: "image", screen: 0, w: 0.4, keyframes: [{ t: 0, scale: 0.5 }] }, media);
  const again = normalizeLayer(layerToInput(layer, [screen]), media);
  assert.deepEqual(again, layer);
});

test("missing fields are taken from the previous version of the layer", () => {
  const previous = normalizeLayer({ id: "t", type: "text", text: "Hi", fontSize: 0.1, color: "#ff0000" }, media);
  const next = normalizeLayer({ id: "t", type: "text", y: 0.2 }, media, previous);
  assert.equal(next.text, "Hi");
  assert.equal(next.fontSize, 0.1);
  assert.equal(next.base.color, "#ff0000");
  assert.equal(next.base.y, 0.2);
});

test("path, icon and particles layers are validated", () => {
  const path = normalizeLayer({ id: "line", type: "path", path: "M10 80 C 40 10, 65 10, 95 80", keyframes: [{ t: 0, draw: 0 }, { t: 1, draw: 1 }] }, media);
  assert.equal(path.viewBox, "0 0 100 100");
  assert.equal(path.fill, false);
  assert.equal(layerStateAt(path, 0.5).draw > 0 && layerStateAt(path, 0.5).draw < 1, true);
  assert.throws(() => normalizeLayer({ id: "bad", type: "path", path: "M0 0 <script>" }, media), /tracé/);
  assert.throws(() => normalizeLayer({ id: "bad", type: "path", path: "M0 0", viewBox: "nope" }, media), /viewBox/);
  assert.equal(normalizeLayer({ id: "ok", type: "icon", icon: "rocket" }, media).icon, "rocket");
  assert.throws(() => normalizeLayer({ id: "bad", type: "icon", icon: "unknown" }, media), /icône/);
  const sparks = normalizeLayer({ id: "p", type: "particles", particleCount: 999, particleMotion: "burst" }, media);
  assert.deepEqual(sparks.particles, { count: 150, shape: "circle", motion: "burst", size: 0.012, speed: 1, seed: 1 });
});

test("text can be filled with a capture, a shape can knock its text out", () => {
  assert.equal(normalizeLayer({ id: "t", type: "text", text: "Hi", screen: 0 }, media).src, screen);
  assert.equal(normalizeLayer({ id: "t", type: "text", text: "Hi" }, media).src, undefined);
  const knock = normalizeLayer({ id: "k", type: "rect", knockout: true, text: "SALE" }, media);
  assert.equal(knock.text, "SALE");
  assert.throws(() => normalizeLayer({ id: "k", type: "rect", knockout: true }, media), /évidé/);
});

test("counters count in the video language", () => {
  const layer = normalizeLayer({ id: "n", type: "text", text: "+{n} clients", countFrom: 0, countTo: 12000, countDuration: 1, countEase: "linear" }, media);
  assert.equal(layerText(layer, 0), "+0 clients");
  assert.equal(layerText(layer, 2, "en"), "+12,000 clients");
  assert.match(layerText(layer, 0.5), /^\+6\s000 clients$/);
  assert.equal(normalizeLayer({ id: "m", type: "text", countTo: 5 }, media).text, "{n}");
  const again = normalizeLayer(layerToInput(layer, [screen]), media);
  assert.deepEqual(again.counter, layer.counter);
});

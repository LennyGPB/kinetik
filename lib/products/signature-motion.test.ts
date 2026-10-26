import test from "node:test";
import assert from "node:assert/strict";
import { productSignatureMotion, SEQUENCES, SIGNATURE_KINDS, SIGNATURE_WINDOWS, whoosh } from "../../config/product-signature-motion";
import { productGalleryMotion, productGalleryTextOpacity } from "../../config/product-gallery-motion";

const durations = [2.37, 1.83, 3.11, 2.69];

test("signature transitions last under 0.8 s and the camera only whips while changing shot", () => {
  assert.ok(SIGNATURE_WINDOWS.incoming + SIGNATURE_WINDOWS.outgoing <= 0.8);
  for (const kind of SIGNATURE_KINDS) for (const fps of [24, 30, 60]) {
    const total = Math.round(durations.reduce((a, b) => a + b, 0) * fps);
    let previous = productSignatureMotion(kind, durations, 0, fps);
    let moving = 0;
    for (let frame = 1; frame < total; frame++) {
      const state = productSignatureMotion(kind, durations, frame, fps);
      assert.deepEqual(productSignatureMotion(kind, durations, frame, fps), state, "deterministic");
      const whip = state.screen.a !== state.screen.b || previous.screen.a !== previous.screen.b;
      if (state.screen.a !== state.screen.b) moving++;
      const scale = 30 / fps;
      const limits = whip ? { az: 0.42 * scale, distance: 1.1 * scale, height: 1.6 * scale } : { az: 0.06 * scale, distance: 0.3 * scale, height: 0.3 * scale };
      for (const key of ["az", "distance", "height"] as const) assert.ok(Math.abs(state.camera[key] - previous.camera[key]) < limits[key], `${kind} ${fps} ${key} @${frame}`);
      assert.ok(state.fov >= 20 && state.fov <= 46, `${kind} fov`);
      previous = state;
    }
    // Trois transitions de ≈ 0,64 s chacune
    assert.ok(moving / fps < 3 * 0.8 && moving / fps > 3 * 0.4, `${kind} ${fps} total transition time ${moving / fps}`);
  }
});

test("rush peaks mid-transition, effects run 0 → 1, and the product lands back at its size", () => {
  for (const kind of SIGNATURE_KINDS) {
    const fps = 30, boundary = Math.round(durations[0] * fps);
    const during = Array.from({ length: 30 }, (_, i) => productSignatureMotion(kind, durations, boundary - 10 + i, fps));
    const peak = Math.max(...during.map((s) => s.rush));
    assert.ok(peak > 0.95, `${kind} rush peak ${peak}`);
    const bursts = during.map((s) => s.burst).filter((b) => b >= 0);
    assert.ok(bursts.length > 10);
    for (let i = 1; i < bursts.length; i++) assert.ok(bursts[i] >= bursts[i - 1], "burst runs forward");
    // Une seconde après l'arrivée : produit stabilisé (rebond amorti), inclinaison de caméra revenue à la dérive d'ambiance
    const settled = productSignatureMotion(kind, durations, boundary + fps, fps);
    assert.ok(Math.abs(settled.product.scale - 1) < 0.02, `${kind} scale ${settled.product.scale}`);
    assert.ok(Math.abs(settled.bank) < 0.04);
    assert.equal(settled.rush, 0);
  }
});

test("texts fade on the same short window as the camera", () => {
  const fps = 30, boundary = Math.round(durations[0] * fps);
  const at = (frame: number) => productGalleryTextOpacity(productGalleryMotion(durations, frame, fps, undefined, SIGNATURE_WINDOWS).transitionStrength);
  assert.equal(at(boundary - 12), 1);
  assert.ok(at(boundary) < 0.2);
  assert.equal(at(boundary + 16), 1);
});

test("the whoosh curve is monotonic, fast in the middle and still at both ends", () => {
  let previous = 0, fastest = 0;
  for (let i = 1; i <= 100; i++) {
    const v = whoosh(i / 100);
    assert.ok(v >= previous);
    fastest = Math.max(fastest, (v - previous) * 100);
    previous = v;
  }
  assert.equal(whoosh(0), 0);
  assert.equal(whoosh(1), 1);
  assert.ok(fastest > 4 && fastest < 6, `peak speed ${fastest}`);
  assert.ok(whoosh(0.05) < 0.01 && whoosh(0.95) > 0.99);
});

test("each universe chains three different camera gestures; Splash and Corde keep their validated first move", () => {
  for (const kind of SIGNATURE_KINDS) {
    assert.equal(new Set(SEQUENCES[kind]).size, 3, kind);
    const fps = 30, starts = [0, 1, 2, 3].map((i) => Math.round(durations.slice(0, i).reduce((a, b) => a + b, 0) * fps));
    const seen = starts.slice(1).map((start) => productSignatureMotion(kind, durations, start, fps).gesture);
    assert.deepEqual(seen, SEQUENCES[kind], kind);
  }
  assert.equal(SEQUENCES.splash[0], "whip");
  assert.equal(SEQUENCES.corde[0], "spiral");
});

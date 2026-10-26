import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_CAMPAIGNS, getProductCampaign, isProduct3D } from "../../config/physical-product";
import { productCampaignMotion } from "../../config/product-campaign-motion";
import { isSignatureKind } from "../../config/product-signature-motion";
import { getStyle } from "../../config/styles";
import { getRecipe } from "../../config/recipes";

test("the five reference-inspired campaigns are available as premium 3D product templates", () => {
  assert.equal(PRODUCT_CAMPAIGNS.length, 5);
  assert.equal(new Set(PRODUCT_CAMPAIGNS.map(item => item.id)).size, 5);
  for (const template of PRODUCT_CAMPAIGNS) {
    assert.equal(getProductCampaign(template.id)?.kind, template.kind);
    assert.ok(isProduct3D(template.id));
    assert.equal(getStyle(template.id)?.category, "3d");
    assert.deepEqual(getRecipe(template.id).transitions, ["zoom", "track", "rotary"]);
  }
  assert.equal(isProduct3D("product-studio"), false);
});

test("campaign cameras remain continuous and deterministic across fractional scene changes and seeking", () => {
  const durations = [2.37, 1.83, 3.11, 2.69];
  for (const { kind } of PRODUCT_CAMPAIGNS) for (const fps of [24, 30, 60]) {
    const total = Math.round(durations.reduce((a, b) => a + b, 0) * fps);
    let previous = productCampaignMotion(kind, durations, 0, fps);
    for (let frame = 1; frame < total; frame++) {
      const state = productCampaignMotion(kind, durations, frame, fps);
      assert.deepEqual(productCampaignMotion(kind, durations, frame, fps), state);
      // Splash et Corde : coup de fouet volontaire pendant les transitions (bornes propres testées dans signature-motion.test.ts)
      const whip = isSignatureKind(kind) && (state.screen.a !== state.screen.b || previous.screen.a !== previous.screen.b);
      for (const key of ["az", "distance", "height"] as const) {
        assert.ok(Number.isFinite(state.camera[key]));
        if (!whip) assert.ok(Math.abs(state.camera[key] - previous.camera[key]) < .4, `${kind} ${key} ${frame}`);
      }
      assert.ok(state.camera.distance > 0);
      assert.ok(state.screen.a >= 0 && state.screen.b < durations.length);
      previous = state;
    }
  }
});

test("each campaign holds a substantial orbit, dolly and crane within a shot", () => {
  for (const { kind } of PRODUCT_CAMPAIGNS) {
    const start = productCampaignMotion(kind, [4, 4, 4, 4], 0, 30);
    const end = productCampaignMotion(kind, [4, 4, 4, 4], 90, 30);
    assert.ok(Math.abs(end.camera.az - start.camera.az) > .25, kind);
    assert.ok(Math.abs(start.camera.distance - end.camera.distance) > .9, kind);
    assert.ok(Math.abs(start.camera.height - end.camera.height) > .6, kind);
  }
  assert.equal(getProductCampaign("product-sylve-3d")?.name, "Corde 3D");
});

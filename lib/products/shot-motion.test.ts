import test from "node:test";
import assert from "node:assert/strict";
import { productPhotoMotion, productShotProgress } from "../../config/product-shot-motion";
import { PRODUCT_CAMPAIGNS } from "../../config/physical-product";
import { productCampaignMotion } from "../../config/product-campaign-motion";

test("camera pace is monotonic, bounded, seekable and settles for the closing hero", () => {
  for (let shot = 0; shot < 4; shot++) {
    let previous = 0;
    for (let i = 0; i <= 1000; i++) {
      const value = productShotProgress(shot, i / 1000);
      assert.ok(value >= previous - 1e-10 && value <= 1);
      assert.equal(value, productShotProgress(shot, i / 1000));
      previous = value;
    }
    assert.equal(productShotProgress(shot, -1), 0);
    assert.equal(productShotProgress(shot, 2), 1);
  }
  assert.ok(productShotProgress(0, .4) > .7);
  assert.ok(productShotProgress(2, .4) < .25);
  assert.equal(productShotProgress(3, .8), 1);
});

test("3D closing shots retreat to a stable hero rather than repeating a push-in", () => {
  for (const { kind } of PRODUCT_CAMPAIGNS) {
    const at = (frame: number) => productCampaignMotion(kind, [4, 4, 4, 4], frame, 30);
    assert.ok(at(455).camera.distance > at(385).camera.distance + 1);
    assert.deepEqual(at(465).camera, at(475).camera);
  }
});

test("2.5D photo framing stays bounded and reserves the strongest movement for Floating", () => {
  for (const style of ["product-studio", "product-floating", "product-editorial"]) {
    for (let shot = 0; shot < 4; shot++) for (let i = 0; i <= 100; i++) {
      const pose = productPhotoMotion(style, shot, i / 100);
      assert.ok(pose.scale >= .88 && pose.scale <= 1.2);
      assert.ok(Math.abs(pose.x) <= 18 && Math.abs(pose.roll) <= 5);
    }
  }
  assert.ok(productPhotoMotion("product-floating", 0, 1).scale > productPhotoMotion("product-studio", 0, 1).scale);
});

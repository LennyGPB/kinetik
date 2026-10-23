import assert from "node:assert/strict";
import test from "node:test";
import { assemblyArmKinematics, assemblyArmOpening } from "../../config/assembly-motion";

test("Assembly reaches its tray with rigid links throughout the handoff and multi-screen layouts", () => {
  for (const spread of [1, 2.4, 5.5]) for (const side of [-1, 1]) {
    let fixedLength: number | undefined;
    for (let i = 0; i <= 100; i++) {
      const p = i / 100, lift = Math.sin(Math.PI * p) ** 2, yaw = lift * 0.16;
      const opening = assemblyArmOpening(side, p);
      const target: [number, number, number] = [
        side * 1.28 * spread * Math.cos(yaw) - 0.6 * Math.sin(yaw) + side * opening * 0.35,
        0.36 + lift * 0.4 + opening * 0.3,
        -side * 1.28 * spread * Math.sin(yaw) - 0.6 * Math.cos(yaw) - opening * 0.3,
      ];
      const k = assemblyArmKinematics(side, spread, target);
      fixedLength ??= k.upper;
      assert.equal(k.upper, fixedLength, "the upper arm cannot telescope");
      assert.equal(k.lower, fixedLength, "the forearm cannot telescope");
      const reach = Math.sin(k.shoulder) * k.upper + Math.sin(k.shoulder + k.elbow) * k.lower;
      const tip = [k.baseX + Math.cos(k.yaw) * reach - side * k.toolOffset, 0.55 + Math.cos(k.shoulder) * k.upper + Math.cos(k.shoulder + k.elbow) * k.lower, k.baseZ - Math.sin(k.yaw) * reach];
      assert.ok(Math.hypot(...tip.map((v, index) => v - target[index])) < 1e-8, "jaws remain on the actual contact point");
      assert.ok(Math.min(opening, assemblyArmOpening(-side, p)) === 0, "one arm always holds the tray");
    }
  }
});

test("Assembly reach and release ease to rest and return to the idle grip", () => {
  for (const side of [-1, 1]) {
    assert.equal(assemblyArmOpening(side, 0), assemblyArmOpening(side, 1));
    const h = 1e-6;
    for (const p of [0, 0.25, 0.28, 0.72, 0.75, 1]) {
      const center = assemblyArmOpening(side, p);
      if (p > 0) assert.ok(Math.abs((center - assemblyArmOpening(side, p - h)) / h) < 0.001);
      if (p < 1) assert.ok(Math.abs((assemblyArmOpening(side, p + h) - center) / h) < 0.001);
    }
  }
});

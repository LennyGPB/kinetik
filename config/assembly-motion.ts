/** Fixed-length two-link arm. Dimensions depend on the layout, never on the current pose. */
export function assemblyArmKinematics(side: number, spread: number, target: [number, number, number]) {
  const baseX = side * (1.85 * spread + 0.35), baseZ = -1.9;
  // The wrist stays outside the tray; the inward-facing jaws extend to the tool contact point.
  const toolOffset = 0.32;
  const dx = target[0] + side * toolOffset - baseX, dz = target[2] - baseZ, dy = target[1] - 0.55;
  const horizontal = Math.hypot(dx, dz), distance = Math.hypot(horizontal, dy);
  const upper = 1.45 + Math.max(0, spread - 1) * 0.42, lower = upper;
  const elbow = Math.acos(Math.max(-1, Math.min(1, (distance * distance - upper * upper - lower * lower) / (2 * upper * lower))));
  const shoulder = Math.atan2(horizontal, dy) - Math.atan2(lower * Math.sin(elbow), upper + lower * Math.cos(elbow));
  return { baseX, baseZ, upper, lower, elbow, shoulder, toolOffset, yaw: Math.atan2(-dz, dx) };
}

/** Overlapping holds and zero velocity at reach/release boundaries. */
export function assemblyArmOpening(side: number, passage: number) {
  const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
  if (side < 0) return passage > 0.28 && passage < 0.72 ? Math.sin(Math.PI * (passage - 0.28) / 0.44) ** 2 : 0;
  return passage < 0.25 ? 1 - smooth(passage / 0.25) : passage > 0.75 ? smooth((passage - 0.75) / 0.25) : 0;
}

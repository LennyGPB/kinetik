export const LOGO_MOTION_IDS = ["logo-neon-stack", "logo-slice", "logo-liquid"] as const;
export type LogoMotionId = (typeof LOGO_MOTION_IDS)[number];
export const LOGO_MOTION_DURATIONS = [4, 6, 8] as const;
export const LOGO_MOTIONS = [
  { id: "logo-neon-stack", name: "Sculpt", palette: ["#101014", "#F4F1FF", "#9784D9"], sample: "KINETIK", description: { fr: "Un lettrage sculpté, une rotation douce et un reflet lumineux.", en: "Sculpted lettering, a gentle rotation and a sweeping highlight." } },
  { id: "logo-slice", name: "Slice", palette: ["#FAFAF7", "#111111", "#111111"], sample: "Sable.", description: { fr: "Le mot se découpe, glisse et se recompose.", en: "Your word slices, slides and comes back together." } },
  { id: "logo-liquid", name: "Elastic", palette: ["#111111", "#FAFAF7", "#FAFAF7"], sample: "lab", description: { fr: "Un lettrage souple qui fusionne et reprend sa forme.", en: "Soft lettering merges and returns to its original shape." } },
] as const;
export function getLogoMotion(id?: string | null) { return LOGO_MOTIONS.find((item) => item.id === id); }
export function logoMotionState(time: number, duration: number) {
  const progress = Math.max(0, Math.min(1, time / Math.max(1, duration)));
  const window = (start: number, end: number) => progress <= start || progress >= end ? 0 : Math.sin((progress - start) / (end - start) * Math.PI) ** 2;
  return { progress, distort: window(.06, .24) + window(.53, .76), inverted: progress >= .28 && progress < .73, turn: Math.sin(progress * Math.PI * 2) * 32, reveal: Math.min(1, progress / .09) };
}

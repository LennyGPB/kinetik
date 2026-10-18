/** Four art directions from the supplied image and three local video references. */
export const REFERENCE_MOTION = {
  lucent: { name: "Lucent", headline: "ABSTRACT IN MOTION.", fr: "L’ABSTRAIT PREND VIE.", photo: null, description: { fr: "Quatre tuiles sombres, formes lumineuses et reflets orange, violet et or en mouvement.", en: "Four dark tiles, luminous shapes and shifting orange, violet and gold reflections." } },
  "bold-orbit": { name: "Bold Orbit", headline: "DARE TO BE BOLD.", fr: "OSEZ VOUS AFFIRMER.", photo: null, description: { fr: "Fond noir, orbite de points et impulsion rose lumineuse. Un rythme minimal et affirmé.", en: "Black canvas, orbiting dots and a luminous pink pulse. Minimal, confident rhythm." } },
  "gold-rush": { name: "Gold Rush", headline: "MAKE YOUR MOVE.", fr: "MARQUEZ LES ESPRITS.", photo: null, description: { fr: "Affiche rouge et noire, lettres dorées extrudées et rotation en perspective.", en: "Red and black poster, extruded gold letters and a perspective rotation." } },
  "echo-frame": { name: "Echo Frame", headline: "SAVE THE MOMENT.", fr: "GARDEZ L’INSTANT.", photo: "/post-demos/interior.jpg", description: { fr: "Typographie noire sur blanc, photo centrale et échos de zoom avec flou directionnel.", en: "Black type on white, central photography and zoom echoes with directional blur." } },
} as const;
export type ReferenceMotionKind = keyof typeof REFERENCE_MOTION;
export function metalTitleHeight(text: string) { return text.length <= 12 ? 380 : text.length <= 32 ? 580 : 760; }
export function getReferenceMotion(id?: string | null) { return id && Object.hasOwn(REFERENCE_MOTION, id) ? REFERENCE_MOTION[id as ReferenceMotionKind] : undefined; }
/** A repeatable reveal/hold cycle; no wall clock or random values enter the render. */
export function referenceMotionTiming(time: number) {
  const phase = ((Math.max(0, time) % 3.6) / 3.6);
  const reveal = Math.min(1, phase / .24);
  const settle = 1 - Math.pow(1 - reveal, 4);
  const burst = Math.pow(Math.max(0, 1 - phase / .24), 3);
  return { phase, settle, burst, turn: Math.sin(Math.max(0, time) * .9) * 19 };
}

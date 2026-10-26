import type { CSSProperties } from "react";

export const TYPE_POSTERS = {
  spill: { name: "Spill", transition: "gravity-pull", font: "condensed" },
  veil: { name: "Veil", transition: "violet-fold", font: "wide" },
  power: { name: "Power", transition: "paint-sweep", font: "wide" },
  spectra: { name: "Spectra", transition: "type-stretch", font: "condensed" },
  batch: { name: "Batch", transition: "stack-collapse", font: "wide" },
  turn: { name: "Turn", transition: "ribbon-turn", font: "condensed" },
  fanout: { name: "Fanout", transition: "fan-fold", font: "condensed" },
  blocktype: { name: "Block", transition: "block-pivot", font: "condensed" },
  positive: { name: "Positive", transition: "mirror-horizon", font: "condensed" },
  helix: { name: "Helix", transition: "helix-wind", font: "condensed" },
} as const;
export type TypePosterKind = keyof typeof TYPE_POSTERS;
export function getTypePoster(id?: string) {
  return id && Object.hasOwn(TYPE_POSTERS, id) ? TYPE_POSTERS[id as TypePosterKind] : undefined;
}
export function typePosterPlacement(kind: TypePosterKind, aspectRatio: number): CSSProperties {
  const portrait = aspectRatio < 0.85;
  if (kind === "spill" || kind === "veil") return { position: "absolute", left: "5%", width: "90%", top: "50%", height: "85%", transform: "translateY(-50%)" };
  if (["fanout", "blocktype", "positive", "helix"].includes(kind)) return { position: "absolute", left: "5%", width: "90%", top: "50%", height: "80%", transform: "translateY(-50%)" };
  return { position: "absolute", left: "5%", width: "90%", top: kind === "power" ? "4%" : portrait ? "21%" : "12%", height: kind === "power" ? "82%" : portrait ? "55%" : "65%" };
}

/** Transitions thématiques d'une recette (fade et cut ne sont que des secours). */
export function themedTransitions<T extends string>(transitions: readonly T[]): T[] {
  const themed = transitions.filter((t) => t !== "fade" && t !== "cut");
  return themed.length ? themed : [...transitions];
}

/**
 * Affiches : chaque frontière de scène reçoit tour à tour la signature puis les transitions secondaires,
 * pour qu'une vidéo par défaut en montre au moins trois différentes.
 */
export function posterTransitionAt<T extends string>(transitions: readonly T[], sceneIndex: number): T {
  const themed = themedTransitions(transitions);
  return themed[Math.max(0, sceneIndex - 1) % themed.length];
}

/**
 * Garde-fou après génération : si l'IA a répété la même transition, les affiches de 4 scènes ou plus
 * repartent sur le cycle signature → secondaires (les choix variés de l'IA sont conservés).
 */
export function ensurePosterVariety<S extends { transition: T }, T extends string>(scenes: S[], transitions: readonly T[]): S[] {
  const themed = themedTransitions(transitions);
  const used = new Set(scenes.slice(1).map((s) => s.transition).filter((t) => themed.includes(t)));
  if (scenes.length < 4 || used.size >= Math.min(3, themed.length)) return scenes;
  return scenes.map((s, i) => (i === 0 ? s : { ...s, transition: posterTransitionAt(transitions, i) }));
}

/** Templates dont la vidéo par défaut doit montrer au moins trois transitions thématiques : affiches typo, Lucent, Echo Frame, Folio, Broadsheet. */
export function variesTransitions(recipe: { graphicTreatment?: string; referenceMotion?: string; editorialLayout?: string }) {
  return Boolean(getTypePoster(recipe.graphicTreatment)) || ["lucent", "echo-frame"].includes(recipe.referenceMotion ?? "") || ["folio", "broadsheet"].includes(recipe.editorialLayout ?? "");
}

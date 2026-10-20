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

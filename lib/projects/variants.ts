import { FORMAT_IDS, type VideoFormatId } from "@/config/formats";
import { totalDuration, type Scene, type SceneGraph } from "./scenes";
import { SCENE_MIN_SECONDS } from "./timeline";

/**
 * Déclinaisons en un clic : un nouveau projet, prêt à modifier, à partir d'une vidéo existante.
 * - un autre format (le moteur réadapte la mise en page tout seul : aucun appel à Claude)
 * - une version courte, dans le même format, qui garde les moments clés
 * Gratuit : seul l'export de chaque déclinaison est payant.
 */
export type VariantKind = VideoFormatId | "short";

export const VARIANT_KINDS: VariantKind[] = ["PORTRAIT", "SQUARE", "LANDSCAPE", "short"];
export const SHORT_DURATION = 15;

export function isVariantKind(value: unknown): value is VariantKind {
  return value === "short" || FORMAT_IDS.includes(value as VideoFormatId);
}

/** Déclinaisons proposables pour un projet : pas son propre format, pas de version courte si la vidéo l'est déjà. */
export function availableVariants(format: VideoFormatId, graph: SceneGraph): VariantKind[] {
  return VARIANT_KINDS.filter((kind) => (kind === "short" ? totalDuration(graph) > SHORT_DURATION : kind !== format));
}

/**
 * Version courte : l'ouverture, le logo, le premier moment produit (screens, sinon bénéfice) et l'appel à l'action,
 * dans l'ordre d'origine, avec des durées réparties au prorata (2 s minimum par scène).
 */
export function shortenGraph(graph: SceneGraph, target = SHORT_DURATION): SceneGraph {
  if (totalDuration(graph) <= target) return graph;
  const scenes = graph.scenes;
  const keep = new Set<Scene>(
    [
      scenes[0],
      scenes.find((s) => s.kind === "logo"),
      scenes.find((s) => s.kind === "screens") ?? scenes.find((s) => s.kind === "feature"),
      scenes.findLast((s) => s.kind === "cta") ?? scenes.at(-1),
    ].filter((s): s is Scene => Boolean(s)),
  );
  const kept = scenes.filter((s) => keep.has(s));
  const sum = kept.reduce((acc, s) => acc + s.duration, 0);
  const durations = kept.map((s) => Math.max(SCENE_MIN_SECONDS, Math.round((s.duration / sum) * target * 2) / 2));
  // Ajuste la plus longue scène pour tomber pile sur la durée visée
  const longest = durations.indexOf(Math.max(...durations));
  durations[longest] = Math.max(SCENE_MIN_SECONDS, durations[longest] + target - durations.reduce((a, b) => a + b, 0));
  return { ...graph, scenes: kept.map((s, i) => ({ ...s, duration: durations[i] })) };
}

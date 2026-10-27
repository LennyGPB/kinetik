import type { SceneGraph } from "@/lib/projects/scenes";
import { CUSTOM_MAX_TOTAL_SECONDS, type CustomMotionMeta } from "./contract";

/**
 * Règles d'un projet Créations, vérifiées sur le plan obtenu (montage manuel comme chat) :
 * types de scènes connus, nombre de scènes, durées, textes déclarés, et scènes non répétables ni ajoutées ni retirées.
 * Renvoie la liste des problèmes (vide = plan valide).
 */
export function customGraphIssues(meta: CustomMotionMeta, before: SceneGraph, after: SceneGraph): string[] {
  const issues: string[] = [];
  const count = after.scenes.length;
  if (count < meta.minScenes) issues.push(`Il faut au moins ${meta.minScenes} scène(s).`);
  if (count > meta.maxScenes) issues.push(`${meta.maxScenes} scènes maximum.`);
  if (after.colors && after.colors.length !== meta.colors.length) issues.push(`Il faut ${meta.colors.length} couleur(s).`);
  const total = after.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (total > CUSTOM_MAX_TOTAL_SECONDS + 1e-6) issues.push(`Durée totale limitée à ${CUSTOM_MAX_TOTAL_SECONDS} s.`);
  for (const scene of after.scenes) {
    const type = meta.sceneTypes.find((t) => t.type === scene.customType);
    if (!type) { issues.push(`Type de scène inconnu : ${scene.customType ?? scene.kind}.`); continue; }
    if (scene.screens?.length && !type.screen) issues.push(`« ${type.label} » n'affiche pas de capture.`);
    if (scene.duration < type.minDuration - 1e-6 || scene.duration > type.maxDuration + 1e-6) issues.push(`« ${type.label} » dure entre ${type.minDuration} et ${type.maxDuration} s.`);
    for (const [key, value] of Object.entries(scene.texts ?? {})) {
      const field = type.texts.find((f) => f.key === key);
      if (!field) issues.push(`« ${type.label} » n'a pas de texte « ${key} ».`);
      else if (value.length > field.max) issues.push(`« ${field.label} » : ${field.max} caractères maximum.`);
    }
  }
  const tally = (graph: SceneGraph, type: string) => graph.scenes.filter((s) => s.customType === type).length;
  for (const type of meta.sceneTypes.filter((t) => !t.repeatable)) {
    if (tally(before, type.type) !== tally(after, type.type)) issues.push(`La scène « ${type.label} » ne peut être ni ajoutée, ni dupliquée, ni supprimée.`);
  }
  return [...new Set(issues)];
}

/** Bornes de durée d'une scène Créations (frise de l'éditeur). */
export function customDurationBounds(meta: CustomMotionMeta | undefined, customType: string | undefined) {
  const type = meta?.sceneTypes.find((t) => t.type === customType);
  return type ? { min: type.minDuration, max: type.maxDuration } : null;
}

import type { SceneGraph } from "./scenes";

export type TranslationLanguage = "fr" | "en";
export type TranslationEntry = { key: string; text: string; maxLength: number };

/** Translate copy only: media, brand names, timing and all visual settings stay intact. */
export function translationEntries(graph: SceneGraph): TranslationEntry[] {
  const entries: TranslationEntry[] = [];
  graph.scenes.forEach((scene, index) => {
    if (scene.kind !== "logo" && scene.title.trim()) entries.push({ key: `scene-${index}-title`, text: scene.title, maxLength: Math.max(80, scene.title.length) });
    if (scene.subtitle?.trim()) entries.push({ key: `scene-${index}-subtitle`, text: scene.subtitle, maxLength: Math.max(120, scene.subtitle.length) });
    // Surtitre personnalisé (le nom de l'app par défaut n'est pas traduit)
    if (scene.kicker?.trim()) entries.push({ key: `scene-${index}-kicker`, text: scene.kicker, maxLength: Math.max(40, scene.kicker.length) });
    if (scene.focus?.label?.trim()) entries.push({ key: `scene-${index}-focus`, text: scene.focus.label, maxLength: Math.max(80, scene.focus.label.length) });
    scene.focuses?.forEach((focus, step) => {
      if (focus.label?.trim()) entries.push({ key: `scene-${index}-focus-${step}`, text: focus.label, maxLength: Math.max(80, focus.label.length) });
      if (focus.title?.trim()) entries.push({ key: `scene-${index}-focus-${step}-title`, text: focus.title, maxLength: Math.max(80, focus.title.length) });
    });
  });
  graph.overlays?.forEach((layer, index) => {
    if (["text", "badge"].includes(layer.type) && layer.text?.trim()) entries.push({ key: `overlay-${index}`, text: layer.text, maxLength: 160 });
  });
  return entries;
}

export function applyTranslation(graph: SceneGraph, translated: { key: string; text: string }[], language?: TranslationLanguage): SceneGraph {
  const expected = translationEntries(graph);
  const byKey = new Map(translated.map((entry) => [entry.key, entry.text.trim()]));
  if (translated.length !== expected.length || byKey.size !== expected.length || expected.some((entry) => !byKey.get(entry.key) || byKey.get(entry.key)!.length > entry.maxLength)) throw new Error("invalid_translation");
  const next = structuredClone(graph);
  if (language) next.language = language;
  next.scenes.forEach((scene, index) => {
    const title = byKey.get(`scene-${index}-title`);
    const subtitle = byKey.get(`scene-${index}-subtitle`);
    const label = byKey.get(`scene-${index}-focus`);
    if (title) scene.title = title;
    if (subtitle) scene.subtitle = subtitle;
    const kicker = byKey.get(`scene-${index}-kicker`);
    if (kicker) scene.kicker = kicker;
    if (label && scene.focus) scene.focus.label = label;
    scene.focuses?.forEach((focus, step) => {
      const translatedLabel = byKey.get(`scene-${index}-focus-${step}`);
      if (translatedLabel) focus.label = translatedLabel;
      const translatedTitle = byKey.get(`scene-${index}-focus-${step}-title`);
      if (translatedTitle) focus.title = translatedTitle;
    });
  });
  next.overlays?.forEach((layer, index) => { const text = byKey.get(`overlay-${index}`); if (text) layer.text = text; });
  return next;
}

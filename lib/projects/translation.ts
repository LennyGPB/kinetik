import { HEADLINE_MAX, type SceneGraph } from "./scenes";
import { LAYER_TEXT_MAX } from "./motion-layers";

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
    // Titres enchaînés : chacun des titres qui suivent le titre principal
    scene.lines?.forEach((line, step) => {
      if (line.trim()) entries.push({ key: `scene-${index}-line-${step}`, text: line, maxLength: Math.max(HEADLINE_MAX, line.length) });
    });
    // Texte du bouton personnalisé (l'adresse du site par défaut n'est pas traduite)
    if (scene.badge?.trim()) entries.push({ key: `scene-${index}-badge`, text: scene.badge, maxLength: Math.max(40, scene.badge.length) });
    if (scene.focus?.label?.trim()) entries.push({ key: `scene-${index}-focus`, text: scene.focus.label, maxLength: Math.max(80, scene.focus.label.length) });
    scene.focuses?.forEach((focus, step) => {
      if (focus.label?.trim()) entries.push({ key: `scene-${index}-focus-${step}`, text: focus.label, maxLength: Math.max(80, focus.label.length) });
      if (focus.title?.trim()) entries.push({ key: `scene-${index}-focus-${step}-title`, text: focus.title, maxLength: Math.max(80, focus.title.length) });
    });
    // Calques animés libres de la scène
    scene.layers?.forEach((layer) => {
      if (layer.type === "text" && layer.text?.trim()) entries.push({ key: `scene-${index}-layer-${layer.id}`, text: layer.text, maxLength: Math.max(LAYER_TEXT_MAX, layer.text.length) });
    });
  });
  graph.overlays?.forEach((layer, index) => {
    if (["text", "badge"].includes(layer.type) && layer.text?.trim()) entries.push({ key: `overlay-${index}`, text: layer.text, maxLength: 160 });
  });
  graph.voiceover?.segments.forEach((s) => { if (s.text.trim()) entries.push({ key: `voice-${s.sceneId}`, text: s.text, maxLength: 1000 }); });
  return entries;
}

export function applyTranslation(graph: SceneGraph, translated: { key: string; text: string }[], language?: TranslationLanguage): SceneGraph {
  const expected = translationEntries(graph);
  const byKey = new Map(translated.map((entry) => [entry.key, entry.text.trim()]));
  if (translated.length !== expected.length || byKey.size !== expected.length || expected.some((entry) => !byKey.get(entry.key) || byKey.get(entry.key)!.length > entry.maxLength)) throw new Error("invalid_translation");
  const next = structuredClone(graph);
  if (next.voiceover) {
    if (language) next.voiceover.language = language;
    next.voiceover.segments = next.voiceover.segments.map((s) => ({ ...s, text: byKey.get(`voice-${s.sceneId}`) ?? s.text }));
  }
  if (language) next.language = language;
  next.scenes.forEach((scene, index) => {
    const title = byKey.get(`scene-${index}-title`);
    const subtitle = byKey.get(`scene-${index}-subtitle`);
    const label = byKey.get(`scene-${index}-focus`);
    if (title) scene.title = title;
    if (subtitle) scene.subtitle = subtitle;
    const kicker = byKey.get(`scene-${index}-kicker`);
    if (kicker) scene.kicker = kicker;
    if (scene.lines) scene.lines = scene.lines.map((line, step) => byKey.get(`scene-${index}-line-${step}`) ?? line);
    const badge = byKey.get(`scene-${index}-badge`);
    if (badge) scene.badge = badge;
    if (label && scene.focus) scene.focus.label = label;
    scene.focuses?.forEach((focus, step) => {
      const translatedLabel = byKey.get(`scene-${index}-focus-${step}`);
      if (translatedLabel) focus.label = translatedLabel;
      const translatedTitle = byKey.get(`scene-${index}-focus-${step}-title`);
      if (translatedTitle) focus.title = translatedTitle;
    });
    scene.layers?.forEach((layer) => { const text = byKey.get(`scene-${index}-layer-${layer.id}`); if (text && layer.type === "text") layer.text = text; });
  });
  next.overlays?.forEach((layer, index) => { const text = byKey.get(`overlay-${index}`); if (text) layer.text = text; });
  return next;
}

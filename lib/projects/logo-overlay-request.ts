import type { SceneGraph } from "./scenes";
import type { VideoOverlay } from "./overlays";

/** Narrow, deterministic command. Creative or compound requests still go to the AI. */
export function applyPinnedLogoRequest(graph: SceneGraph, message: string, hasLogo: boolean, sceneId?: string, locale: "en" | "fr" = "fr") {
  const en = locale === "en";
  const text = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/\blogo\b/.test(text) || !/\bpetit\b/.test(text) || !/\bhaut\b/.test(text) || !/\bdroite\b/.test(text)
    || !/ajout|rajout|mets|mettre|affich|plac|position/.test(text)
    || /ne .*(?:ajout|rajout|mets|mettre|affich|plac)|sans logo|retir|supprim|enlev|\bpas\b|\bmais\b|\bpuis\b|\bet\b/.test(text)) return null;
  if (!hasLogo) return { graph: null, label: "", reply: en ? "Add your logo in Media before placing it over the video." : "Ajoute ton logo dans Médias pour pouvoir le placer sur la vidéo." };
  const global = /tout(?:e|es|es les|es mes|es ces|es ses)?\s+(?:les\s+)?scenes|chaque\s+scene|partout|toute\s+la\s+video/.test(text);
  const target = global ? null : sceneId ? [sceneId] : null;
  const current = graph.overlays?.find((layer) => layer.type === "logo" && (target === null ? layer.sceneIds === null : layer.sceneIds?.length === 1 && layer.sceneIds[0] === sceneId));
  if (!current && (graph.overlays?.length ?? 0) >= 16) return { graph: null, label: "", reply: en ? "The video already has 16 layers. Remove one in Layers before adding the logo." : "La vidéo contient déjà 16 calques. Retire un élément dans Calques avant d’ajouter le logo." };
  let id = current?.id ?? "pinned-logo";
  if (!current) {
    let suffix = 0;
    while (graph.overlays?.some((layer) => layer.id === id)) id = `pinned-logo-${++suffix}`;
  }
  const layer: VideoOverlay = { id, type: "logo", screen: null, text: null,
    x: 0.9, y: 0.08, width: 0.1, opacity: 1, rotation: 0, fontSize: 0.035,
    color: null, background: null, animation: "none", sceneIds: target, start: null, end: null };
  const overlays = [...(graph.overlays ?? []).filter((item) => item.id !== current?.id), layer];
  if (en) return { graph: { ...graph, overlays }, label: "Small logo, top right", reply: `Here's the preview with your small logo in the top right, ${target ? "on the selected scene" : "on every scene"}.` };
  return { graph: { ...graph, overlays }, label: "Petit logo en haut à droite", reply: `Voici l’aperçu avec ton petit logo en haut à droite, ${target ? "sur la scène sélectionnée" : "sur toutes les scènes"}.` };
}

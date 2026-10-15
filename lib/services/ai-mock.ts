import "server-only";
import { getTrack, MUSIC_LIBRARY } from "@/config/music";
import type { Scene, SceneGraph } from "@/lib/projects/scenes";
import { sleep } from "@/lib/utils";
import { isScenePresentation } from "@/config/scene-presentations";

/**
 * Service IA — MOCK (repli quand ANTHROPIC_API_KEY est absente, et données du seed).
 * Même signature et même format de sortie (SceneGraph) que le vrai service (ai.ts).
 * Le mock applique des règles simples sur des mots-clés pour rendre la démo crédible.
 */

export type GenerationInput = {
  locale?: "en" | "fr";
  videoType?: string;
  screenUrls?: string[];
  logoUrl?: string | null;
  appName: string;
  duration: number;
  brief?: string | null;
  musicTrackId?: string | null;
};

export type EditResult = {
  graph: SceneGraph | null;
  /** Réponse affichée dans le chat */
  reply: string;
  /** Résumé court pour l'historique des versions */
  label: string;
};

const MOCK_LATENCY_MS = 1200;

function sceneId(kind: string, index: number) {
  return `${kind}-${index}`;
}

function distribute(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => Math.max(1, Math.floor((w / sum) * total * 2) / 2));
  let remaining = Math.round((total - raw.reduce((a, b) => a + b, 0)) * 2);
  for (let i = 0; remaining !== 0; i = (i + 1) % raw.length) {
    const step = remaining > 0 ? 0.5 : -0.5;
    if (raw[i] + step < 1) continue;
    raw[i] += step;
    remaining -= Math.sign(remaining);
  }
  return raw;
}

export async function generateVideo(input: GenerationInput): Promise<SceneGraph> {
  await sleep(MOCK_LATENCY_MS);
  const track = getTrack(input.musicTrackId) ?? MUSIC_LIBRARY[0];
  const en = input.locale === "en";
  const highlight = input.brief?.split(/[.\n]/)[0]?.trim();

  const blueprint: Omit<Scene, "duration">[] = [
    { id: sceneId("intro", 0), kind: "intro", title: `${en ? "Meet" : "Voici"} ${input.appName}`, subtitle: en ? "The future of your workflow" : "Le futur de ton workflow", transition: "fade" },
    { id: sceneId("logo", 1), kind: "logo", title: input.appName, transition: "zoom" },
    { id: sceneId("feature", 2), kind: "feature", title: highlight || (en ? "Everything in one place" : "Tout au même endroit"), subtitle: en ? "Simple. Fast. Powerful." : "Simple. Rapide. Puissant.", transition: "slide" },
    { id: sceneId("screens", 3), kind: "screens", title: en ? "Built for speed" : "Pensé pour aller vite", transition: "slide" },
    { id: sceneId("cta", 4), kind: "cta", title: `${en ? "Try" : "Essaie"} ${input.appName}`, subtitle: en ? "Available today" : "Disponible dès aujourd'hui", transition: "fade" },
  ];
  const hasScreens = Boolean(input.screenUrls?.length);
  const product = { ...blueprint[3], kind: hasScreens ? "screens" as const : "feature" as const };
  const feature = blueprint[2];
  const cta = blueprint[4];
  let plan: Omit<Scene, "duration">[];
  switch (input.videoType) {
    case "demo":
      plan = [product, { ...product, title: highlight || (en ? "Everything in one place" : "Tout au même endroit") }, { ...product, title: en ? "Take action" : "Passe à l’action" }, cta];
      break;
    case "feature":
      plan = [{ ...feature, title: en ? "Focus on what matters" : "Va à l’essentiel", subtitle: undefined }, { ...product, title: highlight || (en ? "Everything in one place" : "Tout au même endroit") }, feature, cta];
      break;
    case "teaser":
      plan = [{ ...feature, title: en ? "What if…" : "Et si…", subtitle: undefined }, { ...feature, title: en ? "Everything became simple" : "Tout devenait simple", subtitle: undefined }, product, ...(input.logoUrl ? [blueprint[1]] : []), cta];
      break;
    default:
      plan = [blueprint[0], feature, product, cta];
  }
  const count = input.duration >= 30 ? 12 : input.duration >= 15 ? 7 : 5;
  let index = 0;
  while (plan.length < count) {
    const source = input.videoType === "demo" ? product : index % 2 ? product : feature;
    const insertAt = input.videoType === "teaser" && input.logoUrl ? plan.length - 2 : plan.length - 1;
    plan.splice(insertAt, 0, { ...source });
    index++;
  }
  plan = plan.map((scene, i) => ({ ...scene, id: sceneId(scene.kind, i) }));
  const shortCount = plan.filter((scene) => scene.kind === "intro" || scene.kind === "logo").length;
  const opening = input.duration === 10 ? 1 : 1.5;
  const contentDurations = distribute(input.duration - shortCount * opening, plan.filter((scene) => scene.kind !== "intro" && scene.kind !== "logo").map(() => 1));
  const durations = plan.map((scene) => scene.kind === "intro" || scene.kind === "logo" ? opening : contentDurations.shift()!);

  return {
    schema: 1,
    energy: "balanced",
    logoEmphasis: false,
    screenFrame: "phone",
    musicTrackId: input.musicTrackId ?? null,
    bpm: track.bpm,
    scenes: plan.map((scene, i) => ({ ...scene, duration: durations[i] })),
  };
}

export async function applyEdit(graph: SceneGraph, message: string, assets?: { hasLogo: boolean }): Promise<EditResult> {
  await sleep(MOCK_LATENCY_MS);
  const text = message.toLowerCase();
  const next: SceneGraph = structuredClone(graph);

  if (/logo/.test(text) && /coin|haut|bas|superpos|toutes les sc|chaque sc|fixe/.test(text)) {
    if (!assets?.hasLogo) return { graph: null, label: "", reply: "Ajoute d’abord ton logo dans Médias pour pouvoir le superposer à la vidéo." };
    const current = (next.overlays ?? []).find((layer) => layer.type === "logo");
    const others = (next.overlays ?? []).filter((layer) => layer.id !== current?.id);
    if (/retir|supprim|enlev/.test(text)) {
      next.overlays = others;
      return { graph: next, label: "Logo superposé retiré", reply: "Le logo superposé est retiré dans cet aperçu." };
    }
    next.overlays = [...others, {
      id: current?.id ?? "pinned-logo", type: "logo", screen: null, text: null,
      x: /gauche/.test(text) ? 0.1 : /centr/.test(text) ? 0.5 : current?.x ?? 0.9,
      y: /bas/.test(text) ? 0.9 : current?.y ?? 0.08,
      width: /grand/.test(text) ? 0.18 : /petit/.test(text) ? 0.1 : current?.width ?? 0.1,
      opacity: current?.opacity ?? 1, rotation: 0, fontSize: 0.035, color: null, background: null,
      animation: "none", sceneIds: current?.sceneIds ?? null, start: null, end: null,
    }];
    return { graph: next, label: "Logo superposé", reply: "Le logo est superposé à la vidéo à la position demandée dans cet aperçu." };
  }

  const presentation = /éditorial|editorial/.test(text) ? "editorial"
    : /texte et produit|split/.test(text) ? "split"
    : /lumière|lumiere|spotlight/.test(text) ? "spotlight"
    : /carte de bénéfice|carte de benefice/.test(text) ? "card"
    : /signature finale|end.card/.test(text) ? "end-card"
    : /fenêtre web|fenetre web/.test(text) ? "browser" : null;
  if (presentation) {
    next.scenes = next.scenes.map((scene) => isScenePresentation(scene.kind, presentation) ? { ...scene, presentation } : scene);
    return { graph: next, label: "Mise en scène ajustée", reply: "La composition de la scène a été mise à jour." };
  }

  if (/logo/.test(text) && /fond|tuile/.test(text)) {
    next.logoBackground = !/sans|retir|enlèv|enlev|supprim|transparent/.test(text);
    return { graph: next, label: next.logoBackground ? "Logo avec fond" : "Logo sans fond", reply: next.logoBackground ? "Le fond de la tuile du logo est rétabli." : "La tuile derrière le logo est retirée ; le fichier image reste intact." };
  }

  if (/logo|marque|icône d.app|icone d.app/.test(text)) {
    const layout = /orbit/.test(text) ? "orbit"
      : /affiche|poster/.test(text) ? "poster"
      : /écho|echo/.test(text) ? "echo"
      : /emblème|embleme/.test(text) ? "emblem"
      : /signature/.test(text) ? "signature"
      : /typograph/.test(text) ? "typographic"
      : /produit|captures|screens/.test(text) ? "product"
      : /icône|icone/.test(text) ? "app-icon" : null;
    if (layout) {
      next.logoLayout = layout;
      return { graph: next, label: "Mise en scène du logo", reply: "La mise en scène du logo a été mise à jour." };
    }
  }

  if (/dynamique|punch|rapide|énerg/.test(text)) {
    next.energy = "high";
    next.scenes = next.scenes.map((s, i) => ({ ...s, transition: i % 2 ? "glitch" : "zoom" }));
    return { graph: next, label: "Plus dynamique", reply: "J'ai accéléré le rythme : transitions en zoom et glitch calées sur chaque temps fort." };
  }

  if (/court|raccourc|moins long/.test(text)) {
    const total = next.scenes.reduce((sum, s) => sum + s.duration, 0);
    const target = Math.max(next.scenes.length === 1 ? 1 : 10, Math.round(total * 0.75 * 2) / 2);
    const durations = distribute(target, next.scenes.map((s) => s.duration));
    next.scenes = next.scenes.map((s, i) => ({ ...s, duration: durations[i] }));
    return { graph: next, label: `Raccourcie à ${target} s`, reply: `C'est plus court : la vidéo passe à ${target} secondes, sans perdre les moments clés.` };
  }

  if (/musique|son|track|morceau/.test(text)) {
    const current = MUSIC_LIBRARY.findIndex((t) => t.id === next.musicTrackId);
    const track = MUSIC_LIBRARY[(current + 1) % MUSIC_LIBRARY.length];
    next.musicTrackId = track.id;
    next.bpm = track.bpm;
    return { graph: next, label: `Musique : ${track.title}`, reply: `Nouvelle bande-son : « ${track.title} » (${track.bpm} BPM). J'ai recalé les animations sur le tempo.` };
  }

  if (/téléphone|telephone|mobile|iphone|smartphone|mockup|navigateur|browser/.test(text)) {
    next.screenFrame = /navigateur|browser/.test(text) ? "browser" : "phone";
    return { graph: next, label: next.screenFrame === "phone" ? "Mockup téléphone" : "Mockup navigateur", reply: next.screenFrame === "phone" ? "Tes screens sont maintenant présentés dans un téléphone." : "Tes screens sont maintenant présentés dans une fenêtre de navigateur." };
  }

  // Réglages de mise en scène (même effet que les réglages rapides de l'éditeur)
  const count = /un seul|1 seul|une seule/.test(text) ? 1 : /deux|2 (écrans|mockups|téléphones)/.test(text) ? 2 : /trois|3 (écrans|mockups|téléphones)/.test(text) ? 3 : null;
  if (count && /écran|mockup|téléphone|screen/.test(text)) {
    next.scenes = next.scenes.map((s) => (s.kind === "screens" ? { ...s, screenCount: count } : s));
    return { graph: next, label: count === 1 ? "Mockups : 1 écran" : `Mockups : ${count} écrans`, reply: count === 1 ? "C'est fait : un seul écran par scène de mockups." : `C'est fait : ${count} écrans par scène de mockups.` };
  }
  if (/éventail|eventail/.test(text)) {
    next.scenes = next.scenes.map((s) => (s.kind === "screens" ? { ...s, layout: "fan" } : s));
    return { graph: next, label: "Mockups : En éventail", reply: "Tes mockups sont maintenant présentés en éventail." };
  }
  if (/lettre par lettre/.test(text)) {
    next.titleAnimation = "letters";
    return { graph: next, label: "Animation : Lettre par lettre", reply: "Les textes apparaissent maintenant lettre par lettre." };
  }

  if (/logo|marque/.test(text)) {
    next.logoEmphasis = true;
    next.scenes = next.scenes.map((s) => (s.kind === "logo" ? { ...s, duration: s.duration + 1, transition: "zoom" } : s));
    return { graph: next, label: "Logo mis en avant", reply: "Le logo a maintenant plus de place : apparition plus longue, zoom d'entrée et rappel en fin de vidéo." };
  }

  // Par défaut : on retravaille le texte de la scène "feature"
  next.scenes = next.scenes.map((s) => (s.kind === "feature" || (next.scenes.length === 1 && s.kind !== "logo") ? { ...s, title: message.slice(0, 60) } : s));
  return { graph: next, label: "Message ajusté", reply: "C'est noté ! J'ai intégré ta demande dans la scène principale. Dis-moi si tu veux aller plus loin." };
}

export function welcomeMessage(appName: string, locale: "en" | "fr" = "fr") {
  if (locale === "en") return `Your video for ${appName} is ready! Ask me to change the pacing, text, music, logo and more.`;
  return `Ta vidéo pour ${appName} est prête ! Demande-moi n'importe quelle modification : rythme, textes, musique, mise en avant du logo…`;
}

// ⚠️ Fichier aussi bundlé par Remotion : imports RELATIFS uniquement.
import { sceneFocuses, type Scene, type ScreenFocus, type Transition } from "../lib/projects/scenes";
import { deviceSpec } from "./device-mockups";

/**
 * Templates en vraie 3D (remotion/video/stage3d.tsx + un décor par univers dans remotion/video/stage-envs/).
 * Un appareil (le mockup du projet) dans un univers ; une seule caméra voyage d'une scène à l'autre.
 * Ce fichier ne contient que de la logique pure (testée) : univers, plans de caméra, transitions, contenu des écrans.
 * Guide : docs/STAGE-3D.md
 */

export const STAGE_KINDS = ["orbit", "monument", "shoot", "aquarium", "zen", "kiosk", "obsidian", "halo", "magnet", "vault", "gyroscope"] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

/**
 * Univers 3D : identifiant du template, transition signature, ambiance claire ou sombre,
 * couleur dominante du décor (elle décide de la couleur du texte), titres de démo.
 */
export const STAGE_THEMES: Record<StageKind, {
  templateId: string; name: string; signature: Transition; light: boolean; base: string;
  headline: { en: string; fr: string }; description: { en: string; fr: string };
}> = {
  gyroscope: {
    templateId: "orbit-3d", name: "Orbit 3D", signature: "gyro-turn", light: false, base: "#080E14",
    headline: { en: "A world around you.", fr: "Une nouvelle orbite." },
    description: { fr: "Deux arcs métalliques tournent autour de votre app comme un gyroscope, au-dessus d’un plateau miroir. Les orbites accélèrent entre les scènes.", en: "Two metallic arcs revolve around your app like a gyroscope above a mirrored stage. Their orbits accelerate between scenes." },
  },
  magnet: {
    templateId: "magnet", name: "Magnet", signature: "magnetic-lock", light: false, base: "#080D15",
    headline: { en: "Perfectly balanced.", fr: "L’équilibre parfait." },
    description: { fr: "Votre app en lévitation entre deux blocs de métal brossé. Les blocs se rapprochent puis s’écartent pour révéler chaque nouvelle capture.", en: "Your app levitates between two brushed-metal blocks. The blocks close and reopen to reveal each new screen." },
  },
  vault: {
    templateId: "vault", name: "Vault", signature: "vault-pass", light: true, base: "#EAE4D9",
    headline: { en: "Room for possibility.", fr: "Ouvrez les perspectives." },
    description: { fr: "Votre app au cœur d’une galerie d’arches en pierre claire. Une lumière naturelle dessine les volumes et la caméra franchit une arche entre les scènes.", en: "Your app in a gallery of pale stone arches. Natural light shapes the space as the camera passes an arch between scenes." },
  },
  obsidian: {
    templateId: "obsidian", name: "Obsidian", signature: "stone-slide", light: false, base: "#101114",
    headline: { en: "Quietly exceptional.", fr: "L’élégance, simplement." },
    description: { fr: "Votre app sur un socle de pierre noire, entre parois sculpturales et lumière rasante. Les parois coulissent pour révéler chaque nouveau plan.", en: "Your app on a black stone plinth, framed by sculptural walls and grazing light. Sliding walls reveal each new shot." },
  },
  halo: {
    templateId: "halo", name: "Halo", signature: "halo-pass", light: false, base: "#080D18",
    headline: { en: "A new perspective.", fr: "Une nouvelle perspective." },
    description: { fr: "Votre app sur un plateau suspendu, devant un grand anneau lumineux. La caméra avance dans la lumière entre les scènes.", en: "Your app on a suspended platform in front of a luminous ring. The camera glides into the light between scenes." },
  },
  orbit: {
    templateId: "stage", name: "Stage", signature: "turntable", light: false, base: "#09090C",
    headline: { en: "Goal reached.", fr: "Objectif atteint." },
    description: { fr: "Votre app en vraie 3D sur un plateau miroir cerclé d’anneaux de lumière, avec une caméra qui tourne autour.", en: "Your app in real 3D on a mirrored stage ringed with light, filmed by an orbiting camera." },
  },
  monument: {
    templateId: "monument", name: "Array", signature: "array-sweep", light: false, base: "#0B0D12",
    headline: { en: "Every angle matters.", fr: "Chaque angle compte." },
    description: { fr: "Votre app sur un plateau miroir, entourée de lames métalliques sculpturales. Elles pivotent en vague et font voyager la lumière entre les scènes.", en: "Your app on a mirrored stage framed by sculptural metal vanes. They pivot in a wave, sweeping light between scenes." },
  },
  shoot: {
    templateId: "shoot", name: "Shoot", signature: "flash", light: true, base: "#F2F2EF",
    headline: { en: "Picture perfect.", fr: "Parfait sous tous les angles." },
    description: { fr: "Séance photo produit : fond infini, boîtes à lumière, plateau tournant et reflet parfait. Chaque flash, un nouveau cadrage.", en: "Product photo shoot: infinite backdrop, softboxes, turntable and a flawless reflection. Every flash, a new angle." },
  },
  aquarium: {
    templateId: "aquarium", name: "Aquarium", signature: "current", light: false, base: "#06324A",
    headline: { en: "Dive right in.", fr: "Plongez dedans." },
    description: { fr: "Votre app flotte dans une eau turquoise traversée de rayons de soleil, entre bulles, algues et reflets sur le sable.", en: "Your app floats in turquoise water pierced by sunbeams, among bubbles, seaweed and light ripples on the sand." },
  },
  zen: {
    templateId: "zen", name: "Zen", signature: "rake", light: true, base: "#ECE4D6",
    headline: { en: "Find your calm.", fr: "Trouvez votre calme." },
    description: { fr: "Jardin japonais à l’heure dorée : sable ratissé, pierres moussues et pétales de cerisier qui tombent autour de votre app.", en: "Japanese garden at golden hour: raked sand, mossy stones and cherry petals drifting around your app." },
  },
  kiosk: {
    templateId: "kiosk", name: "Kiosque", signature: "district", light: true, base: "#E9EFF4",
    headline: { en: "Right around the corner.", fr: "Juste au coin de la rue." },
    description: { fr: "Ville miniature vue d’hélicoptère : votre app se dresse comme une tour, et la caméra survole la ville d’un quartier à l’autre.", en: "Miniature city seen from a helicopter: your app towers over the streets as the camera flies from one district to the next." },
  },
};

export function stageTheme(kind: StageKind | undefined) {
  return STAGE_THEMES[kind ?? "orbit"];
}

/** Transitions signatures des univers 3D (la caméra et le décor font le geste, les textes suivent). */
export const STAGE_TRANSITIONS = ["turntable", "sunpath", "flash", "current", "rake", "district", "stone-slide", "halo-pass", "magnetic-lock", "vault-pass", "array-sweep", "gyro-turn"] as const satisfies readonly Transition[];

/** Plan de caméra : orbite autour de l'appareil (degrés, unités de scène : un téléphone mesure 2 de haut). */
export type Shot = {
  /** Angle autour de l'appareil (0 = de face, > 0 = caméra à droite) */
  az: number;
  /** Hauteur de la caméra (degrés au-dessus du sol) */
  el: number;
  /** Distance à l'appareil */
  dist: number;
  /** Hauteur visée */
  ty: number;
  /** Position de l'appareil dans l'image (0 → 1), hors perspective : laisse la place au texte */
  x: number;
  y: number;
};

export type StageFormat = "landscape" | "portrait" | "square";
export function stageFormat(aspectRatio: number): StageFormat {
  return aspectRatio > 1.15 ? "landscape" : aspectRatio < 0.87 ? "portrait" : "square";
}

/** Où l'appareil se place dans l'image : à droite du texte (paysage, carré), sous le texte (portrait), ou au centre. */
function framing(format: StageFormat, centered: boolean) {
  if (centered) return format === "portrait" ? { x: 0.5, y: 0.57, zoom: 1.35 } : { x: 0.5, y: 0.55, zoom: 1 };
  if (format === "portrait") return { x: 0.5, y: 0.63, zoom: 1.28 };
  if (format === "square") return { x: 0.7, y: 0.53, zoom: 1.22 };
  return { x: 0.69, y: 0.52, zoom: 1 };
}

type Pair = [Omit<Shot, "x" | "y">, Omit<Shot, "x" | "y">];
type ShotOf = { az: number; el: number; dist: number; ty: number };
const pair = (a: ShotOf, b: ShotOf): Pair => [a, b];

/**
 * Début et fin du plan de chaque type de scène, propres à chaque univers ; `side` alterne le côté d'une scène à l'autre.
 * Array (identifiant monument) : orbites mesurées entre les lames · Orbit 3D : plans larges autour du gyroscope · Shoot : cadrages nets ·
 * Aquarium : dérive, parfois en contre-plongée · Zen : plans lents et bas, presque immobiles · Kiosque : hélicoptère en plongée.
 */
function shotPair(theme: StageKind, kind: Scene["kind"], side: 1 | -1): Pair {
  switch (theme) {
    case "gyroscope":
      if (kind === "intro") return pair({ az: -26, el: 22, dist: 13, ty: 1.55 }, { az: -12, el: 10, dist: 9.6, ty: 1.4 });
      if (kind === "screens") return pair({ az: 5 * side, el: 5, dist: 7.4, ty: 1.25 }, { az: 0, el: 4, dist: 6.7, ty: 1.2 });
      if (kind === "cta") return pair({ az: -10, el: 10, dist: 9.8, ty: 1.4 }, { az: -28, el: 22, dist: 13.8, ty: 1.5 });
      return pair({ az: 24 * side, el: 12, dist: 10, ty: 1.4 }, { az: 15 * side, el: 8, dist: 9.3, ty: 1.35 });
    case "magnet":
      if (kind === "intro") return pair({ az: -28, el: 16, dist: 11.8, ty: 1.5 }, { az: -12, el: 8, dist: 8.8, ty: 1.45 });
      if (kind === "screens") return pair({ az: 5 * side, el: 4, dist: 6.4, ty: 1.45 }, { az: 1 * side, el: 3, dist: 5.8, ty: 1.4 });
      if (kind === "cta") return pair({ az: -8, el: 8, dist: 8.4, ty: 1.45 }, { az: -24, el: 18, dist: 12, ty: 1.4 });
      return pair({ az: 23 * side, el: 10, dist: 8.8, ty: 1.45 }, { az: 13 * side, el: 7, dist: 8.1, ty: 1.45 });
    case "vault":
      if (kind === "intro") return pair({ az: -15, el: 14, dist: 13.5, ty: 1.3 }, { az: -7, el: 7, dist: 9.5, ty: 1.15 });
      if (kind === "screens") return pair({ az: 4 * side, el: 4, dist: 6.1, ty: 1.05 }, { az: 0, el: 3, dist: 5.5, ty: 1.05 });
      if (kind === "cta") return pair({ az: -5, el: 6, dist: 9, ty: 1.1 }, { az: -12, el: 13, dist: 14, ty: 1.25 });
      return pair({ az: 14 * side, el: 8, dist: 9.2, ty: 1.15 }, { az: 8 * side, el: 6, dist: 8.5, ty: 1.1 });
    case "obsidian":
      if (kind === "intro") return pair({ az: -30, el: 12, dist: 10, ty: 1.2 }, { az: -16, el: 7, dist: 7.8, ty: 1.15 });
      if (kind === "screens") return pair({ az: 5 * side, el: 4, dist: 5.8, ty: 1.1 }, { az: 2 * side, el: 3, dist: 5.3, ty: 1.1 });
      if (kind === "cta") return pair({ az: -8, el: 6, dist: 7.8, ty: 1.1 }, { az: -23, el: 15, dist: 11, ty: 1.05 });
      return pair({ az: 24 * side, el: 8, dist: 7.8, ty: 1.15 }, { az: 16 * side, el: 6, dist: 7.3, ty: 1.1 });
    case "halo":
      if (kind === "intro") return pair({ az: -22, el: 20, dist: 12, ty: 1.25 }, { az: -8, el: 8, dist: 8.4, ty: 1.2 });
      if (kind === "screens") return pair({ az: 6 * side, el: 4, dist: 5.8, ty: 1.12 }, { az: 0, el: 3, dist: 5.2, ty: 1.1 });
      if (kind === "cta") return pair({ az: -6, el: 8, dist: 8.2, ty: 1.15 }, { az: -18, el: 18, dist: 12.5, ty: 1.2 });
      return pair({ az: 20 * side, el: 10, dist: 8.6, ty: 1.2 }, { az: 12 * side, el: 7, dist: 7.8, ty: 1.15 });
    case "monument":
      if (kind === "intro") return pair({ az: -28, el: 20, dist: 12, ty: 1.3 }, { az: -12, el: 8, dist: 9, ty: 1.15 });
      if (kind === "screens") return pair({ az: 5 * side, el: 5, dist: 6.1, ty: 1.1 }, { az: 0, el: 3, dist: 5.6, ty: 1.05 });
      if (kind === "cta") return pair({ az: -8, el: 8, dist: 9, ty: 1.15 }, { az: -24, el: 20, dist: 12.5, ty: 1.3 });
      return pair({ az: 25 * side, el: 10, dist: 9.2, ty: 1.15 }, { az: 16 * side, el: 7, dist: 8.5, ty: 1.1 });
    case "shoot":
      if (kind === "intro") return pair({ az: 0, el: 6, dist: 9.5, ty: 1.05 }, { az: -18, el: 9, dist: 7, ty: 1 });
      if (kind === "screens") return pair({ az: 0, el: 4, dist: 5.4, ty: 1 }, { az: 0, el: 3, dist: 5.1, ty: 1 });
      if (kind === "stat") return pair({ az: 18 * side, el: 46, dist: 6.6, ty: 0.8 }, { az: 14 * side, el: 42, dist: 6.4, ty: 0.85 });
      if (kind === "logo") return pair({ az: 0, el: -3, dist: 6.6, ty: 1.15 }, { az: 0, el: -2, dist: 6.3, ty: 1.12 });
      if (kind === "cta") return pair({ az: -8, el: 7, dist: 7.2, ty: 1 }, { az: -14, el: 9, dist: 7.6, ty: 1 });
      return pair({ az: 34 * side, el: 8, dist: 6.9, ty: 1 }, { az: 30 * side, el: 9, dist: 6.6, ty: 1 });
    case "aquarium":
      if (kind === "intro") return pair({ az: -30, el: 34, dist: 12, ty: 1 }, { az: -14, el: 6, dist: 7.6, ty: 1 });
      if (kind === "screens") return pair({ az: 8 * side, el: 2, dist: 5.7, ty: 1.02 }, { az: 2 * side, el: 3, dist: 5, ty: 1 });
      if (kind === "logo") return pair({ az: 0, el: -14, dist: 7, ty: 1.3 }, { az: 4 * side, el: -9, dist: 6.4, ty: 1.2 });
      if (kind === "cta") return pair({ az: -10, el: 2, dist: 7.2, ty: 1 }, { az: -22, el: -10, dist: 9.4, ty: 1.4 });
      return pair({ az: 24 * side, el: -5, dist: 7.4, ty: 1.1 }, { az: 12 * side, el: 3, dist: 6.8, ty: 1 });
    case "zen":
      if (kind === "intro") return pair({ az: -24, el: 14, dist: 10.5, ty: 1 }, { az: -18, el: 8, dist: 8.4, ty: 1 });
      if (kind === "screens") return pair({ az: 6 * side, el: 4, dist: 5.6, ty: 1.02 }, { az: 3 * side, el: 3, dist: 5.2, ty: 1 });
      if (kind === "cta") return pair({ az: -6, el: 6, dist: 7.6, ty: 1 }, { az: -12, el: 12, dist: 9.6, ty: 0.9 });
      return pair({ az: 22 * side, el: 5, dist: 7.6, ty: 1 }, { az: 17 * side, el: 6, dist: 7.1, ty: 1 });
    case "kiosk":
      if (kind === "intro") return pair({ az: -40, el: 62, dist: 22, ty: 0.6 }, { az: -22, el: 34, dist: 10.5, ty: 0.9 });
      if (kind === "screens") return pair({ az: 10 * side, el: 12, dist: 6, ty: 1.02 }, { az: 4 * side, el: 9, dist: 5.4, ty: 1 });
      if (kind === "cta") return pair({ az: -16, el: 30, dist: 10, ty: 0.9 }, { az: -40, el: 55, dist: 21, ty: 0.6 });
      return pair({ az: 36 * side, el: 38, dist: 10.5, ty: 0.9 }, { az: 22 * side, el: 32, dist: 9.6, ty: 0.95 });
    default:
      return orbitPair(kind, side);
  }
}

function orbitPair(kind: Scene["kind"], side: 1 | -1): Pair {
  switch (kind) {
    // Grue d'ouverture : la caméra descend de haut et de loin jusqu'au trois-quarts
    case "intro": return [{ az: -42, el: 30, dist: 11.5, ty: 1 }, { az: -18, el: 11, dist: 7.6, ty: 1 }];
    // Contre-plongée héroïque, face à l'écran
    case "logo": return [{ az: 6 * side, el: 1.5, dist: 6.9, ty: 1.15 }, { az: -4 * side, el: 4, dist: 6.2, ty: 1.08 }];
    // Gros plan presque frontal : l'écran est lisible
    case "screens": return [{ az: 9 * side, el: 6, dist: 5.6, ty: 1.02 }, { az: 2 * side, el: 3, dist: 4.9, ty: 1 }];
    // Chiffre : plongée légère, orbite lente
    case "stat": return [{ az: 30 * side, el: 16, dist: 7.4, ty: 0.95 }, { az: 18 * side, el: 12, dist: 7, ty: 1 }];
    // Fin : la caméra recule et s'élève, les anneaux occupent le cadre
    case "cta": return [{ az: -12, el: 9, dist: 6.9, ty: 1 }, { az: -26, el: 21, dist: 9.6, ty: 0.9 }];
    default: return [{ az: 26 * side, el: 9, dist: 7.3, ty: 1 }, { az: 13 * side, el: 7, dist: 6.7, ty: 1.02 }];
  }
}

export type StageScene = {
  kind: Scene["kind"]; transition: Transition; from: number; duration: number; deviceCount: number; showDevice: boolean;
  /** Mises en avant (zoom / découpe) de la scène, dans l'ordre ; jouées en 3D sur l'écran de l'appareil */
  focus?: ScreenFocus[];
};

/** Plan d'une scène à sa progression `t` (0 → 1), cadré pour le format. */
export function sceneShot(scene: StageScene, index: number, t: number, format: StageFormat, theme: StageKind = "orbit"): Shot {
  const centered = scene.kind === "screens";
  const [a, b] = shotPair(theme, scene.kind, index % 2 ? -1 : 1);
  const f = framing(format, centered);
  // Plusieurs appareils côte à côte : la caméra recule d'autant
  const spread = 1 + 0.42 * (Math.max(1, scene.deviceCount) - 1);
  const k = easeInOutSine(clamp01(t));
  return {
    az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), ty: lerp(a.ty, b.ty, k),
    dist: lerp(a.dist, b.dist, k) * f.zoom * spread,
    x: f.x, y: f.y,
  };
}

/** Durée (images) des deux moitiés d'une transition de plateau : fin de la scène précédente, début de la suivante. */
export function stageTransitionFrames(transition: Transition) {
  if (transition === "array-sweep") return { out: 20, in: 26 };
  if (transition === "gyro-turn") return { out: 22, in: 28 };
  if (transition === "magnetic-lock") return { out: 18, in: 22 };
  if (transition === "vault-pass") return { out: 22, in: 26 };
  if (transition === "stone-slide") return { out: 18, in: 22 };
  if (transition === "halo-pass") return { out: 20, in: 24 };
  // Coupe nette : le flash (Shoot) et le râteau (Zen) masquent eux-mêmes le changement de plan
  if (transition === "cut" || transition === "flash" || transition === "rake") return { out: 0, in: 0 };
  if (transition === "turntable" || transition === "current") return { out: 14, in: 18 };
  if (transition === "sunpath") return { out: 16, in: 22 };
  if (transition === "district") return { out: 22, in: 28 };
  return { out: 10, in: 18 };
}

export type StageState = {
  shot: Shot;
  /** Rotation supplémentaire de l'appareil sur lui-même (radians) : le tour de plateau */
  spin: number;
  /** Écran affiché : scène `a`, en fondu vers la scène `b` (`mix` de 0 à 1) */
  screen: { a: number; b: number; mix: number };
  /** Appareils visibles (0 → 3, fractionnaire pendant un changement) */
  devices: number;
  /** Onde de lumière qui court sur le sol après une frontière : progression 0 → 1, ou -1 */
  wave: number;
  /** Scène active (index) et progression dans cette scène */
  index: number;
  progress: number;
  /**
   * Mise en avant en cours : scène concernée, image locale à cette scène, et poids (1, puis 0 pendant la transition
   * vers la scène suivante : la caméra ressort du zoom et la découpe regagne l'écran au lieu de sauter).
   */
  focus: { scene: number; frame: number; weight: number } | null;
  /** Emplacement de l'appareil au sol (x, z) : fixe, sauf Kiosque où chaque scène a son quartier */
  spot: [number, number];
  /** Horloge du décor (0 → 1) : avance lentement pendant les scènes et accélère pendant les transitions (course du soleil) */
  clock: number;
  /** Transition en cours et sa progression (0 → 1, adoucie), pour les effets du décor (bulles, flash…) */
  transition: { kind: Transition; k: number; to: number } | null;
};

/**
 * Quartier de la scène `index` (Kiosque) : les quartiers se suivent sur une spirale (7 à 12 unités de l'un au suivant),
 * sans jamais se chevaucher ; le premier est au centre de la ville.
 */
export function stageSpot(theme: StageKind, index: number): [number, number] {
  if (theme !== "kiosk" || index === 0) return [0, 0];
  const r = 14 + 1.1 * index, a = 0.45 * index;
  return [Math.round((r * Math.cos(a) - 14) * 100) / 100, Math.round(r * Math.sin(a) * 100) / 100];
}

/**
 * État du plateau à l'image `frame` : tout dérive de la frame (déterministe).
 * Entre deux scènes, la caméra glisse du plan de fin de l'une au plan de début de l'autre ;
 * en `turntable`, l'appareil fait un tour complet et change d'écran quand il montre son dos ; en `cut`, le plan change net.
 */
export function stageState(scenes: StageScene[], frame: number, format: StageFormat, theme: StageKind = "orbit"): StageState {
  const last = scenes.length - 1;
  let index = 0;
  for (let i = 0; i <= last; i++) if (frame >= scenes[i].from) index = i;
  const scene = scenes[index];
  const deviceCount = (s: StageScene) => (s.showDevice ? Math.max(1, Math.min(3, s.deviceCount)) : 0);
  const base = (i: number, t: number) => sceneShot(scenes[i], i, t, format, theme);
  // Partie « tenue » d'une scène : entre la fin de son entrée et le début de la sortie vers la suivante
  const span = (i: number) => {
    const s = scenes[i];
    const enter = i > 0 ? stageTransitionFrames(s.transition).in : 0;
    const leave = i < last ? stageTransitionFrames(scenes[i + 1].transition).out : 0;
    const start = s.from + Math.min(enter, s.duration / 2);
    const end = Math.max(start, s.from + s.duration - Math.min(leave, s.duration / 2));
    return { start, end };
  };
  const progressIn = (i: number, f: number) => {
    const { start, end } = span(i);
    return end > start ? clamp01((f - start) / (end - start)) : 0;
  };

  const local = frame - scene.from;
  const tr = stageTransitionFrames(scene.transition);
  const enter = index > 0 ? Math.min(tr.in, scene.duration / 2) : 0;
  const next = index < last ? scenes[index + 1] : undefined;
  const leave = next ? Math.min(stageTransitionFrames(next.transition).out, scene.duration / 2) : 0;
  const untilNext = scene.from + scene.duration - frame;

  // Position dans une transition : `p` de 0 (fin de la scène précédente) à 1 (scène suivante posée)
  let blend: { from: number; to: number; p: number; transition: Transition } | undefined;
  if (index > 0 && local < enter) {
    const out = Math.min(stageTransitionFrames(scene.transition).out, scenes[index - 1].duration / 2);
    blend = { from: index - 1, to: index, p: (out + local) / (out + enter), transition: scene.transition };
  } else if (next && untilNext <= leave) {
    const inFrames = Math.min(stageTransitionFrames(next.transition).in, next.duration / 2);
    blend = { from: index, to: index + 1, p: (leave - untilNext) / (leave + inFrames), transition: next.transition };
  }

  // Mise en avant : la scène quittée garde la sienne pendant toute la transition, en s'effaçant
  const focusScene = blend && blend.to === index ? blend.from : index;
  const focusWeight = blend && blend.from === focusScene ? 1 - easeInOutCubic(clamp01(blend.p)) : 1;
  const focus = scenes[focusScene]?.focus?.length && scenes[focusScene].showDevice
    ? { scene: focusScene, frame: Math.min(frame - scenes[focusScene].from, scenes[focusScene].duration - 1), weight: focusWeight }
    : null;

  let shot = base(index, progressIn(index, frame));
  let spin = 0;
  let screen = { a: index, b: index, mix: 0 };
  let devices = deviceCount(scene);
  let spot = stageSpot(theme, index);
  // Horloge : 30 % de chaque tranche pendant la scène, 70 % pendant la transition qui suit (accéléré)
  let clock = (index + 0.3 * progressIn(index, frame)) / Math.max(1, scenes.length);
  let transition: StageState["transition"] = null;
  if (blend) {
    const k = easeInOutCubic(clamp01(blend.p));
    const from = base(blend.from, 1), to = base(blend.to, 0);
    shot = lerpShot(from, to, k);
    devices = lerp(deviceCount(scenes[blend.from]), deviceCount(scenes[blend.to]), k);
    const a = stageSpot(theme, blend.from), b = stageSpot(theme, blend.to);
    spot = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    clock = (blend.from + 0.3 + 0.7 * k) / Math.max(1, scenes.length);
    transition = { kind: blend.transition, k, to: blend.to };
    if (blend.transition === "vault-pass") {
      const travel = Math.sin(Math.PI * k);
      shot = { ...shot, dist: shot.dist * (1 - 0.14 * travel), az: shot.az + 3 * travel };
    }
    if (blend.transition === "halo-pass") {
      const travel = Math.sin(Math.PI * k);
      shot = { ...shot, dist: shot.dist * (1 - 0.18 * travel), az: shot.az + 6 * travel };
    }
    if (blend.transition === "district") {
      // Survol : la caméra prend de la hauteur et du recul au milieu du trajet
      const lift = Math.sin(Math.PI * k);
      shot = { ...shot, el: shot.el + 22 * lift, dist: shot.dist * (1 + 0.7 * lift) };
    }
    if (blend.transition === "turntable" || blend.transition === "current") {
      // Courbe sinusoïdale : vitesse de pointe ~18° par image, sans saccade
      spin = -Math.PI * 2 * easeInOutSine(clamp01(blend.p));
      // L'écran change quand l'appareil montre son dos (demi-tour)
      screen = k < 0.5 ? { a: blend.from, b: blend.from, mix: 0 } : { a: blend.to, b: blend.to, mix: 0 };
    } else {
      screen = { a: blend.from, b: blend.to, mix: k };
    }
  }

  // Onde de sol : part de chaque frontière (sauf la première scène, qui a sa propre montée)
  const since = index > 0 ? local : local - 18;
  const wave = since >= 0 && since < 40 ? since / 40 : -1;
  return { shot, spin, screen, devices, wave, index, progress: scene.duration > 0 ? clamp01(local / scene.duration) : 0, focus, spot, clock, transition };
}

/** Ce que l'écran de l'appareil montre pour une scène : capture(s) fournie(s), écran d'accueil au logo, ou maquette. */
export type ScreenContent = { kind: "image"; src: string } | { kind: "splash" } | { kind: "mock"; variant: number };

export function stageScreens(scenes: Scene[], screenUrls: string[], pick: (scene: Scene) => string[]): ScreenContent[][] {
  let textIndex = 0;
  return scenes.map((scene) => {
    if (scene.kind === "logo" || scene.kind === "cta") return [{ kind: "splash" }];
    if (scene.kind === "screens") {
      // Mise en avant : l'écran montre les captures des cadrages, dans l'ordre
      const framed = [...new Set(sceneFocuses(scene).map((focus) => focus.src).filter((src) => screenUrls.includes(src)))];
      if (framed.length) return framed.map((src) => ({ kind: "image", src }));
      const urls = pick(scene);
      return urls.length ? urls.map((src) => ({ kind: "image", src })) : Array.from({ length: Math.max(1, Math.min(3, scene.screenCount ?? 1)) }, (_, i) => ({ kind: "mock", variant: i }));
    }
    // Scènes de texte : les captures défilent d'une scène à l'autre
    const k = textIndex++;
    return [screenUrls.length ? { kind: "image", src: screenUrls[k % screenUrls.length] } : { kind: "mock", variant: k }];
  });
}

/** L'appareil 3D cède la place à une mise en page 2D choisie par l'utilisateur (mise en avant, mise en scène, présentation). */
export function stageShowsDevice(scene: Scene, userLogoLayout: boolean) {
  if (scene.presentation) return false;
  if (scene.kind === "headlines" || scene.pitchVisual?.chart) return false;
  if (scene.kind === "logo" && (userLogoLayout || scene.logoLayout)) return false;
  if (scene.kind === "screens" && scene.layout && !sceneFocuses(scene).length) return false;
  return true;
}

// ───────────── Mises en avant (zoom / découpe) en 3D ─────────────

/** Zone en fractions (0 → 1, origine en haut à gauche). */
export type FocusRect = { x: number; y: number; w: number; h: number };

export type StageFocusState = {
  /** Cadrage en cours (index), zone affichée (interpolée entre deux cadrages) */
  index: number;
  rect: FocusRect;
  /** Cadre lumineux qui repère la zone sur l'écran (0 → 1) */
  mark: number;
  /** Caméra plongée dans la zone (0 → 1) */
  zoom: number;
  /** Découpe sortie de l'écran (0 → 1) */
  pop: number;
  /** Capture affichée : `src`, en fondu depuis `previousSrc` (`srcMix` 0 → 1) */
  src: string;
  previousSrc: string;
  srcMix: number;
  animation?: ScreenFocus["animation"];
  label?: string;
  /** Début et durée du cadrage (images locales à la scène) */
  start: number;
  frames: number;
};

/**
 * Calendrier d'une mise en avant, calqué sur la version 2D (remotion/video/focus.tsx) : repère à 16 images, plongée de 30 à 56.
 * Plusieurs cadrages se partagent la scène ; on passe de l'un à l'autre sans revenir à l'écran entier (la zone glisse).
 */
export function stageFocusState(steps: ScreenFocus[], duration: number, local: number): StageFocusState {
  const n = steps.length;
  const start = (i: number) => Math.round((i * duration) / n);
  let index = 0;
  for (let i = 0; i < n; i++) if (local >= start(i)) index = i;
  const step = steps[index];
  const frames = Math.max(1, start(index + 1) - start(index));
  const f = local - start(index);
  const level = (focus: ScreenFocus) => ({ zoom: focus.mode === "zoom" ? 1 : 0, pop: focus.mode === "popout" ? 1 : 0 });
  const base = { index, src: step.src, animation: step.animation, label: step.label?.trim() || undefined, start: start(index), frames };
  if (index === 0) {
    const ff = f * (n > 1 ? Math.max(1, 75 / frames) : 1);
    const mark = clamp01((ff - 16) / 10);
    const act = easeInOutCubic(clamp01((ff - 30) / 26));
    const { zoom, pop } = level(step);
    return { ...base, rect: rectOf(step), mark: mark * (1 - act * (pop ? 1 : 0.7)), zoom: zoom * act, pop: pop * act, previousSrc: step.src, srcMix: 1 };
  }
  const previous = steps[index - 1];
  const t = clamp01(f / Math.max(1, Math.min(12, Math.floor(frames * 0.25))));
  const p = t * t * (3 - 2 * t);
  const a = level(previous), b = level(step);
  const zoom = lerp(a.zoom, b.zoom, p), pop = lerp(a.pop, b.pop, p);
  return {
    ...base, rect: lerpRect(rectOf(previous), rectOf(step), p), mark: clamp01(1 - pop - zoom * 0.7), zoom, pop,
    previousSrc: previous.src, srcMix: previous.src === step.src ? 1 : p,
  };
}

/**
 * Place de la découpe une fois sortie, en fractions de l'image (centre, largeur, hauteur) : la plus grande qui tient
 * dans la moitié libre. `regionAspect` = largeur / hauteur réelles de la zone ; `frameAspect` = largeur / hauteur de la vidéo.
 * Partagée par la carte 3D et la légende 2D, pour qu'elles tombent l'une sous l'autre.
 */
export function popoutTarget(regionAspect: number, format: StageFormat, frameAspect: number) {
  const box = format === "portrait" ? { cx: 0.5, cy: 0.74, w: 0.86, h: 0.28 } : { cx: format === "square" ? 0.73 : 0.74, cy: 0.5, w: format === "square" ? 0.46 : 0.42, h: 0.58 };
  const h = Math.min(box.h, (box.w * frameAspect) / Math.max(0.05, regionAspect));
  return { cx: box.cx, cy: box.cy, h, w: (h * regionAspect) / frameAspect };
}

/** Où l'appareil se range pendant la découpe (à gauche, ou en haut en portrait). */
export function popoutDeviceSpot(format: StageFormat) {
  return format === "portrait" ? { x: 0.5, y: 0.4 } : { x: format === "square" ? 0.3 : 0.32, y: 0.55 };
}

const rectOf = (f: ScreenFocus): FocusRect => ({ x: f.x, y: f.y, w: f.w, h: f.h });
const lerpRect = (a: FocusRect, b: FocusRect, k: number): FocusRect => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

/** Appareil du plateau : le mockup choisi, sinon un portable pour des captures en paysage, un téléphone pour le reste. */
export function stageDeviceId(deviceMockup: string | undefined | null, screenRatios: (number | null)[] | undefined) {
  const spec = deviceSpec(deviceMockup);
  if (spec) return spec.id;
  const known = (screenRatios ?? []).filter((r): r is number => typeof r === "number");
  return known.length && known.filter((r) => r > 1).length > known.length / 2 ? "macbook-pro" : "iphone-pro";
}

/**
 * Couleurs d'un univers : `base` = couleur dominante du décor (elle décide de la couleur du texte), `glow` = accent vif.
 * Univers sombres (Stage, Aquarium) : un fond de marque clair est assombri vers la couleur du décor.
 * Univers clairs naturels (Monument, Zen, Kiosque) : le décor garde ses couleurs, sauf fond de marque clair.
 * Shoot : le fond du studio prend la couleur de fond de la marque, claire ou sombre.
 */
export function stageColors([bg, main, accent]: [string, string, string], kind: StageKind = "orbit") {
  const theme = STAGE_THEMES[kind];
  const base = kind === "shoot" ? bg : theme.light ? (luma(bg) > 0.6 ? bg : theme.base) : luma(bg) < 0.32 ? bg : mixHex(bg, theme.base, 0.9);
  const light = luma(base) > 0.5;
  const glow = light
    ? (luma(accent) < 0.85 && luma(accent) > 0.08 ? accent : luma(main) < 0.85 ? main : mixHex(accent, "#000000", 0.4))
    : luma(accent) > 0.22 ? accent : luma(main) > 0.22 && luma(main) < 0.9 ? main : mixHex(accent, "#ffffff", 0.45);
  return { base, glow, light };
}

function luma(hex: string) {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function mixHex(a: string, b: string, k: number) {
  const pa = Number.parseInt(a.replace("#", "").slice(0, 6), 16) || 0, pb = Number.parseInt(b.replace("#", "").slice(0, 6), 16) || 0;
  const channel = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - k) + ((pb >> shift) & 255) * k);
  return "#" + [16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("");
}

function lerpShot(a: Shot, b: Shot, k: number): Shot {
  return { az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), dist: lerp(a.dist, b.dist, k), ty: lerp(a.ty, b.ty, k), x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

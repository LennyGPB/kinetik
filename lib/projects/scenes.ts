import type { VideoOverlay } from "./overlays";
import type { BrandFont } from "../../config/fonts";
import type { LogoLayout, ScreensLayout, TitleAnimation } from "../../config/recipes";
import type { ScenePresentation } from "../../config/scene-presentations";

/**
 * Format du "JSON des scènes" stocké dans ProjectVersion.scenes.
 * C'est le contrat entre l'IA (génération / modifs) et le moteur de rendu (Remotion).
 */
export type SceneKind = "intro" | "logo" | "feature" | "screens" | "cta" | "stat" | "quote";
/**
 * Transitions d'entrée/sortie d'une scène (rendu : remotion/video/transitions.tsx).
 * - fade : fondu · slide : glissé latéral · zoom : arrivée en zoom arrière · glitch : secousse RGB
 * - cut : coupe sèche, calée sur un temps de la musique · curtain : un panneau de couleur balaie l'écran
 * - glass : une plaque de verre dépoli passe sur l'écran, floute la fin de la scène et dévoile la suivante
 * - cube : les deux scènes sont les faces d'un cube qui tourne en 3D
 */
export const TRANSITIONS = ["fade", "slide", "zoom", "glitch", "cut", "curtain", "glass", "cube", "shutter", "iris", "prism", "fold", "track"] as const;
export type Transition = (typeof TRANSITIONS)[number];
/** Présentation des screens : dans un téléphone, une fenêtre de navigateur, ou tels quels. */
export type ScreenFrame = "phone" | "browser" | "none";

export type Scene = {
  textOffsets?: Partial<Record<"title" | "subtitle", { x: number; y: number }>>;
  /** Couleur choisie pour le titre / sous-titre / surtitre (#rrggbb) ; absente = couleur du template */
  textColors?: Partial<Record<"title" | "subtitle" | "kicker", string>>;
  /** Surtitre des scènes feature (au-dessus du titre) : absent = nom de l'app, "" = masqué */
  kicker?: string;
  presentation?: ScenePresentation;
  /** Overrides scoped to this scene; absent = video settings. */
  energy?: SceneGraph["energy"];
  titleAnimation?: TitleAnimation;
  logoLayout?: LogoLayout;
  logoBackground?: boolean;
  logoEmphasis?: boolean;
  screenFrame?: ScreenFrame;
  id: string;
  kind: SceneKind;
  title: string;
  subtitle?: string;
  /** Durée en secondes */
  duration: number;
  transition: Transition;
  /**
   * Scènes "screens" uniquement. Absents = choix du template (recipe.screens).
   * Renseignés seulement quand l'utilisateur le demande (chat ou réglages rapides de l'éditeur).
   */
  layout?: ScreensLayout;
  /** Nombre d'écrans montrés (1 à 3), plafonné au nombre de screens fournis. */
  screenCount?: number;
  /** Scènes "screens" : mise en avant d'une zone d'un screen (zoom ou découpe qui sort de l'écran). */
  focus?: ScreenFocus;
  /** Ordered framing steps; legacy focus remains supported. */
  focuses?: ScreenFocus[];
  /** Scènes "screens" : URLs des screens à montrer, dans l'ordre (absent = les suivants dans l'ordre du projet). */
  screens?: string[];
};

export const FOCUS_MODES = ["zoom", "popout"] as const;
export const FOCUS_ANIMATIONS = ["lift", "pivot"] as const;
export const MAX_FOCUS_STEPS = 6;

export function sceneFocuses(scene: Pick<Scene, "focus" | "focuses">): ScreenFocus[] {
  return scene.focuses ?? (scene.focus ? [scene.focus] : []);
}

/**
 * Screens montrés par une scène "screens" : ceux choisis (qui existent encore), sinon les suivants dans l'ordre
 * du projet, chaque scène "screens" prenant la suite de la précédente et rebouclant.
 * `defaultCount` = nombre par défaut de la mise en page ; scene.screenCount le remplace. Partagé par le moteur et l'éditeur.
 */
export function sceneScreens(scenes: Scene[], scene: Scene, all: string[], defaultCount: number): string[] {
  const chosen = scene.screens?.filter((url) => all.includes(url)) ?? [];
  if (chosen.length) return chosen.slice(0, MAX_SCREEN_COUNT);
  if (!all.length) return [];
  const count = scene.screenCount ? Math.max(1, Math.min(MAX_SCREEN_COUNT, Math.round(scene.screenCount))) : defaultCount;
  const order = Math.max(0, scenes.filter((s) => s.kind === "screens").findIndex((s) => s.id === scene.id));
  return Array.from({ length: Math.min(count, all.length) }, (_, i) => all[(order * count + i) % all.length]);
}

/**
 * Mise en avant d'une zone d'un screen (rendu : remotion/video/focus.tsx).
 * - zoom : la caméra plonge dans la zone, à l'intérieur de l'appareil
 * - popout : la zone est découpée, sort de l'écran et s'agrandit à côté de l'appareil
 * La zone est exprimée en fractions de l'image (0 → 1), indépendamment de sa taille en pixels.
 */
export type ScreenFocus = {
  /** URL du screen concerné (stable même si l'ordre des screens change) */
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  mode: (typeof FOCUS_MODES)[number];
  /** Cutout entrance; absent keeps the original lift animation. */
  animation?: (typeof FOCUS_ANIMATIONS)[number];
  /** Légende courte affichée à côté de la découpe (facultatif) */
  label?: string;
  /** Titre affiché pendant ce cadrage, à la place de celui de la scène (facultatif) */
  title?: string;
};

/** Réglages de la musique (absents = valeurs par défaut). */
export type AudioSettings = {
  /** 0 → 1 (défaut 1) */
  volume?: number;
  /** Secondes du morceau à sauter au début (défaut 0) */
  trimStart?: number;
  /** Montée du son sur la première seconde */
  fadeIn?: boolean;
  /** Descente du son sur les 2 dernières secondes */
  fadeOut?: boolean;
};

export const MAX_SCREEN_COUNT = 3;

export type SceneGraph = {
  language?: "fr" | "en";
  overlays?: VideoOverlay[];
  schema: 1;
  energy: "calm" | "balanced" | "high";
  logoEmphasis: boolean;
  /** Absent sur les anciennes versions : équivaut à "none". */
  screenFrame?: ScreenFrame;
  musicTrackId: string | null;
  bpm: number;
  /** Animation des titres choisie par l'utilisateur pour toute la vidéo. Absente = celle du template. */
  titleAnimation?: TitleAnimation;
  /** Mise en scène des séquences logo. Absente = choix du template. */
  logoLayout?: LogoLayout;
  /** Fond de la tuile du logo. Absent = false ; false conserve la transparence du fichier. */
  logoBackground?: boolean;
  /** Position du premier temps dans le morceau, en secondes (détectée à l'upload). Absente = 0. */
  beatOffset?: number;
  audio?: AudioSettings;
  /**
   * Template et couleurs de cette version (changés depuis l'éditeur). Absents = ceux du projet.
   * Versionnés : revenir à une ancienne version restaure aussi son style.
   */
  styleId?: string;
  colors?: string[];
  /** Polices du brand kit (titres / textes). Absentes = typographie du template. */
  fonts?: { heading: BrandFont; body: BrandFont };
  scenes: Scene[];
};

/**
 * Grille des temps musicaux vue depuis la vidéo : durée d'un temps et décalage du premier temps,
 * en tenant compte du début de morceau coupé (audio.trimStart). Partagée par le moteur et l'éditeur.
 */
export function beatGrid(graph: Pick<SceneGraph, "bpm" | "beatOffset" | "audio">) {
  const period = 60 / (graph.bpm || 120);
  const raw = (graph.beatOffset ?? 0) - (graph.audio?.trimStart ?? 0);
  return { period, phase: ((raw % period) + period) % period };
}

export function totalDuration(graph: SceneGraph) {
  return graph.scenes.reduce((sum, scene) => sum + scene.duration, 0);
}

/** Lecture défensive d'une valeur JSON venant de la base. */
export function parseSceneGraph(value: unknown): SceneGraph {
  const graph = value as Partial<SceneGraph> | null;
  if (!graph || !Array.isArray(graph.scenes)) {
    return { schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120, scenes: [] };
  }
  return graph as SceneGraph;
}

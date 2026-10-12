import type { VideoOverlay } from "./overlays";
import type { BrandFont } from "../../config/fonts";
import type { LogoLayout, ScreensLayout, TitleAnimation } from "../../config/recipes";
import type { ScenePresentation } from "../../config/scene-presentations";

/**
 * Format du "JSON des scènes" stocké dans ProjectVersion.scenes.
 * C'est le contrat entre l'IA (génération / modifs) et le moteur de rendu (Remotion).
 */
export type SceneKind = "intro" | "logo" | "feature" | "screens" | "cta";
/**
 * Transitions d'entrée/sortie d'une scène (rendu : remotion/video/transitions.tsx).
 * - fade : fondu · slide : glissé latéral · zoom : arrivée en zoom arrière · glitch : secousse RGB
 * - cut : coupe sèche, calée sur un temps de la musique · curtain : un panneau de couleur balaie l'écran
 */
export const TRANSITIONS = ["fade", "slide", "zoom", "glitch", "cut", "curtain"] as const;
export type Transition = (typeof TRANSITIONS)[number];
/** Présentation des screens : dans un téléphone, une fenêtre de navigateur, ou tels quels. */
export type ScreenFrame = "phone" | "browser" | "none";

export type Scene = {
  textOffsets?: Partial<Record<"title" | "subtitle", { x: number; y: number }>>;
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
  /** Scènes "screens" : URLs des screens à montrer, dans l'ordre (absent = les suivants dans l'ordre du projet). */
  screens?: string[];
};

export const FOCUS_MODES = ["zoom", "popout"] as const;

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
  /** Légende courte affichée à côté de la découpe (facultatif) */
  label?: string;
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
  /** Fond de la tuile du logo. Absent = true ; false conserve la transparence du fichier. */
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

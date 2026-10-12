// ⚠️ Fichier aussi bundlé par Remotion : imports RELATIFS uniquement.
import type { Transition } from "../lib/projects/scenes";

/**
 * RECETTES DES TEMPLATES — source unique de vérité du rendu d'un template.
 *
 * Une recette assemble des « briques » du moteur vidéo (remotion/video/*). Chaque champ ci-dessous
 * pointe vers un registre de briques ; le moteur lit la recette via `useRecipe()`.
 * Claude reçoit la `direction`, l'`energy` et les `transitions` autorisées (lib/services/ai.ts).
 *
 * Guide complet (ajouter une brique, créer un template) : docs/TEMPLATES.md
 */

// ───────────── Catalogue des briques ─────────────
// Ajouter une valeur à l'un de ces types fait apparaître une erreur TypeScript dans le registre
// correspondant tant que la brique n'est pas codée : c'est voulu, suivez-la.

/**
 * Fond animé, sous toutes les scènes — remotion/video/backgrounds.tsx (+ aperçu galerie : components/media/video-placeholder.tsx).
 * blobs : taches de couleur fluides · type : mur de mots géants · glitch : taches + saccades · rings : ondes concentriques
 * aurora : grille fine + faisceaux de lumière · grid : sol quadrillé en perspective · shapes : formes géométriques flottantes
 * bars : égaliseur audio · orbit : orbite pointillée · clean : blanc lumineux · paper : papier crème et colonnes de mise en page
 * terminal : lignes de code qui défilent · spotlight : faisceau doré et poussière · chrome : reflets irisés et étincelles
 * data : courbes de données qui se tracent · glass : panneaux de verre dépoli · iso : cubes isométriques
 * blocks : filets épais et blocs pleins qui sautent sur le tempo · line : un cercle fin et un point, presque rien
 */
export type BackgroundKind =
  | "blobs"
  | "type"
  | "glitch"
  | "rings"
  | "aurora"
  | "grid"
  | "shapes"
  | "bars"
  | "orbit"
  | "clean"
  | "paper"
  | "terminal"
  | "spotlight"
  | "chrome"
  | "data"
  | "glass"
  | "iso"
  | "blocks"
  | "line";

/**
 * Mise en scène des screens — remotion/video/screens.tsx.
 * row : alignés, celui du centre en avant · hero : un seul grand écran, texte à côté · split : typo géante derrière l'écran
 * fan : en éventail · tilt : perspective 3D · stack : empilés, un par temps fort · carousel : défilement continu
 * bento : un écran + tuiles de graphiques façon tableau de bord
 * La valeur de la recette est celle par défaut ; l'utilisateur peut la changer par scène (Scene.layout).
 */
export const SCREENS_LAYOUTS = ["row", "hero", "split", "fan", "tilt", "stack", "carousel", "bento"] as const;
export type ScreensLayout = (typeof SCREENS_LAYOUTS)[number];

/**
 * Police des titres — remotion/video/fonts.ts.
 * display : Bricolage Grotesque, expressive · sans : Inter serrée, façon San Francisco · serif : Instrument Serif, éditorial
 * condensed : Anton, capitales étroites façon affiche · mono : JetBrains Mono, développeur
 */
export type Typography = "display" | "sans" | "serif" | "condensed" | "mono";

/**
 * Apparition des titres — remotion/video/titles.tsx.
 * words : mot par mot depuis un masque · letters : lettre par lettre avec rebond · fade : fondu + flou doux
 * mask : un bloc de couleur balaie puis dévoile le texte · glitch : séparation RGB qui se stabilise
 * typewriter : machine à écrire avec curseur · flicker : tube néon qui s'allume en grésillant
 * La valeur de la recette est celle par défaut ; l'utilisateur peut la changer pour toute la vidéo (SceneGraph.titleAnimation).
 */
export const TITLE_ANIMATIONS = ["words", "letters", "fade", "mask", "glitch", "typewriter", "flicker"] as const;
export type TitleAnimation = (typeof TITLE_ANIMATIONS)[number];

/** Habillage des titres — remotion/video/titles.tsx. none : couleur pleine · glow : halo lumineux · chrome : dégradé métallisé. */
export type TitleEffect = "none" | "glow" | "chrome";

/** Apparition du logo — remotion/video/scenes.tsx. pop : rebond, rotation, onde · soft : fondu discret. */
export type LogoReveal = "pop" | "soft";

export const LOGO_LAYOUTS = ["signature", "app-icon", "typographic", "product", "orbit", "poster", "echo", "emblem"] as const;
export type LogoLayout = (typeof LOGO_LAYOUTS)[number];

export function defaultLogoLayout(recipe: Recipe): LogoLayout {
  if (recipe.logoLayout) return recipe.logoLayout;
  if (recipe.typography === "condensed" || recipe.background === "type") return "typographic";
  if (recipe.screens === "bento" || recipe.screens === "carousel") return "product";
  return recipe.logo === "soft" ? "signature" : "app-icon";
}

/** Éléments d'accent (trait sous les titres, bouton final) : dégradé ou couleur pleine. */
export type AccentStyle = "gradient" | "solid";

/**
 * Effets globaux — remotion/video/effects.tsx.
 * vignette : bords assombris (sous les scènes) · grain : grain de pellicule · light : fuite de lumière qui traverse l'image
 * scanlines : lignes d'écran cathodique
 */
export type Effect = "vignette" | "grain" | "light" | "scanlines";

export type Energy = "calm" | "balanced" | "high";

export type Recipe = {
  typography: Typography;
  titleAnimation: TitleAnimation;
  titleEffect: TitleEffect;
  background: BackgroundKind;
  screens: ScreensLayout;
  logo: LogoReveal;
  logoLayout?: LogoLayout;
  accent: AccentStyle;
  /** Le logo et le bouton final pulsent sur le tempo de la musique. */
  beatPulse: boolean;
  /** Rythme typique (point de départ pour Claude et pour les démos). */
  energy: Energy;
  /** Transitions autorisées entre les scènes : Claude ne peut choisir que celles-ci (la première sert de repli). */
  transitions: Transition[];
  effects: Effect[];
  /** Consignes de ton et de rythme transmises à Claude. */
  direction: string;
  /**
   * Polices du brand kit qui remplacent la typographie. Jamais définies dans RECIPES :
   * injectées au rendu par KinetikVideo depuis SceneGraph.fonts (choix de l'utilisateur).
   */
  brandFonts?: { heading: string; body: string };
};

// ───────────── Recettes ─────────────

/** Base commune ; chaque recette ne précise que ce qui la distingue. */
const BASE: Omit<Recipe, "background" | "screens" | "direction"> = {
  typography: "display",
  titleAnimation: "words",
  titleEffect: "none",
  logo: "pop",
  accent: "gradient",
  beatPulse: true,
  energy: "balanced",
  transitions: ["fade", "slide", "zoom", "glitch"],
  effects: ["vignette"],
};

/** Recette utilisée quand un projet n'a pas de template connu. */
export const DEFAULT_RECIPE: Recipe = {
  ...BASE,
  background: "blobs",
  screens: "row",
  direction: "Ton moderne et dynamique, titres courts et percutants.",
};

export const RECIPES: Record<string, Recipe> = {
  // ── Minimal ──
  apple: {
    ...BASE,
    typography: "sans",
    titleAnimation: "fade",
    background: "clean",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "slide"],
    effects: [],
    direction:
      "Style keynote Apple : phrases très courtes et affirmatives (2 à 4 mots), ton premium et serein, aucun point d'exclamation. Rythme lent, transitions en fondu de préférence.",
  },
  minimal: {
    ...BASE,
    typography: "sans",
    titleAnimation: "mask",
    background: "line",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "slide"],
    effects: [],
    direction: "Épuré et calme : peu de mots, beaucoup d'air, ton simple et clair. Transitions douces.",
  },
  luxe: {
    ...BASE,
    typography: "serif",
    titleAnimation: "fade",
    background: "spotlight",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade"],
    effects: ["vignette", "grain", "light"],
    direction:
      "Haut de gamme et feutré : vocabulaire choisi, phrases courtes et posées (2 à 5 mots), jamais de superlatif criard ni de point d'exclamation. Rythme lent, uniquement des fondus.",
  },

  // ── Typo ──
  "kinetic-typo": {
    ...BASE,
    titleAnimation: "letters",
    background: "type",
    screens: "split",
    energy: "high",
    transitions: ["cut", "slide", "curtain", "zoom"],
    effects: ["vignette", "grain"],
    direction:
      "La typographie est la star : titres de 1 à 3 mots, verbes d'action, impact maximal. Rythme rapide, une idée par scène. Coupes sèches sur le beat et rideaux pour enchaîner.",
  },
  brutalist: {
    ...BASE,
    typography: "condensed",
    titleAnimation: "mask",
    background: "blocks",
    screens: "split",
    accent: "solid",
    energy: "high",
    transitions: ["cut", "curtain"],
    effects: ["grain"],
    direction: "Brut et frontal : titres massifs de 1 à 3 mots, affirmations franches, ton direct. Uniquement des coupes sèches et des rideaux.",
  },
  editorial: {
    ...BASE,
    typography: "serif",
    titleAnimation: "mask",
    background: "paper",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["curtain", "fade"],
    effects: ["grain"],
    direction:
      "Façon couverture de magazine : titres élégants comme des accroches de une (2 à 5 mots), ton cultivé et assuré, sous-titres qui donnent envie de lire la suite. Rythme posé.",
  },

  // ── Bold ──
  neon: {
    ...BASE,
    titleAnimation: "flicker",
    titleEffect: "glow",
    background: "aurora",
    screens: "tilt",
    energy: "high",
    transitions: ["cut", "zoom", "fade"],
    effects: ["vignette", "grain"],
    direction:
      "Ambiance nocturne et électrique : titres de 2 à 3 mots qui s'allument comme des enseignes, ton punchy. Rythme nerveux, coupes calées sur la musique.",
  },
  glitch: {
    ...BASE,
    typography: "mono",
    titleAnimation: "glitch",
    background: "glitch",
    screens: "stack",
    energy: "high",
    transitions: ["glitch", "cut", "zoom"],
    effects: ["vignette", "scanlines", "grain"],
    direction: "Énergie brute et tech : titres très courts, ton audacieux, coupes nettes. Favorise les transitions glitch et les coupes sèches.",
  },
  "beat-cut": {
    ...BASE,
    typography: "condensed",
    titleAnimation: "words",
    background: "bars",
    screens: "stack",
    energy: "high",
    transitions: ["cut", "zoom"],
    effects: ["vignette", "grain"],
    direction: "Chaque scène tombe sur le beat : scènes courtes (2 à 3 secondes), titres de 1 à 3 mots, rythme très soutenu. Quasi uniquement des coupes sèches.",
  },

  // ── Tech ──
  "gradient-flow": {
    ...BASE,
    titleAnimation: "fade",
    background: "blobs",
    screens: "carousel",
    transitions: ["fade", "slide", "curtain"],
    effects: ["vignette", "light"],
    direction: "Fluide et inspirant : ton moderne, titres courts qui coulent d'une scène à l'autre. Transitions douces et glissées.",
  },
  "liquid-glass": {
    ...BASE,
    typography: "sans",
    titleAnimation: "fade",
    background: "glass",
    screens: "carousel",
    logo: "soft",
    energy: "calm",
    transitions: ["fade", "slide"],
    effects: ["vignette", "light"],
    direction: "Élégant et aérien : ton premium, titres courts, transitions douces et fluides.",
  },
  terminal: {
    ...BASE,
    typography: "mono",
    titleAnimation: "typewriter",
    titleEffect: "glow",
    background: "terminal",
    screens: "row",
    accent: "solid",
    transitions: ["cut", "fade"],
    effects: ["vignette", "scanlines"],
    direction:
      "Pour les développeurs : ton technique mais clair, titres courts comme des commandes ou des messages de commit (2 à 5 mots, minuscules acceptées). Aucun jargon marketing creux.",
  },

  // ── Fun ──
  playful: {
    ...BASE,
    titleAnimation: "letters",
    background: "shapes",
    screens: "fan",
    transitions: ["zoom", "slide", "curtain"],
    effects: [],
    direction: "Fun et chaleureux : ton complice et enjoué, tutoiement, titres courts et souriants.",
  },
  "3d-flat": {
    ...BASE,
    background: "iso",
    screens: "tilt",
    transitions: ["zoom", "slide", "fade"],
    effects: ["vignette", "light"],
    direction: "Moderne et accessible : ton positif, titres clairs qui décrivent un bénéfice.",
  },
  y2k: {
    ...BASE,
    titleAnimation: "letters",
    titleEffect: "chrome",
    background: "chrome",
    screens: "fan",
    energy: "high",
    transitions: ["zoom", "glitch", "curtain"],
    effects: ["grain"],
    direction: "Rétro-futuriste années 2000 : ton pétillant et un brin rétro, titres courts et accrocheurs, énergie de clip. Rythme vif.",
  },

  // ── Business ──
  corporate: {
    ...BASE,
    typography: "sans",
    background: "grid",
    screens: "row",
    logo: "soft",
    energy: "calm",
    transitions: ["fade", "slide"],
    effects: ["vignette"],
    direction:
      "B2B rassurant et structuré : bénéfices concrets et mesurables, ton professionnel, pas d'argot. Rythme posé, transitions sobres.",
  },
  dashboard: {
    ...BASE,
    typography: "sans",
    titleAnimation: "words",
    background: "data",
    screens: "bento",
    transitions: ["slide", "fade", "cut"],
    effects: ["vignette"],
    direction:
      "Produit data / analytics : titres orientés résultat (suivre, comprendre, décider), ton précis et confiant. N'invente aucun chiffre. Rythme régulier.",
  },
};

export function getRecipe(styleId: string | null | undefined): Recipe {
  return (styleId && RECIPES[styleId]) || DEFAULT_RECIPE;
}

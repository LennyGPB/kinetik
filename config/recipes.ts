// ⚠️ Fichier aussi bundlé par Remotion : imports RELATIFS uniquement.
import type { Transition } from "../lib/projects/scenes";
import type { EditorialTreatment } from "./editorial-motion";

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
 * halftone : trame de points pop art, révélée par une tache qui se promène · stripes : grandes bandes diagonales qui défilent
 * sun : soleil rétro rayé sur un ciel dégradé · confetti : confettis qui tombent en tournoyant
 * waves : vagues pleines superposées dans le bas du cadre · sunburst : éventail de rayons années 70 qui tourne
 * topo : courbes de niveau qui ondulent · starfield : saut dans l'hyperespace · pixels : cases qui s'allument sur le beat
 */
export type BackgroundKind =
  | "monolith"
  | "focus"
  | "prism"
  | "papercut"
  | "metro"
  | "blueprint-draft"
  | "ocean-tide"
  | "playful-fluid"
  | "corporate-panels"
  | "swiss-rules"
  | "pulse-edge"
  | "studio-stage"
  | "gold-atelier"
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
  | "line"
  | "halftone"
  | "stripes"
  | "sun"
  | "confetti"
  | "waves"
  | "sunburst"
  | "topo"
  | "starfield"
  | "pixels";

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
 * flip : chaque mot tombe en 3D depuis la caméra et s'écrase (secousse, onde de choc), avec du relief
 * La valeur de la recette est celle par défaut ; l'utilisateur peut la changer pour toute la vidéo (SceneGraph.titleAnimation).
 */
export const TITLE_ANIMATIONS = ["words", "letters", "fade", "mask", "glitch", "typewriter", "flicker", "flip"] as const;
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
 * scanlines : lignes d'écran cathodique · letterbox : bandes noires de cinéma · viewfinder : viseur de caméra (coins, REC, timecode)
 * film : pellicule ancienne (scintillement, poussières, rayures) · rays : faisceaux de lumière depuis un coin · border : passe-partout imprimé
 * depth : gros cubes 3D flous au premier plan qui traversent le cadre
 * liquid : lentilles de verre liquide qui se déforment, dérivent et passent sur les textes (backdrop-filter)
 * letterbox, viewfinder et border occupent les bords du cadre : les associer aux compositions center ou left, pas à poster.
 */
export type Effect = "vignette" | "grain" | "light" | "scanlines" | "letterbox" | "viewfinder" | "film" | "rays" | "border" | "liquid" | "depth";

/**
 * Composition des scènes de texte (intro, feature, cta, stat, quote en mise en scène « du template ») — remotion/video/composition.tsx.
 * center : tout centré, symétrique · left : bloc aligné à gauche avec un filet, façon éditorial / keynote B2B
 * poster : typo géante qui remplit le cadre, calée en haut à gauche, façon affiche
 * extrude : titre en relief 3D (épaisseur extrudée), bloc qui se pose en perspective
 * glass : bloc centré posé sur une carte de verre dépoli (backdrop-filter), qui arrive en se défloutant
 * C'est ce qui change la silhouette d'une vidéo : deux recettes au même fond mais à la composition différente ne se ressemblent pas.
 */
export const COMPOSITIONS = ["center", "left", "poster", "glass", "extrude"] as const;
export type Composition = (typeof COMPOSITIONS)[number];

/**
 * Mouvement de caméra global, appliqué au contenu de chaque scène (pas au fond) — remotion/video/camera.tsx.
 * still : plan fixe · drift : lent travelling latéral et léger zoom, très doux · push : avancée continue vers le texte
 * handheld : caméra à l'épaule, petites secousses organiques (à réserver aux styles nerveux)
 * swing : balancier 3D en perspective (rotations lentes sur deux axes) · glitch : sursauts aléatoires de glitch sur tout le contenu
 * (tranches décalées + séparation RGB), avec une légère séparation RGB permanente
 */
export const CAMERAS = ["still", "drift", "push", "handheld", "swing", "glitch"] as const;
export type Camera = (typeof CAMERAS)[number];

export type Energy = "calm" | "balanced" | "high";

export type Recipe = {
  photoTreatment?: EditorialTreatment;
  typography: Typography;
  titleAnimation: TitleAnimation;
  titleEffect: TitleEffect;
  background: BackgroundKind;
  screens: ScreensLayout;
  logo: LogoReveal;
  logoLayout?: LogoLayout;
  composition: Composition;
  camera: Camera;
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
  composition: "center",
  camera: "still",
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
  cadran: {
    ...BASE, photoTreatment: "gallery", typography: "serif", titleAnimation: "mask", composition: "center", camera: "still",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["iris", "fade"], effects: [],
    direction: "A photographic gallery cover with an inset portrait, two fine offset frames and refined serif headlines. Frames gently align as the scene settles. Short concrete titles, quiet optical reveals, imported imagery only.",
  },
  passage: {
    ...BASE, photoTreatment: "ribbon", typography: "condensed", titleAnimation: "letters", composition: "left", camera: "still",
    background: "clean", screens: "split", accent: "solid", beatPulse: false, energy: "high", transitions: ["track", "cut"], effects: [],
    direction: "Urban photographic ribbon travels horizontally through an ink poster. Condensed headlines, coral edge and purposeful pacing. Titles of 2 to 4 words, quick horizontal transitions without glitch.",
  },
  reverie: {
    ...BASE, photoTreatment: "color-window", typography: "serif", titleAnimation: "fade", composition: "center", camera: "drift",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["fade", "iris"], effects: [],
    direction: "A color window moves across monochrome photography, revealing the original warm colors. Elegant serif type and soft restrained camera motion. A poetic editorial campaign, no invented claims or facts.",
  },
  duplex: {
    ...BASE, photoTreatment: "double-spread", typography: "serif", titleAnimation: "words", composition: "center", camera: "still",
    background: "clean", screens: "stack", logo: "soft", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["fold", "slide"], effects: [],
    direction: "Two offset horizontal photographic panels glide in opposite directions around a central editorial headline. Warm ink and ivory, measured serif typography and magazine page-fold transitions.",
  },
  terracotta: {
    ...BASE, photoTreatment: "rust-panel", typography: "condensed", titleAnimation: "mask", composition: "center", camera: "still",
    background: "clean", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["curtain", "shutter"], effects: [],
    direction: "Terracotta campaign poster: a tall monochrome portrait on the right and a broad translucent rust headline panel sliding into place. Bold condensed copy, cream text and clean curtain transitions.",
  },
  silhouette: {
    ...BASE, photoTreatment: "slit", typography: "serif", titleAnimation: "fade", composition: "center", camera: "still",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["iris", "fade"], effects: [],
    direction: "Fashion portrait revealed through a widening vertical aperture, warm ink and ivory palette, refined serif titles of 2 to 5 words. Quiet confident rhythm and optical transitions; use imported photos.",
  },
  bulletin: {
    ...BASE, photoTreatment: "masthead", typography: "condensed", titleAnimation: "mask", composition: "center", camera: "still",
    background: "clean", screens: "split", accent: "solid", beatPulse: false, energy: "high", transitions: ["track", "shutter"], effects: [],
    direction: "Moving agency bulletin: monochrome photo strips above and below a dark typographic masthead with vermilion rules. Oversized condensed titles of 2 to 4 words, precise fast reveals. No fabricated statistics.",
  },
  montage: {
    ...BASE, photoTreatment: "strips", typography: "condensed", titleAnimation: "words", composition: "center", camera: "still",
    background: "clean", screens: "fan", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["slide", "cut"], effects: [],
    direction: "Three photographic strips drift in alternating directions, with different crops and one monochrome strip. Bold short condensed type, restrained coral accents and a contact-sheet feeling.",
  },
  fervor: {
    ...BASE, photoTreatment: "diffuse", typography: "serif", titleAnimation: "letters", composition: "center", camera: "push",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["curtain", "fade"], effects: [],
    direction: "Warm abstract photographic poster: imported photo softened into luminous orange and bronze color fields, elegant serif titles emerging letter by letter. Slow moving light, no neon or glitch.",
  },
  horizon: {
    ...BASE, photoTreatment: "panorama", typography: "serif", titleAnimation: "words", composition: "center", camera: "still",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["fold", "fade"], effects: [],
    direction: "Panoramic landscape framed by deep teal margins, a gently traveling golden rule and elegant serif type. Calm editorial pacing, 2 to 5 words per title, understated page transitions.",
  },
  dispatch: {
    ...BASE, photoTreatment: "band", typography: "condensed", titleAnimation: "mask", composition: "center", camera: "still",
    background: "clean", screens: "hero", accent: "solid", beatPulse: false, energy: "high", transitions: ["shutter", "cut"], effects: [],
    direction: "Photographic agency campaign: monochrome imagery, vermilion headline band, huge condensed titles of 2 to 4 words. Sharp shutters and confident cuts. Use supplied images, no invented metrics.",
  },
  maison: {
    ...BASE, photoTreatment: "portrait", typography: "serif", titleAnimation: "words", composition: "center", camera: "drift",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["fade", "iris"], effects: [],
    direction: "Fashion editorial: immersive portraits, fine inset frame, elegant serif titles of 2 to 5 words, measured reveals and gentle camera motion. Let the supplied photography breathe.",
  },
  oblique: {
    ...BASE, photoTreatment: "split", typography: "condensed", titleAnimation: "letters", composition: "left", camera: "still",
    background: "clean", screens: "split", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["track", "cut"], effects: [],
    direction: "Independent creative agency: asymmetric monochrome photograph on the right, ink background, coral rule and condensed headline. Short direct copy, horizontal tracking transitions.",
  },
  solstice: {
    ...BASE, photoTreatment: "warm", typography: "serif", titleAnimation: "fade", composition: "center", camera: "push",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["fade", "zoom"], effects: [],
    direction: "Warm landscape editorial: bronze tones, slow photographic push-in, delicate serif typography and a fine expanding horizon. Poetic but concrete titles of 2 to 5 words.",
  },
  archive: {
    ...BASE, photoTreatment: "frames", typography: "serif", titleAnimation: "mask", composition: "center", camera: "still",
    background: "clean", screens: "stack", logo: "soft", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["fold", "slide"], effects: [],
    direction: "A moving photographic contact sheet: two staggered crops, one monochrome, sliding gently in opposite directions. Editorial serif titles, restrained captions and page-fold transitions. Use the imported imagery.",
  },
  monolith: {
    ...BASE, composition: "left", camera: "still", typography: "sans", titleAnimation: "mask",
    background: "monolith", screens: "hero", logo: "soft", accent: "solid", beatPulse: false,
    transitions: ["shutter", "cut"], effects: [],
    direction: "Minimalisme monumental noir sur blanc : titres affirmés de 1 à 4 mots, beaucoup de vide. Privilégie shutter, des volets noirs s’ouvrent franchement pour révéler la scène ; cut pour ponctuer. Pas d’ornement ajouté.",
  },
  focus: {
    ...BASE, composition: "center", camera: "push", typography: "sans", titleAnimation: "fade",
    background: "focus", screens: "hero", logo: "soft", accent: "solid", beatPulse: false,
    transitions: ["iris", "zoom"], effects: [],
    direction: "Minimalisme sombre de précision optique : une idée nette par scène, titres de 2 à 4 mots. Privilégie iris, révélation circulaire ample suivie d’un contenu stable ; zoom pour les détails du produit. Aucun halo criard ni surcharge.",
  },
  prism: {
    ...BASE, composition: "left", camera: "drift", typography: "display", titleAnimation: "words",
    background: "prism", screens: "tilt", logoLayout: "signature", accent: "solid", beatPulse: false,
    transitions: ["prism", "fade"], effects: [],
    direction: "Réfraction graphique : facettes violettes et menthe en périphérie, texte blanc net, titres de 2 à 4 mots. Privilégie prism, balayage de lamelles diagonales colorées. Une sensation de précision et de découverte, pas de glitch.",
  },
  papercut: {
    ...BASE, composition: "center", camera: "still", typography: "serif", titleAnimation: "words",
    background: "papercut", screens: "fan", logo: "soft", logoLayout: "app-icon", accent: "solid", beatPulse: false,
    transitions: ["fold", "slide"], effects: [],
    direction: "Atelier de papier découpé, crème, terracotta et vert profond. Titres chaleureux de 2 à 5 mots, courts et concrets. Privilégie fold, une feuille se replie pour dévoiler la suite. Pas d’effet numérique, néon ou verre.",
  },
  metro: {
    ...BASE, composition: "center", camera: "still", typography: "sans", titleAnimation: "mask",
    background: "metro", screens: "row", logo: "soft", logoLayout: "typographic", accent: "solid", beatPulse: false,
    transitions: ["track", "cut"], effects: [],
    direction: "Signalétique de réseau de transport : parcours clair, stations et lignes animées, titres de 1 à 4 mots. Privilégie track, passage horizontal rapide comme une rame. Présente les bénéfices comme les étapes d’un trajet, sans inventer de données.",
  },
  // ── Minimal ──
  apple: {
    ...BASE,
    composition: "center",
    camera: "push",
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
    composition: "left",
    camera: "still",
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
    composition: "center",
    camera: "still",
    typography: "serif",
    titleAnimation: "fade",
    background: "gold-atelier",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade"],
    effects: [],
    direction:
      "Haut de gamme et feutré : vocabulaire choisi, phrases courtes et posées (2 à 5 mots), jamais de superlatif criard ni de point d'exclamation. Rythme lent, uniquement des fondus.",
  },

  // ── Typo ──
  "kinetic-typo": {
    ...BASE,
    composition: "poster",
    camera: "push",
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
    composition: "poster",
    camera: "still",
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
    composition: "left",
    camera: "drift",
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
    composition: "center",
    camera: "handheld",
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
    composition: "poster",
    camera: "glitch",
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
    composition: "poster",
    camera: "handheld",
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
    composition: "center",
    camera: "drift",
    titleAnimation: "fade",
    background: "blobs",
    screens: "carousel",
    transitions: ["fade", "slide", "curtain"],
    effects: ["vignette", "light"],
    direction: "Fluide et inspirant : ton moderne, titres courts qui coulent d'une scène à l'autre. Transitions douces et glissées.",
  },
  "liquid-glass": {
    ...BASE,
    composition: "center",
    camera: "drift",
    typography: "sans",
    titleAnimation: "fade",
    background: "glass",
    screens: "carousel",
    logo: "soft",
    energy: "calm",
    transitions: ["glass", "fade", "slide"],
    effects: ["vignette", "liquid", "light"],
    direction:
      "Élégant et aérien, tout en verre : ton premium, titres courts (2 à 4 mots), transitions douces. Privilégie la transition glass (une vitre passe et dévoile la scène suivante), en alternance avec des fondus.",
  },
  terminal: {
    ...BASE,
    composition: "left",
    camera: "still",
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
    composition: "center",
    camera: "drift",
    titleAnimation: "words",
    background: "playful-fluid",
    screens: "fan",
    beatPulse: false,
    transitions: ["zoom", "slide", "curtain"],
    effects: [],
    direction: "Fun et chaleureux : ton complice et enjoué, tutoiement, titres courts et souriants.",
  },
  "3d-flat": {
    ...BASE,
    composition: "extrude",
    camera: "swing",
    background: "iso",
    screens: "tilt",
    transitions: ["cube", "zoom", "slide"],
    effects: ["vignette", "depth", "light"],
    direction:
      "Moderne et accessible, en volume : ton positif, titres clairs de 2 à 5 mots qui décrivent un bénéfice. Privilégie la transition cube (les scènes tournent comme les faces d'un cube), en alternance avec des zooms.",
  },
  y2k: {
    ...BASE,
    composition: "center",
    camera: "push",
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
    composition: "left",
    camera: "still",
    typography: "sans",
    background: "corporate-panels",
    screens: "row",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "slide"],
    effects: [],
    direction:
      "B2B rassurant et structuré : bénéfices concrets et mesurables, ton professionnel, pas d'argot. Rythme posé, transitions sobres.",
  },
  dashboard: {
    ...BASE,
    composition: "left",
    camera: "push",
    typography: "sans",
    titleAnimation: "words",
    background: "data",
    screens: "bento",
    transitions: ["slide", "fade", "cut"],
    effects: ["vignette"],
    direction:
      "Produit data / analytics : titres orientés résultat (suivre, comprendre, décider), ton précis et confiant. N'invente aucun chiffre. Rythme régulier.",
  },
  // ── Nouvelles compositions ──
  swiss: {
    ...BASE,
    composition: "poster",
    camera: "push",
    typography: "sans",
    titleAnimation: "mask",
    background: "swiss-rules",
    screens: "split",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    transitions: ["shutter", "slide", "cut"],
    effects: [],
    direction:
      "Style international suisse : grille stricte, titres factuels de 1 à 4 mots, aucun adjectif superflu, ton neutre et précis. Une idée par scène. Volets rouges (shutter) pour les moments forts, glissés et coupes nettes pour le reste.",
  },
  pitch: {
    ...BASE,
    composition: "left",
    camera: "push",
    typography: "sans",
    titleAnimation: "words",
    background: "clean",
    screens: "bento",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    transitions: ["slide", "fade", "curtain"],
    effects: [],
    direction:
      "Pitch de startup : on montre des résultats. Titres orientés bénéfice mesurable (2 à 5 mots), ton confiant et concret. Si le brief contient des chiffres réels, consacre-leur une scène stat ; s'il contient un vrai témoignage client, une scène quote. Rythme régulier.",
  },
  // Apesanteur : système orbital, titres qui s'allument lettre à lettre, balancier 3D
  orbit: {
    ...BASE,
    composition: "center",
    camera: "swing",
    typography: "display",
    titleAnimation: "letters",
    titleEffect: "glow",
    background: "orbit",
    screens: "carousel",
    logoLayout: "orbit",
    transitions: ["zoom", "fade", "slide"],
    effects: ["vignette", "light", "grain"],
    direction: "Ambiance spatiale et ambitieuse : titres courts et inspirants (2 à 4 mots), ton visionnaire sans emphase creuse. Rythme ample, zooms pour les moments forts, fondus et glissés pour le reste.",
  },
  pulse: {
    ...BASE,
    composition: "poster",
    camera: "still",
    typography: "condensed",
    titleAnimation: "words",
    background: "pulse-edge",
    screens: "stack",
    accent: "solid",
    beatPulse: false,
    energy: "high",
    transitions: ["cut", "zoom"],
    effects: [],
    direction: "Pub sociale qui claque : accroche percutante dès la première scène, titres de 1 à 3 mots en capitales, scènes courtes calées sur le beat. Quasi uniquement des coupes sèches.",
  },
  zine: {
    ...BASE,
    composition: "left",
    camera: "handheld",
    typography: "serif",
    titleAnimation: "letters",
    background: "paper",
    screens: "fan",
    logoLayout: "poster",
    transitions: ["curtain", "slide", "zoom"],
    effects: ["grain"],
    direction:
      "Fanzine indépendant : ton complice et un brin décalé, tutoiement, titres courts et vivants (2 à 5 mots) avec de la personnalité. Rideaux et glissés pour un côté collage.",
  },
  synthwave: {
    ...BASE,
    composition: "center",
    camera: "drift",
    typography: "mono",
    titleAnimation: "flicker",
    titleEffect: "glow",
    background: "grid",
    screens: "tilt",
    energy: "high",
    transitions: ["zoom", "glitch", "cut"],
    effects: ["vignette", "scanlines", "grain"],
    direction: "Rétro années 80, route au néon vers l'horizon : titres de 2 à 4 mots qui brillent, ton cool et nostalgique. Rythme soutenu, zooms et coupes sur le beat.",
  },
  pop: {
    ...BASE,
    composition: "poster",
    camera: "handheld",
    typography: "condensed",
    titleAnimation: "letters",
    background: "halftone",
    screens: "fan",
    accent: "solid",
    energy: "high",
    transitions: ["zoom", "cut", "curtain"],
    effects: ["grain"],
    direction: "Pop art et bande dessinée : titres explosifs de 1 à 3 mots, onomatopées bienvenues si elles collent au produit, ton enthousiaste et direct. Rythme vif.",
  },
  sprint: {
    ...BASE,
    composition: "center",
    camera: "push",
    typography: "condensed",
    titleAnimation: "words",
    background: "stripes",
    screens: "stack",
    energy: "high",
    transitions: ["slide", "cut", "zoom"],
    effects: ["vignette", "grain"],
    direction: "Énergie de marque de sport : titres à l'impératif de 1 à 3 mots (va plus vite, dépasse-toi), ton motivant et franc. Scènes courtes, glissés et coupes sur le beat.",
  },
  "golden-hour": {
    ...BASE,
    composition: "center",
    camera: "drift",
    typography: "serif",
    titleAnimation: "fade",
    background: "sun",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "slide"],
    effects: ["light", "grain"],
    direction: "Chaleureux et apaisant, lumière de fin de journée : titres doux de 2 à 5 mots, ton bienveillant et humain, aucun superlatif. Rythme lent, fondus.",
  },
  fiesta: {
    ...BASE,
    composition: "center",
    camera: "push",
    typography: "display",
    titleAnimation: "letters",
    background: "confetti",
    screens: "carousel",
    transitions: ["zoom", "curtain", "slide"],
    effects: ["vignette"],
    direction: "Célébration (lancement, nouveauté, cap franchi) : titres festifs et courts de 2 à 4 mots, ton joyeux et reconnaissant envers les utilisateurs. Rythme enlevé.",
  },
  blueprint: {
    ...BASE,
    composition: "left",
    camera: "still",
    typography: "mono",
    titleAnimation: "typewriter",
    background: "blueprint-draft",
    screens: "row",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    transitions: ["slide", "cut"],
    effects: [],
    direction: "Plan technique d'ingénieur : titres précis comme des annotations (2 à 5 mots), ton factuel et rigoureux, aucun jargon marketing. Rythme régulier.",
  },
  // Shooting produit en studio : plateau tournant (swing), mockups en éventail comme sur un présentoir, faisceaux de lumière
  studio: {
    ...BASE,
    composition: "center",
    camera: "swing",
    typography: "display",
    titleAnimation: "words",
    background: "studio-stage",
    screens: "fan",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    transitions: ["zoom", "slide", "fade"],
    effects: ["rays", "grain"],
    direction: "Shooting produit en studio : le produit est présenté comme un objet design, sous les projecteurs. Titres nets de 2 à 5 mots centrés sur la valeur pour le client, ton premium et sûr de lui sans emphase. Rythme posé ; zooms façon mise au point pour les moments forts.",
  },
  cinema: {
    ...BASE,
    composition: "center",
    camera: "push",
    typography: "condensed",
    titleAnimation: "fade",
    background: "spotlight",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "cut"],
    effects: ["letterbox", "film", "grain"],
    direction: "Bande-annonce de cinéma : titres courts et solennels (2 à 4 mots), en crescendo, ton dramatique mais sincère. Plans longs, fondus au noir et coupes franches.",
  },
  ocean: {
    ...BASE,
    composition: "center",
    camera: "drift",
    typography: "sans",
    titleAnimation: "fade",
    background: "ocean-tide",
    screens: "carousel",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "slide"],
    effects: [],
    direction: "Fluide et serein comme l'océan : titres apaisants de 2 à 5 mots, ton clair et rassurant, promesse de simplicité. Rythme lent, fondus et glissés.",
  },
  arcade: {
    ...BASE,
    composition: "center",
    camera: "still",
    typography: "mono",
    titleAnimation: "letters",
    background: "pixels",
    screens: "row",
    energy: "high",
    transitions: ["cut", "zoom", "glitch"],
    effects: ["scanlines", "border"],
    direction: "Borne d'arcade rétro : titres de 1 à 3 mots façon écran de jeu (niveau suivant, prêt ?), ton joueur et compétitif. Rythme vif, coupes sur le beat.",
  },
  seventies: {
    ...BASE,
    composition: "center",
    camera: "drift",
    typography: "display",
    titleAnimation: "letters",
    background: "sunburst",
    screens: "fan",
    accent: "solid",
    transitions: ["curtain", "zoom", "slide"],
    effects: ["film", "grain"],
    direction: "Affiche des années 70 : titres ronds et chaleureux de 2 à 4 mots, ton optimiste et groovy sans caricature. Rythme dansant, rideaux et zooms.",
  },
  terrain: {
    ...BASE,
    composition: "left",
    camera: "drift",
    typography: "sans",
    titleAnimation: "words",
    background: "topo",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    transitions: ["slide", "fade"],
    effects: ["vignette", "grain"],
    direction: "Exploration et terrain : titres orientés progression et cap (2 à 5 mots), ton calme et déterminé, vocabulaire concret. Rythme régulier.",
  },
  hyperspace: {
    ...BASE,
    composition: "center",
    camera: "push",
    typography: "display",
    titleAnimation: "fade",
    titleEffect: "glow",
    background: "starfield",
    screens: "tilt",
    logoLayout: "echo",
    energy: "high",
    transitions: ["zoom", "fade", "cut"],
    effects: ["vignette", "light"],
    direction: "Saut dans l'hyperespace : titres très courts et audacieux (1 à 3 mots), ton de lancement de fusée, sensation de vitesse. Zooms et coupes sur le beat.",
  },
  creator: {
    ...BASE,
    composition: "left",
    camera: "handheld",
    typography: "display",
    titleAnimation: "words",
    background: "blobs",
    screens: "stack",
    transitions: ["cut", "slide", "zoom"],
    effects: ["viewfinder", "grain"],
    direction: "Vlog de créateur filmé caméra à l'épaule : titres parlés et spontanés (2 à 5 mots), tutoiement, ton authentique comme une story. Coupes rapides.",
  },
  riso: {
    ...BASE,
    composition: "left",
    camera: "still",
    typography: "display",
    titleAnimation: "mask",
    background: "halftone",
    screens: "split",
    accent: "solid",
    beatPulse: false,
    transitions: ["curtain", "cut"],
    effects: ["border", "grain"],
    direction: "Impression risographie d'atelier : titres graphiques de 2 à 4 mots, ton artisanal et créatif, un peu d'humour bienvenu. Rideaux et coupes nettes.",
  },
  // Keynote haut de gamme : titres révélés au masque puis posés en relief 3D, mockups inclinés, cube 3D entre les scènes
  summit: {
    ...BASE,
    composition: "extrude",
    camera: "push",
    typography: "sans",
    titleAnimation: "mask",
    background: "spotlight",
    screens: "tilt",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    transitions: ["cube", "slide", "fade"],
    effects: ["vignette", "light"],
    direction:
      "Keynote produit haut de gamme : ton professionnel, confiant et précis, sans superlatifs creux. Titres courts orientés bénéfice (2 à 5 mots), sous-titres factuels. Rythme posé mais affirmé ; la transition cube marque les moments forts, glissés et fondus pour le reste.",
  },
  // Aurores boréales, textes posés directement sur le ciel : sobre, lent, sans effet de verre
  aurora: {
    ...BASE,
    composition: "center",
    camera: "drift",
    typography: "sans",
    titleAnimation: "fade",
    background: "aurora",
    screens: "hero",
    logo: "soft",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "slide"],
    effects: ["vignette"],
    direction:
      "Ambiance aurore boréale, calme et sobre : titres courts et posés (2 à 4 mots), ton premium et rassurant, sans emphase. Scènes un peu plus longues que la moyenne ; fondus et glissés uniquement.",
  },
};

export function getRecipe(styleId: string | null | undefined): Recipe {
  return (styleId && RECIPES[styleId]) || DEFAULT_RECIPE;
}

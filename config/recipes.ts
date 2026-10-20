import { SIGNATURE_COLLECTION } from "./logo-motion-collection";
// ⚠️ Fichier aussi bundlé par Remotion : imports RELATIFS uniquement.
import type { Transition } from "../lib/projects/scenes";
import type { EditorialTreatment } from "./editorial-motion";
import type { GraphicMotionKind } from "./graphic-motion";
import type { ReferenceMotionKind } from "./reference-motion";
import type { LogoMotionId } from "./logo-motion";

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
 * tile-ring : grille + anneau de tuiles en orbite 3D · neon-tunnel : tunnel de néons qui fonce vers la caméra · grunge : spray, coulures, scotch
 * optic : trame halftone + cadre de mise au point · burst-panels : rayons, pilules, chevrons · gradient-mosaic : cases en dégradé sur le beat
 * grain-wave : vagues floues granuleuses · neon-flow : tubes de néon liquide · cosmic : planète éclairée, anneau, étoiles + formes en courbes de niveau
 * silk-ribbon : rubans de soie qui se tordent en 3D · wire-globe : globe en points + arcs de vol · led-matrix : panneau LED à points
 * marble : papier marbré, encres qui ondulent · circuit : circuit imprimé néon, impulsions sur les pistes
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
  | "pixels"
  // Fonds « inspirés » — remotion/video/inspired-backgrounds.tsx (partagés avec la galerie)
  | "tile-ring"
  | "neon-tunnel"
  | "grunge"
  | "optic"
  | "burst-panels"
  | "gradient-mosaic"
  | "grain-wave"
  | "neon-flow"
  | "cosmic"
  | "silk-ribbon"
  | "wire-globe"
  | "led-matrix"
  | "marble"
  | "circuit";

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

/**
 * Personnalité du mouvement (docs/MOTION-RULES.md) — remotion/video/transitions.tsx.
 * ease : courbe des entrées de scène · cubic (défaut) · expo : lent et feutré · quint : arrivée lourde
 * back : léger dépassement, mécanique · steps : par crans, comme un cliquet
 * exit : sortie des éléments avant une transition en fondu · fade (défaut) · sink : s'enfonce · rise : s'envole
 * shrink : se rétracte · slam : écrasé · blur : se dissout dans le flou
 */
export type MotionEase = "cubic" | "expo" | "quint" | "back" | "steps";
export type MotionExit = "fade" | "sink" | "rise" | "shrink" | "slam" | "blur";

export type Recipe = {
  logoMotion?: LogoMotionId;
  referenceMotion?: ReferenceMotionKind;
  graphicTreatment?: GraphicMotionKind;
  editorialLayout?: "column" | "aspect" | "interval" | "memento" | "broadsheet" | "crosscut" | "contact" | "folio" | "linea" | "slate";
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
  /** Courbe et sortie propres au template ; absent = mouvement par défaut du moteur. */
  motion?: { ease?: MotionEase; exit?: MotionExit };
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
  ...Object.fromEntries(SIGNATURE_COLLECTION.map((item) => [item.id, { ...BASE, logoMotion: item.id, screens: "hero", background: "clean", titleAnimation: "fade", composition: "center", camera: "still", beatPulse: false, effects: [], direction: "Preserve the supplied text exactly. " + item.description.en } satisfies Recipe])),
  "logo-neon-stack": { ...BASE, logoMotion: "logo-neon-stack", background: "clean", typography: "condensed", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied name exactly, no added claims or subtitles. Neon extruded lettering rotates with cyan and pink reflections." },
  "logo-slice": { ...BASE, logoMotion: "logo-slice", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only wordmark. Preserve the supplied text. Horizontal word slices slide apart and reassemble, with a black/white color inversion. No added images or copy." },
  "logo-liquid": { ...BASE, logoMotion: "logo-liquid", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only elastic wordmark. Preserve the supplied name. Soft letters squeeze, merge and return to sharp readable type. No added images or copy." },
  "logo-rise": { ...BASE, logoMotion: "logo-rise", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Letters rise one by one out of a baseline mask with vertical motion blur, an accent rule draws from the centre, then a staggered wave." },
  "logo-trace": { ...BASE, logoMotion: "logo-trace", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Serif wordmark drawn stroke by stroke in the accent colour, then filled, with a light sheen and a slow push-in." },
  "logo-wipe": { ...BASE, logoMotion: "logo-wipe", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Accent block wipes on and off to reveal the word, then an accent lens crosses and inverts the letters." },
  "logo-focus": { ...BASE, logoMotion: "logo-focus", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Italic serif word pulls from wide-tracked blur into focus with chromatic fringe, slow tracking breath and an anamorphic flare." },
  "logo-flip": { ...BASE, logoMotion: "logo-flip", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Each letter flips on its horizontal hinge like a split-flap board with an accent back face, and flips again mid-way." },
  "logo-echo": { ...BASE, logoMotion: "logo-echo", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Solid word with outlined repeats stacked above and below that spread out, scissor-drift, collapse into the word and reopen." },
  "logo-decode": { ...BASE, logoMotion: "logo-decode", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Each letter slot cycles through random characters in the accent colour and locks in left to right behind a blinking cursor; a re-scramble wave passes mid-way." },
  "logo-drop": { ...BASE, logoMotion: "logo-drop", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Letters fall one after another and bounce with squash and stretch over soft contact shadows, then hop once mid-way." },
  "logo-mosaic": { ...BASE, logoMotion: "logo-mosaic", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Serif word revealed through a grid of pixels that flash in the accent colour, partly dissolves mid-way and rebuilds." },
  "logo-coil": { ...BASE, logoMotion: "logo-coil", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Letters spin in curled around a wheel, unroll into a flat line, curl into an arc mid-way and straighten again." },
  "logo-impact": { ...BASE, logoMotion: "logo-impact", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Heavy condensed word slams down from huge scale with a flash, frame shake, shock ring and speed lines; a second hit mid-way." },
  "logo-neon": { ...BASE, logoMotion: "logo-neon", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["cut", "fade"], effects: [], direction: "Text-only logo motion. Preserve the supplied text exactly, no added images or copy. Glass neon tubes stutter on letter by letter, settle into a humming glow, and one letter buzzes out mid-way." },
  lucent: { ...BASE, referenceMotion: "lucent", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "bento", logo: "soft", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["mosaic", "fade"], effects: [], direction: "Dark abstract design gallery. Four square softly rounded glass tiles with molten orange/violet lightning, eclipse and prism silhouettes. A clear short white headline above the artwork; no full-screen text over the tiles. Use 2 to 5 words per title, measured transitions and slow luminous movement." },
  "bold-orbit": { ...BASE, referenceMotion: "bold-orbit", background: "clean", typography: "sans", titleAnimation: "words", composition: "center", camera: "still", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["eclipse", "fade", "iris", "cut"], motion: { ease: "expo", exit: "blur" }, effects: [], direction: "Minimal black motion poster. Six small outlined dots orbit an empty center, one glowing pink dot passes the light to the next. A short confident white sentence below, generous empty space. 2 to 4 words per title. No busy decoration, no invented event details." },
  "gold-rush": { ...BASE, referenceMotion: "gold-rush", background: "clean", typography: "condensed", titleAnimation: "flip", composition: "center", camera: "still", screens: "tilt", logo: "pop", logoLayout: "orbit", accent: "solid", beatPulse: false, energy: "high", transitions: ["cut", "curtain", "zoom"], effects: [], direction: "Red/black event-poster energy with oversized extruded metallic gold lettering rotating slowly in perspective. Keep titles extremely short, 1 to 3 words, so the 3D lettering dominates. Warm gold highlights, black sides, red light rising from below. Never invent dates, artists, venue or statistics." },
  "echo-frame": { ...BASE, referenceMotion: "echo-frame", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["zoom", "shutter", "cut"], effects: [], direction: "White photographic motion poster. Large black words at top and bottom frame a clean rectangular central photo. On each scene, the image stretches into a soft vertical echo, then resolves sharply. Titles of 2 to 4 words split into top/bottom phrases; keep the central photograph clear and do not add fictitious claims." },
  anvil: {
    ...BASE, graphicTreatment: "anvil", background: "clean", typography: "condensed", titleAnimation: "mask", composition: "center", camera: "still", screens: "hero", accent: "solid", energy: "high", beatPulse: true, transitions: ["press", "shutter", "cut"], motion: { ease: "quint", exit: "slam" }, effects: [],
    direction: "An industrial press: heavy upper and lower clamp jaws approach the open center, stop short of the title and release on the beat. Warm paper, ink and vermilion. Massive centered 1 to 3 word headlines; preserve the central reading window.",
  },
  tessera: {
    ...BASE, graphicTreatment: "tessera", background: "clean", typography: "sans", titleAnimation: "words", composition: "left", camera: "still", screens: "bento", accent: "solid", energy: "balanced", beatPulse: false, transitions: ["tessellate", "mosaic", "fold", "cut"], motion: { ease: "quint", exit: "blur" }, effects: [],
    direction: "Four proportionally square lavender tiles with quarter-circle inlays settle into a clean two-by-two composition. Left-aligned headline below. Mosaic transitions disperse square tiles in a staggered rotation; no elongated diamonds or triangular spikes.",
  },
  suture: {
    ...BASE, graphicTreatment: "suture", background: "clean", typography: "serif", titleAnimation: "letters", composition: "left", camera: "still", screens: "stack", logo: "soft", accent: "solid", energy: "balanced", beatPulse: false, transitions: ["stitch", "fade", "curtain"], motion: { ease: "expo", exit: "rise" }, effects: [],
    direction: "Black editorial poster with a vermilion thread drawing through oversized stitch points at the edges. Asymmetric ivory serif headline, wide black breathing room, a clear connection motif. No waveform or starfield.",
  },
  ratchet: {
    ...BASE, graphicTreatment: "ratchet", background: "clean", typography: "condensed", titleAnimation: "mask", composition: "left", camera: "still", screens: "carousel", accent: "solid", energy: "high", beatPulse: true, transitions: ["cog", "rotary", "track", "cut"], motion: { ease: "steps", exit: "shrink" }, effects: [],
    direction: "A perfectly circular precision cog with an orange hub turns in eased discrete steps on warm ivory. Condensed flat headlines below in portrait, beside the cog in square and landscape. Use rotary shutter transitions and occasional express cuts. No stretched gear or extruded titles.",
  },
  // Gloss : liquide chromé rose qui monte jusqu'à un mot en contour lumineux
  gloss: {
    ...BASE, graphicTreatment: "gloss", background: "clean", typography: "condensed", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", logo: "soft", accent: "solid", energy: "balanced", beatPulse: true, transitions: ["surge", "fade", "cut"], motion: { ease: "expo", exit: "rise" }, effects: [],
    direction: "Black poster with a glossy pink-and-white chrome liquid flowing in the lower half and rising in a column to meet ONE tall condensed uppercase word drawn as a glowing pink outline filled with black. A short uppercase lead-in subtitle above the word (like 'I'M THE'), a three-column header. Titles of one word; subtitle of 1 to 3 words.",
  },
  // Lumen (ex-Interlock, ex-Capsule) : mot en contour orange, colonnes de lumière violette
  interlock: {
    ...BASE, graphicTreatment: "interlock", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "bento", logo: "soft", accent: "solid", energy: "balanced", beatPulse: true, transitions: ["streak", "capsule", "track", "shutter", "fade"], motion: { ease: "expo", exit: "rise" }, effects: [],
    direction: "Neon long-exposure poster: ONE short lowercase word drawn as peach-orange outlines with a violet inner glow, each letter stretched into tall violet light columns and thin luminous vertical lines; dusty black film background. A short lowercase lead-in subtitle above the word (like 'lost in'). Titles of one word; subtitle of 1 to 3 words.",
  },
  "column": { ...BASE, editorialLayout: "column", "photoTreatment":"newsprint","typography":"serif","titleAnimation":"mask","composition":"center","camera":"still","background":"clean","screens":"hero","logo":"soft","accent":"solid","beatPulse":false,"energy":"balanced","transitions":["fold","fade"],"effects":[],"direction":"Asymmetric magazine cover: title in the top-left column, a large photograph below, a small monochrome inset top-right and a dividing rule. Preserve the editorial grid, do not center the title." },
  "aspect": { ...BASE, editorialLayout: "aspect", "photoTreatment":"offset","typography":"serif","titleAnimation":"words","composition":"left","camera":"still","background":"clean","screens":"hero","logo":"soft","accent":"solid","beatPulse":false,"energy":"balanced","transitions":["slide","fade"],"effects":[],"direction":"A diagonal-cut portrait above a bottom-left serif headline. The diagonal aperture expands slowly. Keep copy to 2 to 4 words; leave the upper portrait clear." },
  // Holo (ex-Patina) : capsule holographique, titre découpé, entailles diagonales
  spill: { ...BASE, graphicTreatment: "spill", accent: "solid", background: "clean", typography: "condensed", titleAnimation: "mask", composition: "left", camera: "still", screens: "hero", energy: "calm", transitions: ["gravity-pull", "fade"], motion: { ease: "expo", exit: "sink" }, effects: [], direction: "A monochrome word on a sloping typographic plane; long tapered white liquid tails fall from its lower edge and fade into charcoal. Signature: gravity draws the letters into full-frame curtains which release the next scene. Keep one short uppercase word per title (two maximum), minimal subtitle. Continuous slow swaying of the liquid, never a static poster. Respect project screens and logo scenes." },
  veil: { ...BASE, graphicTreatment: "veil", accent: "solid", background: "clean", typography: "display", titleAnimation: "fade", composition: "center", camera: "still", screens: "carousel", energy: "calm", transitions: ["violet-fold", "fade"], motion: { ease: "expo", exit: "blur" }, effects: [], direction: "A pale neutral optical poster, bold lowercase dark word crossed by a violet reflection. Two out-of-focus dark folds edged in violet rise from the lower foreground. Signature: soft violet folds sweep up to cover the frame and recede. One short word per title (two maximum), lowercase, brief supporting subtitle. Continuous reflection and foreground drift, no flashing. Preserve screen and logo scenes." },
  fanout: { ...BASE, graphicTreatment: "fanout", accent: "solid", background: "clean", typography: "condensed", titleAnimation: "mask", composition: "poster", camera: "push", screens: "split", energy: "high", transitions: ["fan-fold", "fade"], motion: { ease: "quint", exit: "slam" }, effects: [], direction: "Folded condensed typography on black. Two lines fan out around a diagonal hinge, each letter tapering in perspective. Signature: the typographic fan folds closed across the full frame and unfolds the next scene. One short word per title (two maximum); no institution names or dates invented. Main text rests after the fan settles." },
  blocktype: { ...BASE, graphicTreatment: "blocktype", accent: "solid", background: "clean", typography: "condensed", titleAnimation: "flip", composition: "extrude", camera: "still", screens: "tilt", energy: "balanced", transitions: ["block-pivot", "fade"], motion: { ease: "quint", exit: "shrink" }, effects: [], direction: "A pure black-and-white isometric cube made entirely of giant condensed letters on three visible faces. Signature: the letter cube pivots forward and fills the frame, revealing the next cube. One short word per title (two maximum), repeated on its faces, minimal subtitle. Keep the cube geometrically square in every format." },
  positive: { ...BASE, graphicTreatment: "positive", accent: "solid", background: "clean", typography: "condensed", titleAnimation: "words", composition: "center", camera: "drift", screens: "row", energy: "balanced", transitions: ["mirror-horizon", "fade"], motion: { ease: "expo", exit: "sink" }, effects: [], direction: "Metallic monochrome typographic perspective. Four giant repeated words fade towards a dark central horizon, reflected upside down below it. Signature: mirrored type converges into the horizon, which opens into the next scene. One short uppercase word per title (two maximum), one short subtitle. No color accents, preserve the dark mirror seam." },
  helix: { ...BASE, graphicTreatment: "helix", accent: "solid", background: "clean", typography: "condensed", titleAnimation: "letters", composition: "left", camera: "still", screens: "carousel", energy: "balanced", transitions: ["helix-wind", "fade"], motion: { ease: "back", exit: "rise" }, effects: [], direction: "A tactile monochrome type ribbon coiling vertically between two thin elliptical rings on black. Large rotated letters and smaller echo words follow the winding strip, with restrained printed stipple. Signature: the helix winds into an opaque full-frame ribbon then unwinds the next scene. One short word per title (two maximum), short supporting subtitle. No invented claims." },
  power: { ...BASE, graphicTreatment: "power", accent: "solid", background: "clean", typography: "display", titleAnimation: "mask", composition: "poster", camera: "push", screens: "split", energy: "high", transitions: ["paint-sweep", "cut"], motion: { ease: "quint", exit: "slam" }, effects: [], direction: "A wall of nine bold uppercase repetitions with acid outlines and dry-brush marks. Signature: acid brush strokes sweep over the full frame to reveal the next scene. One short word per title (two maximum), one short supporting subtitle. Rows lock into place with a punchy quintic entry." },
  spectra: { ...BASE, graphicTreatment: "spectra", accent: "solid", background: "clean", typography: "condensed", titleAnimation: "flip", composition: "left", camera: "drift", screens: "row", energy: "high", transitions: ["type-stretch", "cut"], motion: { ease: "expo", exit: "shrink" }, effects: [], direction: "Experimental festival poster: italic white and rainbow words, reverse spectrum bars and compressed echoes on black. Signature: the poster stretches into a chromatic ribbon and releases the next scene. One short uppercase word per title (two maximum), one short supporting subtitle. Do not invent festival dates or sponsors." },
  batch: { ...BASE, graphicTreatment: "batch", accent: "solid", background: "clean", typography: "display", titleAnimation: "mask", composition: "center", camera: "still", screens: "bento", energy: "balanced", transitions: ["stack-collapse", "fade"], motion: { ease: "back", exit: "shrink" }, effects: [], direction: "Monochrome type sculpture on a cool light ground: one wide heavy word with six compressed echoes forming an elliptical stack. Signature: the stack collapses to the center then expands into a solid ink band and releases a new word. One short uppercase word per title (two maximum), minimal subtitle." },
  turn: { ...BASE, graphicTreatment: "turn", accent: "solid", background: "clean", typography: "condensed", titleAnimation: "flip", composition: "poster", camera: "swing", screens: "tilt", energy: "balanced", transitions: ["ribbon-turn", "cut"], motion: { ease: "quint", exit: "rise" }, effects: [], direction: "Black and white folded type ribbon, giant condensed letters sliced into three oblique bands with reversed top and bottom fragments. Signature: the ribbon twists over the entire frame then unfolds the next scene. One short uppercase word per title (two maximum), short subtitle. The main word remains readable after the twist." },
  "patina": { ...BASE, graphicTreatment: "patina", background: "clean", typography: "display", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", logo: "soft", accent: "solid", beatPulse: true, energy: "balanced", transitions: ["slash", "fade", "slide"], motion: { ease: "expo", exit: "shrink" }, effects: [], direction: "Holographic monolith: a rounded capsule with flowing cyan/violet/magenta metallic reflections, beveled edges and a dark title (vertical in portrait). Two diagonal slits oscillate at its ends. Signature motion: the slits widen into full-frame iridescent-edged bands that close and reopen the scene. Tiny rotated side labels, readable supporting text below. Titles of ONE short word (2 at most), uppercase; keep the subtitle to one short supporting sentence." },
  "interval": { ...BASE, editorialLayout: "interval", "photoTreatment":"shutters","typography":"condensed","titleAnimation":"letters","composition":"center","camera":"still","background":"clean","screens":"hero","logo":"soft","accent":"solid","beatPulse":false,"energy":"balanced","transitions":["shutter","fade"],"effects":[],"direction":"Three offset photographic fragments arranged as alternating steps. Condensed text left-aligned across the middle, clipped photo reveals synchronized with scene changes." },
  "memento": { ...BASE, editorialLayout: "memento", "photoTreatment":"inlay","typography":"serif","titleAnimation":"mask","composition":"center","camera":"still","background":"clean","screens":"hero","logo":"soft","accent":"solid","beatPulse":false,"energy":"balanced","transitions":["iris","fade"],"effects":[],"direction":"A tilted photographic print with an ivory border in the upper half, a large serif caption below and a fine footer rule. Printed keepsake rather than a full-frame portrait." },
  "torque": { ...BASE, graphicTreatment: "torque", "background":"clean","typography":"condensed","titleAnimation":"flip","composition":"poster","camera":"still","screens":"split","accent":"solid","energy":"high","beatPulse":true,"transitions":["shear","curtain","cut"],"motion":{"ease":"quint","exit":"sink"},"effects":[],"direction":"Tilted industrial poster under tension: two notched rails tilted -12 degrees surge in opposite directions on every beat, vermilion rules, a rev counter needle kicks to the red line. Short 1 to 3 word headlines with punch; no repeating wall of words." },
  "cadence": { ...BASE, graphicTreatment: "cadence", "background":"clean","typography":"sans","titleAnimation":"words","composition":"center","camera":"still","screens":"split","accent":"solid","energy":"high","beatPulse":true,"transitions":["track","shutter"],"effects":[],"direction":"Mechanical metronome: a calibrated metronome needle swings above the headline while proportionate columns bounce independently along the lower edge. Lime and ink, measured beat-driven motion; no full-screen block grid." },
  // Ember (ex-Flux) : affiche noire usée, mot incandescent à échos radiaux
  flux: { ...BASE, graphicTreatment: "flux", background: "clean", typography: "sans", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", logo: "soft", accent: "solid", energy: "balanced", beatPulse: true, transitions: ["ignite", "shutter", "cut", "slide"], motion: { ease: "expo", exit: "blur" }, effects: ["grain"], direction: "Worn black poster card with a horizontal fold, dust and scratches. One glowing word at the centre: white-hot core, letters echoing outward in a red-orange radial zoom blur that pulses on the beat. A short lowercase tagline in a small dark pill, tiny corner labels. Titles of ONE word (two at most), uppercase; subtitles short and lowercase." },
  "vector-beat": { ...BASE, graphicTreatment: "vector-beat", "background":"clean","typography":"display","titleAnimation":"letters","composition":"left","camera":"still","screens":"split","accent":"solid","energy":"high","beatPulse":true,"transitions":["track","cut"],"effects":[],"direction":"Directional arrow poster driven by the beat: a stream of chevrons steps forward on every beat in the upper third, a circular arrow turns in the right column, and a broad amber arrow shoots across the lower edge each bar. The headline sits in the open central lane between dashed guide lines. Short, forward-moving titles (2 to 4 words). No diagonal stripe wallpaper." },
  "blackout": { ...BASE, graphicTreatment: "blackout", "background":"clean","typography":"condensed","titleAnimation":"mask","composition":"center","camera":"still","screens":"split","accent":"solid","energy":"high","beatPulse":true,"transitions":["shutter","cut"],"effects":[],"direction":"Black optical instrument: a circular lime orbit above a centered white title, two precision reticles below and one advancing baseline. Preserve empty black space; no pulse-edge frame." },
  "voltage": { ...BASE, graphicTreatment: "voltage", "background":"clean","typography":"condensed","titleAnimation":"typewriter","composition":"poster","camera":"still","screens":"split","accent":"solid","energy":"high","beatPulse":true,"transitions":["glitch","cut"],"effects":["vignette"],"direction":"Black signal poster: a live orange waveform above a left-aligned white headline, sparse orange brackets and a barcode-like lower register. No starfield or space imagery." },
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
  broadsheet: {
    ...BASE, editorialLayout: "broadsheet", photoTreatment: "press-column", typography: "condensed", titleAnimation: "mask", composition: "left", camera: "still", background: "clean", screens: "hero", accent: "solid", beatPulse: false, energy: "high", transitions: ["track", "fold"], effects: [],
    direction: "Newspaper cover with a top-left condensed headline, narrow side photograph, and a wide lower monochrome crop. Vermilion typesetting rules slide into place. Use 2 to 4 words and imported images. No fabricated statistics.",
  },
  crosscut: {
    ...BASE, editorialLayout: "crosscut", photoTreatment: "diagonal-diptych", typography: "condensed", titleAnimation: "words", composition: "left", camera: "still", background: "clean", screens: "hero", accent: "solid", beatPulse: false, energy: "balanced", transitions: ["curtain", "slide"], effects: [],
    direction: "Two diagonal photographic apertures in opposing corners, a slightly tilted central headline on deep teal, warm coral registration lines. Crop slides in opposite directions; 2 to 4 word titles. No full-height split or central masthead band.",
  },
  // Melt (ex-Offprint) : texte qui fond en coulures roses et bleues dans un tourbillon spatial
  offprint: {
    ...BASE, graphicTreatment: "offprint", background: "clean", typography: "display", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", logo: "soft", accent: "solid", beatPulse: true, energy: "balanced",
    transitions: ["drip", "shutter", "track"], motion: { ease: "quint", exit: "sink" }, effects: [],
    direction: "Liquid melting type poster: ONE wide uppercase word, glowing white with a pink and blue fringe, slightly arched, with long pink-to-blue drips running down from the letters; dark space with a red and blue rotational blur swirl and dust stars. A short subtitle shown as spaced capitals at the top. Titles of one word (two at most).",
  },
  contact: {
    ...BASE, editorialLayout: "contact", photoTreatment: "contact-sheet", typography: "condensed", titleAnimation: "words", composition: "left", camera: "still", background: "clean", screens: "hero", accent: "solid", beatPulse: false, energy: "high", transitions: ["mosaic", "cut"], effects: [],
    direction: "Darkroom contact sheet: six crops of the same imported photo appear frame by frame in the upper half, and a red grease-pencil circle selects one. Condensed 2 to 4 word titles below. No film-strip ribbon or full-frame photo.",
  },
  folio: {
    ...BASE, editorialLayout: "folio", photoTreatment: "arch-window", typography: "serif", titleAnimation: "mask", composition: "left", camera: "still", background: "clean", screens: "hero", accent: "solid", beatPulse: false, energy: "calm", transitions: ["fold", "fade"], effects: [],
    direction: "A book-page composition: an arched photographic window rises from its base, with an offset rose outline and a fine folio rule. Elegant serif titles in the lower third. Quiet pacing; no masthead or split screen.",
  },
  // Halo (ex-Lens) : affiche noire, mot crème à arcs de rotation orange, grain
  lens: {
    ...BASE, graphicTreatment: "lens", background: "clean", typography: "display", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", logo: "soft", accent: "solid", beatPulse: true, energy: "balanced",
    transitions: ["whirl", "iris", "fade"], motion: { ease: "expo", exit: "shrink" }, effects: [],
    direction: "Black typographic poster: ONE word in normal case (e.g. Create), cream and grainy, whose copies spin around the centre so the outer letters trace glowing orange arcs on both sides. A short subtitle shown as widely spaced capitals above the word, tiny corner labels. Titles of one word; subtitles of 2 to 4 words.",
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
  linea: {
    ...BASE, editorialLayout: "linea", photoTreatment: "linea", typography: "sans", titleAnimation: "words", composition: "left", camera: "still",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["hairline", "fade"], motion: { ease: "expo", exit: "rise" }, effects: [],
    direction: "Very sober, very clean studio layout: light paper, a black-and-white photograph on the right, one fine blue hairline and precise sans-serif headlines on the left. Short calm copy (2 to 5 words), lots of air, no decoration.",
  },
  slate: {
    ...BASE, editorialLayout: "slate", photoTreatment: "slate", typography: "serif", titleAnimation: "mask", composition: "left", camera: "still",
    background: "clean", screens: "hero", logo: "soft", accent: "solid", beatPulse: false, energy: "calm", transitions: ["lift", "fade"], motion: { ease: "quint", exit: "sink" }, effects: [],
    direction: "Quiet, refined slate layout: a wide photograph across the top, one fine horizontal rule and an elegant serif headline below. Short understated copy (2 to 5 words), measured rhythm, no effects.",
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
    transitions: ["train", "track", "cut"], motion: { ease: "quint", exit: "shrink" }, effects: [],
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
    transitions: ["stencil", "cut", "slide", "curtain", "zoom"], motion: { ease: "back", exit: "slam" },
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
    transitions: ["stencil", "cut", "curtain"], motion: { ease: "quint", exit: "sink" },
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
    transitions: ["ink", "curtain", "fade"], motion: { ease: "expo", exit: "rise" },
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
    transitions: ["whip", "slide", "cut", "zoom"], motion: { ease: "quint", exit: "shrink" },
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
    transitions: ["burn", "fade", "cut"], motion: { ease: "expo" },
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
    transitions: ["ripple", "fade", "slide"], motion: { ease: "expo", exit: "sink" },
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
    transitions: ["burn", "curtain", "zoom", "slide"], motion: { ease: "back", exit: "rise" },
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
  // Void (ex-Carousel) : texte ambré défocalisé et couronne d'épines lumineuse qui tourne autour
  "carousel": {
    ...BASE, graphicTreatment: "carousel", background: "clean", typography: "display", titleAnimation: "fade", composition: "center", camera: "still", screens: "carousel", logo: "soft", logoLayout: "orbit", accent: "solid", beatPulse: true, energy: "balanced",
    transitions: ["defocus", "zoom", "fade", "cube"], motion: { ease: "expo", exit: "blur" }, effects: [],
    direction: "Dark cinematic poster: 2 or 3 short uppercase words stacked, glowing amber and softly out of focus, wrapped by a sharp luminous crown of thorns that turns in 3D around them, passing behind then in front of the letters. Heavy grain, warm black. Titles of 2 to 3 short words; mysterious, intense tone.",
  },
  "hyperloop": {
    ...BASE,
    background: "neon-tunnel",
    typography: "condensed",
    titleAnimation: "glitch",
    titleEffect: "glow",
    composition: "poster",
    camera: "glitch",
    screens: "stack",
    logo: "pop",
    logoLayout: "typographic",
    accent: "gradient",
    beatPulse: true,
    energy: "high",
    transitions: ["cut", "glitch", "zoom"],
    effects: ["scanlines"],
    direction: "Tunnel magenta, capitales condensées et sursauts de glitch : énergie club et lancement explosif. Titres de 1 à 3 mots, coupes franches.",
  },
  "grunge": {
    ...BASE,
    background: "grunge",
    typography: "condensed",
    titleAnimation: "flip",
    composition: "poster",
    camera: "handheld",
    screens: "tilt",
    logo: "pop",
    logoLayout: "poster",
    accent: "solid",
    beatPulse: true,
    energy: "high",
    transitions: ["cut", "curtain", "glitch"],
    effects: ["grain"],
    direction: "Affiche street : bombe de peinture violette et rose qui coule, scotch, gribouillis au marqueur. Ton direct et irrévérencieux, titres en capitales de 1 à 3 mots.",
  },
  // Smear (ex-Sticker) : affiche « traînée lumineuse »
  "sticker": {
    ...BASE, graphicTreatment: "sticker", background: "clean", typography: "condensed", titleAnimation: "words", composition: "center", camera: "still", screens: "stack", accent: "solid", energy: "high", beatPulse: true,
    transitions: ["smear", "cut", "slide", "curtain"], motion: { ease: "quint", exit: "blur" }, effects: ["grain"],
    direction: "Neon smear poster: one huge condensed uppercase word stretched into glowing vertical light trails, hot yellow core fading to magenta and violet, doubled above and below on black textured fabric with faint seams. Titles of 1 or 2 short words, uppercase and punchy. A signature-style app name at the bottom.",
  },
  // Noise (ex-Optic) : affiche typographique noire à faisceaux de lumière et gros grain
  "optic": {
    ...BASE, graphicTreatment: "optic", background: "clean", typography: "display", titleAnimation: "fade", composition: "center", camera: "still", screens: "hero", logo: "soft", logoLayout: "typographic", accent: "solid", beatPulse: true, energy: "balanced",
    transitions: ["flare", "fade", "zoom", "glass"], motion: { ease: "expo", exit: "blur" }, effects: [],
    direction: "Black typographic poster: two to four short words stacked one per line in a huge extended sans-serif, each line filling the width, white letters casting long vertical light beams above and below, heavy film grain. Bold uppercase claims of 2 to 4 short words; monochrome, no decoration.",
  },
  "darkroom": {
    ...BASE,
    background: "optic",
    typography: "mono",
    titleAnimation: "typewriter",
    composition: "center",
    camera: "still",
    screens: "split",
    logo: "soft",
    logoLayout: "typographic",
    accent: "solid",
    beatPulse: false,
    energy: "balanced",
    transitions: ["cut", "fade"],
    effects: ["grain"],
    direction: "Chambre noire : trame de points grise, cadre de visée, lueur rouge. Titres en machine à écrire, ton factuel et minimal, phrases courtes.",
  },
  "velocity": {
    ...BASE,
    background: "burst-panels",
    typography: "condensed",
    titleAnimation: "flip",
    composition: "poster",
    camera: "handheld",
    screens: "stack",
    logo: "pop",
    logoLayout: "poster",
    accent: "solid",
    beatPulse: true,
    energy: "high",
    transitions: ["whip", "cut", "zoom", "curtain"], motion: { ease: "back", exit: "slam" },
    effects: ["grain"],
    direction: "Version orange et nerveuse : rayons qui tournent, capitales géantes qui s'écrasent. Ton énergique, verbes d'action, titres de 1 à 3 mots.",
  },
  "tilework": {
    ...BASE,
    background: "gradient-mosaic",
    typography: "display",
    titleAnimation: "letters",
    composition: "center",
    camera: "drift",
    screens: "fan",
    logo: "pop",
    logoLayout: "emblem",
    accent: "gradient",
    beatPulse: true,
    energy: "balanced",
    transitions: ["zoom", "slide", "cube"],
    effects: ["grain"],
    direction: "Mosaïque coucher de soleil : cases orange et or qui s'allument au rythme, lettres qui rebondissent. Ton chaleureux et joyeux, titres courts.",
  },
  "haze": {
    ...BASE,
    background: "grain-wave",
    typography: "serif",
    titleAnimation: "fade",
    composition: "center",
    camera: "drift",
    screens: "hero",
    logo: "soft",
    logoLayout: "signature",
    accent: "gradient",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "glass"],
    effects: [],
    direction: "Brume violette granuleuse qui ondule lentement : intime et premium. Titres serif posés, ton doux et confiant, scènes un peu plus longues.",
  },
  "liquid-neon": {
    ...BASE,
    background: "neon-flow",
    typography: "display",
    titleAnimation: "letters",
    titleEffect: "glow",
    composition: "center",
    camera: "swing",
    screens: "tilt",
    logo: "pop",
    logoLayout: "orbit",
    accent: "gradient",
    beatPulse: true,
    energy: "high",
    transitions: ["ripple", "zoom", "glass", "fade"], motion: { ease: "expo", exit: "blur" },
    effects: ["vignette"],
    direction: "Tubes de néon liquide bleu-rose qui ondulent sur les bords, ambiance nuit. Titres lumineux et courts, rythme vif.",
  },
  "cosmos": {
    ...BASE,
    background: "cosmic",
    typography: "display",
    titleAnimation: "fade",
    titleEffect: "glow",
    composition: "glass",
    camera: "drift",
    screens: "fan",
    logo: "pop",
    logoLayout: "emblem",
    accent: "gradient",
    beatPulse: true,
    energy: "balanced",
    transitions: ["zoom", "fade", "cube"],
    effects: ["grain"],
    direction: "Espace onirique : arc de planète incandescent, anneau fin et formes en courbes de niveau néon qui dérivent. Ton imaginatif, titres posés sur verre dépoli.",
  },
  "silk": {
    ...BASE,
    background: "silk-ribbon",
    typography: "serif",
    titleAnimation: "fade",
    composition: "left",
    camera: "drift",
    screens: "hero",
    logo: "soft",
    logoLayout: "signature",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["fade", "slide", "glass"],
    effects: [],
    direction: "Rubans de soie terracotta qui ondulent et se retournent en 3D sur un papier crème. Ton élégant et éditorial, titres serif de 2 à 5 mots, scènes posées.",
  },
  "atlas": {
    ...BASE,
    background: "wire-globe",
    typography: "sans",
    titleAnimation: "words",
    composition: "center",
    camera: "push",
    screens: "bento",
    logo: "pop",
    logoLayout: "app-icon",
    accent: "gradient",
    beatPulse: true,
    energy: "balanced",
    transitions: ["zoom", "fade", "slide"],
    effects: ["vignette"],
    direction: "Globe en points qui tourne et arcs de vol entre les villes : portée mondiale, croissance, réseau. Ton ambitieux et factuel, titres de 2 à 4 mots.",
  },
  "marquee": {
    ...BASE,
    background: "led-matrix",
    typography: "condensed",
    titleAnimation: "flicker",
    titleEffect: "glow",
    composition: "center",
    camera: "still",
    screens: "split",
    logo: "pop",
    logoLayout: "typographic",
    accent: "solid",
    beatPulse: true,
    energy: "high",
    transitions: ["cut", "glitch"],
    effects: ["scanlines"],
    direction: "Panneau LED à points ambre : chevrons qui défilent, égaliseur qui saute sur le beat. Ton d'annonce, capitales courtes comme un écran de stade.",
  },
  "marble": {
    ...BASE,
    background: "marble",
    typography: "serif",
    titleAnimation: "mask",
    composition: "center",
    camera: "still",
    screens: "row",
    logo: "soft",
    logoLayout: "app-icon",
    accent: "solid",
    beatPulse: false,
    energy: "calm",
    transitions: ["ink", "fade", "slide"], motion: { ease: "expo", exit: "blur" },
    effects: [],
    direction: "Papier marbré façon ebru : veines d'encre bleu nuit et terracotta qui ondulent en haut et en bas, centre crème et dégagé. Ton raffiné et artisanal, titres serif courts.",
  },
  "circuit": {
    ...BASE,
    background: "circuit",
    typography: "mono",
    titleAnimation: "typewriter",
    titleEffect: "glow",
    composition: "left",
    camera: "push",
    screens: "tilt",
    logo: "pop",
    logoLayout: "emblem",
    accent: "gradient",
    beatPulse: true,
    energy: "balanced",
    transitions: ["cut", "glitch", "zoom"],
    effects: ["vignette"],
    direction: "Circuit imprimé vert néon : pistes, puces et impulsions lumineuses qui courent sur le cuivre. Ton technique et précis, titres courts comme des lignes de commande.",
  },
};

export function getRecipe(styleId: string | null | undefined): Recipe {
  return (styleId && RECIPES[styleId]) || DEFAULT_RECIPE;
}

import { z } from "zod";
import { LAYER_ICON_NAMES } from "../../config/layer-icons";

/**
 * Calques animés libres d'une scène (rendu : remotion/video/motion-layers.tsx).
 * Une mini-timeline à la After Effects : chaque calque a des propriétés de base, et peut animer chacune d'elles par images clés.
 * Pas de code arbitraire : tout est décrit en JSON borné, donc rendu à l'identique dans le Player, sur Lambda et dans les aperçus.
 *
 * Repères : x / y = centre du calque en fraction du cadre (0 → 1, au-delà = hors cadre) ; w = fraction de la largeur, h = de la hauteur ;
 * fontSize, radius, strokeWidth = fraction du plus petit côté. Les temps (t, start, end…) sont en secondes depuis le début de la scène.
 * Briques : texte (dégradé, rempli d'une capture, compteur animé), rect / ellipse (dégradé, texte évidé), image, logo,
 * path (tracé SVG libre qui se dessine), icon (pictogramme qui se dessine), particles (particules déterministes).
 * Ce fichier est aussi bundlé par Remotion : imports relatifs uniquement.
 */

export const LAYER_TYPES = ["text", "rect", "ellipse", "image", "logo", "path", "icon", "particles"] as const;
export const PARTICLE_SHAPES = ["circle", "square", "ring", "spark", "confetti", "star"] as const;
export const PARTICLE_MOTIONS = ["rise", "fall", "burst", "float", "snow", "confetti", "orbit"] as const;
export const LAYER_EASINGS = ["linear", "in", "out", "inOut", "back", "elastic", "bounce", "spring", "step"] as const;
export const LAYER_LOOPS = ["none", "float", "pulse", "spin", "wiggle", "blink", "drift"] as const;
export const TEXT_REVEALS = ["none", "words", "letters", "lines"] as const;
export const REVEAL_EFFECTS = ["rise", "fade", "pop", "blur", "drop", "slide"] as const;
export const LAYER_BLENDS = ["normal", "screen", "multiply", "overlay", "difference", "lighten"] as const;

export type LayerEasing = (typeof LAYER_EASINGS)[number];

export const MAX_LAYERS_PER_SCENE = 24;
export const MAX_KEYFRAMES = 24;
export const LAYER_TEXT_MAX = 300;

/** Propriétés animables (toutes numériques sauf color). */
export const ANIMATABLE_PROPS = ["x", "y", "w", "h", "scale", "scaleX", "scaleY", "rotation", "rotateX", "rotateY", "skewX", "opacity", "blur", "clipLeft", "clipRight", "clipTop", "clipBottom", "letterSpacing", "draw", "color"] as const;
type NumericProp = Exclude<(typeof ANIMATABLE_PROPS)[number], "color">;
export type LayerState = Record<NumericProp, number> & { color: string };

const HEX = /^#[0-9a-fA-F]{6}$/;
const hex = z.string().describe("Couleur #rrggbb");
const num = (description: string) => z.number().describe(description);

const AnimatableShape = {
  x: num("Centre horizontal, fraction de la largeur (0.5 = centre ; <0 ou >1 = hors cadre)"),
  y: num("Centre vertical, fraction de la hauteur"),
  w: num("Largeur, fraction de la largeur du cadre (1 = plein cadre). Texte : largeur max de la boîte"),
  h: num("Hauteur, fraction de la hauteur du cadre. Ignorée pour le texte"),
  scale: num("Échelle (1 = normale)"),
  scaleX: num("Échelle horizontale additionnelle (1 = normale)"),
  scaleY: num("Échelle verticale additionnelle (1 = normale)"),
  rotation: num("Rotation en degrés"),
  rotateX: num("Rotation 3D autour de l'axe horizontal, degrés"),
  rotateY: num("Rotation 3D autour de l'axe vertical, degrés"),
  skewX: num("Inclinaison horizontale, degrés"),
  opacity: num("Opacité 0 → 1"),
  blur: num("Flou, fraction du plus petit côté (0.01 = léger)"),
  clipLeft: num("Masque : part rognée à gauche, 0 → 1 (anime un volet)"),
  clipRight: num("Masque : part rognée à droite, 0 → 1"),
  clipTop: num("Masque : part rognée en haut, 0 → 1"),
  clipBottom: num("Masque : part rognée en bas, 0 → 1"),
  letterSpacing: num("Texte : interlettrage en em (0 = normal)"),
  draw: num("path / icon : part du trait dessinée, 0 → 1 (animer de 0 à 1 pour le dessiner)"),
  color: hex.describe("Couleur du remplissage, du texte, du trait (path / icon) ou des particules #rrggbb"),
};

/** Mêmes propriétés que le calque, sans leurs descriptions (déjà données une fois : le schéma est envoyé à chaque tour). */
const KeyframeProps = Object.fromEntries(Object.keys(AnimatableShape).map((key) => [key, key === "color" ? z.string().optional() : z.number().optional()])) as { [K in keyof typeof AnimatableShape]: z.ZodOptional<K extends "color" ? z.ZodString : z.ZodNumber> };
export const KeyframeSchema = z.object({
  t: num("Temps de l'image clé, en secondes depuis le début de la scène"),
  ease: z.enum(LAYER_EASINGS).optional().describe("Courbe qui mène à cette image clé depuis la précédente (défaut inOut)"),
  ...KeyframeProps,
}).describe("Une ou plusieurs propriétés animables du calque (mêmes unités) à atteindre à l'instant t");
export type LayerKeyframe = z.infer<typeof KeyframeSchema>;

/** Format accepté en entrée (Claude) : tout est facultatif sauf id et type, les valeurs par défaut sont posées par normalizeLayer. */
export const LayerInputSchema = z.object({
  id: z.string().describe("Identifiant court et unique dans la scène"),
  type: z.enum(LAYER_TYPES),
  ...Object.fromEntries(Object.entries(AnimatableShape).map(([key, schema]) => [key, schema.optional()])) as { [K in keyof typeof AnimatableShape]: z.ZodOptional<(typeof AnimatableShape)[K]> },
  text: z.string().optional().describe("Texte affiché (type text)"),
  font: z.enum(["heading", "body"]).optional().describe("Police des titres ou des textes du template / brand kit"),
  fontSize: num("Taille du texte, fraction du plus petit côté (0.08 = gros titre)").optional(),
  weight: num("Graisse 100 → 900").optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  uppercase: z.boolean().optional(),
  italic: z.boolean().optional(),
  lineHeight: num("Interligne (1.1 par défaut)").optional(),
  textReveal: z.enum(TEXT_REVEALS).optional().describe("Apparition du texte par mot, lettre ou ligne (none = d'un bloc)"),
  revealEffect: z.enum(REVEAL_EFFECTS).optional().describe("Effet de chaque mot / lettre qui apparaît"),
  revealStart: num("Début de l'apparition, secondes").optional(),
  revealStagger: num("Décalage entre deux mots / lettres, secondes (0.06 par défaut)").optional(),
  revealDuration: num("Durée d'apparition de chaque mot / lettre, secondes (0.4 par défaut)").optional(),
  screen: z.number().nullable().optional().describe("image : numéro de la capture du projet ; text : remplit les lettres avec cette capture"),
  fit: z.enum(["contain", "cover"]).optional(),
  colors: z.array(hex).optional().describe("2 à 4 couleurs : dégradé du rect / ellipse / texte ; particles : couleurs tirées au hasard"),
  gradient: z.enum(["linear", "radial"]).optional(),
  gradientAngle: num("Angle du dégradé linéaire, degrés").optional(),
  radius: num("Arrondi des coins, fraction du plus petit côté").optional(),
  stroke: hex.nullable().optional().describe("Couleur du contour (forme sans remplissage si fill est false)"),
  strokeWidth: num("Épaisseur du contour, fraction du plus petit côté").optional(),
  fill: z.boolean().optional().describe("false = forme en contour seul"),
  glow: num("Halo lumineux de la couleur du calque, 0 → 1").optional(),
  shadow: num("Ombre portée, 0 → 1").optional(),
  blend: z.enum(LAYER_BLENDS).optional(),
  start: num("Apparition du calque, secondes (défaut 0)").nullable().optional(),
  end: num("Disparition du calque, secondes (défaut fin de scène)").nullable().optional(),
  loop: z.enum(LAYER_LOOPS).optional().describe("Mouvement continu ajouté : float flotte, pulse respire, spin tourne, wiggle tremble, blink clignote, drift dérive"),
  loopAmount: num("Amplitude du mouvement continu (1 = normale)").optional(),
  loopSpeed: num("Cycles par seconde du mouvement continu (0.5 par défaut)").optional(),
  path: z.string().optional().describe("path : tracé SVG (attribut d) dans la grille viewBox, ex. M10 80 C 40 10, 65 10, 95 80"),
  viewBox: z.string().optional().describe("path : grille du tracé, « minX minY largeur hauteur » (défaut 0 0 100 100), étirée sur w × h"),
  icon: z.enum(LAYER_ICON_NAMES as [string, ...string[]]).optional().describe("icon : pictogramme"),
  knockout: z.boolean().optional().describe("rect / ellipse : le texte (text, font, fontSize…) est évidé dans la forme"),
  particleCount: num("particles : nombre, 1 → 150").optional(),
  particleShape: z.enum(PARTICLE_SHAPES).optional(),
  particleMotion: z.enum(PARTICLE_MOTIONS).optional().describe("particles : rise monte, fall tombe, burst explose depuis le centre, float flotte, snow neige, confetti jaillit puis retombe, orbit tourne"),
  particleSize: num("particles : taille moyenne, fraction du plus petit côté (0.012 par défaut)").optional(),
  particleSpeed: num("particles : vitesse (1 = normale)").optional(),
  seed: num("particles : graine du tirage (change la disposition)").optional(),
  countFrom: num("text : compteur animé, valeur de départ ; {n} dans text marque sa place").optional(),
  countTo: num("text : compteur animé, valeur d'arrivée").optional(),
  countDecimals: num("text : décimales du compteur (0 par défaut)").optional(),
  countStart: num("text : début du comptage, secondes").optional(),
  countDuration: num("text : durée du comptage, secondes (1.2 par défaut)").optional(),
  countEase: z.enum(LAYER_EASINGS).optional(),
  keyframes: z.array(KeyframeSchema).optional().describe("Images clés : une propriété animée suit uniquement ses images clés (tenue avant la première et après la dernière)"),
});
export type MotionLayerInput = z.infer<typeof LayerInputSchema>;

export type MotionLayer = {
  id: string;
  type: (typeof LAYER_TYPES)[number];
  base: LayerState;
  text?: string;
  font: "heading" | "body";
  fontSize: number;
  weight: number;
  align: "left" | "center" | "right";
  uppercase: boolean;
  italic: boolean;
  lineHeight: number;
  textReveal: (typeof TEXT_REVEALS)[number];
  revealEffect: (typeof REVEAL_EFFECTS)[number];
  revealStart: number;
  revealStagger: number;
  revealDuration: number;
  /** URL interne d'une capture du projet (type image) */
  src?: string;
  fit: "contain" | "cover";
  colors?: string[];
  gradient: "linear" | "radial";
  gradientAngle: number;
  radius: number;
  stroke: string | null;
  strokeWidth: number;
  fill: boolean;
  glow: number;
  shadow: number;
  blend: (typeof LAYER_BLENDS)[number];
  start: number | null;
  end: number | null;
  /** path : tracé SVG et sa grille */
  path?: string;
  viewBox?: string;
  icon?: string;
  /** rect / ellipse : texte évidé */
  knockout?: boolean;
  particles?: { count: number; shape: (typeof PARTICLE_SHAPES)[number]; motion: (typeof PARTICLE_MOTIONS)[number]; size: number; speed: number; seed: number };
  /** text : compteur animé de from à to */
  counter?: { from: number; to: number; decimals: number; start: number; duration: number; ease: LayerEasing };
  loop: (typeof LAYER_LOOPS)[number];
  loopAmount: number;
  loopSpeed: number;
  keyframes: LayerKeyframe[];
};

const BOUNDS: Record<NumericProp, [number, number, number]> = {
  // [min, max, défaut]
  x: [-2, 3, 0.5], y: [-2, 3, 0.5], w: [0, 4, 0.3], h: [0, 4, 0.3],
  scale: [0, 20, 1], scaleX: [0, 20, 1], scaleY: [0, 20, 1],
  rotation: [-3600, 3600, 0], rotateX: [-720, 720, 0], rotateY: [-720, 720, 0], skewX: [-80, 80, 0],
  opacity: [0, 1, 1], blur: [0, 0.2, 0],
  clipLeft: [0, 1, 0], clipRight: [0, 1, 0], clipTop: [0, 1, 0], clipBottom: [0, 1, 0],
  letterSpacing: [-0.2, 2, 0],
  draw: [0, 1, 1],
};

const clamp = (value: unknown, min: number, max: number, fallback: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const round = (value: number) => Math.round(value * 10000) / 10000;
const color = (value: unknown, fallback: string) => typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;
const pick = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => options.includes(value as T) ? value as T : fallback;

export type LayerMedia = { screenUrls: string[]; hasLogo: boolean; sceneDuration: number };

/**
 * Valeurs bornées, médias limités à ceux du projet. `previous` = calque actuel du même id (les champs absents en sont repris).
 * Lève une erreur lisible (renvoyée à Claude) si le calque est inutilisable.
 */
export function normalizeLayer(input: MotionLayerInput, media: LayerMedia, previous?: MotionLayer): MotionLayer {
  const id = /^[a-zA-Z0-9_-]{1,40}$/.test(input.id) ? input.id : null;
  if (!id) throw new Error(`Identifiant de calque invalide « ${input.id} » (lettres, chiffres, - et _ ; 40 caractères max).`);
  const prev = previous?.type === input.type ? previous : undefined;
  const fallbackColor = input.type === "text" ? "#ffffff" : "#ffffff";
  const base = Object.fromEntries(Object.entries(BOUNDS).map(([key, [min, max, def]]) => {
    const fallback = prev?.base[key as NumericProp] ?? (input.type === "text" && key === "w" ? 0.8 : def);
    return [key, round(clamp(input[key as NumericProp], min, max, fallback))];
  })) as Record<NumericProp, number>;
  const state: LayerState = { ...base, color: color(input.color, prev?.base.color ?? fallbackColor) };

  let src: string | undefined;
  if (input.type === "image" || input.type === "text") {
    const index = input.screen;
    if (index === undefined) src = prev?.src;
    else if (index !== null && Number.isInteger(index)) src = media.screenUrls[index];
    if (input.type === "text" && (index === undefined || index === null) && !prev?.src) src = undefined;
    else if (!src || !media.screenUrls.includes(src)) throw new Error(`Calque « ${id} » : capture introuvable (${media.screenUrls.length ? `numéros valides : 0 à ${media.screenUrls.length - 1}` : "aucune capture dans le projet"}).`);
  }
  if (input.type === "logo" && !media.hasLogo) throw new Error("Aucun logo dans le projet : demande à l'utilisateur de l'ajouter dans Médias.");
  const counter = normalizeCounter(input, prev?.counter);
  const text = (input.text ?? prev?.text ?? (counter ? "{n}" : "")).trim().slice(0, LAYER_TEXT_MAX);
  if (input.type === "text" && !text) throw new Error(`Calque texte « ${id} » sans texte.`);
  const knockout = (input.type === "rect" || input.type === "ellipse") && (input.knockout ?? prev?.knockout ?? false);
  if (knockout && !text) throw new Error(`Calque « ${id} » : texte évidé sans texte.`);
  const path = input.type === "path" ? (input.path ?? prev?.path ?? "").trim() : undefined;
  if (path !== undefined && (!/^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]*$/.test(path) || path.length > 5000)) throw new Error(`Calque « ${id} » : tracé SVG invalide (commandes M L H V C S Q T A Z et nombres uniquement).`);
  const viewBox = input.type === "path" ? (input.viewBox ?? prev?.viewBox ?? "0 0 100 100").trim() : undefined;
  if (viewBox !== undefined && !/^-?\d+(\.\d+)?( -?\d+(\.\d+)?){1}( \d+(\.\d+)?){2}$/.test(viewBox)) throw new Error(`Calque « ${id} » : viewBox invalide (« 0 0 100 100 »).`);
  const icon = input.type === "icon" ? input.icon ?? prev?.icon : undefined;
  if (input.type === "icon" && (!icon || !LAYER_ICON_NAMES.includes(icon))) throw new Error(`Calque « ${id} » : icône inconnue.`);
  const particles = input.type === "particles" ? {
    count: Math.round(clamp(input.particleCount, 1, 150, prev?.particles?.count ?? 40)),
    shape: pick(input.particleShape, PARTICLE_SHAPES, prev?.particles?.shape ?? "circle"),
    motion: pick(input.particleMotion, PARTICLE_MOTIONS, prev?.particles?.motion ?? "float"),
    size: round(clamp(input.particleSize, 0.002, 0.08, prev?.particles?.size ?? 0.012)),
    speed: round(clamp(input.particleSpeed, 0.1, 5, prev?.particles?.speed ?? 1)),
    seed: Math.round(clamp(input.seed, 0, 9999, prev?.particles?.seed ?? 1)),
  } : undefined;

  const keyframes = (input.keyframes ?? prev?.keyframes ?? [])
    .slice(0, MAX_KEYFRAMES)
    .filter((k) => Number.isFinite(k.t))
    .map((k) => {
      const out: LayerKeyframe = { t: round(clamp(k.t, 0, 60, 0)), ease: pick(k.ease, LAYER_EASINGS, "inOut") };
      for (const [key, [min, max]] of Object.entries(BOUNDS) as [NumericProp, [number, number, number]][]) {
        if (k[key] !== undefined && Number.isFinite(k[key])) out[key] = round(clamp(k[key], min, max, 0));
      }
      if (k.color !== undefined && HEX.test(k.color)) out.color = k.color.toLowerCase();
      return out;
    })
    .sort((a, b) => a.t - b.t);

  const colors = (input.colors ?? prev?.colors ?? []).filter((c) => HEX.test(c)).map((c) => c.toLowerCase()).slice(0, 4);
  const startIn = input.start === undefined ? prev?.start ?? null : input.start;
  const endIn = input.end === undefined ? prev?.end ?? null : input.end;
  const start = startIn === null ? null : round(clamp(startIn, 0, 60, 0));
  const end = endIn === null ? null : round(clamp(endIn, 0, 60, media.sceneDuration));
  if (start !== null && end !== null && end <= start) throw new Error(`Calque « ${id} » : end doit être après start.`);
  return {
    id,
    type: input.type,
    base: state,
    ...((input.type === "text" || knockout) && { text }),
    ...(path !== undefined && { path, viewBox }),
    ...(icon && { icon }),
    ...(knockout && { knockout }),
    ...(particles && { particles }),
    ...(input.type === "text" && counter && { counter }),
    font: pick(input.font, ["heading", "body"] as const, prev?.font ?? "heading"),
    fontSize: round(clamp(input.fontSize, 0.01, 0.6, prev?.fontSize ?? 0.08)),
    weight: Math.round(clamp(input.weight, 100, 900, prev?.weight ?? 700) / 100) * 100,
    align: pick(input.align, ["left", "center", "right"] as const, prev?.align ?? "center"),
    uppercase: input.uppercase ?? prev?.uppercase ?? false,
    italic: input.italic ?? prev?.italic ?? false,
    lineHeight: round(clamp(input.lineHeight, 0.7, 2.5, prev?.lineHeight ?? 1.1)),
    textReveal: pick(input.textReveal, TEXT_REVEALS, prev?.textReveal ?? "none"),
    revealEffect: pick(input.revealEffect, REVEAL_EFFECTS, prev?.revealEffect ?? "rise"),
    revealStart: round(clamp(input.revealStart, 0, 60, prev?.revealStart ?? 0)),
    revealStagger: round(clamp(input.revealStagger, 0, 2, prev?.revealStagger ?? 0.06)),
    revealDuration: round(clamp(input.revealDuration, 0.05, 5, prev?.revealDuration ?? 0.4)),
    ...(src && { src }),
    fit: pick(input.fit, ["contain", "cover"] as const, prev?.fit ?? "contain"),
    ...(colors.length >= 2 && { colors }),
    gradient: pick(input.gradient, ["linear", "radial"] as const, prev?.gradient ?? "linear"),
    gradientAngle: round(clamp(input.gradientAngle, -360, 360, prev?.gradientAngle ?? 135)),
    radius: round(clamp(input.radius, 0, 0.5, prev?.radius ?? 0)),
    stroke: input.stroke === undefined ? prev?.stroke ?? null : input.stroke === null ? null : color(input.stroke, "#ffffff"),
    strokeWidth: round(clamp(input.strokeWidth, 0, 0.1, prev?.strokeWidth ?? (input.type === "path" || input.type === "icon" ? 0.006 : 0.004))),
    fill: input.fill ?? prev?.fill ?? !(input.type === "path" || input.type === "icon"),
    glow: round(clamp(input.glow, 0, 1, prev?.glow ?? 0)),
    shadow: round(clamp(input.shadow, 0, 1, prev?.shadow ?? 0)),
    blend: pick(input.blend, LAYER_BLENDS, prev?.blend ?? "normal"),
    start,
    end,
    loop: pick(input.loop, LAYER_LOOPS, prev?.loop ?? "none"),
    loopAmount: round(clamp(input.loopAmount, 0, 10, prev?.loopAmount ?? 1)),
    loopSpeed: round(clamp(input.loopSpeed, 0, 10, prev?.loopSpeed ?? 0.5)),
    keyframes,
  };
}

/** Calque stocké → format d'entrée de Claude (capture désignée par son numéro). Sert au plan envoyé à Claude. */
export function layerToInput(layer: MotionLayer, screenUrls: string[]): MotionLayerInput {
  const { base, src, keyframes, particles, counter, ...rest } = layer;
  return {
    ...rest,
    ...base,
    ...(src && { screen: screenUrls.indexOf(src) }),
    ...(layer.type === "image" && !src && { screen: null }),
    ...(particles && { particleCount: particles.count, particleShape: particles.shape, particleMotion: particles.motion, particleSize: particles.size, particleSpeed: particles.speed, seed: particles.seed }),
    ...(counter && { countFrom: counter.from, countTo: counter.to, countDecimals: counter.decimals, countStart: counter.start, countDuration: counter.duration, countEase: counter.ease }),
    ...(keyframes.length && { keyframes }),
  };
}

function normalizeCounter(input: MotionLayerInput, prev: MotionLayer["counter"]): MotionLayer["counter"] {
  if (input.countFrom === undefined && input.countTo === undefined && !prev) return undefined;
  const to = clamp(input.countTo, -1e12, 1e12, prev?.to ?? 0);
  return {
    from: clamp(input.countFrom, -1e12, 1e12, prev?.from ?? 0),
    to,
    decimals: Math.round(clamp(input.countDecimals, 0, 3, prev?.decimals ?? 0)),
    start: round(clamp(input.countStart, 0, 60, prev?.start ?? 0)),
    duration: round(clamp(input.countDuration, 0.05, 30, prev?.duration ?? 1.2)),
    ease: pick(input.countEase, LAYER_EASINGS, prev?.ease ?? "out"),
  };
}

/** Texte affiché à l'instant `time` : compteur formaté dans la langue de la vidéo à la place de {n}. */
export function layerText(layer: MotionLayer, time: number, locale = "fr"): string {
  const text = layer.text ?? "";
  const c = layer.counter;
  if (!c) return text;
  const value = c.from + (c.to - c.from) * ease(c.ease, (time - c.start) / c.duration);
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals }).format(value);
  return text.includes("{n}") ? text.split("{n}").join(formatted) : formatted;
}

/** Courbes d'animation (0 → 1). */
export function ease(kind: LayerEasing, t: number): number {
  const x = Math.min(1, Math.max(0, t));
  switch (kind) {
    case "linear": return x;
    case "in": return x ** 3;
    case "out": return 1 - (1 - x) ** 3;
    case "inOut": return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
    case "back": { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; }
    case "elastic": return x === 0 || x === 1 ? x : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
    case "bounce": {
      const n = 7.5625, d = 2.75;
      if (x < 1 / d) return n * x * x;
      if (x < 2 / d) { const y = x - 1.5 / d; return n * y * y + 0.75; }
      if (x < 2.5 / d) { const y = x - 2.25 / d; return n * y * y + 0.9375; }
      const y = x - 2.625 / d; return n * y * y + 0.984375;
    }
    case "spring": return x === 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(x * 4.5 * Math.PI) * (1 - x);
    case "step": return x < 1 ? 0 : 1;
  }
}

function mixColor(a: string, b: string, k: number) {
  const pa = Number.parseInt(a.slice(1), 16), pb = Number.parseInt(b.slice(1), 16);
  const channel = (shift: number) => Math.round(((pa >> shift) & 255) + (((pb >> shift) & 255) - ((pa >> shift) & 255)) * k);
  return `#${[16, 8, 0].map((s) => Math.min(255, Math.max(0, channel(s))).toString(16).padStart(2, "0")).join("")}`;
}

function animate<K extends keyof LayerState>(layer: MotionLayer, key: K, time: number): LayerState[K] {
  const frames = layer.keyframes.filter((k) => k[key] !== undefined);
  if (!frames.length) return layer.base[key];
  if (time <= frames[0].t) return frames[0][key] as LayerState[K];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    if (time > b.t) continue;
    const k = b.t === a.t ? 1 : ease(b.ease ?? "inOut", (time - a.t) / (b.t - a.t));
    if (key === "color") return mixColor(a.color!, b.color!, Math.min(1, Math.max(0, k))) as LayerState[K];
    return ((a[key] as number) + ((b[key] as number) - (a[key] as number)) * k) as LayerState[K];
  }
  return frames.at(-1)![key] as LayerState[K];
}

/** État d'un calque à un instant de la scène (secondes) : images clés puis mouvement continu. */
export function layerStateAt(layer: MotionLayer, time: number): LayerState {
  const state = Object.fromEntries(ANIMATABLE_PROPS.map((key) => [key, animate(layer, key, time)])) as LayerState;
  const a = layer.loopAmount, phase = time * layer.loopSpeed * Math.PI * 2;
  switch (layer.loop) {
    case "float": state.y += Math.sin(phase) * 0.015 * a; break;
    case "pulse": state.scale *= 1 + Math.sin(phase) * 0.04 * a; break;
    case "spin": state.rotation += time * layer.loopSpeed * 360 * Math.sign(a || 1); break;
    case "wiggle":
      state.x += (Math.sin(phase * 1.7) + Math.sin(phase * 3.1 + 1)) * 0.004 * a;
      state.y += (Math.sin(phase * 2.3 + 2) + Math.sin(phase * 2.9)) * 0.004 * a;
      state.rotation += Math.sin(phase * 2.1) * 2 * a;
      break;
    case "blink": state.opacity *= Math.sin(phase) > 0 ? 1 : Math.max(0, 1 - a); break;
    case "drift": state.x += time * 0.02 * a; break;
    case "none": break;
  }
  return state;
}

/** Visible à cet instant (secondes depuis le début de la scène) ? */
export function layerVisible(layer: MotionLayer, time: number, sceneDuration: number) {
  return time >= (layer.start ?? 0) && time < (layer.end ?? sceneDuration);
}

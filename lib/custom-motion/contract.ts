// ⚠️ Importé par la composition Remotion (bundlée par webpack) : imports RELATIFS uniquement, pas d'alias "@/".
import { z } from "zod";

/**
 * Claude privé : contrat entre le code libre écrit par Claude (studio admin) et le reste du site.
 * - `meta` déclare ce que l'utilisateur peut changer : types de scènes, textes, couleurs, formats.
 * - `demo` est le contenu par défaut copié dans le projet de l'utilisateur.
 * - Le code exporte par défaut un composant qui reçoit `CustomVideoInput` et dessine toute la vidéo.
 */

export const COMMUNITY_PREFIX = "community:";

/** styleId d'un projet créé depuis une vidéo Créations : "community:<id de version>". */
export function communityVersionId(styleId: string | null | undefined): string | null {
  if (!styleId?.startsWith(COMMUNITY_PREFIX)) return null;
  const id = styleId.slice(COMMUNITY_PREFIX.length);
  return /^[a-z0-9]{8,40}$/.test(id) ? id : null;
}

export function isCommunityStyle(styleId: string | null | undefined) {
  return communityVersionId(styleId) !== null;
}

/** Seuls modules importables par le code de Claude (remotion/custom/runtime.ts les fournit). */
export const CUSTOM_IMPORTS = ["react", "react/jsx-runtime", "remotion", "three", "@remotion/three", "@react-three/fiber", "kinetik"] as const;

export const CUSTOM_FORMATS =["LANDSCAPE", "PORTRAIT", "SQUARE"] as const;
export const CUSTOM_MAX_SCENES = 12;
export const CUSTOM_MIN_SECONDS = 0.5;
export const CUSTOM_MAX_SECONDS = 20;
export const CUSTOM_MAX_TOTAL_SECONDS = 90;
export const CUSTOM_TEXT_MAX = 300;
export const CUSTOM_MAX_COLORS = 6;

const id = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/, "identifiant en minuscules (a-z, 0-9, -), 32 caractères max");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "couleur #rrggbb");

export const CustomTextFieldSchema = z.object({
  key: id,
  label: z.string().min(1).max(40).describe("Libellé montré à l'utilisateur, ex. « Titre »"),
  max: z.number().int().min(1).max(CUSTOM_TEXT_MAX).describe("Longueur maximale (caractères)"),
  multiline: z.boolean().optional(),
});

export const CustomSceneTypeSchema = z.object({
  type: id.describe("Identifiant du type de scène, ex. « intro »"),
  label: z.string().min(1).max(40).describe("Nom montré à l'utilisateur"),
  texts: z.array(CustomTextFieldSchema).max(8),
  minDuration: z.number().min(CUSTOM_MIN_SECONDS).max(CUSTOM_MAX_SECONDS),
  maxDuration: z.number().min(CUSTOM_MIN_SECONDS).max(CUSTOM_MAX_SECONDS),
  defaultDuration: z.number().min(CUSTOM_MIN_SECONDS).max(CUSTOM_MAX_SECONDS),
  /** L'utilisateur peut ajouter / dupliquer / supprimer ce type de scène */
  repeatable: z.boolean(),
  /** La scène montre un écran (mockup) que l'utilisateur peut remplacer par une de ses captures */
  screen: z.boolean().optional(),
});

export const CustomMotionMetaSchema = z.object({
  sceneTypes: z.array(CustomSceneTypeSchema).min(1).max(CUSTOM_MAX_SCENES),
  colors: z.array(z.object({ label: z.string().min(1).max(30) })).min(1).max(CUSTOM_MAX_COLORS).describe("Rôle de chaque couleur de la palette, dans l'ordre (ex. Fond, Texte, Accent)"),
  formats: z.array(z.enum(CUSTOM_FORMATS)).min(1),
  minScenes: z.number().int().min(1).max(CUSTOM_MAX_SCENES),
  maxScenes: z.number().int().min(1).max(CUSTOM_MAX_SCENES),
  /** La vidéo affiche le logo de l'utilisateur s'il en a un */
  usesLogo: z.boolean(),
  /** Nombre de photos / captures de l'utilisateur utilisées (0 = aucune) */
  photos: z.number().int().min(0).max(6),
}).superRefine((meta, ctx) => {
  if (meta.minScenes > meta.maxScenes) ctx.addIssue({ code: "custom", message: "minScenes > maxScenes" });
  const types = new Set<string>();
  for (const scene of meta.sceneTypes) {
    if (types.has(scene.type)) ctx.addIssue({ code: "custom", message: `type de scène en double : ${scene.type}` });
    types.add(scene.type);
    if (scene.minDuration > scene.maxDuration || scene.defaultDuration < scene.minDuration || scene.defaultDuration > scene.maxDuration) ctx.addIssue({ code: "custom", message: `durées incohérentes pour ${scene.type}` });
    if (new Set(scene.texts.map((t) => t.key)).size !== scene.texts.length) ctx.addIssue({ code: "custom", message: `textes en double dans ${scene.type}` });
  }
});

export type CustomMotionMeta = z.infer<typeof CustomMotionMetaSchema>;
export type CustomSceneType = z.infer<typeof CustomSceneTypeSchema>;

export const CustomDemoSchema = z.object({
  scenes: z.array(z.object({
    type: id,
    duration: z.number().min(CUSTOM_MIN_SECONDS).max(CUSTOM_MAX_SECONDS),
    texts: z.record(z.string(), z.string().max(CUSTOM_TEXT_MAX)),
  })).min(1).max(CUSTOM_MAX_SCENES),
  colors: z.array(hex).min(1).max(CUSTOM_MAX_COLORS),
  musicTrackId: z.string().nullable(),
  bpm: z.number().min(40).max(220),
  appName: z.string().max(40),
});
export type CustomDemo = z.infer<typeof CustomDemoSchema>;

/** Vérifie la cohérence du contenu par défaut avec les réglages déclarés ; renvoie la liste des problèmes. */
export function demoIssues(meta: CustomMotionMeta, demo: CustomDemo): string[] {
  const issues: string[] = [];
  if (demo.scenes.length < meta.minScenes || demo.scenes.length > meta.maxScenes) issues.push(`la démo a ${demo.scenes.length} scènes (attendu ${meta.minScenes} à ${meta.maxScenes})`);
  if (demo.colors.length !== meta.colors.length) issues.push(`la démo a ${demo.colors.length} couleurs, meta.colors en déclare ${meta.colors.length}`);
  const total = demo.scenes.reduce((sum, s) => sum + s.duration, 0);
  if (total > CUSTOM_MAX_TOTAL_SECONDS) issues.push(`durée totale ${total} s > ${CUSTOM_MAX_TOTAL_SECONDS} s`);
  demo.scenes.forEach((scene, i) => {
    const type = meta.sceneTypes.find((t) => t.type === scene.type);
    if (!type) { issues.push(`scène ${i + 1} : type inconnu « ${scene.type} »`); return; }
    if (scene.duration < type.minDuration || scene.duration > type.maxDuration) issues.push(`scène ${i + 1} : durée hors bornes`);
    for (const key of Object.keys(scene.texts)) if (!type.texts.some((t) => t.key === key)) issues.push(`scène ${i + 1} : texte inconnu « ${key} »`);
    for (const field of type.texts) if ((scene.texts[field.key] ?? "").length > field.max) issues.push(`scène ${i + 1} : « ${field.key} » dépasse ${field.max} caractères`);
  });
  return issues;
}

/** Ce que la composition reçoit pour une vidéo Créations (ajouté aux props côté serveur, jamais stocké dans le projet). */
export type CustomRuntime = {
  /** JavaScript compilé (CommonJS) */
  code: string;
  meta: CustomMotionMeta;
  /** Images du studio : { nom: url } */
  assets: Record<string, string>;
};

/** Une scène telle que le code de Claude la reçoit. Temps en images. */
export type CustomSceneInput = {
  id: string;
  type: string;
  index: number;
  from: number;
  duration: number;
  texts: Record<string, string>;
  /** Scènes à écran : capture de l'utilisateur à afficher, null = faux écran dessiné par le code */
  screen: string | null;
};

/** Props du composant exporté par le code de Claude. */
export type CustomVideoInput = {
  scenes: CustomSceneInput[];
  /** Palette dans l'ordre de meta.colors */
  colors: string[];
  format: (typeof CUSTOM_FORMATS)[number];
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  /** Tempo de la musique, et position du premier temps (en images) */
  bpm: number;
  beatPhase: number;
  appName: string;
  websiteUrl: string | null;
  locale: "fr" | "en";
  logoUrl: string | null;
  photos: string[];
  assets: Record<string, string>;
  /** Polices du brand kit si l'utilisateur en a choisi, sinon null (le code garde les siennes) */
  fonts: { heading: string; body: string } | null;
};

/**
 * Capture de chaque scène à écran : celle choisie par l'utilisateur (si elle existe encore),
 * sinon les captures du projet dans l'ordre, scène après scène, en rebouclant. null = pas de capture.
 */
export function customSceneScreens(meta: CustomMotionMeta, scenes: { customType?: string; screens?: string[] }[], photos: string[]): (string | null)[] {
  let next = 0;
  return scenes.map((scene) => {
    const type = meta.sceneTypes.find((t) => t.type === scene.customType);
    if (!type?.screen || !photos.length) return null;
    const chosen = scene.screens?.find((url) => photos.includes(url));
    return chosen ?? photos[next++ % photos.length];
  });
}

/** Texte d'une scène, borné à la longueur déclarée ; vide si absent. */
export function sceneTexts(type: CustomSceneType | undefined, texts: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of type?.texts ?? []) out[field.key] = (texts?.[field.key] ?? "").slice(0, field.max);
  return out;
}

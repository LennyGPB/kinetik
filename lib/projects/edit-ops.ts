import { z } from "zod";
import { getTrack } from "../../config/music";
import { BRAND_FONTS, isBrandFont } from "../../config/fonts";
import { LOGO_LAYOUTS, SCREENS_LAYOUTS, TITLE_ANIMATIONS } from "../../config/recipes";
import { isScenePresentation, SCENE_PRESENTATIONS } from "../../config/scene-presentations";
import { normalizeOverlays, OverlaySchema } from "./overlays";
import { DEVICE_MOCKUP_IDS } from "../../config/device-mockups";
import { normalizeCamera, normalizePose, ObjectPoseSchema, SceneCameraSchema } from "./scene-camera";
import { LayerInputSchema, layerToInput, MAX_LAYERS_PER_SCENE, normalizeLayer, type MotionLayer, type MotionLayerInput } from "./motion-layers";
import { FOCUS_ANIMATIONS, FOCUS_MODES, MAX_FOCUS_STEPS, MAX_SCREEN_COUNT, sceneHeadlines, toHeadlines, TRANSITIONS, type Scene, type SceneGraph, type ScreenFocus, type Transition } from "./scenes";
import { BADGE_MAX, KICKER_MAX, MAX_SCENES, MIN_SCENES, SCENE_KINDS, SCENE_MAX_SECONDS, SCENE_MIN_SECONDS, SUBTITLE_MAX, TEXT_END_MIN, TEXT_SCALE_MAX, TEXT_SCALE_MIN, TITLE_MAX, VIDEO_MAX_SECONDS } from "./timeline";

/**
 * Opérations d'édition appliquées par l'agent IA du chat (lib/services/ai.ts), une par outil.
 * Chaque opération valide ses entrées avec les mêmes bornes que l'éditeur manuel et lève une EditOpError
 * dont le message est renvoyé tel quel à Claude pour qu'il corrige son appel. Logique pure, sans I/O.
 */

export class EditOpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditOpError";
  }
}

export type EditEnv = {
  screenUrls: string[];
  hasLogo: boolean;
  /** Transitions du template : les seules autorisées */
  transitions: Transition[];
  /** Template en vraie 3D : une capture peut habiller le mockup de toute scène */
  stage: boolean;
  /** Produit physique en 3D (photo détourée dans un décor) : caméra et pose réglables, rotations bornées */
  product3d?: boolean;
  /** Édition ciblée : seule cette scène peut changer */
  scopeSceneId?: string;
};

const hex = z.string().describe("#rrggbb");
const HEX = /^#[0-9a-fA-F]{6}$/;
const Offset = z.object({ x: z.number(), y: z.number() });

const FocusInput = z.object({
  screen: z.number().describe("Numéro de la capture"),
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),
  mode: z.enum(FOCUS_MODES),
  animation: z.enum(FOCUS_ANIMATIONS).nullable().optional(),
  label: z.string().nullable().optional(),
  title: z.string().nullable().optional().describe("Titre affiché pendant ce cadrage, à la place de celui de la scène"),
});

/** Tous les champs modifiables d'une scène. Absent = inchangé ; null = retour au choix du template. */
export const SceneFieldsSchema = z.object({
  kind: z.enum(SCENE_KINDS as [Scene["kind"], ...Scene["kind"][]]).optional().describe("Changer le type de la scène"),
  title: z.string().optional().describe("Texte principal. headlines : tous les titres séparés par « | »"),
  subtitle: z.string().nullable().optional(),
  duration: z.number().optional().describe("Secondes, de 1 à 20"),
  transition: z.enum(TRANSITIONS).optional().describe("Transition d'entrée, parmi celles du template"),
  presentation: z.enum(SCENE_PRESENTATIONS).nullable().optional(),
  layout: z.enum(SCREENS_LAYOUTS).nullable().optional().describe("Scènes screens"),
  screenCount: z.number().nullable().optional().describe("Scènes screens : 1 à 3"),
  screens: z.array(z.number()).nullable().optional().describe("Numéros des captures montrées (3 max ; 1 pour le mockup 3D des autres scènes)"),
  focuses: z.array(FocusInput).nullable().optional().describe("Scènes screens : cadrages successifs (zoom ou découpe). [] les retire"),
  textOffsets: z.object({ title: Offset.nullable().optional(), subtitle: Offset.nullable().optional() }).nullable().optional().describe("Décalage des textes, fraction du cadre (-1 → 1)"),
  textScales: z.object({ title: z.number().nullable().optional(), subtitle: z.number().nullable().optional() }).nullable().optional().describe("Taille des textes par rapport au template (0.5 → 2)"),
  textColors: z.object({ title: hex.nullable().optional(), subtitle: hex.nullable().optional(), kicker: hex.nullable().optional() }).nullable().optional(),
  textEnds: z.object({ title: z.number().nullable().optional(), subtitle: z.number().nullable().optional(), kicker: z.number().nullable().optional() }).nullable().optional().describe("Moment où le texte disparaît, fraction de la scène (0.1 → 1)"),
  kicker: z.string().nullable().optional().describe("Scènes feature : surtitre ; \"\" le masque"),
  badge: z.string().nullable().optional().describe("Scènes cta : texte du bouton ; \"\" le masque"),
  lineColors: z.array(hex.nullable()).nullable().optional().describe("Scènes headlines : couleur de chaque titre"),
  energy: z.enum(["calm", "balanced", "high"]).nullable().optional().describe("Rythme propre à cette scène"),
  titleAnimation: z.enum(TITLE_ANIMATIONS).nullable().optional().describe("Animation des titres propre à cette scène"),
  logoLayout: z.enum(LOGO_LAYOUTS).nullable().optional(),
  logoBackground: z.boolean().nullable().optional(),
  logoEmphasis: z.boolean().nullable().optional(),
  screenFrame: z.enum(["phone", "browser", "none"]).nullable().optional(),
  hideTemplate: z.boolean().nullable().optional().describe("true = n'affiche plus le contenu du template, seulement le fond et les calques libres"),
  camera: SceneCameraSchema.nullable().optional().describe("Templates 3D : plan de caméra de la scène et geste de la transition qui y mène ; null = celui du template"),
  pose: ObjectPoseSchema.nullable().optional().describe("Templates 3D : pose de l'appareil ou de la photo produit ; null = celle du template"),
});
export type SceneFields = z.infer<typeof SceneFieldsSchema>;

export const VideoFieldsSchema = z.object({
  energy: z.enum(["calm", "balanced", "high"]).optional(),
  logoEmphasis: z.boolean().optional(),
  screenFrame: z.enum(["phone", "browser", "none"]).optional(),
  musicTrackId: z.string().optional().describe("Identifiant d'une piste de la bibliothèque"),
  titleAnimation: z.enum(TITLE_ANIMATIONS).nullable().optional(),
  logoLayout: z.enum(LOGO_LAYOUTS).nullable().optional(),
  logoBackground: z.boolean().nullable().optional(),
  colors: z.array(hex).optional().describe("Couleurs de marque [principale, secondaire]"),
  fonts: z.union([z.object({ heading: z.enum(BRAND_FONTS), body: z.enum(BRAND_FONTS) }), z.literal("template")]).optional(),
  audio: z.object({ volume: z.number(), trimStart: z.number(), fadeIn: z.boolean(), fadeOut: z.boolean() }).partial().optional(),
  deviceMockup: z.enum(DEVICE_MOCKUP_IDS).optional().describe("Appareil qui présente les captures (none = captures seules)"),
  deviceColor: hex.nullable().optional().describe("Templates 3D Stage : couleur de la coque de l'appareil ; null = couleur du modèle"),
});
export type VideoFields = z.infer<typeof VideoFieldsSchema>;

export const LayerPatchSchema = LayerInputSchema.omit({ id: true, type: true }).partial();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round2 = (value: number) => Math.round(value * 100) / 100;

function checkScope(env: EditEnv, sceneId: string | null) {
  if (env.scopeSceneId && sceneId !== env.scopeSceneId) throw new EditOpError(`Édition ciblée : seule la scène ${env.scopeSceneId} peut changer.`);
}

function findScene(graph: SceneGraph, sceneId: string) {
  const index = graph.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0) throw new EditOpError(`Scène « ${sceneId} » introuvable. Scènes : ${graph.scenes.map((s) => s.id).join(", ")}.`);
  return index;
}

function screenUrl(env: EditEnv, n: number) {
  const url = Number.isInteger(n) ? env.screenUrls[n] : undefined;
  if (!url) throw new EditOpError(`Capture ${n} introuvable (numéros valides : ${env.screenUrls.length ? `0 à ${env.screenUrls.length - 1}` : "aucune capture"}).`);
  return url;
}

function toFocus(focus: z.infer<typeof FocusInput>, env: EditEnv): ScreenFocus {
  const src = screenUrl(env, focus.screen);
  if (![focus.x, focus.y, focus.w, focus.h].every(Number.isFinite)) throw new EditOpError("Cadrage : coordonnées invalides.");
  const w = clamp(focus.w, 0.08, 1), h = clamp(focus.h, 0.05, 1);
  const label = focus.label?.trim().slice(0, 40), title = focus.title?.trim().slice(0, TITLE_MAX);
  return { src, x: clamp(focus.x, 0, 1 - w), y: clamp(focus.y, 0, 1 - h), w, h, mode: focus.mode, ...(focus.mode === "popout" && focus.animation && { animation: focus.animation }), ...(label && { label }), ...(title && { title }) };
}

function totalCheck(scenes: Scene[]) {
  const total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (total > VIDEO_MAX_SECONDS + 1e-6) throw new EditOpError(`Durée totale ${round2(total)} s : maximum ${VIDEO_MAX_SECONDS} s.`);
}

/** Applique des champs à une scène (copie). */
function patchScene(scene: Scene, fields: SceneFields, env: EditEnv): Scene {
  const next: Scene = structuredClone(scene);
  const set = <K extends keyof Scene>(key: K, value: Scene[K] | null | undefined) => {
    if (value === undefined) return;
    if (value === null) delete next[key];
    else next[key] = value;
  };

  if (fields.kind && fields.kind !== next.kind) {
    next.kind = fields.kind;
    if (next.kind !== "screens") { delete next.layout; delete next.screenCount; delete next.focus; delete next.focuses; }
    if (next.kind !== "headlines") { delete next.lines; delete next.lineColors; }
    if (next.presentation && !isScenePresentation(next.kind, next.presentation)) delete next.presentation;
    if (next.kind !== "screens" && !env.stage) delete next.screens;
  }
  if (fields.title !== undefined) {
    if (next.kind === "headlines") {
      const { title, lines } = toHeadlines(fields.title.split("|"), next.lineColors ? sceneHeadlines(next).map((_, i) => next.lineColors?.[i]) : undefined);
      if (!title) throw new EditOpError("headlines : au moins un titre.");
      next.title = title;
      if (lines.length) next.lines = lines; else delete next.lines;
    } else {
      const title = fields.title.trim().slice(0, TITLE_MAX);
      if (!title && next.kind !== "logo") throw new EditOpError("Le titre ne peut pas être vide (utilise textEnds ou hideTemplate pour le masquer).");
      next.title = title;
    }
  }
  if (fields.subtitle !== undefined) set("subtitle", fields.subtitle === null ? null : fields.subtitle.trim().slice(0, SUBTITLE_MAX) || null);
  if (fields.duration !== undefined) {
    if (!Number.isFinite(fields.duration)) throw new EditOpError("Durée invalide.");
    next.duration = round2(clamp(fields.duration, SCENE_MIN_SECONDS, SCENE_MAX_SECONDS));
  }
  if (fields.transition !== undefined) {
    if (!env.transitions.includes(fields.transition)) throw new EditOpError(`Transition « ${fields.transition} » non disponible sur ce template. Autorisées : ${env.transitions.join(", ")}.`);
    next.transition = fields.transition;
  }
  if (fields.presentation !== undefined) {
    if (fields.presentation !== null && !isScenePresentation(next.kind, fields.presentation)) throw new EditOpError(`Mise en scène « ${fields.presentation} » impossible pour une scène ${next.kind}.`);
    set("presentation", fields.presentation);
  }
  if (fields.layout !== undefined || fields.screenCount !== undefined || fields.focuses !== undefined) {
    if (next.kind !== "screens") throw new EditOpError("layout, screenCount et focuses ne concernent que les scènes screens.");
    set("layout", fields.layout);
    if (fields.screenCount !== undefined) set("screenCount", fields.screenCount === null ? null : clamp(Math.round(fields.screenCount), 1, MAX_SCREEN_COUNT));
    if (fields.focuses !== undefined) {
      delete next.focus;
      if (fields.focuses === null) delete next.focuses;
      else {
        if (fields.focuses.length > MAX_FOCUS_STEPS) throw new EditOpError(`${MAX_FOCUS_STEPS} cadrages maximum.`);
        next.focuses = fields.focuses.map((focus) => toFocus(focus, env));
      }
    }
  }
  if (fields.screens !== undefined) {
    if (fields.screens === null) delete next.screens;
    else {
      if (next.kind !== "screens" && !env.stage) throw new EditOpError("Sur ce template, seules les scènes screens montrent des captures (ou ajoute un calque image).");
      const urls = [...new Set(fields.screens.map((n) => screenUrl(env, n)))].slice(0, next.kind === "screens" ? MAX_SCREEN_COUNT : 1);
      if (urls.length) next.screens = urls; else delete next.screens;
    }
  }
  if (fields.textOffsets !== undefined) {
    if (fields.textOffsets === null) delete next.textOffsets;
    else {
      const offsets = { ...next.textOffsets };
      for (const key of ["title", "subtitle"] as const) {
        const value = fields.textOffsets[key];
        if (value === undefined) continue;
        if (value === null || (!value.x && !value.y)) delete offsets[key];
        else offsets[key] = { x: round2(clamp(value.x, -1, 1)), y: round2(clamp(value.y, -1, 1)) };
      }
      if (Object.keys(offsets).length) next.textOffsets = offsets; else delete next.textOffsets;
    }
  }
  if (fields.textScales !== undefined) {
    if (fields.textScales === null) delete next.textScales;
    else {
      const scales = { ...next.textScales };
      for (const key of ["title", "subtitle"] as const) {
        const value = fields.textScales[key];
        if (value === undefined) continue;
        if (value === null || value === 1) delete scales[key]; else scales[key] = round2(clamp(value, TEXT_SCALE_MIN, TEXT_SCALE_MAX));
      }
      if (Object.keys(scales).length) next.textScales = scales; else delete next.textScales;
    }
  }
  for (const field of ["textColors", "textEnds"] as const) {
    const input = fields[field];
    if (input === undefined) continue;
    if (input === null) { delete next[field]; continue; }
    const out: Record<string, string | number> = { ...next[field] };
    for (const key of ["title", "subtitle", "kicker"] as const) {
      const value = input[key];
      if (value === undefined) continue;
      if (value === null) delete out[key];
      else if (field === "textColors") {
        if (typeof value !== "string" || !HEX.test(value)) throw new EditOpError(`Couleur invalide « ${value} » (format #rrggbb).`);
        out[key] = value.toLowerCase();
      } else if (typeof value === "number") {
        if (value >= 1) delete out[key]; else out[key] = round2(clamp(value, TEXT_END_MIN, 1));
      }
    }
    if (Object.keys(out).length) (next as Record<string, unknown>)[field] = out; else delete next[field];
  }
  if (fields.kicker !== undefined) set("kicker", fields.kicker === null ? null : fields.kicker.trim().slice(0, KICKER_MAX));
  if (fields.badge !== undefined) set("badge", fields.badge === null ? null : fields.badge.trim().slice(0, BADGE_MAX));
  if (fields.lineColors !== undefined) {
    if (next.kind !== "headlines") throw new EditOpError("lineColors ne concerne que les scènes headlines.");
    if (fields.lineColors === null) delete next.lineColors;
    else next.lineColors = sceneHeadlines(next).map((_, i) => { const c = fields.lineColors?.[i]; return c && HEX.test(c) ? c.toLowerCase() : null; });
  }
  set("energy", fields.energy);
  set("titleAnimation", fields.titleAnimation);
  set("logoLayout", fields.logoLayout);
  set("logoBackground", fields.logoBackground);
  set("logoEmphasis", fields.logoEmphasis);
  set("screenFrame", fields.screenFrame);
  if (fields.hideTemplate !== undefined) { if (fields.hideTemplate) next.hideTemplate = true; else delete next.hideTemplate; }
  if ((fields.camera || fields.pose) && !env.stage && !env.product3d) throw new EditOpError("camera et pose ne concernent que les templates en vraie 3D (Stage et produits 3D). Ici, utilise les calques animés.");
  if (fields.camera !== undefined) {
    const camera = fields.camera && normalizeCamera(fields.camera);
    if (camera) next.camera = camera; else delete next.camera;
  }
  if (fields.pose !== undefined) {
    const pose = fields.pose && normalizePose(fields.pose, !env.stage);
    if (pose) next.pose = pose; else delete next.pose;
  }
  return next;
}

export function updateScene(graph: SceneGraph, sceneId: string, fields: SceneFields, env: EditEnv): SceneGraph {
  checkScope(env, sceneId);
  const index = findScene(graph, sceneId);
  const scenes = graph.scenes.map((scene, i) => i === index ? patchScene(scene, SceneFieldsSchema.parse(fields), env) : scene);
  totalCheck(scenes);
  return { ...graph, scenes };
}

export function addScene(graph: SceneGraph, kind: Scene["kind"], afterSceneId: string | null, fields: SceneFields, env: EditEnv, id: string): { graph: SceneGraph; id: string } {
  checkScope(env, null);
  if (graph.scenes.length >= MAX_SCENES) throw new EditOpError(`${MAX_SCENES} scènes maximum.`);
  if (kind === "logo" && !env.hasLogo) throw new EditOpError("Aucun logo dans le projet : demande à l'utilisateur de l'ajouter dans Médias.");
  const at = afterSceneId === null ? 0 : findScene(graph, afterSceneId) + 1;
  const blank: Scene = { id, kind, title: kind === "logo" ? "" : "…", duration: 3, transition: env.transitions[0] ?? "fade" };
  const scene = patchScene(blank, SceneFieldsSchema.parse({ ...fields, kind: undefined }), env);
  if (scene.title === "…") throw new EditOpError("Nouvelle scène : renseigne son titre dans fields.title.");
  const scenes = [...graph.scenes.slice(0, at), scene, ...graph.scenes.slice(at)];
  totalCheck(scenes);
  return { graph: { ...graph, scenes }, id };
}

export function removeScene(graph: SceneGraph, sceneId: string, env: EditEnv): SceneGraph {
  checkScope(env, null);
  findScene(graph, sceneId);
  if (graph.scenes.length <= MIN_SCENES) throw new EditOpError(`Une vidéo garde au moins ${MIN_SCENES} scènes.`);
  const overlays = graph.overlays?.flatMap((layer) => {
    if (layer.sceneIds === null) return [layer];
    const targets = layer.sceneIds.filter((id) => id !== sceneId);
    return targets.length ? [{ ...layer, sceneIds: targets }] : [];
  });
  return { ...graph, ...(overlays && { overlays }), scenes: graph.scenes.filter((scene) => scene.id !== sceneId) };
}

export function moveScene(graph: SceneGraph, sceneId: string, toIndex: number, env: EditEnv): SceneGraph {
  checkScope(env, null);
  const from = findScene(graph, sceneId);
  const to = clamp(Math.round(toIndex), 0, graph.scenes.length - 1);
  const scenes = [...graph.scenes];
  const [scene] = scenes.splice(from, 1);
  scenes.splice(to, 0, scene);
  return { ...graph, scenes };
}

export function updateVideo(graph: SceneGraph, input: VideoFields, env: EditEnv): SceneGraph {
  if (env.scopeSceneId) throw new EditOpError("Édition ciblée : les réglages de toute la vidéo ne changent pas ici. Pour cette scène, utilise update_scene (energy, titleAnimation, logoLayout… propres à la scène). Couleurs, polices et son : propose de choisir « Toute la vidéo ».");
  const fields = VideoFieldsSchema.parse(input);
  const next: SceneGraph = structuredClone(graph);
  if (fields.energy) next.energy = fields.energy;
  if (fields.logoEmphasis !== undefined) next.logoEmphasis = fields.logoEmphasis;
  if (fields.screenFrame) next.screenFrame = fields.screenFrame;
  for (const key of ["titleAnimation", "logoLayout", "logoBackground"] as const) {
    const value = fields[key];
    if (value === undefined) continue;
    if (value === null) delete next[key]; else (next as Record<string, unknown>)[key] = value;
  }
  if (fields.musicTrackId !== undefined) {
    const track = getTrack(fields.musicTrackId);
    if (!track) throw new EditOpError(`Piste « ${fields.musicTrackId} » introuvable dans la bibliothèque.`);
    next.musicTrackId = track.id;
    next.bpm = track.bpm;
    next.beatOffset = track.beatOffset ?? 0;
  }
  if (fields.colors) {
    const colors = fields.colors.map((c) => c.trim().toLowerCase()).filter((c) => HEX.test(c)).slice(0, 2);
    if (!colors.length) throw new EditOpError("Couleurs invalides (format #rrggbb).");
    next.colors = colors;
  }
  if (fields.fonts === "template") delete next.fonts;
  else if (fields.fonts && isBrandFont(fields.fonts.heading) && isBrandFont(fields.fonts.body)) next.fonts = { heading: fields.fonts.heading, body: fields.fonts.body };
  if (fields.deviceMockup) next.deviceMockup = fields.deviceMockup;
  if (fields.deviceColor !== undefined) {
    if (!env.stage) throw new EditOpError("La couleur de la coque ne s'applique qu'aux templates 3D Stage.");
    if (fields.deviceColor === null) delete next.deviceColor;
    else if (HEX.test(fields.deviceColor)) next.deviceColor = fields.deviceColor.toLowerCase();
    else throw new EditOpError("Couleur de coque invalide (format #rrggbb).");
  }
  if (fields.audio) {
    const { volume, trimStart, fadeIn, fadeOut } = fields.audio;
    next.audio = {
      volume: volume !== undefined && Number.isFinite(volume) ? round2(clamp(volume, 0, 1)) : graph.audio?.volume ?? 1,
      trimStart: trimStart !== undefined && Number.isFinite(trimStart) ? Math.round(clamp(trimStart, 0, 600) * 10) / 10 : graph.audio?.trimStart ?? 0,
      fadeIn: fadeIn ?? graph.audio?.fadeIn ?? false,
      fadeOut: fadeOut ?? graph.audio?.fadeOut ?? false,
    };
  }
  return next;
}

export function setOverlays(graph: SceneGraph, overlays: unknown, env: EditEnv): SceneGraph {
  if (env.scopeSceneId) throw new EditOpError("Édition ciblée : utilise les calques de la scène (set_layers) plutôt que les calques de toute la vidéo.");
  const parsed = OverlaySchema.array().safeParse(overlays);
  if (!parsed.success) throw new EditOpError(`Calques invalides : ${z.prettifyError(parsed.error)}`);
  return { ...graph, overlays: normalizeOverlays(parsed.data, graph.scenes.map((s) => s.id), env.screenUrls.length, env.hasLogo) };
}

function sceneLayersOp(graph: SceneGraph, sceneId: string, env: EditEnv, change: (layers: MotionLayer[], scene: Scene) => MotionLayer[], hideTemplate?: boolean | null): SceneGraph {
  checkScope(env, sceneId);
  const index = findScene(graph, sceneId);
  const scene = graph.scenes[index];
  const layers = change(scene.layers ?? [], scene);
  if (layers.length > MAX_LAYERS_PER_SCENE) throw new EditOpError(`${MAX_LAYERS_PER_SCENE} calques maximum par scène.`);
  const ids = new Set<string>();
  for (const layer of layers) {
    if (ids.has(layer.id)) throw new EditOpError(`Deux calques ont l'id « ${layer.id} ».`);
    ids.add(layer.id);
  }
  const next: Scene = { ...scene, layers };
  if (!layers.length) delete next.layers;
  if (hideTemplate !== undefined && hideTemplate !== null) { if (hideTemplate) next.hideTemplate = true; else delete next.hideTemplate; }
  return { ...graph, scenes: graph.scenes.map((s, i) => i === index ? next : s) };
}

const media = (env: EditEnv, scene: Scene) => ({ screenUrls: env.screenUrls, hasLogo: env.hasLogo, sceneDuration: scene.duration });

function wrapLayerError<T>(run: () => T): T {
  try { return run(); }
  catch (error) {
    if (error instanceof z.ZodError) throw new EditOpError(`Calque invalide : ${z.prettifyError(error)}`);
    if (error instanceof Error && !(error instanceof EditOpError)) throw new EditOpError(error.message);
    throw error;
  }
}

/** Remplace tous les calques libres d'une scène (les calques au même id reprennent leurs champs non fournis). */
export function setLayers(graph: SceneGraph, sceneId: string, layers: MotionLayerInput[], env: EditEnv, hideTemplate?: boolean | null): SceneGraph {
  return wrapLayerError(() => sceneLayersOp(graph, sceneId, env, (current, scene) => layers.map((input) => {
    const parsed = LayerInputSchema.parse(input);
    return normalizeLayer(parsed, media(env, scene), current.find((layer) => layer.id === parsed.id));
  }), hideTemplate));
}

/** Modifie quelques champs d'un calque existant ; keyframes fournies remplacent les anciennes. */
export function updateLayer(graph: SceneGraph, sceneId: string, layerId: string, patch: z.infer<typeof LayerPatchSchema>, env: EditEnv): SceneGraph {
  return wrapLayerError(() => sceneLayersOp(graph, sceneId, env, (current, scene) => {
    const previous = current.find((layer) => layer.id === layerId);
    if (!previous) throw new EditOpError(`Calque « ${layerId} » introuvable dans la scène. Calques : ${current.map((l) => l.id).join(", ") || "aucun"}.`);
    const parsed = LayerPatchSchema.parse(patch);
    const next = normalizeLayer({ ...layerToInput(previous, env.screenUrls), ...parsed, id: previous.id, type: previous.type }, media(env, scene), previous);
    return current.map((layer) => layer.id === layerId ? next : layer);
  }));
}

export function removeLayer(graph: SceneGraph, sceneId: string, layerId: string, env: EditEnv): SceneGraph {
  return sceneLayersOp(graph, sceneId, env, (current) => {
    if (!current.some((layer) => layer.id === layerId)) throw new EditOpError(`Calque « ${layerId} » introuvable.`);
    return current.filter((layer) => layer.id !== layerId);
  });
}

/** Une scène telle que Claude la voit (captures désignées par leur numéro). */
export function sceneForModel(scene: Scene, screenUrls: string[]) {
  const index = (url: string) => screenUrls.indexOf(url);
  const { focus, focuses, screens, layers, lines, ...rest } = scene;
  const steps = focuses ?? (focus ? [focus] : undefined);
  return {
    ...rest,
    ...(scene.kind === "headlines" && { title: sceneHeadlines(scene).join(" | ") }),
    ...(lines && scene.kind !== "headlines" && { lines }),
    ...(screens && { screens: screens.map(index).filter((n) => n >= 0) }),
    ...(steps && { focuses: steps.map(({ src, ...f }) => ({ ...f, screen: index(src) })) }),
    ...(layers?.length && { layers: layers.map((layer) => layerToInput(layer, screenUrls)) }),
  };
}

/** Garde-fous finaux : transitions du template, durées bornées. */
export function finalizeGraph(graph: SceneGraph, env: EditEnv): SceneGraph {
  const scenes = graph.scenes.map((scene, i) => ({
    ...scene,
    duration: round2(clamp(Number.isFinite(scene.duration) ? scene.duration : 3, SCENE_MIN_SECONDS, SCENE_MAX_SECONDS)),
    transition: env.transitions.includes(scene.transition) ? scene.transition : env.transitions[i % env.transitions.length] ?? scene.transition,
  }));
  totalCheck(scenes);
  return { ...graph, scenes };
}

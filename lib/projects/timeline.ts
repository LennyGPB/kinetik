import { format, getDictionary, type Locale } from "@/lib/i18n";
import { LOGO_LAYOUTS, SCREENS_LAYOUTS, type LogoLayout, type ScreensLayout } from "../../config/recipes";
import { isScenePresentation, SCENE_PRESENTATIONS, type ScenePresentation } from "../../config/scene-presentations";
import { FOCUS_ANIMATIONS, FOCUS_MODES, HEADLINES_MAX, toHeadlines, MAX_FOCUS_STEPS, MAX_SCREEN_COUNT, totalDuration, TRANSITIONS, type SceneGraph, type SceneKind, type ScreenFocus, type Transition } from "./scenes";

/**
 * Montage manuel depuis la frise de l'éditeur : durée, ordre, suppression, textes, transition et mise en avant des scènes.
 * Logique pure, exécutée côté client (aperçu immédiat) ET côté serveur (seule source de vérité enregistrée).
 * Gratuit, sans Claude : chaque validation crée une nouvelle version.
 */
export type TimelineEdit =
  | { kind: "textPosition"; sceneId: string; target: "title" | "subtitle"; offset: { x: number; y: number } | null }
  /** Taille d'un texte par rapport au template (null = taille du template) */
  | { kind: "textScale"; sceneId: string; target: "title" | "subtitle"; scale: number | null }
  | { kind: "presentation"; sceneId: string; value: ScenePresentation | LogoLayout | ScreensLayout | null }
  | { kind: "duration"; sceneId: string; duration: number }
  | { kind: "move"; sceneId: string; toIndex: number }
  | { kind: "delete"; sceneId: string }
  /**
   * `colors` (facultatif) : couleur de chaque texte fourni, null = couleur du template.
   * `kicker` (facultatif, scènes feature) : surtitre, null = nom de l'app, "" = masqué.
   * `badge` (facultatif, scènes cta) : texte du bouton, null = automatique (site ou nom de l'app), "" = masqué.
   * `lines` (facultatif, scènes headlines) : titres qui suivent `title`.
   */
  | { kind: "text"; sceneId: string; title: string; subtitle: string | null; colors?: Partial<Record<TextTarget, string | null>>; ends?: Partial<Record<TextTarget, number | null>>; kicker?: string | null; badge?: string | null; lines?: string[]; lineColors?: (string | null)[] }
  | { kind: "transition"; sceneId: string; transition: Transition }
  /** Scènes screens : zone d'un screen à mettre en avant (null = retirer) */
  | { kind: "focus"; sceneId: string; focus: ScreenFocus | null }
  | { kind: "focuses"; sceneId: string; focuses: ScreenFocus[] }
  /** Captures de la scène ; une seule pour le mockup 3D hors scènes screens (null = automatique). */
  | { kind: "screens"; sceneId: string; screens: string[] | null }
  /** Nouvelle scène après `afterId` (null = au début). L'id est fourni par le client pour que le serveur rejoue la même suite. */
  | { kind: "add"; id: string; afterId: string | null; sceneKind: SceneKind; title: string; transition: Transition }
  | { kind: "duplicate"; sceneId: string; id: string };

/** Mêmes bornes que pour Claude (lib/services/ai.ts → normalize). */
export const SCENE_MIN_SECONDS = 1;
export const SCENE_MAX_SECONDS = 20;
export const VIDEO_MAX_SECONDS = 90;
/** Pas des boutons − / + et du redimensionnement */
export const DURATION_STEP = 0.1;
/** Une vidéo garde au moins 2 scènes, et au plus 12. */
export const MIN_SCENES = 2;
export const MAX_SCENES = 12;
/** Durée d'une scène ajoutée depuis la frise */
export const NEW_SCENE_SECONDS = 3;
export const SCENE_KINDS: SceneKind[] = ["intro", "logo", "feature", "screens", "stat", "quote", "headlines", "cta"];
const SCENE_ID = /^[a-z]+-[a-z0-9]{4,24}$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
type TextTarget = "title" | "subtitle" | "kicker";
const TEXT_TARGETS: TextTarget[] = ["title", "subtitle", "kicker"];
/** Taille d'un texte : de la moitié au double de celle du template */
export const TEXT_SCALE_MIN = 0.5;
export const TEXT_SCALE_MAX = 2;
/** Un texte reste visible au moins ce pourcentage de la scène */
export const TEXT_END_MIN = 0.1;
/** Surtitre d'une scène feature (court, en capitales dans la vidéo) */
export const KICKER_MAX = 40;
/** Texte du bouton d'une scène cta */
export const BADGE_MAX = 40;

/** Identifiant d'une scène créée depuis l'éditeur (unique, généré côté client). */
export function newSceneId(kind: SceneKind) {
  return `${kind}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
/** Longueurs maximales des textes (mêmes que pour Claude). */
export const TITLE_MAX = 80;
export const SUBTITLE_MAX = 120;
/** Sous-titres des scènes standard ; le mockup Stage est traité par hasEditableSubtitle. */
export const SUBTITLE_KINDS: SceneGraph["scenes"][number]["kind"][] = ["intro", "feature", "cta", "stat", "quote"];
/** Stage mockups render a subtitle too; legacy populated subtitles remain editable. */
export function hasEditableSubtitle(scene: Pick<SceneGraph["scenes"][number], "kind" | "subtitle">, stage = false) {
  return SUBTITLE_KINDS.includes(scene.kind) || (scene.kind === "screens" && (stage || Boolean(scene.subtitle)));
}
/** Scènes dont le titre est modifiable (la scène logo affiche toujours le nom de l'app). */
export function hasEditableTitle(kind: SceneGraph["scenes"][number]["kind"]) {
  return kind !== "logo";
}

/** Nombre maximum de modifications envoyées en une fois (anti-abus). */
export const MAX_EDITS_PER_COMMIT = 50;


export function clampDuration(seconds: number) {
  return Math.round(Math.min(SCENE_MAX_SECONDS, Math.max(SCENE_MIN_SECONDS, seconds)) * 100) / 100;
}

export function isTimelineEdit(value: unknown): value is TimelineEdit {
  // Valeur venant du client : on vérifie chaque champ à l'exécution
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== "object") return false;
  // Ajout : pas de scène existante visée
  if (v.kind === "add")
    return (
      typeof v.id === "string" &&
      SCENE_ID.test(v.id) &&
      (v.afterId === null || (typeof v.afterId === "string" && v.afterId.length <= 64)) &&
      SCENE_KINDS.includes(v.sceneKind as SceneKind) &&
      typeof v.title === "string" &&
      v.title.length <= TITLE_MAX &&
      TRANSITIONS.includes(v.transition as Transition)
    );
  if (typeof v.sceneId !== "string" || v.sceneId.length > 64) return false;
  if (v.kind === "textPosition") {
    const offset = v.offset as { x?: unknown; y?: unknown } | null;
    return (v.target === "title" || v.target === "subtitle") && (offset === null || Boolean(offset && [offset.x, offset.y].every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 1)));
  }
  if (v.kind === "textScale") return (v.target === "title" || v.target === "subtitle") && (v.scale === null || (typeof v.scale === "number" && Number.isFinite(v.scale) && v.scale >= TEXT_SCALE_MIN && v.scale <= TEXT_SCALE_MAX));
  if (v.kind === "presentation") return v.value === null || (typeof v.value === "string" && [...SCENE_PRESENTATIONS, ...LOGO_LAYOUTS, ...SCREENS_LAYOUTS].some((item) => item === v.value));
  if (v.kind === "duration") return typeof v.duration === "number" && Number.isFinite(v.duration);
  if (v.kind === "move") return Number.isInteger(v.toIndex);
  if (v.kind === "text") {
    const colors = v.colors as Record<string, unknown> | undefined;
    const ends = v.ends as Record<string, unknown> | undefined;
    const isEnd = (n: unknown) => n === undefined || n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1);
    const isColor = (c: unknown) => c === undefined || c === null || (typeof c === "string" && HEX_COLOR.test(c));
    return typeof v.title === "string" && v.title.length <= 500 && (v.subtitle === null || (typeof v.subtitle === "string" && v.subtitle.length <= 500))
      && (v.kicker === undefined || v.kicker === null || (typeof v.kicker === "string" && v.kicker.length <= 500))
      && (v.badge === undefined || v.badge === null || (typeof v.badge === "string" && v.badge.length <= 500))
      && (v.lines === undefined || (Array.isArray(v.lines) && v.lines.length < HEADLINES_MAX && v.lines.every((line) => typeof line === "string" && line.length <= 500)))
      && (v.lineColors === undefined || (Array.isArray(v.lineColors) && v.lineColors.length <= HEADLINES_MAX && v.lineColors.every((c) => c === null || (typeof c === "string" && HEX_COLOR.test(c)))))
      && (colors === undefined || Boolean(colors && typeof colors === "object" && Object.keys(colors).every((key) => TEXT_TARGETS.includes(key as TextTarget) && isColor(colors[key]))))
      && (ends === undefined || Boolean(ends && typeof ends === "object" && Object.keys(ends).every((key) => TEXT_TARGETS.includes(key as TextTarget) && isEnd(ends[key]))));
  }
  if (v.kind === "transition") return TRANSITIONS.includes(v.transition as Transition);
  if (v.kind === "focus") return v.focus === null || isFocus(v.focus);
  if (v.kind === "focuses") return Array.isArray(v.focuses) && v.focuses.length <= MAX_FOCUS_STEPS && v.focuses.every(isFocus);
  if (v.kind === "screens") return v.screens === null || (Array.isArray(v.screens) && v.screens.length <= MAX_SCREEN_COUNT && v.screens.every((u) => typeof u === "string" && u.startsWith("/api/uploads/") && u.length < 300));
  if (v.kind === "duplicate") return typeof v.id === "string" && SCENE_ID.test(v.id);
  return v.kind === "delete";
}

function isFocus(f: unknown): f is ScreenFocus {
  const v = f as Partial<ScreenFocus> | null;
  return Boolean(
    v &&
      typeof v.src === "string" &&
      v.src.startsWith("/api/uploads/") &&
      v.src.length < 300 &&
      [v.x, v.y, v.w, v.h].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1) &&
      FOCUS_MODES.includes(v.mode as ScreenFocus["mode"]) &&
      (v.animation === undefined || FOCUS_ANIMATIONS.includes(v.animation)) &&
      (v.label === undefined || (typeof v.label === "string" && v.label.length <= 40)) &&
      (v.title === undefined || (typeof v.title === "string" && v.title.length <= TITLE_MAX)) &&
      (v.titleEnd === undefined || (typeof v.titleEnd === "number" && Number.isFinite(v.titleEnd) && v.titleEnd >= 0 && v.titleEnd <= 1)) &&
      (v.titleColor === undefined || (typeof v.titleColor === "string" && HEX_COLOR.test(v.titleColor))),
  );
}

/** Zone bornée : au moins 8 % × 5 % de l'image, entièrement dedans. */
function clampFocus(f: ScreenFocus): ScreenFocus {
  const w = Math.min(1, Math.max(0.08, f.w));
  const h = Math.min(1, Math.max(0.05, f.h));
  const label = f.label?.trim().slice(0, 40);
  const title = f.title?.trim().slice(0, TITLE_MAX);
  return { src: f.src, mode: f.mode, w, h, x: Math.min(1 - w, Math.max(0, f.x)), y: Math.min(1 - h, Math.max(0, f.y)), ...(f.mode === "popout" && f.animation && { animation: f.animation }), ...(label && f.mode === "popout" && { label }), ...(title && { title }), ...(f.titleEnd !== undefined && f.titleEnd < 1 && { titleEnd: Math.round(Math.max(TEXT_END_MIN, f.titleEnd) * 1000) / 1000 }), ...(f.titleColor && { titleColor: f.titleColor.toLowerCase() }) };
}

/** Applique une modification ; renvoie le graph inchangé si elle est impossible (scène introuvable, limites…). */
export function applyTimelineEdit(graph: SceneGraph, edit: TimelineEdit): SceneGraph {
  if (edit.kind === "add") return addScene(graph, edit);
  const index = graph.scenes.findIndex((scene) => scene.id === edit.sceneId);
  if (index < 0) return graph;
  const scenes = [...graph.scenes];

  switch (edit.kind) {
    case "textScale": {
      if (!isTimelineEdit(edit)) return graph;
      const textScales = { ...scenes[index].textScales };
      if (edit.scale === null || Math.abs(edit.scale - 1) < 0.005) delete textScales[edit.target];
      else textScales[edit.target] = Math.round(edit.scale * 100) / 100;
      scenes[index] = { ...scenes[index], textScales };
      if (!Object.keys(textScales).length) delete scenes[index].textScales;
      break;
    }
    case "textPosition": {
      if (!isTimelineEdit(edit)) return graph;
      const textOffsets = { ...scenes[index].textOffsets };
      if (edit.offset === null) delete textOffsets[edit.target];
      else textOffsets[edit.target] = { ...edit.offset };
      scenes[index] = { ...scenes[index], textOffsets };
      break;
    }
    case "presentation": {
      const scene = { ...scenes[index] };
      if (scene.kind === "logo") {
        if (edit.value !== null && !LOGO_LAYOUTS.some((item) => item === edit.value)) return graph;
        if (edit.value === null) delete scene.logoLayout;
        else scene.logoLayout = edit.value as LogoLayout;
      } else if (scene.kind === "screens") {
        if (edit.value !== null && !SCREENS_LAYOUTS.some((item) => item === edit.value)) return graph;
        if (edit.value === null) delete scene.layout;
        else scene.layout = edit.value as ScreensLayout;
      } else {
        if (edit.value !== null && !isScenePresentation(scene.kind, edit.value)) return graph;
        if (edit.value === null || edit.value === "classic") delete scene.presentation;
        else scene.presentation = edit.value as ScenePresentation;
      }
      scenes[index] = scene;
      break;
    }
    case "duration": {
      const duration = clampDuration(edit.duration);
      const others = totalDuration(graph) - scenes[index].duration;
      scenes[index] = { ...scenes[index], duration: Math.min(duration, VIDEO_MAX_SECONDS - others) };
      break;
    }
    case "move": {
      const to = Math.max(0, Math.min(scenes.length - 1, edit.toIndex));
      const [scene] = scenes.splice(index, 1);
      scenes.splice(to, 0, scene);
      break;
    }
    case "delete":
      if (scenes.length <= MIN_SCENES) return graph;
      scenes.splice(index, 1);
      break;
    case "text": {
      const title = edit.title.trim().slice(0, TITLE_MAX);
      if (!title || !hasEditableTitle(scenes[index].kind)) return graph;
      const subtitle = (SUBTITLE_KINDS.includes(scenes[index].kind) || scenes[index].kind === "screens") ? edit.subtitle?.trim().slice(0, SUBTITLE_MAX) || undefined : scenes[index].subtitle;
      scenes[index] = { ...scenes[index], title, subtitle };
      if (!subtitle) delete scenes[index].subtitle;
      if (edit.lines && scenes[index].kind === "headlines") {
        const headlines = toHeadlines([title, ...edit.lines], edit.lineColors);
        scenes[index].title = headlines.title;
        if (headlines.lines.length) scenes[index].lines = headlines.lines;
        else delete scenes[index].lines;
        if (headlines.lineColors) scenes[index].lineColors = headlines.lineColors;
        else delete scenes[index].lineColors;
      }
      if (edit.badge !== undefined && scenes[index].kind === "cta") {
        const badge = edit.badge?.trim().slice(0, BADGE_MAX);
        if (badge === undefined) delete scenes[index].badge;
        else scenes[index].badge = badge;
      }
      if (edit.kicker !== undefined && scenes[index].kind === "feature") {
        const kicker = edit.kicker?.trim().slice(0, KICKER_MAX);
        if (kicker === undefined) delete scenes[index].kicker;
        else scenes[index].kicker = kicker;
      }
      if (edit.colors) {
        const textColors = { ...scenes[index].textColors };
        for (const target of TEXT_TARGETS.filter((key) => key in edit.colors!)) {
          const color = edit.colors[target];
          if (color && HEX_COLOR.test(color)) textColors[target] = color.toLowerCase();
          else delete textColors[target];
        }
        if (Object.keys(textColors).length) scenes[index].textColors = textColors;
        else delete scenes[index].textColors;
      }
      if (edit.ends) {
        const textEnds = { ...scenes[index].textEnds };
        for (const target of TEXT_TARGETS.filter((key) => key in edit.ends!)) {
          const end = edit.ends[target];
          // Pleine durée = comportement par défaut : rien à enregistrer
          if (typeof end === "number" && end < 1) textEnds[target] = Math.round(Math.max(TEXT_END_MIN, end) * 1000) / 1000;
          else delete textEnds[target];
        }
        if (Object.keys(textEnds).length) scenes[index].textEnds = textEnds;
        else delete scenes[index].textEnds;
      }
      break;
    }
    case "transition":
      scenes[index] = { ...scenes[index], transition: edit.transition };
      break;
    case "screens": {
      const limit = scenes[index].kind === "screens" ? MAX_SCREEN_COUNT : 1;
      const list = edit.screens ? [...new Set(edit.screens)].slice(0, limit) : [];
      scenes[index] = { ...scenes[index], screens: list };
      if (list.length && scenes[index].focus && !list.includes(scenes[index].focus!.src)) delete scenes[index].focus;
      if (list.length && scenes[index].focuses) scenes[index] = { ...scenes[index], focuses: scenes[index].focuses!.filter((f) => list.includes(f.src)) };
      if (!list.length) delete scenes[index].screens;
      break;
    }
    case "duplicate": {
      if (scenes.length >= MAX_SCENES || scenes.some((s) => s.id === edit.id) || totalDuration(graph) + scenes[index].duration > VIDEO_MAX_SECONDS) return graph;
      scenes.splice(index + 1, 0, { ...structuredClone(scenes[index]), id: edit.id });
      break;
    }
    case "focus":
      if (scenes[index].kind !== "screens") return graph;
      scenes[index] = { ...scenes[index], focus: edit.focus ? clampFocus(edit.focus) : undefined };
      if (!edit.focus) delete scenes[index].focus;
      delete scenes[index].focuses;
      break;
    case "focuses":
      if (scenes[index].kind !== "screens" || !isTimelineEdit(edit)) return graph;
      scenes[index] = { ...scenes[index], focuses: edit.focuses.map(clampFocus) };
      delete scenes[index].focus;
      break;
  }
  return { ...graph, scenes };
}

function addScene(graph: SceneGraph, edit: Extract<TimelineEdit, { kind: "add" }>): SceneGraph {
  const tl = getDictionary(graph.language ?? "en").app.editor.timeline;
  if (graph.scenes.length >= MAX_SCENES || graph.scenes.some((s) => s.id === edit.id)) return graph;
  const duration = Math.min(NEW_SCENE_SECONDS, VIDEO_MAX_SECONDS - totalDuration(graph));
  if (duration < SCENE_MIN_SECONDS) return graph;
  const at = edit.afterId === null ? 0 : graph.scenes.findIndex((s) => s.id === edit.afterId) + 1;
  if (at === 0 && edit.afterId !== null) return graph;
  const scenes = [...graph.scenes];
  scenes.splice(at, 0, { id: edit.id, kind: edit.sceneKind, title: edit.title.trim().slice(0, TITLE_MAX) || tl.newTitles[edit.sceneKind], duration, transition: edit.transition, ...(edit.sceneKind === "headlines" && { lines: [...tl.newHeadlines] }) });
  return { ...graph, scenes };
}

export function applyTimelineEdits(graph: SceneGraph, edits: TimelineEdit[]) {
  return edits.reduce(applyTimelineEdit, graph);
}

export function sceneLabel(kind: SceneGraph["scenes"][number]["kind"], locale: Locale = "en") {
  return getDictionary(locale).app.editor.timeline.kinds[kind];
}

export function formatSeconds(seconds: number, locale: Locale = "en") {
  return `${seconds.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 2 })} s`;
}

/** Libellé de la version créée (historique). */
export function timelineEditsLabel(before: SceneGraph, edits: TimelineEdit[]) {
  const locale = before.language ?? "en";
  const tl = getDictionary(locale).app.editor.timeline;
  if (edits.length !== 1) return format(tl.versionMany, { count: edits.length });
  const edit = edits[0];
  if (edit.kind === "add") return format(tl.versionAdd, { name: sceneLabel(edit.sceneKind, locale) });
  const scene = before.scenes.find((s) => s.id === edit.sceneId);
  const name = scene ? sceneLabel(scene.kind, locale) : "";
  switch (edit.kind) {
    case "textScale":
      return `${locale === "en" ? "Text size" : "Taille du texte"} · ${name}`;
    case "textPosition":
      return `${locale === "en" ? "Text position" : "Position du texte"} · ${name}`;
    case "presentation":
      return `${locale === "en" ? "Scene layout" : "Mise en scène"} · ${name}`;
    case "duration":
      return format(tl.versionDuration, { name, from: formatSeconds(scene?.duration ?? 0, locale), to: formatSeconds(clampDuration(edit.duration), locale) });
    case "move":
      return format(tl.versionMove, { name });
    case "delete":
      return format(tl.versionDelete, { name });
    case "text":
      return format(tl.versionText, { name });
    case "transition":
      return format(tl.versionTransition, { name, transition: tl.transitions[edit.transition] });
    case "screens":
      return format(tl.versionScreens, { name });
    case "duplicate":
      return format(tl.versionDuplicate, { name });
    case "focus":
      return edit.focus ? format(tl.versionFocus, { mode: tl.focusModes[edit.focus.mode] }) : tl.versionFocusRemoved;
    case "focuses":
      return edit.focuses.length ? format(tl.versionFocusSteps, { count: edit.focuses.length }) : tl.versionFocusRemoved;
  }
}

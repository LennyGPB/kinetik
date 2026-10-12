import { format, t } from "@/lib/i18n";
import { LOGO_LAYOUTS, SCREENS_LAYOUTS, type LogoLayout, type ScreensLayout } from "../../config/recipes";
import { isScenePresentation, SCENE_PRESENTATIONS, type ScenePresentation } from "../../config/scene-presentations";
import { FOCUS_MODES, MAX_SCREEN_COUNT, totalDuration, TRANSITIONS, type SceneGraph, type SceneKind, type ScreenFocus, type Transition } from "./scenes";

/**
 * Montage manuel depuis la frise de l'éditeur : durée, ordre, suppression, textes, transition et mise en avant des scènes.
 * Logique pure, exécutée côté client (aperçu immédiat) ET côté serveur (seule source de vérité enregistrée).
 * Gratuit, sans Claude : chaque validation crée une nouvelle version.
 */
export type TimelineEdit =
  | { kind: "textPosition"; sceneId: string; target: "title" | "subtitle"; offset: { x: number; y: number } | null }
  | { kind: "presentation"; sceneId: string; value: ScenePresentation | LogoLayout | ScreensLayout | null }
  | { kind: "duration"; sceneId: string; duration: number }
  | { kind: "move"; sceneId: string; toIndex: number }
  | { kind: "delete"; sceneId: string }
  | { kind: "text"; sceneId: string; title: string; subtitle: string | null }
  | { kind: "transition"; sceneId: string; transition: Transition }
  /** Scènes screens : zone d'un screen à mettre en avant (null = retirer) */
  | { kind: "focus"; sceneId: string; focus: ScreenFocus | null }
  /** Scènes screens : captures à montrer, dans l'ordre (null = automatique) */
  | { kind: "screens"; sceneId: string; screens: string[] | null }
  /** Nouvelle scène après `afterId` (null = au début). L'id est fourni par le client pour que le serveur rejoue la même suite. */
  | { kind: "add"; id: string; afterId: string | null; sceneKind: SceneKind; title: string; transition: Transition }
  | { kind: "duplicate"; sceneId: string; id: string };

/** Mêmes bornes que pour Claude (lib/services/ai.ts → normalize). */
export const SCENE_MIN_SECONDS = 1;
export const SCENE_MAX_SECONDS = 20;
export const VIDEO_MAX_SECONDS = 90;
/** Pas des boutons − / + et du redimensionnement */
export const DURATION_STEP = 0.5;
/** Une vidéo garde au moins 2 scènes, et au plus 12. */
export const MIN_SCENES = 2;
export const MAX_SCENES = 12;
/** Durée d'une scène ajoutée depuis la frise */
export const NEW_SCENE_SECONDS = 3;
export const SCENE_KINDS: SceneKind[] = ["intro", "logo", "feature", "screens", "cta"];
const SCENE_ID = /^[a-z]+-[a-z0-9]{4,24}$/;

/** Identifiant d'une scène créée depuis l'éditeur (unique, généré côté client). */
export function newSceneId(kind: SceneKind) {
  return `${kind}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
/** Longueurs maximales des textes (mêmes que pour Claude). */
export const TITLE_MAX = 80;
export const SUBTITLE_MAX = 120;
/** Scènes dont le sous-titre est affiché (la scène logo affiche le nom de l'app, la scène screens seulement un titre). */
export const SUBTITLE_KINDS: SceneGraph["scenes"][number]["kind"][] = ["intro", "feature", "cta"];
/** Scènes dont le titre est modifiable (la scène logo affiche toujours le nom de l'app). */
export function hasEditableTitle(kind: SceneGraph["scenes"][number]["kind"]) {
  return kind !== "logo";
}

/** Nombre maximum de modifications envoyées en une fois (anti-abus). */
export const MAX_EDITS_PER_COMMIT = 50;

const tl = t.app.editor.timeline;

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
  if (v.kind === "presentation") return v.value === null || (typeof v.value === "string" && [...SCENE_PRESENTATIONS, ...LOGO_LAYOUTS, ...SCREENS_LAYOUTS].some((item) => item === v.value));
  if (v.kind === "duration") return typeof v.duration === "number" && Number.isFinite(v.duration);
  if (v.kind === "move") return Number.isInteger(v.toIndex);
  if (v.kind === "text") return typeof v.title === "string" && v.title.length <= 500 && (v.subtitle === null || (typeof v.subtitle === "string" && v.subtitle.length <= 500));
  if (v.kind === "transition") return TRANSITIONS.includes(v.transition as Transition);
  if (v.kind === "focus") return v.focus === null || isFocus(v.focus);
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
      (v.label === undefined || (typeof v.label === "string" && v.label.length <= 40)),
  );
}

/** Zone bornée : au moins 8 % × 5 % de l'image, entièrement dedans. */
function clampFocus(f: ScreenFocus): ScreenFocus {
  const w = Math.min(1, Math.max(0.08, f.w));
  const h = Math.min(1, Math.max(0.05, f.h));
  const label = f.label?.trim().slice(0, 40);
  return { src: f.src, mode: f.mode, w, h, x: Math.min(1 - w, Math.max(0, f.x)), y: Math.min(1 - h, Math.max(0, f.y)), ...(label && f.mode === "popout" && { label }) };
}

/** Applique une modification ; renvoie le graph inchangé si elle est impossible (scène introuvable, limites…). */
export function applyTimelineEdit(graph: SceneGraph, edit: TimelineEdit): SceneGraph {
  if (edit.kind === "add") return addScene(graph, edit);
  const index = graph.scenes.findIndex((scene) => scene.id === edit.sceneId);
  if (index < 0) return graph;
  const scenes = [...graph.scenes];

  switch (edit.kind) {
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
      const subtitle = SUBTITLE_KINDS.includes(scenes[index].kind) ? edit.subtitle?.trim().slice(0, SUBTITLE_MAX) || undefined : scenes[index].subtitle;
      scenes[index] = { ...scenes[index], title, subtitle };
      if (!subtitle) delete scenes[index].subtitle;
      break;
    }
    case "transition":
      scenes[index] = { ...scenes[index], transition: edit.transition };
      break;
    case "screens": {
      if (scenes[index].kind !== "screens") return graph;
      const list = edit.screens ? [...new Set(edit.screens)].slice(0, MAX_SCREEN_COUNT) : [];
      scenes[index] = { ...scenes[index], screens: list };
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
      break;
  }
  return { ...graph, scenes };
}

function addScene(graph: SceneGraph, edit: Extract<TimelineEdit, { kind: "add" }>): SceneGraph {
  if (graph.scenes.length >= MAX_SCENES || graph.scenes.some((s) => s.id === edit.id)) return graph;
  const duration = Math.min(NEW_SCENE_SECONDS, VIDEO_MAX_SECONDS - totalDuration(graph));
  if (duration < SCENE_MIN_SECONDS) return graph;
  const at = edit.afterId === null ? 0 : graph.scenes.findIndex((s) => s.id === edit.afterId) + 1;
  if (at === 0 && edit.afterId !== null) return graph;
  const scenes = [...graph.scenes];
  scenes.splice(at, 0, { id: edit.id, kind: edit.sceneKind, title: edit.title.trim().slice(0, TITLE_MAX) || tl.newTitles[edit.sceneKind], duration, transition: edit.transition });
  return { ...graph, scenes };
}

export function applyTimelineEdits(graph: SceneGraph, edits: TimelineEdit[]) {
  return edits.reduce(applyTimelineEdit, graph);
}

export function sceneLabel(kind: SceneGraph["scenes"][number]["kind"]) {
  return tl.kinds[kind];
}

export function formatSeconds(seconds: number) {
  return `${seconds.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} s`;
}

/** Libellé de la version créée (historique). */
export function timelineEditsLabel(before: SceneGraph, edits: TimelineEdit[]) {
  if (edits.length !== 1) return format(tl.versionMany, { count: edits.length });
  const edit = edits[0];
  if (edit.kind === "add") return format(tl.versionAdd, { name: sceneLabel(edit.sceneKind) });
  const scene = before.scenes.find((s) => s.id === edit.sceneId);
  const name = scene ? sceneLabel(scene.kind) : "";
  switch (edit.kind) {
    case "textPosition":
      return `Position du texte · ${name}`;
    case "presentation":
      return `Mise en scène · ${name}`;
    case "duration":
      return format(tl.versionDuration, { name, from: formatSeconds(scene?.duration ?? 0), to: formatSeconds(clampDuration(edit.duration)) });
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
  }
}

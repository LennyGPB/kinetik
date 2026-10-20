import { beatGrid, type Scene, type SceneGraph } from "./scenes";
import { sceneTimeline } from "./scene-timing";

export type VoiceClip = {
  src: string;
  duration: number;
  text: string;
  voiceId: string;
  modelId: string;
  language: "fr" | "en";
  sceneContent: string;
  /** Character alignment is retained for future captions. */
  alignment?: { characters: string[]; starts: number[]; ends: number[] };
};
export type VoiceSegment = { sceneId: string; text: string; clip?: VoiceClip };
export type Voiceover = {
  enabled: boolean;
  voiceId: string;
  language: "fr" | "en";
  volume: number;
  duckMusic: boolean;
  autoFit?: boolean;
  captions?: boolean;
  setupPending?: boolean;
  segments: VoiceSegment[];
  /** Durable receipt for an idempotent paid operation. */
  requestId?: string;
};

export function sceneVoiceContent(scene: Scene) {
  return JSON.stringify([scene.kind, scene.title, scene.subtitle ?? "", scene.lines ?? [], scene.kicker ?? "", scene.badge ?? "", scene.focuses?.map((f) => [f.title, f.label]) ?? []]);
}

export function voiceSlots(graph: SceneGraph, fps = 30) {
  return sceneTimeline(graph.scenes, fps, graph.bpm, beatGrid(graph).phase);
}

export type VoiceStatus = "empty" | "missing" | "stale" | "too_long" | "ready";
export function voiceStatus(graph: SceneGraph, sceneId: string): VoiceStatus {
  const voice = graph.voiceover;
  const segment = voice?.segments.find((s) => s.sceneId === sceneId);
  if (!segment?.text.trim()) return "empty";
  if (!segment.clip) return "missing";
  const scene = graph.scenes.find((s) => s.id === sceneId);
  const clip = segment.clip;
  if (!scene || clip.text !== segment.text.trim() || clip.voiceId !== voice!.voiceId || clip.language !== voice!.language
    || clip.language !== (graph.language ?? voice!.language) || clip.sceneContent !== sceneVoiceContent(scene)) return "stale";
  const slot = voiceSlots(graph).find((s) => s.scene.id === sceneId);
  return !slot || Math.ceil(clip.duration * 30) > slot.duration ? "too_long" : "ready";
}

export function hasVoiceIssues(graph: SceneGraph) {
  return Boolean(graph.voiceover?.enabled && (graph.voiceover.setupPending || graph.scenes.some((s) => !["empty", "ready"].includes(voiceStatus(graph, s.id)))));
}

/** Non-ready clips are never silently truncated or spoken in the wrong language. */
export function playableVoiceClips(graph: SceneGraph, fps = 30) {
  if (!graph.voiceover?.enabled) return [];
  return voiceSlots(graph, fps).flatMap((slot) => {
    const segment = graph.voiceover!.segments.find((s) => s.sceneId === slot.scene.id);
    return segment?.clip && voiceStatus(graph, slot.scene.id) === "ready" ? [{ ...slot, clip: segment.clip }] : [];
  });
}

export function musicDuckVolume(graph: SceneGraph, frame: number, fps: number) {
  if (!graph.voiceover?.duckMusic || graph.voiceover.volume <= 0) return 1;
  const ramp = Math.max(1, Math.round(fps * 0.15));
  return playableVoiceClips(graph, fps).reduce((volume, { from, clip }) => {
    const end = from + Math.ceil(clip.duration * fps);
    const envelope = Math.max(0, Math.min(1, (frame - from + ramp) / ramp, (end + ramp - frame) / ramp));
    return Math.min(volume, 1 - envelope * 0.75);
  }, 1);
}

export function mapVoiceMedia(graph: SceneGraph, transform: (src: string) => string): SceneGraph {
  if (!graph.voiceover) return graph;
  return { ...graph, voiceover: { ...graph.voiceover, segments: graph.voiceover.segments.map((s) => ({ ...s, ...(s.clip && { clip: { ...s.clip, src: transform(s.clip.src) } }) })) } };
}

export function estimateVoiceSeconds(text: string) {
  return text.trim() ? Math.ceil((Math.max(text.trim().split(/\s+/).length / 2, text.trim().length / 12) + 0.4) * 10) / 10 : 0;
}

/** Fit existing audio without another paid call. Beat snapping can move either scene boundary. */
export function fitVoiceScenes(graph: SceneGraph, sceneIds = graph.scenes.map((s) => s.id)): SceneGraph {
  if (graph.recording) return graph;
  const next = structuredClone(graph);
  for (let pass = 0; pass < 100; pass++) {
    let changed = false;
    for (const sceneId of sceneIds) {
      if (voiceStatus(next, sceneId) !== "too_long") continue;
      const scene = next.scenes.find((s) => s.id === sceneId)!;
      const clip = next.voiceover!.segments.find((s) => s.sceneId === sceneId)!.clip!;
      const slot = voiceSlots(next).find((s) => s.scene.id === sceneId)!;
      const deficit = (Math.ceil(clip.duration * 30) - slot.duration) / 30;
      const remaining = next.pitch ? Math.max(0, 120 - next.scenes.reduce((sum, s) => sum + s.duration, 0)) : 120;
      const duration = Math.min(20, scene.duration + remaining, Math.ceil((scene.duration + deficit + 0.1) * 30) / 30);
      if (duration > scene.duration) { scene.duration = duration; changed = true; }
    }
    if (!changed) break;
  }
  return next;
}

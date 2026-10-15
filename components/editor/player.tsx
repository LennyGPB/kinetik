"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { QuickSettings } from "./quick-settings";
import type { QuickSetting } from "@/lib/projects/settings";
import { TextEditingContext } from "@/remotion/video/movable-text";

import { Player as RemotionPlayer, type PlayerRef } from "@remotion/player";
import { ChevronRight, Copy, Images, Maximize2, Minus, Pause, Pencil, Play, Plus, ScanSearch, Trash2, Type, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { VIDEO_FORMATS } from "@/config/formats";
import { beatGrid, sceneFocuses, sceneScreens, TRANSITIONS, type Scene, type Transition } from "@/lib/projects/scenes";
import {
  applyTimelineEdits,
  DURATION_STEP,
  formatSeconds,
  hasEditableTitle,
  MAX_SCENES,
  MIN_SCENES,
  newSceneId,
  SCENE_KINDS,
  SCENE_MAX_SECONDS,
  SCENE_MIN_SECONDS,
  sceneLabel,
  SUBTITLE_KINDS,
  SUBTITLE_MAX,
  TITLE_MAX,
  KICKER_MAX,
  type TimelineEdit,
} from "@/lib/projects/timeline";
import { cn, formatTime } from "@/lib/utils";
import { DIMENSIONS, durationInFrames, FPS, type VideoProps } from "@/remotion/props";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { sceneTimeline } from "@/remotion/video/transitions";
import { FocusSequenceEditor } from "./focus-sequence-editor";
import { VariantSwitcher } from "./variant-switcher";
import type { ProjectVariant } from "@/lib/projects/types";
import { ScreensPicker } from "./screens-picker";
import { SceneTimeline } from "./scene-timeline";
import { ScenePresentationSelect } from "./scene-presentation-select";
import { Dialog } from "@/components/ui/dialog";
import { AnimatedApply } from "@/components/ui/animated-apply";

/** Délai sans nouvelle modification avant d'enregistrer (plusieurs clics sur + = une seule version). */
const COMMIT_DELAY_MS = 900;

export type TimelineEditing = {
  onSelectScene?: (sceneId: string | null) => void;
  onSetting?: (setting: QuickSetting, sceneId?: string) => void;
  onMedia?: () => void;
  onAskScene?: (sceneId: string) => void;
  /** Enregistre les modifications ; renvoie false en cas d'échec (l'aperçu revient alors à la version enregistrée). */
  onCommit: (edits: TimelineEdit[], focusSceneId: string | null) => Promise<boolean>;
  disabled?: boolean;
  /** Scène à resélectionner (et à lire) après un rechargement de version */
  initialSceneId?: string | null;
};

/**
 * Aperçu = la vraie composition Remotion (identique au MP4 exporté),
 * avec nos propres contrôles par-dessus l'API du Player.
 * Avec `editing`, la frise permet aussi le montage (durée, ordre, suppression des scènes).
 */
/**
 * `compact` (mobile uniquement) : vidéo plus petite et barre d'outils de montage masquée, pour laisser la place au chat.
 * Sans effet dès lg, où l'aperçu a toujours toute sa zone.
 */
export function Player({ videoProps, editing, variants, className, compact = false, initiallyMuted = true, onMutedChange, initiallyPlaying = true, onPlayingChange }: { videoProps: VideoProps; editing?: TimelineEditing; variants?: { list: ProjectVariant[]; currentId: string; canCreate: boolean }; className?: string; compact?: boolean; initiallyMuted?: boolean; onMutedChange?: (muted: boolean) => void; initiallyPlaying?: boolean; onPlayingChange?: (playing: boolean) => void }) {
  const t = useDictionary();

  const e = t.app.editor;
  const tl = e.timeline;

  const playerRef = useRef<PlayerRef>(null);
  const [autoPlay] = useState(initiallyPlaying);
  const [playing, setPlaying] = useState(initiallyPlaying);
  const [muted, setMuted] = useState(initiallyMuted);
  const [selectedId, setSelectedIdState] = useState<string | null>(editing?.initialSceneId ?? (editing ? videoProps.graph.scenes[0]?.id ?? null : null));
  // Panneau ouvert sous la barre d'outils de la scène
  const [panel, setPanel] = useState<"text" | "focus" | "screens" | "logo" | null>(null);
  const closeFocus = useCallback(() => setPanel(null), []);
  const [addOpen, setAddOpen] = useState(false);
  const [positioning, setPositioning] = useState(false);
  // Couleur affichée par le template pour chaque texte (« sceneId:title »), relevée dans l'aperçu : valeur de départ du choix de couleur
  const [defaultColors, setDefaultColors] = useState<Record<string, string>>({});
  const reportDefaultColor = useCallback((sceneId: string, target: "title" | "subtitle", css: string) => {
    const hex = cssColorToHex(css);
    const key = `${sceneId}:${target}`;
    if (hex) setDefaultColors((colors) => (colors[key] === hex ? colors : { ...colors, [key]: hex }));
  }, []);
  // Changer de scène ferme l'éditeur de texte
  const setSelectedId = (id: string | null) => {
    if (id !== selectedId) setPanel(null);
    setSelectedIdState(id);
    editing?.onSelectScene?.(id);
  };
  // Modifications pas encore enregistrées : appliquées tout de suite à l'aperçu
  const [drafts, setDrafts] = useState<TimelineEdit[]>([]);
  const [saving, setSaving] = useState(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const graph = drafts.length ? applyTimelineEdits(videoProps.graph, drafts) : videoProps.graph;
  const props = graph === videoProps.graph ? videoProps : { ...videoProps, graph };
  const total = durationInFrames(graph);
  const { width, height } = DIMENSIONS[videoProps.format];
  const ratio = VIDEO_FORMATS[videoProps.format].ratio;
  const timeline = sceneTimeline(graph.scenes, FPS, graph.bpm, beatGrid(graph).phase);
  // Après une modification, la lecture reprend au début de la scène sélectionnée
  const [initialFrame] = useState(() => timeline.find((s) => s.scene.id === editing?.initialSceneId)?.from ?? 0);
  const [frame, setFrame] = useState(initialFrame);
  const index = Math.max(0, timeline.findLastIndex((s) => s.from <= frame));
  const editable = Boolean(editing) && !editing?.disabled && !saving;
  const selected = graph.scenes.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = (ev: { detail: { frame: number } }) => setFrame(ev.detail.frame);
    const onPlay = () => {
      setPlaying(true);
      onPlayingChange?.(true);
    };
    const onPause = () => {
      setPlaying(false);
      onPlayingChange?.(false);
    };
    const onMute = (ev: { detail: { isMuted: boolean } }) => {
      setMuted(ev.detail.isMuted);
      onMutedChange?.(ev.detail.isMuted);
    };
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("mutechange", onMute);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("mutechange", onMute);
    };
  }, [onMutedChange, onPlayingChange]);

  useEffect(() => () => clearTimeout(commitTimer.current), []);

  /** Le clic sur « activer le son » est le geste utilisateur qui autorise le navigateur à jouer l'audio. */
  function toggleSound(ev: React.MouseEvent) {
    const player = playerRef.current;
    if (!player) return;
    if (!muted) return player.mute();
    player.unmute();
    if (!player.isPlaying()) player.play(ev);
  }

  function seek(target: number) {
    playerRef.current?.seekTo(Math.max(0, Math.min(total - 1, target)));
  }

  /** Ajoute une modification à l'aperçu et planifie l'enregistrement groupé. */
  function edit(change: TimelineEdit) {
    if (!editing || !editable) return;
    const next = [...drafts, change];
    setDrafts(next);
    if (change.kind === "delete") setSelectedId(null);
    // Nouvelle scène : on la sélectionne et on ouvre directement l'édition de son texte
    if (change.kind === "add" || change.kind === "duplicate") {
      setSelectedIdState(change.id);
      setPanel(change.kind === "add" && hasEditableTitle(change.sceneKind) ? "text" : null);
    }
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(async () => {
      setSaving(true);
      const ok = await editing.onCommit(next, change.kind === "delete" ? null : change.kind === "add" || change.kind === "duplicate" ? change.id : change.sceneId);
      // Succès : le parent recharge le lecteur avec la nouvelle version. Échec : on revient à la version enregistrée.
      if (!ok) {
        setDrafts([]);
        setSaving(false);
      }
    }, COMMIT_DELAY_MS);
  }


  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div
        data-text-preview
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-2xl border border-line-strong bg-black shadow-[0_30px_80px_-30px_var(--accent-glow)] sm:rounded-3xl",
          // Mobile : grand dans l'onglet Montage, compact au-dessus du chat ; desktop : il remplit la zone centrale
          ratio === "9:16" && (compact ? "max-w-[calc(26dvh*9/16)]" : "max-w-[calc(52dvh*9/16)]"),
          ratio === "9:16" && "lg:max-w-[min(100%,calc((100dvh-21rem)*9/16))]",
          ratio === "1:1" && (compact ? "max-w-[26dvh]" : "max-w-[52dvh]"),
          ratio === "1:1" && "lg:max-w-[min(100%,calc(100dvh-21rem))]",
          ratio === "16:9" && compact && "max-w-[calc(26dvh*16/9)]",
          ratio === "16:9" && "lg:max-w-[min(100%,calc((100dvh-21rem)*16/9))]",
        )}
      >
        <TextEditingContext value={{ enabled: positioning && editable, onStart: (sceneId) => { playerRef.current?.pause(); setSelectedId(sceneId); }, onCommit: (sceneId, target, offset) => edit({ kind: "textPosition", sceneId, target, offset }), onDefaultColor: editing ? reportDefaultColor : undefined }}>
        <RemotionPlayer
          ref={playerRef}
          component={KinetikVideo}
          inputProps={props}
          durationInFrames={total}
          compositionWidth={width}
          compositionHeight={height}
          fps={FPS}
          initialFrame={Math.min(initialFrame, total - 1)}
          autoPlay={autoPlay}
          loop
          initiallyMuted={initiallyMuted}
          // Une balise audio dédiée par piste : le son suit directement mute/unmute (pas de pool à débloquer)
          numberOfSharedAudioTags={0}
          clickToPlay={!positioning}
          doubleClickToFullscreen={!positioning}
          style={{ width: "100%", aspectRatio: `${width} / ${height}` }}
        />
        </TextEditingContext>
        {positioning && <div aria-hidden className="pointer-events-none absolute inset-0"><div className="absolute inset-y-0 left-1/2 border-l border-dashed border-white/35" /><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/35" /></div>}
        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur">
          {index + 1}/{graph.scenes.length} · {graph.scenes[index]?.kind}
        </span>
        {/* En pause : icône lecture au centre (le clic sur la vidéo relance la lecture, l'icône ne l'intercepte pas) */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-md transition-[opacity,scale] duration-200",
            playing || positioning ? "scale-90 opacity-0" : "scale-100 opacity-100",
          )}
        >
          <Play className="size-7 translate-x-0.5 fill-current" />
        </span>
        {/* Barre du bas, posée sur la vidéo : temps et formats à gauche, son et plein écran à droite. Sur une vidéo étroite, les formats passent au-dessus du temps au lieu de chevaucher les boutons */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-end gap-1.5 sm:inset-x-3 sm:bottom-3">
        <div className="flex min-w-0 flex-1 flex-wrap-reverse items-center gap-1.5">
          <span className="pointer-events-none rounded-full bg-black/45 px-2.5 py-1 font-mono text-[11px] text-white/85 tabular-nums backdrop-blur">
            {formatTime(frame / FPS)} / {formatTime(total / FPS)}
          </span>
          {variants && <div className="pointer-events-auto"><VariantSwitcher variants={variants.list} currentId={variants.currentId} canCreate={variants.canCreate} /></div>}
        </div>
        {/* Son et plein écran */}
        <div className="pointer-events-auto flex shrink-0 gap-1">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={muted ? e.unmute : e.mute}
            className="grid size-8 place-items-center rounded-full bg-black/45 text-white/85 backdrop-blur transition-colors hover:bg-black/65 hover:text-white focus-visible:outline-2 focus-visible:outline-accent"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => playerRef.current?.requestFullscreen()}
            aria-label={e.fullscreen}
            className="hidden size-8 place-items-center rounded-full bg-black/45 text-white/85 backdrop-blur transition-colors hover:bg-black/65 hover:text-white focus-visible:outline-2 focus-visible:outline-accent sm:grid"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(ev) => playerRef.current?.toggle(ev)}
          aria-label={playing ? e.pause : e.play}
          // En édition, la barre de lecture (h-3 + gap-1) surmonte les scènes : on recentre le bouton sur les scènes
          className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-fg text-bg transition-transform active:scale-90", editable && "mt-4")}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
        </button>
        <SceneTimeline
          graph={graph}
          frame={frame}
          total={total}
          onSeek={seek}
          editable={editable}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={edit}
        />
      </div>

      {/* Montage : barre d'outils de la scène sélectionnée (aussi utilisable au clavier et au doigt) */}
      {editing && (
        <div className={cn("flex min-h-10 flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted", compact && "max-lg:hidden")}>
          {selected ? (
            // Mobile : la barre passe à la ligne (aucun outil caché hors écran) ; dès sm, une seule pilule
            <div role="toolbar" aria-label={tl.selected} className="flex w-full flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface p-1.5 pl-3 text-fg sm:w-auto sm:max-w-full sm:flex-nowrap sm:gap-1 sm:overflow-x-auto sm:rounded-full sm:p-1 sm:pl-3 sm:scrollbar-none">
              <span className="mr-1 shrink-0 text-sm font-semibold whitespace-nowrap">{sceneLabel(selected.kind, t.locale)}</span>
              <span className="mr-1 shrink-0 font-mono text-xs whitespace-nowrap text-muted tabular-nums sm:w-12">{formatSeconds(selected.duration, t.locale)}</span>
              <ToolButton label={tl.shorter} disabled={!editable || selected.duration <= SCENE_MIN_SECONDS} onClick={() => edit({ kind: "duration", sceneId: selected.id, duration: selected.duration - DURATION_STEP })}>
                <Minus />
              </ToolButton>
              <ToolButton label={tl.longer} disabled={!editable || selected.duration >= SCENE_MAX_SECONDS} onClick={() => edit({ kind: "duration", sceneId: selected.id, duration: selected.duration + DURATION_STEP })}>
                <Plus />
              </ToolButton>
              <ToolButton label={selected.kind === "logo" ? t.copy["61918df1ac56"] : tl.editText} disabled={!editable} active={panel === "text" || panel === "logo"} onClick={() => {
                playerRef.current?.pause();
                const next = selected.kind === "logo" ? "logo" : "text";
                // Texte : on affiche la scène, ce qui relève aussi la couleur actuelle de ses textes
                const timing = timeline.find((item) => item.scene.id === selected.id);
                if (next === "text" && panel !== "text" && timing) seek(timing.from + Math.min(Math.round(FPS * 0.8), Math.floor(selected.duration * FPS * 0.6)));
                setPanel((v) => (v === next ? null : next));
              }}>
                <Type />
              </ToolButton>
              {selected.kind === "screens" && (
                <ToolButton
                  label={videoProps.screenUrls.length ? tl.focus : tl.focusNoScreens}
                  disabled={!editable || !videoProps.screenUrls.length}
                  active={panel === "focus" || sceneFocuses(selected).length > 0}
                  onClick={() => { playerRef.current?.pause(); setPanel((v) => (v === "focus" ? null : "focus")); }}
                >
                  <ScanSearch />
                </ToolButton>
              )}
              {selected.kind === "screens" && (
                <ToolButton
                  label={videoProps.screenUrls.length ? tl.screensPick : tl.screensNone}
                  disabled={!editable || !videoProps.screenUrls.length}
                  active={panel === "screens" || Boolean(selected.screens?.length)}
                  onClick={() => setPanel((v) => (v === "screens" ? null : "screens"))}
                >
                  <Images />
                </ToolButton>
              )}
              <span className="mx-0.5 h-5 w-px bg-line" />
              <TransitionSelect value={selected.transition} recommended={videoProps.recipe.transitions} disabled={!editable} onChange={(transition) => edit({ kind: "transition", sceneId: selected.id, transition })} />
              <span className="mx-0.5 h-5 w-px bg-line" />
              <ToolButton
                label={graph.scenes.length >= MAX_SCENES ? tl.maxScenes : tl.duplicate}
                disabled={!editable || graph.scenes.length >= MAX_SCENES}
                onClick={() => edit({ kind: "duplicate", sceneId: selected.id, id: newSceneId(selected.kind) })}
              >
                <Copy />
              </ToolButton>
              <ToolButton
                label={graph.scenes.length <= MIN_SCENES ? tl.minScenes : tl.remove}
                danger
                disabled={!editable || graph.scenes.length <= MIN_SCENES}
                onClick={() => edit({ kind: "delete", sceneId: selected.id })}
              >
                <Trash2 />
              </ToolButton>
              <ToolButton label={tl.deselect} onClick={() => setSelectedId(null)}>
                <X />
              </ToolButton>
            </div>
          ) : (
            <span className="max-sm:hidden">{tl.hint}</span>
          )}
          <div className="relative">
            <button
              type="button"
              disabled={!editable || graph.scenes.length >= MAX_SCENES}
              onClick={() => setAddOpen((v) => !v)}
              aria-expanded={addOpen}
              title={graph.scenes.length >= MAX_SCENES ? tl.maxScenes : selected ? tl.addAfter : tl.addAtEnd}
              className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-sm font-medium text-fg transition-colors hover:border-accent hover:text-accent-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" /> {tl.add}
            </button>
            {addOpen && (
              <ul role="menu" className="absolute bottom-full left-0 z-30 mb-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-[var(--shadow-lift)]">
                {SCENE_KINDS.map((kind) => (
                  <li key={kind}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAddOpen(false);
                        edit({ kind: "add", id: newSceneId(kind), afterId: selected?.id ?? graph.scenes.at(-1)?.id ?? null, sceneKind: kind, title: tl.newTitles[kind], transition: videoProps.recipe.transitions[0] });
                      }}
                      className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="text-sm font-semibold text-fg">{sceneLabel(kind, t.locale)}</span>
                      <span className="text-xs text-muted">{tl.kindHints[kind]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="ml-auto flex items-center gap-3 font-mono tabular-nums">
            {saving && <span className="animate-pulse text-accent-text">{tl.saving}</span>}
          </span>
        </div>
      )}
      {editing && selected && (
        <details key={selected.id} open className="rounded-xl border border-line bg-surface/60 p-3">
        <summary className="cursor-pointer text-xs font-medium text-muted">{t.copy["636c04a3a715"]}</summary>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ScenePresentationSelect scene={selected} videoProps={videoProps} disabled={!editable} onChange={edit} />
          <button type="button" disabled={!editable} aria-pressed={positioning} onClick={() => {
            const next = !positioning;
            setPositioning(next);
            playerRef.current?.pause();
            if (next) {
              const timing = timeline.find((item) => item.scene.id === selected.id);
              if (timing) seek(timing.from + Math.min(Math.round(FPS * 0.8), Math.floor(selected.duration * FPS * 0.6)));
            }
          }} className={cn("min-h-9 cursor-pointer rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40", positioning ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-black text-white hover:border-accent hover:bg-accent")}>
            {positioning ? t.copy["5613f09a3b54"] : t.copy["f8a325b0b137"]}
          </button>
          {positioning && <span className="text-xs text-muted">{t.copy["8ab456b730b6"]}</span>}
          {(["title", "subtitle"] as const).map((target) => selected.textOffsets?.[target] && (
            <button key={target} type="button" disabled={!editable} onClick={() => edit({ kind: "textPosition", sceneId: selected.id, target, offset: null })} className="min-h-9 cursor-pointer rounded-lg border border-line-strong bg-black px-3 text-xs text-white hover:bg-accent">
              {target === "title" ? t.copy["b711766805b2"] : t.copy["a9cee89d1dca"]}
            </button>
          ))}
          {editing.onAskScene && (
            <button type="button" disabled={!editable || drafts.length > 0} onClick={() => { playerRef.current?.pause(); editing.onAskScene?.(selected.id); }} className="min-h-9 cursor-pointer rounded-lg border border-line-strong bg-black px-3 py-2 text-xs font-medium text-white transition-colors hover:border-accent hover:bg-accent hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40">

              {t.copy["c7b2ac7f9b71"]}
            </button>
          )}
          {selected.kind === "screens" && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-muted">{t.copy["27a2555e059e"]}</span>
              {/* Mockup classique : le choisir, puis (une fois choisi) le même bouton ouvre la modale de ses captures */}
              {!sceneFocuses(selected).length && panel !== "focus" ? (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  disabled={!editable || !videoProps.screenUrls.length}
                  title={videoProps.screenUrls.length ? undefined : tl.screensNone}
                  onClick={() => { playerRef.current?.pause(); setPanel("screens"); }}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-accent bg-accent px-3 text-xs font-semibold text-accent-fg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  {tl.editMockup}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => {
                    if (sceneFocuses(selected).length) edit({ kind: "focus", sceneId: selected.id, focus: null });
                    setPanel(null);
                  }}
                  className="min-h-9 cursor-pointer rounded-lg border border-line-strong bg-black px-3 text-xs font-medium text-white transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.copy["23ab12dc12fd"]}
                </button>
              )}
              <button
                type="button"
                aria-expanded={panel === "focus"}
                aria-pressed={sceneFocuses(selected).length > 0 || panel === "focus"}
                disabled={!editable || !videoProps.screenUrls.length}
                onClick={() => { playerRef.current?.pause(); setPanel("focus"); }}
                className={cn("flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40", sceneFocuses(selected).length || panel === "focus" ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-black text-white hover:border-accent")}
              >
                <ScanSearch className="size-3.5" aria-hidden />
                {sceneFocuses(selected).length ? t.copy["c6e8135881b1"] : t.copy["96f130bf318b"]}
              </button>
            </div>
          )}

        </div></details>
      )}
      {editing && selected && panel === "logo" && (
        <Dialog open onClose={closeFocus} title={t.copy["61918df1ac56"]}>
          <button type="button" onClick={() => { setPanel(null); editing.onMedia?.(); }} className="min-h-10 rounded-lg border border-line-strong px-4 text-sm font-medium hover:bg-surface-2">{t.copy["37a2f034ce7c"]}</button>
          <QuickSettings logoOnly initiallyOpen sceneId={selected.id} graph={graph} videoProps={videoProps} recipe={videoProps.recipe} brandFonts={null} disabled={!editable} onApply={(setting) => { editing.onSetting?.(setting, selected.id); setPanel(null); }} />
        </Dialog>
      )}
      {editing && selected && panel === "text" && (
        // La clé fait repartir le formulaire des textes de la scène sélectionnée
        <TextForm
          key={selected.id}
          scene={selected}
          defaultColors={{ title: defaultColors[`${selected.id}:title`] ?? null, subtitle: defaultColors[`${selected.id}:subtitle`] ?? null, kicker: null }}
          // Surtitre : scène feature classique, hors compositions « affiche » (le nom de l'app y est déjà en en-tête)
          kicker={selected.kind === "feature" && (!selected.presentation || selected.presentation === "classic") && videoProps.recipe.composition !== "poster" ? { appName: videoProps.appName, color: cssColorToHex(videoProps.palette[2]) ?? "#ffffff" } : null}
          disabled={!editable}
          onCancel={closeFocus}
          onApply={(change) => {
            edit({ kind: "text", sceneId: selected.id, ...change });
            setPanel(null);
          }}
        />
      )}
      {editing && selected?.kind === "screens" && panel === "screens" && (
        <Dialog open onClose={() => setPanel(null)} title={tl.editMockup}>
          <ScreensPicker
            key={selected.id}
            screens={videoProps.screenUrls.map((url, i) => ({ url, ratio: videoProps.screenRatios?.[i] ?? null }))}
            value={selected.screens}
            disabled={!editable}
            onManage={() => { setPanel(null); editing.onMedia?.(); }}
            onCancel={() => setPanel(null)}
            onApply={(screens) => {
              edit({ kind: "screens", sceneId: selected.id, screens });
              setPanel(null);
            }}
          />
        </Dialog>
      )}
      {editing && selected?.kind === "screens" && panel === "focus" && (
        <FocusSequenceEditor
          key={selected.id}
          screens={videoProps.screenUrls.map((url, i) => ({ url, ratio: videoProps.screenRatios?.[i] ?? null }))}
          value={sceneFocuses(selected)}
          sceneScreens={sceneScreens(graph.scenes, selected, videoProps.screenUrls, 3)}
          sceneTitle={selected.title}
          duration={selected.duration}
          disabled={!editable}
          onCancel={closeFocus}
          onApply={(focuses) => {
            edit({ kind: "focuses", sceneId: selected.id, focuses });
            setPanel(null);
          }}
        />
      )}
    </div>
  );
}

/** Transition d'entrée de la scène : celles du template en premier. */
function TransitionSelect({ value, recommended, disabled, onChange }: { value: Transition; recommended: Transition[]; disabled: boolean; onChange: (t: Transition) => void }) {
  const t = useDictionary();

  const e = t.app.editor;
  const tl = e.timeline;

  const others = TRANSITIONS.filter((t) => !recommended.includes(t));
  return (
    <span className="relative ml-0.5 flex shrink-0 items-center gap-1.5">
    <span aria-hidden className="text-[11px] font-medium text-muted">{tl.transitionShort}</span>
    <select
      aria-label={tl.transition}
      title={tl.transition}
      value={value}
      disabled={disabled}
      onChange={(ev) => onChange(ev.target.value as Transition)}
      className="h-8 appearance-none rounded-full border border-line bg-bg pr-9 pl-3 text-xs font-medium text-fg outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <optgroup label={tl.recommended}>
        {recommended.map((t) => (
          <option key={t} value={t}>
            {tl.transitions[t]}
          </option>
        ))}
      </optgroup>
      {others.length > 0 && (
        <optgroup label={tl.others}>
          {others.map((t) => (
            <option key={t} value={t}>
              {tl.transitions[t]}
            </option>
          ))}
        </optgroup>
      )}
    </select>
    <ChevronRight aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 rotate-90 text-muted" />
    </span>
  );
}

/** Édition du titre (et du sous-titre quand la scène en affiche un). */
type TextColors = Record<"title" | "subtitle" | "kicker", string | null>;
type TextChange = { title: string; subtitle: string | null; colors: Partial<TextColors>; kicker?: string | null };

/**
 * Textes de la scène et leur couleur. `kicker` : surtitre affiché par cette scène (scène feature classique),
 * avec sa valeur par défaut (nom de l'app) et sa couleur de template ; absent = pas de surtitre.
 */
function TextForm({ scene, defaultColors, kicker: kickerDefaults, disabled, onApply, onCancel }: {
  scene: Scene;
  defaultColors: TextColors;
  kicker: { appName: string; color: string } | null;
  disabled: boolean;
  onApply: (change: TextChange) => void;
  onCancel: () => void;
}) {
  const t = useDictionary();

  const e = t.app.editor;
  const tl = e.timeline;

  const [title, setTitle] = useState(scene.title);
  const [subtitle, setSubtitle] = useState(scene.subtitle ?? "");
  const [kicker, setKicker] = useState(scene.kicker ?? kickerDefaults?.appName ?? "");
  const [colors, setColors] = useState<TextColors>({ title: scene.textColors?.title ?? null, subtitle: scene.textColors?.subtitle ?? null, kicker: scene.textColors?.kicker ?? null });
  const [applying, setApplying] = useState(false);
  const pending = useRef<TextChange>({ title, subtitle, colors });
  const withSubtitle = SUBTITLE_KINDS.includes(scene.kind);
  const colorPicker = (target: keyof TextColors) => (
    <TextColorPicker value={colors[target]} fallback={target === "kicker" ? kickerDefaults?.color ?? null : defaultColors[target]} disabled={disabled || applying} onChange={(color) => setColors((c) => ({ ...c, [target]: color }))} />
  );
  // Ce qui est envoyé : seulement les textes que la scène affiche ; le surtitre égal au nom de l'app reste « par défaut »
  const change = (): TextChange => ({
    title,
    subtitle: withSubtitle ? subtitle : null,
    colors: { title: colors.title, ...(withSubtitle && { subtitle: colors.subtitle }), ...(kickerDefaults && { kicker: colors.kicker }) },
    ...(kickerDefaults && { kicker: kicker.trim() === kickerDefaults.appName ? null : kicker.trim() }),
  });
  const field = "h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] sm:text-sm";
  return (
    <Dialog open onClose={onCancel} title={t.copy["c170d750ef45"]} description={t.copy["f3a990b50207"]}>
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
      }}
      className="flex flex-col gap-4"
    >
      {kickerDefaults && (
        <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
          {tl.kickerLabel}
          <span className="flex items-center gap-2">
            <input disabled={disabled || applying} value={kicker} maxLength={KICKER_MAX} placeholder={tl.kickerHidden} onChange={(ev) => setKicker(ev.target.value)} className={field} />
            {colorPicker("kicker")}
          </span>
          <span className="font-normal text-subtle">{tl.kickerHint}</span>
        </label>
      )}
      <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
        {scene.kind === "stat" ? tl.statTitleLabel : scene.kind === "quote" ? tl.quoteTitleLabel : tl.titleLabel}
        <span className="flex items-center gap-2">
          <input autoFocus disabled={disabled || applying} value={title} maxLength={TITLE_MAX} onChange={(ev) => setTitle(ev.target.value)} className={field} />
          {colorPicker("title")}
        </span>
      </label>
      {withSubtitle && (
        <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
          {scene.kind === "stat" ? tl.statSubtitleLabel : scene.kind === "quote" ? tl.quoteSubtitleLabel : tl.subtitleLabel}
          <span className="flex items-center gap-2">
            <input disabled={disabled || applying} value={subtitle} maxLength={SUBTITLE_MAX} placeholder={tl.subtitlePlaceholder} onChange={(ev) => setSubtitle(ev.target.value)} className={field} />
            {colorPicker("subtitle")}
          </span>
        </label>
      )}
      <AnimatedApply submit disabled={disabled || !title.trim()} onApplyingChange={setApplying} onBegin={() => { pending.current = change(); }} onApply={() => onApply(pending.current)} onCancel={onCancel} />
    </form>
    </Dialog>
  );
}

/**
 * Pastille de couleur d'un texte (sélecteur natif). Sans couleur choisie, elle montre la couleur actuelle du template
 * (`fallback`, relevée dans l'aperçu) : rien n'est enregistré tant qu'on ne la change pas.
 */
function TextColorPicker({ value, fallback, disabled, onChange }: { value: string | null; fallback: string | null; disabled: boolean; onChange: (color: string | null) => void }) {
  const tl = useDictionary().app.editor.timeline;
  const shown = value ?? fallback ?? "#ffffff";
  return (
    <span className="flex shrink-0 items-center gap-1">
      <span
        title={tl.textColor}
        className={cn("relative size-10 cursor-pointer overflow-hidden rounded-xl border border-line-strong shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)]", disabled && "pointer-events-none opacity-50")}
        style={{ background: shown }}
      >
        <input
          type="color"
          aria-label={tl.textColor}
          disabled={disabled}
          value={shown}
          onChange={(ev) => onChange(ev.target.value.toLowerCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
      {value && (
        <button type="button" disabled={disabled} title={tl.textColorReset} aria-label={tl.textColorReset} onClick={() => onChange(null)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
          <X className="size-3.5" />
        </button>
      )}
    </span>
  );
}

/** Couleur CSS calculée (rgb, color(srgb …), oklab…) → #rrggbb ; null si transparente (texte en dégradé). */
const hexCache = new Map<string, string | null>();
function cssColorToHex(css: string): string | null {
  // Relevée à chaque image de l'aperçu : la conversion (canvas) n'est faite qu'une fois par couleur
  if (hexCache.has(css)) return hexCache.get(css)!;
  if (typeof document === "undefined") return null;
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = css;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  const hex = a < 128 ? null : `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  hexCache.set(css, hex);
  return hex;
}

function ToolButton({ label, onClick, disabled, danger, active, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        // Cibles tactiles de 40 px sur mobile
        "grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-35 sm:size-8 [&_svg]:size-4",
        danger && "hover:bg-danger/10 hover:text-danger",
        active && "bg-accent-soft text-accent-text",
      )}
    >
      {children}
    </button>
  );
}

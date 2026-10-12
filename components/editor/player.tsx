"use client";
import { TextEditingContext } from "@/remotion/video/movable-text";


import { Player as RemotionPlayer, type PlayerRef } from "@remotion/player";
import { ChevronRight, Copy, Images, Maximize2, Minus, Pause, Play, Plus, ScanSearch, Trash2, Type, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getExportCost } from "@/config/credits";
import { VIDEO_FORMATS } from "@/config/formats";
import { format, t } from "@/lib/i18n";
import { beatGrid, totalDuration, TRANSITIONS, type Scene, type Transition } from "@/lib/projects/scenes";
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
  type TimelineEdit,
} from "@/lib/projects/timeline";
import { cn, formatTime } from "@/lib/utils";
import { DIMENSIONS, durationInFrames, FPS, type VideoProps } from "@/remotion/props";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { sceneTimeline } from "@/remotion/video/transitions";
import { FocusEditor } from "./focus-editor";
import { ScreensPicker } from "./screens-picker";
import { SceneTimeline } from "./scene-timeline";
import { ScenePresentationSelect } from "./scene-presentation-select";
import { Dialog } from "@/components/ui/dialog";
import { AnimatedApply } from "@/components/ui/animated-apply";

const e = t.app.editor;
const tl = e.timeline;

/** Délai sans nouvelle modification avant d'enregistrer (plusieurs clics sur + = une seule version). */
const COMMIT_DELAY_MS = 900;

export type TimelineEditing = {
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
export function Player({ videoProps, editing, className }: { videoProps: VideoProps; editing?: TimelineEditing; className?: string }) {
  const playerRef = useRef<PlayerRef>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [selectedId, setSelectedIdState] = useState<string | null>(editing?.initialSceneId ?? null);
  // Panneau ouvert sous la barre d'outils de la scène
  const [panel, setPanel] = useState<"text" | "focus" | "screens" | null>(null);
  const closeFocus = useCallback(() => setPanel(null), []);
  const [addOpen, setAddOpen] = useState(false);
  const [positioning, setPositioning] = useState(false);
  // Changer de scène ferme l'éditeur de texte
  const setSelectedId = (id: string | null) => {
    if (id !== selectedId) setPanel(null);
    setSelectedIdState(id);
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
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMute = (ev: { detail: { isMuted: boolean } }) => setMuted(ev.detail.isMuted);
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
  }, []);

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

  const seconds = totalDuration(graph);

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div
        data-text-preview
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-2xl border border-line-strong bg-black shadow-[0_30px_80px_-30px_var(--accent-glow)] sm:rounded-3xl",
          // Mobile : l'aperçu laisse de la place au chat ; desktop : il remplit la zone centrale
          ratio === "9:16" && "max-w-[calc(40dvh*9/16)] lg:max-w-[min(100%,calc((100dvh-21rem)*9/16))]",
          ratio === "1:1" && "max-w-[40dvh] lg:max-w-[min(100%,calc(100dvh-21rem))]",
          ratio === "16:9" && "lg:max-w-[min(100%,calc((100dvh-21rem)*16/9))]",
        )}
      >
        <TextEditingContext value={{ enabled: positioning && editable, onStart: (sceneId) => { playerRef.current?.pause(); setSelectedId(sceneId); }, onCommit: (sceneId, target, offset) => edit({ kind: "textPosition", sceneId, target, offset }) }}>
        <RemotionPlayer
          ref={playerRef}
          component={KinetikVideo}
          inputProps={props}
          durationInFrames={total}
          compositionWidth={width}
          compositionHeight={height}
          fps={FPS}
          initialFrame={Math.min(initialFrame, total - 1)}
          autoPlay
          loop
          initiallyMuted
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
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(ev) => playerRef.current?.toggle(ev)}
          aria-label={playing ? e.pause : e.play}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-bg transition-transform active:scale-90"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
        </button>
        <span className="w-20 shrink-0 font-mono text-xs text-muted tabular-nums">
          {formatTime(frame / FPS)} / {formatTime(total / FPS)}
        </span>

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

        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? e.unmute : e.mute}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:grid"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => playerRef.current?.requestFullscreen()}
          aria-label={e.fullscreen}
          className="hidden size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:grid"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      {/* Montage : barre d'outils de la scène sélectionnée (aussi utilisable au clavier et au doigt) */}
      {editing && (
        <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
          {selected ? (
            <div role="toolbar" aria-label={tl.selected} className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-line bg-surface p-1 pl-3 text-fg scrollbar-none sm:gap-1">
              <span className="mr-1 shrink-0 text-sm font-semibold whitespace-nowrap">{sceneLabel(selected.kind)}</span>
              <span className="mr-1 shrink-0 font-mono text-xs whitespace-nowrap text-muted tabular-nums sm:w-12">{formatSeconds(selected.duration)}</span>
              <ToolButton label={tl.shorter} disabled={!editable || selected.duration <= SCENE_MIN_SECONDS} onClick={() => edit({ kind: "duration", sceneId: selected.id, duration: selected.duration - DURATION_STEP })}>
                <Minus />
              </ToolButton>
              <ToolButton label={tl.longer} disabled={!editable || selected.duration >= SCENE_MAX_SECONDS} onClick={() => edit({ kind: "duration", sceneId: selected.id, duration: selected.duration + DURATION_STEP })}>
                <Plus />
              </ToolButton>
              <ToolButton label={hasEditableTitle(selected.kind) ? tl.editText : tl.logoText} disabled={!editable || !hasEditableTitle(selected.kind)} active={panel === "text"} onClick={() => { playerRef.current?.pause(); setPanel((v) => (v === "text" ? null : "text")); }}>
                <Type />
              </ToolButton>
              {selected.kind === "screens" && (
                <ToolButton
                  label={videoProps.screenUrls.length ? tl.focus : tl.focusNoScreens}
                  disabled={!editable || !videoProps.screenUrls.length}
                  active={panel === "focus" || Boolean(selected.focus)}
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
                      <span className="text-sm font-semibold text-fg">{sceneLabel(kind)}</span>
                      <span className="text-xs text-muted">{tl.kindHints[kind]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="ml-auto flex items-center gap-3 font-mono tabular-nums">
            {saving && <span className="animate-pulse text-accent-text">{tl.saving}</span>}
            <span>{format(tl.total, { duration: formatSeconds(seconds) })}</span>
            <span className="max-sm:hidden">· {format(tl.exportCost, { count: getExportCost({ duration: seconds, quality: "HD" }) })}</span>
          </span>
        </div>
      )}
      {editing && selected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface/60 p-3">
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
            {positioning ? "Terminer le placement" : "Déplacer les textes"}
          </button>
          {positioning && <span className="text-xs text-muted">Glisse un texte dans l’aperçu · flèches pour affiner</span>}
          {(["title", "subtitle"] as const).map((target) => selected.textOffsets?.[target] && (
            <button key={target} type="button" disabled={!editable} onClick={() => edit({ kind: "textPosition", sceneId: selected.id, target, offset: null })} className="min-h-9 cursor-pointer rounded-lg border border-line-strong bg-black px-3 text-xs text-white hover:bg-accent">
              {target === "title" ? "Replacer le titre" : "Replacer le sous-titre"}
            </button>
          ))}
          {editing.onAskScene && (
            <button type="button" disabled={!editable || drafts.length > 0} onClick={() => { playerRef.current?.pause(); editing.onAskScene?.(selected.id); }} className="min-h-9 cursor-pointer rounded-lg border border-line-strong bg-black px-3 py-2 text-xs font-medium text-white transition-colors hover:border-accent hover:bg-accent hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40">
              Modifier cette scène par chat
            </button>
          )}
          {selected.kind === "screens" && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-muted">Effet</span>
              <button
                type="button"
                aria-pressed={!selected.focus && panel !== "focus"}
                disabled={!editable}
                onClick={() => {
                  if (selected.focus) edit({ kind: "focus", sceneId: selected.id, focus: null });
                  setPanel(null);
                }}
                className={cn("min-h-9 cursor-pointer rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40", !selected.focus && panel !== "focus" ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-black text-white hover:border-accent")}
              >
                Mockup classique
              </button>
              <button
                type="button"
                aria-expanded={panel === "focus"}
                aria-pressed={Boolean(selected.focus) || panel === "focus"}
                disabled={!editable || !videoProps.screenUrls.length}
                onClick={() => { playerRef.current?.pause(); setPanel("focus"); }}
                className={cn("flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40", selected.focus || panel === "focus" ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-black text-white hover:border-accent")}
              >
                <ScanSearch className="size-3.5" aria-hidden />
                {selected.focus ? "Modifier le cadrage" : "Créer une découpe"}
              </button>
            </div>
          )}

        </div>
      )}
      {editing && selected && panel === "text" && (
        // La clé fait repartir le formulaire des textes de la scène sélectionnée
        <TextForm
          key={selected.id}
          scene={selected}
          disabled={!editable}
          onCancel={closeFocus}
          onApply={(title, subtitle) => {
            edit({ kind: "text", sceneId: selected.id, title, subtitle });
            setPanel(null);
          }}
        />
      )}
      {editing && selected?.kind === "screens" && panel === "screens" && (
        <ScreensPicker
          key={selected.id}
          screens={videoProps.screenUrls.map((url, i) => ({ url, ratio: videoProps.screenRatios?.[i] ?? null }))}
          value={selected.screens}
          disabled={!editable}
          onCancel={() => setPanel(null)}
          onApply={(screens) => {
            edit({ kind: "screens", sceneId: selected.id, screens });
            setPanel(null);
          }}
        />
      )}
      {editing && selected?.kind === "screens" && panel === "focus" && (
        <FocusEditor
          key={selected.id}
          screens={videoProps.screenUrls.map((url, i) => ({ url, ratio: videoProps.screenRatios?.[i] ?? null }))}
          value={selected.focus ?? null}
          disabled={!editable}
          onCancel={closeFocus}
          onApply={(focus) => {
            edit({ kind: "focus", sceneId: selected.id, focus });
            setPanel(null);
          }}
        />
      )}
    </div>
  );
}

/** Transition d'entrée de la scène : celles du template en premier. */
function TransitionSelect({ value, recommended, disabled, onChange }: { value: Transition; recommended: Transition[]; disabled: boolean; onChange: (t: Transition) => void }) {
  const others = TRANSITIONS.filter((t) => !recommended.includes(t));
  return (
    <span className="relative ml-0.5 shrink-0">
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
function TextForm({ scene, disabled, onApply, onCancel }: { scene: Scene; disabled: boolean; onApply: (title: string, subtitle: string | null) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(scene.title);
  const [subtitle, setSubtitle] = useState(scene.subtitle ?? "");
  const [applying, setApplying] = useState(false);
  const pendingText = useRef({ title, subtitle });
  const withSubtitle = SUBTITLE_KINDS.includes(scene.kind);
  const field = "h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] sm:text-sm";
  return (
    <Dialog open onClose={onCancel} title="Modifier le texte" description="Les modifications seront enregistrées après validation.">
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
        {tl.titleLabel}
        <input autoFocus disabled={disabled || applying} value={title} maxLength={TITLE_MAX} onChange={(ev) => setTitle(ev.target.value)} className={field} />
      </label>
      {withSubtitle && (
        <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
          {tl.subtitleLabel}
          <input disabled={disabled || applying} value={subtitle} maxLength={SUBTITLE_MAX} placeholder={tl.subtitlePlaceholder} onChange={(ev) => setSubtitle(ev.target.value)} className={field} />
        </label>
      )}
      <AnimatedApply submit disabled={disabled || !title.trim()} onApplyingChange={setApplying} onBegin={() => { pendingText.current = { title, subtitle }; }} onApply={() => onApply(pendingText.current.title, withSubtitle ? pendingText.current.subtitle : null)} onCancel={onCancel} />
    </form>
    </Dialog>
  );
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
        "grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4",
        danger && "hover:bg-danger/10 hover:text-danger",
        active && "bg-accent-soft text-accent-text",
      )}
    >
      {children}
    </button>
  );
}

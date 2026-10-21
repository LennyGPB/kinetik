"use client";

import { purpleButtonStyle } from "@/components/ui/button";


import { useDictionary } from "@/lib/i18n/use-dictionary";
import { format } from "@/lib/i18n";

import { QuickSettings } from "./quick-settings";
import type { QuickSetting } from "@/lib/projects/settings";
import { TextEditingContext } from "@/remotion/video/movable-text";

import { Player as RemotionPlayer, type PlayerRef } from "@remotion/player";
import { ALargeSmall, Check, ChevronRight, Copy, Images, Maximize2, MessageSquare, Minimize2, Minus, Move, Pause, Pencil, Play, Plus, RotateCcw, ScanSearch, Trash2, Type, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { VIDEO_FORMATS } from "@/config/formats";
import { stageShowsDevice } from "@/config/stage-motion";
import { beatGrid, HEADLINE_MAX, HEADLINES_MAX, HEADLINES_MIN, sceneFocuses, sceneHeadlines, sceneScreens, TRANSITIONS, type Scene, type Transition } from "@/lib/projects/scenes";
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
  BADGE_MAX,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  type TimelineEdit,
} from "@/lib/projects/timeline";
import { cn, formatTime } from "@/lib/utils";
import { DIMENSIONS, durationInFrames, FPS, type VideoProps } from "@/remotion/props";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { headlineDefaults } from "@/remotion/video/headlines";
import { sceneTimeline } from "@/remotion/video/transitions";
import { FocusSequenceEditor } from "./focus-sequence-editor";
import { TextEndBar } from "./text-end-bar";
import { TextColorPicker } from "./text-color-picker";
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
  /** Envoie une nouvelle capture et l'ajoute aux médias du projet. */
  onAddScreen?: (file: File) => Promise<{ url: string; ratio: number | null }>;
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
/** Boutons du bloc « Réglages avancés de cette scène » : même gabarit pour toutes les actions. */
const TOOL = "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-xs font-medium text-fg transition-colors hover:border-accent/60 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0";
/** Groupe du bloc : marge d'un écart (1,5 rem) et trait centré dans cet écart, sur sa gauche (desktop). */
const GROUP = "sm:relative sm:ml-6 sm:before:absolute sm:before:top-1/2 sm:before:-left-3 sm:before:h-6 sm:before:w-px sm:before:-translate-y-1/2 sm:before:bg-line";
const SEGMENT = "inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1 [&_svg]:size-3.5 [&_svg]:shrink-0";
const SEGMENT_ON = purpleButtonStyle;
const SEGMENT_OFF = "text-muted hover:text-fg";

export function Player({ videoProps, editing, variants, className, compact = false, preview = false, initiallyMuted = true, onMutedChange, initiallyPlaying = true, onPlayingChange }: { videoProps: VideoProps; editing?: TimelineEditing; variants?: { list: ProjectVariant[]; currentId: string; canCreate: boolean }; className?: string; compact?: boolean; preview?: boolean; initiallyMuted?: boolean; onMutedChange?: (muted: boolean) => void; initiallyPlaying?: boolean; onPlayingChange?: (playing: boolean) => void }) {
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
  const addMenuRef = useRef<HTMLDivElement>(null);
  // Menu « Ajouter une scène » : se ferme au clic en dehors (bouton compris dans la zone) ou avec Échap
  useEffect(() => {
    if (!addOpen) return;
    const onPointerDown = (event: PointerEvent) => { if (!addMenuRef.current?.contains(event.target as Node)) setAddOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setAddOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [addOpen]);
  const [positioning, setPositioning] = useState(false);
  // Réglage de la taille des textes : curseurs ouverts, et taille en cours de glissement (aperçu sans enregistrer)
  const [sizing, setSizing] = useState(false);
  const [scaleDraft, setScaleDraft] = useState<Extract<TimelineEdit, { kind: "textScale" }> | null>(null);
  const scaleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Toujours la dernière version de edit() (elle lit les modifications en attente) pour l'enregistrement différé de la taille
  const editRef = useRef<(change: TimelineEdit) => boolean>(() => false);
  // Mobile : outils + réglages avancés de la scène dans une seule feuille (desktop : barre et bloc sous la timeline)
  const [sceneSheet, setSceneSheet] = useState(false);
  // iPhone : pas d'API plein écran pour un élément de page → l'aperçu remplit l'écran en CSS
  const [screenFull, setScreenFull] = useState(false);
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
  /** Nouvelle scène en attente d'enregistrement tant que son formulaire de texte est ouvert. */
  const held = useRef<{ edits: TimelineEdit[]; focusSceneId: string | null } | null>(null);

  const previewEdits = scaleDraft ? [...drafts, scaleDraft] : drafts;
  const graph = previewEdits.length ? applyTimelineEdits(videoProps.graph, previewEdits) : videoProps.graph;
  const props = graph === videoProps.graph ? videoProps : { ...videoProps, graph };
  const total = durationInFrames(graph);
  const { width, height } = DIMENSIONS[videoProps.format];
  const ratio = VIDEO_FORMATS[videoProps.format].ratio;
  const narrow = ratio !== "16:9" && !compact;
  const timeline = sceneTimeline(graph.scenes, FPS, graph.bpm, beatGrid(graph).phase);
  // Après une modification, la lecture reprend au début de la scène sélectionnée
  const [initialFrame] = useState(() => timeline.find((s) => s.scene.id === editing?.initialSceneId)?.from ?? 0);
  const [frame, setFrame] = useState(initialFrame);
  const index = Math.max(0, timeline.findLastIndex((s) => s.from <= frame));
  const editable = Boolean(editing) && !editing?.disabled && !saving;
  const selected = graph.scenes.find((s) => s.id === selectedId) ?? null;
  const canChooseScreens = Boolean(selected && (selected.kind === "screens" || (videoProps.recipe.stage && stageShowsDevice(selected, Boolean(graph.logoLayout)))));

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

  useEffect(() => () => { clearTimeout(commitTimer.current); clearTimeout(scaleTimer.current); }, []);
  useEffect(() => {
    if (!screenFull) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setScreenFull(false);
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); };
  }, [screenFull]);
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) screen.orientation?.unlock?.(); };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

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

  /** Planifie l'enregistrement groupé des modifications en attente. */
  function scheduleCommit(next: TimelineEdit[], focusSceneId: string | null) {
    if (!editing) return;
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(async () => {
      setSaving(true);
      const ok = await editing.onCommit(next, focusSceneId);
      // Succès : le parent recharge le lecteur avec la nouvelle version. Échec : on revient à la version enregistrée.
      if (!ok) {
        setDrafts([]);
        setSaving(false);
      }
    }, COMMIT_DELAY_MS);
  }

  /** Ajoute une modification à l'aperçu et planifie l'enregistrement groupé. */
  function edit(change: TimelineEdit): boolean {
    if (!editing || !editable) return false;
    const next = [...drafts, change];
    setDrafts(next);
    if (change.kind === "delete") setSelectedId(null);
    const focusSceneId = change.kind === "delete" ? null : change.kind === "add" || change.kind === "duplicate" ? change.id : change.sceneId;
    held.current = null;
    // Nouvelle scène : on la sélectionne et on ouvre directement l'édition de son texte
    if (change.kind === "add" || change.kind === "duplicate") {
      setSelectedIdState(change.id);
      const withText = change.kind === "add" && hasEditableTitle(change.sceneKind);
      setPanel(withText ? "text" : null);
      // L'enregistrement recharge le lecteur et fermerait le formulaire : on attend qu'il soit refermé
      // (la scène et son texte partent alors ensemble, en une seule version).
      if (withText) {
        clearTimeout(commitTimer.current);
        held.current = { edits: next, focusSceneId };
        return true;
      }
    }
    scheduleCommit(next, focusSceneId);
    return true;
  }
  useEffect(() => { editRef.current = edit; });
  // Formulaire de la nouvelle scène refermé sans appliquer (Annuler, autre scène…) : la scène est quand même enregistrée.
  useEffect(() => {
    if (panel === "text" || !held.current) return;
    const { edits, focusSceneId } = held.current;
    held.current = null;
    scheduleCommit(edits, focusSceneId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reacts to the form closing
  }, [panel]);

  /**
   * Curseur de taille : l'aperçu suit le glissement, et la taille est enregistrée une fois le curseur immobile
   * (sans dépendre du relâchement de la souris, que le navigateur ne signale pas toujours au curseur).
   */
  function previewScale(change: Extract<TimelineEdit, { kind: "textScale" }>, saved: number) {
    setScaleDraft(change);
    clearTimeout(scaleTimer.current);
    scaleTimer.current = setTimeout(() => {
      // Refusé (enregistrement en cours…) : on garde l'aperçu et on réessaie un peu plus tard
      if ((change.scale ?? 1) === saved || editRef.current(change)) setScaleDraft(null);
      else previewScale(change, saved);
    }, 450);
  }


  // Réglages avancés de la scène : même contenu dans le bloc desktop et dans la feuille mobile
  const cutout = Boolean(selected && (sceneFocuses(selected).length > 0 || panel === "focus"));
  const noScreens = !videoProps.screenUrls.length;
  // Effet des captures : mockup classique OU découpe (cadrages). Segment actif = effet en place ;
  // recliquer dessus ouvre ses réglages (captures du mockup, ou cadrages de la découpe).
  const effectToggle = editing && selected?.kind === "screens" ? (
    <div role="group" aria-label={t.copy["27a2555e059e"]} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/70 p-1 max-sm:flex-1">
      <button
        type="button"
        aria-pressed={!cutout}
        aria-haspopup={!cutout ? "dialog" : undefined}
        disabled={!editable || (!cutout && noScreens)}
        title={!cutout && noScreens ? tl.screensNone : undefined}
        onClick={() => {
          if (cutout) {
            if (sceneFocuses(selected).length) edit({ kind: "focus", sceneId: selected.id, focus: null });
            setPanel(null);
          } else {
            playerRef.current?.pause();
            setPanel("screens");
          }
        }}
        className={cn(SEGMENT, !cutout ? SEGMENT_ON : SEGMENT_OFF)}
      >
        <Pencil aria-hidden />
        {cutout ? t.copy["23ab12dc12fd"] : tl.editMockup}
      </button>
      <button
        type="button"
        aria-pressed={cutout}
        aria-haspopup="dialog"
        disabled={!editable || noScreens}
        onClick={() => { playerRef.current?.pause(); setPanel("focus"); }}
        className={cn(SEGMENT, cutout ? SEGMENT_ON : SEGMENT_OFF)}
      >
        <ScanSearch aria-hidden />
        {sceneFocuses(selected).length ? t.copy["c6e8135881b1"] : t.copy["96f130bf318b"]}
      </button>
    </div>
  ) : null;

  const advanced = editing && selected ? (
        // Chaque groupe porte un trait à sa gauche ; décalé d'un écart vers la gauche dans une boîte qui coupe ce qui dépasse,
        // le trait du premier groupe de chaque ligne est masqué : il n'apparaît qu'entre deux groupes d'une même ligne.
        <div className="sm:-my-1 sm:overflow-hidden sm:py-1">
        <div className="flex flex-col gap-3 lg:-ml-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-0 lg:gap-y-3">
          <div className={GROUP}>
            <ScenePresentationSelect scene={selected} videoProps={videoProps} disabled={!editable} onChange={edit} />
          </div>
          {/* Mobile (feuille de la scène) : le choix de l'effet ici ; desktop : à droite de la ligne de la scène */}
          {effectToggle && (
            <div className={cn(GROUP, "flex items-center gap-2.5 lg:hidden")}>
              <span className="text-xs text-muted">{t.copy["27a2555e059e"]}</span>
              {effectToggle}
            </div>
          )}
          {/* Textes : placement à la main dans l'aperçu, puis retour à la position du template */}
          <div className={cn(GROUP, "flex flex-wrap items-center gap-2")}>
            <button type="button" disabled={!editable} aria-pressed={positioning} onClick={() => {
              const next = !positioning;
              setPositioning(next);
              playerRef.current?.pause();
              if (next) {
                const timing = timeline.find((item) => item.scene.id === selected.id);
                if (timing) seek(timing.from + Math.min(Math.round(FPS * 0.8), Math.floor(selected.duration * FPS * 0.6)));
              }
            }} className={cn(TOOL, positioning && purpleButtonStyle)}>
              {positioning ? <Check aria-hidden /> : <Move aria-hidden />}
              {positioning ? t.copy["5613f09a3b54"] : t.copy["f8a325b0b137"]}
            </button>
            {(["title", "subtitle"] as const).map((target) => selected.textOffsets?.[target] && (
              <button key={target} type="button" disabled={!editable} onClick={() => edit({ kind: "textPosition", sceneId: selected.id, target, offset: null })} className={TOOL}>
                <RotateCcw aria-hidden />
                {target === "title" ? t.copy["b711766805b2"] : t.copy["a9cee89d1dca"]}
              </button>
            ))}
            {positioning && <span className="text-xs text-muted">{t.copy["8ab456b730b6"]}</span>}
            <button type="button" disabled={!editable} aria-pressed={sizing} aria-expanded={sizing} onClick={() => {
              const next = !sizing;
              setSizing(next);
              playerRef.current?.pause();
              if (next) {
                const timing = timeline.find((item) => item.scene.id === selected.id);
                if (timing) seek(timing.from + Math.min(Math.round(FPS * 0.8), Math.floor(selected.duration * FPS * 0.6)));
              }
            }} className={cn(TOOL, sizing && purpleButtonStyle)}>
              {sizing ? <Check aria-hidden /> : <ALargeSmall aria-hidden />}
              {sizing ? tl.textSizeDone : tl.textSize}
            </button>
          </div>
          {sizing && (
            <div className={cn(GROUP, "flex flex-wrap items-center gap-x-5 gap-y-2")}>
              {(["title", "subtitle"] as const).filter((target) => target === "title" || (SUBTITLE_KINDS.includes(selected.kind) && selected.subtitle)).map((target) => {
                const saved = selected.textScales?.[target] ?? 1;
                const value = scaleDraft?.sceneId === selected.id && scaleDraft.target === target ? scaleDraft.scale ?? 1 : saved;
                return (
                  <label key={target} className="flex items-center gap-2 text-xs text-muted">
                    <span className="shrink-0">{target === "title" ? tl.titleLabel : tl.subtitleLabel}</span>
                    <input
                      type="range"
                      min={TEXT_SCALE_MIN * 100}
                      max={TEXT_SCALE_MAX * 100}
                      step={5}
                      value={Math.round(value * 100)}
                      disabled={!editable}
                      onChange={(ev) => previewScale({ kind: "textScale", sceneId: selected.id, target, scale: Number(ev.target.value) / 100 }, saved)}
                      className="w-28 cursor-pointer accent-[var(--accent)] sm:w-36"
                    />
                    <span className="w-10 text-right font-mono tabular-nums text-fg">{Math.round(value * 100)} %</span>
                    {saved !== 1 && (
                      <button type="button" disabled={!editable} title={tl.textSizeReset} aria-label={tl.textSizeReset} onClick={() => edit({ kind: "textScale", sceneId: selected.id, target, scale: null })} className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg">
                        <RotateCcw className="size-3.5" />
                      </button>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          {editing.onAskScene && (
            <div className={cn(GROUP, "max-lg:hidden")}>
              <button type="button" disabled={!editable || drafts.length > 0} onClick={() => { playerRef.current?.pause(); editing.onAskScene?.(selected.id); }} className={TOOL}>
                <MessageSquare aria-hidden />
                {t.copy["c7b2ac7f9b71"]}
              </button>
            </div>
          )}

        </div>
        </div>
  ) : null;

  const enterFullscreen = () => {
    if (!document.fullscreenEnabled) return setScreenFull(true);
    playerRef.current?.requestFullscreen();
    // Vidéo horizontale : bascule en paysage là où c'est permis (Android, en plein écran uniquement)
    if (ratio === "16:9") (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape").catch(() => {});
  };

  return (
    <div className={cn("flex min-w-0 w-full flex-col gap-3", className)}>
      {/* Mobile, vidéo étroite (9:16, 1:1) : formats en colonne à droite de l'aperçu plutôt que par-dessus */}
      <div className="flex items-center justify-center gap-2">
      <div
        data-text-preview
        className={screenFull ? "fixed inset-0 z-[100] flex items-center justify-center bg-black" : cn(
          "relative mx-auto w-full overflow-hidden rounded-2xl border border-line-strong bg-black shadow-[0_30px_80px_-30px_var(--accent-glow)] sm:rounded-3xl",
          // Mobile : aussi grand que la hauteur libre le permet (barres, timeline et réglages + bouton flottant ≈ 27rem) ; desktop : il remplit la zone centrale
          ratio === "9:16" && (compact ? "max-w-[calc(26dvh*9/16)]" : "max-w-[calc((100dvh-27rem)*9/16)]"),
          ratio === "9:16" && "lg:max-w-[min(100%,calc((100dvh-21rem)*9/16))]",
          ratio === "1:1" && (compact ? "max-w-[26dvh]" : "max-w-[calc(100dvh-27rem)]"),
          ratio === "1:1" && "lg:max-w-[min(100%,calc(100dvh-21rem))]",
          ratio === "16:9" && compact && "max-w-[calc(26dvh*16/9)]",
          // Mobile 16:9 : limité par la largeur, l'aperçu passe bord à bord (annule la marge de l'éditeur : 0,75rem, 1,5rem dès sm)
          ratio === "16:9" && !compact && !preview && "max-lg:-mx-3 max-lg:w-[calc(100%+1.5rem)] max-lg:max-w-none max-lg:rounded-none max-lg:border-x-0 sm:max-lg:-mx-6 sm:max-lg:w-[calc(100%+3rem)]",
          ratio === "16:9" && "lg:max-w-[min(100%,calc((100dvh-21rem)*16/9))]",
          // Formats en colonne à côté : l'ensemble aperçu + colonne est centré, pas l'aperçu seul
          narrow && variants && "max-lg:mx-0",
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
          style={{ width: screenFull ? `min(100vw, calc(100dvh * ${width} / ${height}))` : "100%", aspectRatio: `${width} / ${height}` }}
        />
        </TextEditingContext>
        {positioning && <div aria-hidden className="pointer-events-none absolute inset-0"><div className="absolute inset-y-0 left-1/2 border-l border-dashed border-white/35" /><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/35" /></div>}
        <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur">
          {index + 1}/{graph.scenes.length} · {preview ? sceneLabel(graph.scenes[index].kind, t.locale) : graph.scenes[index]?.kind}
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
          <span className="pointer-events-none rounded-full bg-black/45 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap text-white/85 tabular-nums backdrop-blur">
            {formatTime(frame / FPS)} / {formatTime(total / FPS)}
          </span>
          {variants && <div className={cn("pointer-events-auto", narrow && !screenFull && "max-lg:hidden")}><VariantSwitcher variants={variants.list} currentId={variants.currentId} canCreate={variants.canCreate} /></div>}
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
            onClick={() => (screenFull ? setScreenFull(false) : enterFullscreen())}
            aria-label={screenFull ? t.common.close : e.fullscreen}
            className="grid size-8 place-items-center rounded-full bg-black/45 text-white/85 backdrop-blur transition-colors hover:bg-black/65 hover:text-white focus-visible:outline-2 focus-visible:outline-accent"
          >
            {screenFull ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
        </div>
      </div>
      {variants && narrow && !screenFull && (
        <div className="shrink-0 lg:hidden">
          <VariantSwitcher column variants={variants.list} currentId={variants.currentId} canCreate={variants.canCreate} />
        </div>
      )}
      </div>

      {/* Contrôles */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(ev) => playerRef.current?.toggle(ev)}
          aria-label={playing ? e.pause : e.play}
          // En édition, la barre de lecture (h-3 + gap-1) surmonte les scènes : on recentre le bouton sur les scènes
          className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-fg text-bg transition-transform active:scale-90 max-lg:size-12", editable && "mt-4")}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
        </button>
        <SceneTimeline
          graph={graph}
          frame={frame}
          total={total}
          onSeek={seek}
          editable={editable}
          preview={preview}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={edit}
        />
      </div>

      {/* Montage : barre d'outils de la scène sélectionnée (aussi utilisable au clavier et au doigt) */}
      {editing && (
        <div className={cn("flex min-h-10 flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted", compact && "max-lg:hidden")}>
          {selected ? (
            <>
            <div className="flex w-full items-center gap-1 lg:hidden">
              <button type="button" onClick={() => setSceneSheet(true)} aria-haspopup="dialog" className="group flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-3 text-left text-fg shadow-sm transition-[background-color,border-color,transform] hover:border-accent hover:bg-accent/15 active:scale-[0.98] active:bg-accent/20">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg"><Pencil className="size-4" aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{sceneLabel(selected.kind, t.locale)}</span><span className="mt-0.5 block text-xs text-muted tabular-nums">{formatSeconds(selected.duration, t.locale)}</span></span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-text">{tl.sceneSheet} <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
              </button>
            </div>
            <div role="toolbar" aria-label={tl.selected} className="max-lg:hidden flex w-full flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface p-1.5 pl-3 text-fg sm:w-auto sm:max-w-full sm:flex-nowrap sm:gap-1 sm:overflow-x-auto sm:rounded-full sm:p-1 sm:pl-3 sm:scrollbar-none">
              <span className="mr-1 shrink-0 text-sm font-semibold whitespace-nowrap">{sceneLabel(selected.kind, t.locale)}</span>
              <span className="mr-1 shrink-0 font-mono text-xs whitespace-nowrap text-muted tabular-nums sm:w-12">{formatSeconds(selected.duration, t.locale)}</span>
              {/* Mobile : fermer reste en haut à droite, les outils passent sur la ligne suivante */}
              <div className="ml-auto sm:hidden">
                <ToolButton label={tl.deselect} onClick={() => setSelectedId(null)}>
                  <X />
                </ToolButton>
              </div>
              <div className="flex w-full flex-wrap items-center gap-1 sm:contents">
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
              {canChooseScreens && (
                <ToolButton
                  label={videoProps.screenUrls.length ? selected.kind === "screens" ? tl.screensPick : tl.mockupScreenPick : tl.screensNone}
                  disabled={!editable || !videoProps.screenUrls.length}
                  active={panel === "screens" || Boolean(selected.screens?.length)}
                  onClick={() => setPanel((v) => (v === "screens" ? null : "screens"))}
                >
                  <Images />
                </ToolButton>
              )}
              <span className="mx-0.5 h-5 w-px bg-line max-sm:hidden" />
              <TransitionSelect value={selected.transition} recommended={videoProps.recipe.transitions} disabled={!editable} onChange={(transition) => edit({ kind: "transition", sceneId: selected.id, transition })} />
              <span className="mx-0.5 h-5 w-px bg-line max-sm:hidden" />
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
              </div>
              <div className="max-sm:hidden">
                <ToolButton label={tl.deselect} onClick={() => setSelectedId(null)}>
                  <X />
                </ToolButton>
              </div>
            </div>
            </>
          ) : (
            <span className="max-sm:hidden">{tl.hint}</span>
          )}
          {/* Mobile : bouton flottant en bas à droite, menu ouvert vers le haut */}
          <div ref={addMenuRef} className="relative max-lg:fixed max-lg:right-4 max-lg:bottom-[calc(max(1rem,env(safe-area-inset-bottom))+0.75rem)] max-lg:z-40">
            <button
              type="button"
              disabled={!editable || graph.scenes.length >= MAX_SCENES}
              onClick={() => setAddOpen((v) => !v)}
              aria-expanded={addOpen}
              title={graph.scenes.length >= MAX_SCENES ? tl.maxScenes : selected ? tl.addAfter : tl.addAtEnd}
              className={cn(purpleButtonStyle, "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 max-lg:h-10 max-lg:px-3.5 lg:border-dashed lg:border-line-strong lg:bg-none lg:bg-transparent lg:text-fg lg:shadow-none lg:hover:border-accent lg:hover:text-accent-text lg:hover:shadow-none")}
            >
              <Plus className="size-4" /> {tl.add}
            </button>
            {addOpen && (
              <ul role="menu" className="absolute bottom-full left-0 z-30 mb-2 w-60 max-lg:right-0 max-lg:left-auto overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-[var(--shadow-lift)]">
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
          {effectToggle && (
            <div className="ml-auto flex items-center gap-2.5 max-lg:hidden">
              <span className="text-xs text-muted">{t.copy["27a2555e059e"]}</span>
              {effectToggle}
            </div>
          )}
          <span className={cn("flex items-center gap-3 font-mono tabular-nums", effectToggle ? "max-lg:ml-auto" : "ml-auto")}>
            {saving && <span className="animate-pulse text-accent-text">{tl.saving}</span>}
          </span>
        </div>
      )}
      {editing && selected && (
          <>
            {/* Desktop : réglages de la scène posés directement sous la frise (mobile : feuille « Réglages de la scène ») */}
            <div key={selected.id} className="max-lg:hidden">{advanced}</div>
            <Dialog open={sceneSheet} onClose={() => setSceneSheet(false)} title={tl.sceneSheet} headerAction={<button type="button" aria-label={tl.remove} title={tl.remove} disabled={!editable || graph.scenes.length <= MIN_SCENES} onClick={() => { edit({ kind: "delete", sceneId: selected.id }); setSceneSheet(false); }} className="-mt-1 grid size-11 place-items-center rounded-full text-red-500 hover:bg-red-500/10 disabled:opacity-30"><Trash2 className="size-4" /></button>} description={`${sceneLabel(selected.kind, t.locale)} · ${formatSeconds(selected.duration, t.locale)}`}>
              {/* Un bouton agit sur l'aperçu (texte, mockup, déplacer…) : la feuille se referme pour le laisser voir.
                  Exceptions marquées data-keep-open (durée) ; les listes déroulantes ne la ferment pas. */}
              <div className="flex flex-col gap-5" onClickCapture={(event) => {
                const button = (event.target as HTMLElement).closest("button");
                if (button && !button.closest("[data-keep-open]")) setSceneSheet(false);
              }}>
                <div className="flex items-center justify-between gap-3" data-keep-open>
                  <span className="text-sm text-muted">{tl.durationLabel}</span>
                  <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
                    <ToolButton label={tl.shorter} disabled={!editable || selected.duration <= SCENE_MIN_SECONDS} onClick={() => edit({ kind: "duration", sceneId: selected.id, duration: selected.duration - DURATION_STEP })}><Minus /></ToolButton>
                    <span className="w-14 text-center font-mono text-sm tabular-nums">{formatSeconds(selected.duration, t.locale)}</span>
                    <ToolButton label={tl.longer} disabled={!editable || selected.duration >= SCENE_MAX_SECONDS} onClick={() => edit({ kind: "duration", sceneId: selected.id, duration: selected.duration + DURATION_STEP })}><Plus /></ToolButton>
                  </div>
                </div>
                {editing.onAskScene && <button type="button" disabled={!editable || drafts.length > 0} onClick={() => { playerRef.current?.pause(); editing.onAskScene?.(selected.id); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent-soft px-4 text-sm font-semibold text-accent-text disabled:opacity-40"><MessageSquare className="size-4" />{t.copy["c7b2ac7f9b71"]}</button>}
                <div className="grid grid-cols-2 gap-2">
                  <SheetAction icon={<Type />} label={selected.kind === "logo" ? t.copy["61918df1ac56"] : tl.editText} disabled={!editable} onClick={() => {
                    playerRef.current?.pause();
                    const next = selected.kind === "logo" ? "logo" : "text";
                    const timing = timeline.find((item) => item.scene.id === selected.id);
                    if (next === "text" && timing) seek(timing.from + Math.min(Math.round(FPS * 0.8), Math.floor(selected.duration * FPS * 0.6)));
                    setPanel(next);
                  }} />
                  {canChooseScreens && <SheetAction icon={<Images />} label={selected.kind === "screens" ? tl.screensPick : tl.mockupScreenPick} disabled={!editable || !videoProps.screenUrls.length} onClick={() => setPanel("screens")} />}
                  {selected.kind === "screens" && <SheetAction icon={<ScanSearch />} label={tl.focus} disabled={!editable || !videoProps.screenUrls.length} onClick={() => { playerRef.current?.pause(); setPanel("focus"); }} />}
                  <SheetAction icon={<Copy />} label={tl.duplicate} disabled={!editable || graph.scenes.length >= MAX_SCENES} onClick={() => edit({ kind: "duplicate", sceneId: selected.id, id: newSceneId(selected.kind) })} />
                </div>
                <TransitionSelect wide value={selected.transition} recommended={videoProps.recipe.transitions} disabled={!editable} onChange={(transition) => edit({ kind: "transition", sceneId: selected.id, transition })} />
                <div className="border-t border-line pt-4">
                  <p className="mb-3 text-xs font-semibold tracking-wide text-subtle uppercase">{tl.advancedSection}</p>
                  {advanced}
                </div>
              </div>
            </Dialog>
          </>
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
          badgeAuto={selected.kind === "cta" ? videoProps.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? videoProps.appName : undefined}
          headlineColors={selected.kind === "headlines" ? headlineDefaults(videoProps.palette) : undefined}
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
      {editing && selected && canChooseScreens && panel === "screens" && (
        <Dialog open onClose={() => setPanel(null)} title={tl.editMockup}>
          <ScreensPicker
            key={selected.id}
            screens={videoProps.screenUrls.map((url, i) => ({ url, ratio: videoProps.screenRatios?.[i] ?? null }))}
            value={selected.screens}
            maxCount={selected.kind === "screens" ? 3 : 1}
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
          onAddScreen={editing.onAddScreen}
          sceneTitle={selected.title}
          titleColor={selected.textColors?.title ?? defaultColors[`${selected.id}:title`] ?? null}
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
/** `wide` : version pleine largeur de la feuille mobile (étiquette à gauche, sélecteur à droite). */
function TransitionSelect({ value, recommended, disabled, onChange, wide = false }: { value: Transition; recommended: Transition[]; disabled: boolean; onChange: (t: Transition) => void; wide?: boolean }) {
  const t = useDictionary();

  const e = t.app.editor;
  const tl = e.timeline;

  const others = TRANSITIONS.filter((t) => !recommended.includes(t));
  return (
    <span className={cn("relative flex shrink-0 items-center gap-1.5", wide ? "w-full justify-between gap-3" : "ml-0.5")}>
    <span aria-hidden className={cn("font-medium text-muted", wide ? "text-sm font-normal" : "text-[11px]")}>{wide ? tl.transition : tl.transitionShort}</span>
    <select
      aria-label={tl.transition}
      title={tl.transition}
      value={value}
      disabled={disabled}
      onChange={(ev) => onChange(ev.target.value as Transition)}
      className={cn("appearance-none truncate rounded-full border border-line bg-bg pr-7 pl-2.5 font-medium text-fg outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-40", wide ? "h-11 w-44 text-sm" : "h-9 max-w-36 text-xs sm:h-8")}
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
    <ChevronRight aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 rotate-90 text-muted" />
    </span>
  );
}

/** Édition du titre (et du sous-titre quand la scène en affiche un). */
type TextColors = Record<"title" | "subtitle" | "kicker", string | null>;
type TextEnds = Record<"title" | "subtitle" | "kicker", number>;
type TextChange = { title: string; subtitle: string | null; colors: Partial<TextColors>; ends: Partial<TextEnds>; kicker?: string | null; badge?: string | null; lines?: string[]; lineColors?: (string | null)[] };

/**
 * Textes de la scène et leur couleur. `kicker` : surtitre affiché par cette scène (scène feature classique),
 * avec sa valeur par défaut (nom de l'app) et sa couleur de template ; absent = pas de surtitre.
 */
function TextForm({ scene, defaultColors, headlineColors, badgeAuto, kicker: kickerDefaults, disabled, onApply, onCancel }: {
  scene: Scene;
  /** Scènes cta : texte automatique du bouton (site, sinon nom de l'app) */
  badgeAuto?: string;
  /** Scènes headlines : couleurs par défaut des titres (texte, et mise en avant du dernier) */
  headlineColors?: { ink: string; highlight: string | null };
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
  // Titres enchaînés : la liste complète (le premier est le titre de la scène)
  const isHeadlines = scene.kind === "headlines";
  const [headlines, setHeadlines] = useState<{ text: string; color: string | null }[]>(() => {
    const list = sceneHeadlines(scene).map((text, i) => ({ text, color: scene.lineColors?.[i] ?? null }));
    return list.length >= HEADLINES_MIN ? list : [...list, ...Array.from({ length: HEADLINES_MIN - list.length }, () => ({ text: "", color: null }))];
  });
  const filled = headlines.filter((item) => item.text.trim());
  const [subtitle, setSubtitle] = useState(scene.subtitle ?? "");
  const [kicker, setKicker] = useState(scene.kicker ?? kickerDefaults?.appName ?? "");
  const withBadge = badgeAuto !== undefined;
  const [badge, setBadge] = useState(scene.badge ?? badgeAuto ?? "");
  const [colors, setColors] = useState<TextColors>({ title: scene.textColors?.title ?? null, subtitle: scene.textColors?.subtitle ?? null, kicker: scene.textColors?.kicker ?? null });
  const [ends, setEnds] = useState<TextEnds>({ title: scene.textEnds?.title ?? 1, subtitle: scene.textEnds?.subtitle ?? 1, kicker: scene.textEnds?.kicker ?? 1 });
  const [applying, setApplying] = useState(false);
  const pending = useRef<TextChange>({ title, subtitle, colors, ends });
  const withSubtitle = SUBTITLE_KINDS.includes(scene.kind);
  const colorPicker = (target: keyof TextColors) => (
    <TextColorPicker value={colors[target]} fallback={target === "kicker" ? kickerDefaults?.color ?? null : defaultColors[target]} disabled={disabled || applying} onChange={(color) => setColors((c) => ({ ...c, [target]: color }))} />
  );
  // Ce qui est envoyé : seulement les textes que la scène affiche ; le surtitre égal au nom de l'app reste « par défaut »
  const change = (): TextChange => ({
    title: isHeadlines ? filled[0]?.text.trim() ?? "" : title,
    ...(isHeadlines && { lines: filled.slice(1).map((item) => item.text.trim()), lineColors: filled.map((item) => item.color) }),
    subtitle: withSubtitle ? subtitle : null,
    colors: { title: colors.title, ...(withSubtitle && { subtitle: colors.subtitle }), ...(kickerDefaults && { kicker: colors.kicker }) },
    ends: { title: ends.title, ...(withSubtitle && { subtitle: ends.subtitle }), ...(kickerDefaults && { kicker: ends.kicker }) },
    ...(kickerDefaults && { kicker: kicker.trim() === kickerDefaults.appName ? null : kicker.trim() }),
    // Bouton : le texte automatique reste « par défaut » (il suivra un changement d'adresse du site)
    ...(withBadge && { badge: badge.trim() === badgeAuto ? null : badge.trim() }),
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
        <div className="flex flex-col gap-2">
        <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
          {tl.kickerLabel}
          <span className="flex items-center gap-2">
            <input disabled={disabled || applying} value={kicker} maxLength={KICKER_MAX} placeholder={tl.kickerHidden} onChange={(ev) => setKicker(ev.target.value)} className={field} />
            {colorPicker("kicker")}
          </span>
          <span className="font-normal text-subtle">{tl.kickerHint}</span>
        </label>
        <TextEndBar value={ends.kicker} duration={scene.duration} disabled={disabled || applying} onChange={(end) => setEnds((e) => ({ ...e, kicker: end }))} />
        </div>
      )}
      {isHeadlines ? (
        <div className="flex flex-col gap-2">
          {headlines.map((line, i) => (
            <label key={i} className="flex flex-col gap-1 text-[11px] font-medium text-muted">
              {format(tl.headlineLabel, { n: i + 1 })}
              <span className="flex items-center gap-2">
                <input autoFocus={i === 0} disabled={disabled || applying} value={line.text} maxLength={HEADLINE_MAX} onChange={(ev) => setHeadlines((list) => list.map((item, j) => (j === i ? { ...item, text: ev.target.value } : item)))} className={field} />
                <TextColorPicker
                  value={line.color}
                  // Couleur actuelle : le dernier titre est mis en avant (accent lisible), les autres prennent celle du texte
                  fallback={headlineColors ? (i === headlines.length - 1 && headlines.length > 1 ? headlineColors.highlight ?? headlineColors.ink : headlineColors.ink) : null}
                  disabled={disabled || applying}
                  onChange={(color) => setHeadlines((list) => list.map((item, j) => (j === i ? { ...item, color } : item)))}
                />
                {i === 0 ? <span aria-hidden className="size-10 shrink-0" /> : (
                  <button type="button" disabled={disabled || applying || headlines.length <= HEADLINES_MIN} title={tl.headlineRemove} aria-label={tl.headlineRemove} onClick={() => setHeadlines((list) => list.filter((_, j) => j !== i))} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30">
                    <X className="size-4" />
                  </button>
                )}
              </span>
            </label>
          ))}
          {headlines.length < HEADLINES_MAX && (
            <button type="button" disabled={disabled || applying} onClick={() => setHeadlines((list) => [...list, { text: "", color: null }])} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-sm text-muted hover:border-accent hover:text-fg">
              <Plus className="size-4" />{tl.headlineAdd}
            </button>
          )}
          <span className="text-[11px] text-subtle">{tl.headlinesHint}</span>
          <TextEndBar value={ends.title} duration={scene.duration} disabled={disabled || applying} onChange={(end) => setEnds((e) => ({ ...e, title: end }))} />
        </div>
      ) : (
      <div className="flex flex-col gap-2">
      <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
        {scene.kind === "stat" ? tl.statTitleLabel : scene.kind === "quote" ? tl.quoteTitleLabel : tl.titleLabel}
        <span className="flex items-center gap-2">
          <input autoFocus disabled={disabled || applying} value={title} maxLength={TITLE_MAX} onChange={(ev) => setTitle(ev.target.value)} className={field} />
          {colorPicker("title")}
        </span>
      </label>
      <TextEndBar value={ends.title} duration={scene.duration} disabled={disabled || applying} onChange={(end) => setEnds((e) => ({ ...e, title: end }))} />
      </div>
      )}
      {withSubtitle && (
        <div className="flex flex-col gap-2">
        <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
          {scene.kind === "stat" ? tl.statSubtitleLabel : scene.kind === "quote" ? tl.quoteSubtitleLabel : tl.subtitleLabel}
          <span className="flex items-center gap-2">
            <input disabled={disabled || applying} value={subtitle} maxLength={SUBTITLE_MAX} placeholder={tl.subtitlePlaceholder} onChange={(ev) => setSubtitle(ev.target.value)} className={field} />
            {colorPicker("subtitle")}
          </span>
        </label>
        <TextEndBar value={ends.subtitle} duration={scene.duration} disabled={disabled || applying} onChange={(end) => setEnds((e) => ({ ...e, subtitle: end }))} />
        </div>
      )}
      {withBadge && (
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          {tl.badgeLabel}
          <input disabled={disabled || applying} value={badge} maxLength={BADGE_MAX} placeholder={tl.badgeHidden} onChange={(ev) => setBadge(ev.target.value)} className={field} />
          <span className="font-normal text-subtle">{tl.badgeHint}</span>
        </label>
      )}
      <AnimatedApply submit disabled={disabled || (isHeadlines ? filled.length < HEADLINES_MIN : !title.trim())} onApplyingChange={setApplying} onBegin={() => { pending.current = change(); }} onApply={() => onApply(pending.current)} onCancel={onCancel} />
    </form>
    </Dialog>
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

/** Action de la feuille mobile « Modifier la scène » : icône + libellé, grande cible tactile. */
function SheetAction({ icon, label, onClick, disabled, danger }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn(
      "flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left text-sm font-medium text-fg transition-colors hover:border-line-strong disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
      danger && "text-danger hover:border-danger/40",
    )}>
      {icon}<span className="min-w-0 leading-tight">{label}</span>
    </button>
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

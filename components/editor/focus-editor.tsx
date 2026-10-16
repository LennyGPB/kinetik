"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { SquareDashedMousePointer, Trash2, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";

import { FOCUS_ANIMATIONS, FOCUS_MODES, type ScreenFocus } from "@/lib/projects/scenes";
import { TITLE_MAX } from "@/lib/projects/timeline";
import { cn } from "@/lib/utils";

type Rect = { x: number; y: number; w: number; h: number };

/** Taille minimale d'un cadre tracé (fraction de l'image) : en dessous, on considère que c'est un simple clic. */
const MIN_SIZE = 0.03;

const INPUT = "h-10 w-full rounded-xl border border-line-strong bg-bg px-3 text-base text-fg outline-none focus:border-accent sm:text-sm";

/**
 * Choix de la zone à mettre en avant : un screen, un cadre tracé dessus, le mode (zoom / découpe) et une légende.
 * Les coordonnées sont en fractions de l'image (0 → 1), comme dans le SceneGraph.
 * Trois colonnes numérotées sur desktop (screen · zone · réglages), empilées sur mobile.
 */
export function FocusEditor({
  screens,
  value,
  defaultSrc,
  sceneTitle,
  disabled,
  onApply,
  onCancel,
  onClose = onCancel,
}: {
  screens: { url: string; ratio: number | null }[];
  value: ScreenFocus | null;
  defaultSrc?: string;
  sceneTitle: string;
  disabled: boolean;
  onApply: (focus: ScreenFocus | null) => void;
  onCancel: () => void;
  /** Croix, Échap ou clic hors de la modale : par défaut comme Annuler. */
  onClose?: () => void;
}) {
  const t = useDictionary();

  const tl = t.app.editor.timeline;

  const known = (url?: string) => (url && screens.some((s) => s.url === url) ? url : undefined);
  const [src, setSrc] = useState(known(value?.src) ?? known(defaultSrc) ?? screens[0]?.url);
  const [rect, setRect] = useState<Rect | null>(value ? { x: value.x, y: value.y, w: value.w, h: value.h } : null);
  const [mode, setMode] = useState<ScreenFocus["mode"]>(value?.mode ?? "popout");
  const [label, setLabel] = useState(value?.label ?? "");
  const [title, setTitle] = useState(value?.title ?? "");
  const [animation, setAnimation] = useState<NonNullable<ScreenFocus["animation"]>>(value?.animation ?? "lift");
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [removing, setRemoving] = useState(false);
  const [applying, setApplying] = useState(false);
  const pendingFocus = useRef<ScreenFocus | null>(null);
  const locked = disabled || applying;
  const imageRef = useRef<HTMLDivElement>(null);
  const ratio = screens.find((s) => s.url === src)?.ratio ?? 9 / 19.5;

  // Taille de la zone de tracé : à 100 % l'image y tient entière, le zoom l'agrandit (on défile alors dedans)
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setCanvas({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const fitHeight = canvas ? Math.min(canvas.h, canvas.w / ratio) : 0;

  function point(ev: React.PointerEvent) {
    const box = imageRef.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width)), y: Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height)) };
  }

  function update(ev: React.PointerEvent) {
    if (!drag) return;
    const p = point(ev);
    setRect({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) });
  }

  const valid = Boolean(src && rect && rect.w >= MIN_SIZE && rect.h >= MIN_SIZE);

  return (
    <Dialog open onClose={onClose} title={tl.focusTitle} description={t.copy["113775d369d8"]} className="sm:max-w-[min(94vw,80rem)]">
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[8.5rem_minmax(0,1fr)_19rem]">
        {/* 1. Choix du screen */}
        <section className="flex min-w-0 flex-col gap-2.5">
          <StepHeading index={1}>{tl.focusScreenHeading}</StepHeading>
          <div className="flex gap-2 overflow-x-auto scrollbar-none lg:max-h-[58dvh] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:p-0.5">
            {screens.map((screen, i) => (
              <button
                key={screen.url}
                type="button"
                disabled={locked}
                onClick={() => {
                  setSrc(screen.url);
                  setRect(null);
                  setRemoving(false);
                  setZoom(1);
                }}
                aria-pressed={src === screen.url}
                aria-label={`Screen ${i + 1}`}
                className={cn(
                  "relative h-16 shrink-0 overflow-hidden rounded-lg bg-black ring-2 transition-[box-shadow,opacity] lg:h-auto lg:w-full",
                  src === screen.url ? "ring-accent" : "opacity-60 ring-transparent hover:opacity-100",
                )}
                style={{ aspectRatio: `${screen.ratio ?? 9 / 19.5}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- fichier uploadé servi par /api/uploads */}
                <img src={screen.url} alt="" className="size-full object-contain" />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-medium text-white tabular-nums">{i + 1}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Tracé du cadre, zoom juste au-dessus */}
        <section className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <StepHeading index={2}>{tl.focusAreaHeading}</StepHeading>
            <label className="flex items-center gap-2.5 text-sm text-muted">
              <ZoomIn className="size-4" aria-hidden />
              <span className="sr-only">{t.copy["ddabe438c85f"]}</span>
              <input type="range" min={1} max={3} step={0.25} value={zoom} disabled={locked} onChange={(event) => setZoom(Number(event.target.value))} className="h-2 w-44 cursor-pointer accent-accent sm:w-64" />
              <span className="w-12 text-right font-mono tabular-nums">{Math.round(zoom * 100)} %</span>
            </label>
          </div>
          <div ref={canvasRef} className="h-[45dvh] min-w-0 overflow-auto rounded-xl border border-line bg-bg-subtle p-3 lg:h-[58dvh]">
            <div className="flex min-h-full w-max min-w-full items-center justify-center">
              <div
                ref={imageRef}
                onPointerDown={(ev) => {
                  if (locked) return;
                  ev.currentTarget.setPointerCapture(ev.pointerId);
                  const p = point(ev);
                  setDrag(p);
                  setRemoving(false);
                  setRect({ ...p, w: 0, h: 0 });
                }}
                onPointerMove={update}
                onPointerUp={() => setDrag(null)}
                onPointerCancel={() => setDrag(null)}
                onLostPointerCapture={() => setDrag(null)}
                className="relative shrink-0 cursor-crosshair touch-none overflow-hidden rounded-lg select-none"
                style={{ height: fitHeight * zoom, width: fitHeight * zoom * ratio }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- fichier uploadé servi par /api/uploads */}
                {src && <img src={src} alt="" draggable={false} className="pointer-events-none size-full" />}
                {rect && rect.w > 0 && (
                  <div
                    className="pointer-events-none absolute rounded-md border-2 border-accent shadow-[0_0_0_9999px_rgb(0_0_0/0.5)]"
                    style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
                  />
                )}
                {!rect && (
                  <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-lg backdrop-blur">
                    <SquareDashedMousePointer className="size-3.5" /> {tl.focusDraw}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Réglages : l'effet, puis les textes */}
        <section className="flex min-w-0 flex-col gap-2.5">
          <StepHeading index={3}>{tl.focusSettingsHeading}</StepHeading>
          <div className="flex flex-col gap-5 rounded-xl border border-line bg-bg-subtle p-4 lg:max-h-[58dvh] lg:overflow-y-auto">
            <Field label={tl.focusEffect} hint={tl.focusModeHints[mode]}>
              <Segmented label={tl.focusEffect} size="sm" value={mode} onChange={setMode} className="flex w-full [&>button]:flex-1" options={FOCUS_MODES.map((m) => ({ value: m, label: tl.focusModes[m], disabled: locked }))} />
            </Field>
            {mode === "popout" && (
              <Field label={tl.focusAnimation} hint={tl.focusAnimationHints[animation]}>
                <Segmented label={tl.focusAnimation} size="sm" value={animation} onChange={setAnimation} className="flex w-full [&>button]:flex-1" options={FOCUS_ANIMATIONS.map((a) => ({ value: a, label: tl.focusAnimations[a], disabled: locked }))} />
              </Field>
            )}
            <div className="h-px bg-line" aria-hidden />
            <Field input label={tl.focusStepTitle} hint={tl.focusStepTitleHint}>
              <input value={title} disabled={locked} maxLength={TITLE_MAX} placeholder={sceneTitle} onChange={(ev) => setTitle(ev.target.value)} className={INPUT} />
            </Field>
            {mode === "popout" && (
              <Field input label={tl.focusLabel}>
                <input value={label} disabled={locked} maxLength={40} placeholder={tl.focusLabelPlaceholder} onChange={(ev) => setLabel(ev.target.value)} className={INPUT} />
              </Field>
            )}
            {value && (
              <button type="button" disabled={locked || removing} onClick={() => { setRemoving(true); setRect(null); }} className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-danger/30 px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-40">
                <Trash2 className="size-3.5" /> {tl.focusRemove}
              </button>
            )}
            {removing && <p role="status" className="text-xs text-muted">{t.copy["d60eb9ae73b5"]}</p>}
          </div>
        </section>
      </div>

      <AnimatedApply
        disabled={locked || (!valid && !removing)}
        onApplyingChange={setApplying}
        onBegin={() => { pendingFocus.current = removing ? null : { src: src!, ...rect!, mode, ...(mode === "popout" ? { animation } : {}), ...(mode === "popout" && label.trim() ? { label: label.trim() } : {}), ...(title.trim() ? { title: title.trim() } : {}) }; }}
        onApply={() => onApply(pendingFocus.current)}
        onCancel={onCancel}
      />
    </div>
    </Dialog>
  );
}

/** Titre numéroté d'une colonne de la modale (1. screen, 2. zone, 3. réglages). */
function StepHeading({ index, children }: { index: number; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      <span className="grid size-5 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-text tabular-nums">{index}</span>
      {children}
    </h3>
  );
}

/**
 * Réglage du panneau : libellé, contrôle, aide.
 * `<label>` seulement autour d'un champ texte : autour de boutons, un clic sur le libellé activerait le premier.
 */
function Field({ label, hint, input, children }: { label: string; hint?: string; input?: boolean; children: ReactNode }) {
  const Tag = input ? "label" : "div";
  return (
    <Tag className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-relaxed text-subtle">{hint}</span>}
    </Tag>
  );
}

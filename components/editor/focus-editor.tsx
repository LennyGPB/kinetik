"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { SquareDashedMousePointer } from "lucide-react";
import { useRef, useState } from "react";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";

import { FOCUS_ANIMATIONS, FOCUS_MODES, type ScreenFocus } from "@/lib/projects/scenes";
import { TITLE_MAX } from "@/lib/projects/timeline";
import { cn } from "@/lib/utils";

type Rect = { x: number; y: number; w: number; h: number };

/** Taille minimale d'un cadre tracé (fraction de l'image) : en dessous, on considère que c'est un simple clic. */
const MIN_SIZE = 0.03;

/**
 * Choix de la zone à mettre en avant : un screen, un cadre tracé dessus, le mode (zoom / découpe) et une légende.
 * Les coordonnées sont en fractions de l'image (0 → 1), comme dans le SceneGraph.
 */
export function FocusEditor({
  screens,
  value,
  defaultSrc,
  sceneTitle,
  disabled,
  onApply,
  onCancel,
}: {
  screens: { url: string; ratio: number | null }[];
  value: ScreenFocus | null;
  defaultSrc?: string;
  sceneTitle: string;
  disabled: boolean;
  onApply: (focus: ScreenFocus | null) => void;
  onCancel: () => void;
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
    <Dialog open onClose={onCancel} title={tl.focusTitle} description={t.copy["113775d369d8"]} className="sm:max-w-[min(94vw,80rem)]">
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-3 self-stretch text-xs text-muted sm:self-end">

        {t.copy["ddabe438c85f"]}
        <input type="range" min={1} max={3} step={0.25} value={zoom} disabled={locked} onChange={(event) => setZoom(Number(event.target.value))} className="min-w-20 flex-1 cursor-pointer accent-accent sm:w-36" />
        <span className="w-10 text-right font-mono">{Math.round(zoom * 100)} %</span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Choix du screen */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none sm:max-h-[50dvh] sm:flex-col sm:overflow-y-auto">
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
              className={cn("h-20 shrink-0 overflow-hidden rounded-lg border-2 bg-black transition-colors", src === screen.url ? "border-accent" : "border-transparent opacity-60 hover:opacity-100")}
              style={{ aspectRatio: `${screen.ratio ?? 9 / 19.5}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- fichier uploadé servi par /api/uploads */}
              <img src={screen.url} alt="" className="size-full object-contain" />
            </button>
          ))}
        </div>

        {/* Tracé du cadre */}
        <div className="min-w-0 flex-1 overflow-auto rounded-xl border border-line bg-bg-subtle p-2" style={{ height: "50dvh" }}>
        <div className="flex w-max min-w-full justify-center">
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
            style={{ aspectRatio: `${ratio}`, height: `min(${47 * zoom}dvh, ${72 * zoom / ratio}vw)` }}
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
              <span className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-lg bg-black/60 px-2 py-1.5 text-xs text-white backdrop-blur">
                <SquareDashedMousePointer className="size-3.5" /> {tl.focusDraw}
              </span>
            )}
          </div>
        </div>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
        {tl.focusStepTitle}
        <input
          value={title}
          disabled={locked}
          maxLength={TITLE_MAX}
          placeholder={sceneTitle}
          onChange={(ev) => setTitle(ev.target.value)}
          className="h-10 w-full rounded-xl border border-line-strong bg-bg px-3 text-base outline-none focus:border-accent sm:text-sm"
        />
        <span className="font-normal">{tl.focusStepTitleHint}</span>
      </label>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <Segmented label={tl.focusTitle} size="sm" value={mode} onChange={setMode} options={FOCUS_MODES.map((m) => ({ value: m, label: tl.focusModes[m], disabled: locked }))} />
          <span className="text-[11px] text-muted">{tl.focusModeHints[mode]}</span>
        </div>
        {mode === "popout" && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted">{tl.focusAnimation}</span>
            <Segmented label={tl.focusAnimation} size="sm" value={animation} onChange={setAnimation} options={FOCUS_ANIMATIONS.map((a) => ({ value: a, label: tl.focusAnimations[a], disabled: locked }))} />
            <span className="text-[11px] text-muted">{tl.focusAnimationHints[animation]}</span>
          </div>
        )}
        {mode === "popout" && (
          <label className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted">
            {tl.focusLabel}
            <input
              value={label}
              disabled={locked}
              maxLength={40}
              placeholder={tl.focusLabelPlaceholder}
              onChange={(ev) => setLabel(ev.target.value)}
              className="h-10 w-full rounded-xl border border-line-strong bg-bg px-3 text-base outline-none focus:border-accent sm:text-sm"
            />
          </label>
        )}
          {value && (
            <button type="button" disabled={locked || removing} onClick={() => { setRemoving(true); setRect(null); }} className="h-10 cursor-pointer rounded-lg border border-line-strong bg-black px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-40">
              {tl.focusRemove}
            </button>
          )}
      </div>
      {removing && <p role="status" className="text-xs text-muted">{t.copy["d60eb9ae73b5"]}</p>}
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


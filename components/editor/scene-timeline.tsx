"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { useRef, useState } from "react";
import { format } from "@/lib/i18n";
import { beatGrid, type SceneGraph } from "@/lib/projects/scenes";
import { applyTimelineEdit, clampDuration, DURATION_STEP, formatSeconds, sceneLabel, type TimelineEdit } from "@/lib/projects/timeline";
import { cn, formatTime } from "@/lib/utils";
import { FPS } from "@/remotion/props";
import { sceneTimeline } from "@/remotion/video/transitions";

/** En dessous de ce déplacement (px), un appui est un clic (sélection + lecture), pas un glisser. */
const DRAG_THRESHOLD = 5;
/** Aimantation de la fin d'une scène sur un temps de la musique (secondes). */
const BEAT_MAGNET = 0.12;

type Drag =
  | { mode: "press" | "move"; sceneId: string; startX: number; x: number; index: number }
  | { mode: "resize"; sceneId: string; startX: number; x: number; pxPerSecond: number; startDuration: number; start: number };

/**
 * Frise des scènes sous le lecteur. Positions fidèles à la vidéo (coupes recalées sur le beat comprises).
 * En édition : clic = sélectionner + lire la scène, glisser = déplacer, bord droit = changer la durée.
 */
export function SceneTimeline({
  graph,
  frame,
  total,
  onSeek,
  editable,
  selectedId,
  onSelect,
  onEdit,
}: {
  graph: SceneGraph;
  frame: number;
  total: number;
  onSeek: (frame: number) => void;
  editable: boolean;
  selectedId: string | null;
  onSelect: (sceneId: string | null) => void;
  onEdit: (edit: TimelineEdit) => void;
}) {
  const t = useDictionary();

  const e = t.app.editor;
  const tl = e.timeline;
  const SEGMENT_COLORS: Record<SceneGraph["scenes"][number]["kind"], string> = {
  intro: "from-indigo-500 to-violet-500",
  logo: "from-violet-500 to-fuchsia-500",
  feature: "from-fuchsia-500 to-pink-500",
  screens: "from-sky-500 to-indigo-500",
  cta: "from-violet-600 to-purple-400",
  stat: "from-amber-500 to-orange-500",
  quote: "from-emerald-500 to-teal-500",
};

  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  // Aperçu pendant un glisser : on applique la modification en cours sans l'enregistrer
  const pending = drag ? pendingEdit(drag) : null;
  const shown = pending ? applyTimelineEdit(graph, pending) : graph;
  const timeline = sceneTimeline(shown.scenes, FPS, shown.bpm, beatGrid(shown).phase);
  const shownTotal = timeline.reduce((sum, s) => sum + s.duration, 0) || total;

  function pendingEdit(d: Drag): TimelineEdit | null {
    if (d.mode === "resize") return { kind: "duration", sceneId: d.sceneId, duration: resizedDuration(d) };
    if (d.mode === "move") return { kind: "move", sceneId: d.sceneId, toIndex: targetIndex(d) };
    return null;
  }

  function resizedDuration(d: Extract<Drag, { mode: "resize" }>) {
    const raw = d.startDuration + (d.x - d.startX) / d.pxPerSecond;
    let seconds = Math.round(raw / DURATION_STEP) * DURATION_STEP;
    // Aimant : si la fin tombe tout près d'un temps musical, on la cale dessus
    const { period: beat, phase } = beatGrid(graph);
    const end = d.start + raw;
    const nearest = Math.round((end - phase) / beat) * beat + phase;
    if (Math.abs(end - nearest) < BEAT_MAGNET) seconds = nearest - d.start;
    return clampDuration(seconds);
  }

  /** Index visé pendant un déplacement : position du pointeur parmi les milieux des autres scènes. */
  function targetIndex(d: Extract<Drag, { mode: "press" | "move" }>) {
    const el = ref.current;
    if (!el) return d.index;
    const rect = el.getBoundingClientRect();
    const x = (d.x - rect.left) / rect.width;
    const base = sceneTimeline(graph.scenes, FPS, graph.bpm, beatGrid(graph).phase);
    const sum = base.reduce((acc, s) => acc + s.duration, 0);
    let index = 0;
    for (const s of base) {
      if (s.scene.id === d.sceneId) continue;
      if (x > (s.from + s.duration / 2) / sum) index++;
    }
    return index;
  }

  function ratioToFrame(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.round(Math.min(0.999, Math.max(0, (clientX - rect.left) / rect.width)) * (shownTotal - 1));
  }

  function endDrag() {
    if (!drag) return;
    if (drag.mode === "press") {
      onSelect(drag.sceneId);
      onSeek(ratioToFrame(drag.x));
    } else {
      const edit = pendingEdit(drag);
      const scene = graph.scenes.find((s) => s.id === drag.sceneId);
      const changed =
        edit &&
        scene &&
        ((edit.kind === "duration" && edit.duration !== scene.duration) || (edit.kind === "move" && edit.toIndex !== graph.scenes.indexOf(scene)));
      if (edit && changed) onEdit(edit);
      onSelect(drag.sceneId);
    }
    setDrag(null);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {/* Barre de lecture : en édition, la frise sert au montage ; on lit/scrubbe ici */}
      {editable && (
        <div
          role="slider"
          tabIndex={0}
          aria-label={t.a11y.timeline}
          aria-valuemin={0}
          aria-valuemax={Math.round(shownTotal / FPS)}
          aria-valuenow={Math.round(frame / FPS)}
          aria-valuetext={formatTime(frame / FPS)}
          onPointerDown={(ev) => {
            ev.currentTarget.setPointerCapture(ev.pointerId);
            onSeek(ratioToFrame(ev.clientX));
          }}
          onPointerMove={(ev) => ev.buttons === 1 && onSeek(ratioToFrame(ev.clientX))}
          onKeyDown={(ev) => {
            if (ev.key === "ArrowRight") onSeek(Math.min(shownTotal - 1, frame + FPS));
            if (ev.key === "ArrowLeft") onSeek(Math.max(0, frame - FPS));
          }}
          className="group relative h-3 cursor-pointer touch-none py-1"
        >
          <div className="h-1 rounded-full bg-line-strong">
            <div className="h-full rounded-full bg-fg" style={{ width: `${(frame / shownTotal) * 100}%` }} />
          </div>
        </div>
      )}

      <div
        ref={ref}
        {...(!editable && {
          role: "slider",
          tabIndex: 0,
          "aria-label": t.a11y.timeline,
          "aria-valuemin": 0,
          "aria-valuemax": Math.round(shownTotal / FPS),
          "aria-valuenow": Math.round(frame / FPS),
          "aria-valuetext": formatTime(frame / FPS),
          onPointerDown: (ev: React.PointerEvent<HTMLDivElement>) => {
            ev.currentTarget.setPointerCapture(ev.pointerId);
            onSeek(ratioToFrame(ev.clientX));
          },
          onPointerMove: (ev: React.PointerEvent<HTMLDivElement>) => ev.buttons === 1 && onSeek(ratioToFrame(ev.clientX)),
          onKeyDown: (ev: React.KeyboardEvent) => {
            if (ev.key === "ArrowRight") onSeek(Math.min(shownTotal - 1, frame + FPS));
            if (ev.key === "ArrowLeft") onSeek(Math.max(0, frame - FPS));
          },
        })}
        className={cn("relative flex h-9 touch-none items-center gap-0.5", !editable && "cursor-pointer")}
      >
        {timeline.map(({ scene, duration }) => {
          const selected = editable && scene.id === selectedId;
          const dragging = drag?.sceneId === scene.id && drag.mode !== "press";
          const resizing = dragging && drag?.mode === "resize";
          return (
            <div
              key={scene.id}
              role={editable ? "button" : undefined}
              tabIndex={editable ? 0 : undefined}
              aria-pressed={editable ? selected : undefined}
              aria-label={editable ? `${sceneLabel(scene.kind, t.locale)} · ${formatSeconds(scene.duration, t.locale)}` : undefined}
              onPointerDown={
                editable
                  ? (ev) => {
                      ev.currentTarget.setPointerCapture(ev.pointerId);
                      setDrag({ mode: "press", sceneId: scene.id, startX: ev.clientX, x: ev.clientX, index: graph.scenes.findIndex((s) => s.id === scene.id) });
                    }
                  : undefined
              }
              onPointerMove={
                editable
                  ? (ev) => {
                      if (!drag || drag.sceneId !== scene.id || drag.mode === "resize") return;
                      const moved = drag.mode === "move" || Math.abs(ev.clientX - drag.startX) > DRAG_THRESHOLD;
                      setDrag({ ...drag, mode: moved ? "move" : "press", x: ev.clientX });
                    }
                  : undefined
              }
              onPointerUp={editable ? endDrag : undefined}
              onPointerCancel={editable ? () => setDrag(null) : undefined}
              onKeyDown={
                editable
                  ? (ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        onSelect(scene.id);
                      }
                      if (ev.key === "Delete" || ev.key === "Backspace") onEdit({ kind: "delete", sceneId: scene.id });
                    }
                  : undefined
              }
              className={cn(
                "group/tl relative h-7 min-w-3 overflow-visible rounded-md bg-gradient-to-r transition-[opacity,box-shadow]",
                SEGMENT_COLORS[scene.kind],
                editable && "cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing",
                selected && "ring-2 ring-fg ring-offset-1 ring-offset-bg-subtle",
                dragging && drag?.mode === "move" && "z-10 -translate-y-0.5 shadow-lg",
              )}
              style={{ flex: duration }}
            >
              <span className="pointer-events-none absolute inset-0 hidden items-center truncate overflow-hidden rounded-md px-1.5 text-[10px] font-medium text-white sm:flex">
                {editable ? sceneLabel(scene.kind, t.locale) : scene.kind}
              </span>
              {editable && (
                <span
                  role="presentation"
                  aria-label={format(tl.resize, { name: sceneLabel(scene.kind, t.locale) })}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    ev.currentTarget.setPointerCapture(ev.pointerId);
                    const rect = ref.current?.getBoundingClientRect();
                    const seconds = graph.scenes.reduce((sum, s) => sum + s.duration, 0);
                    const index = graph.scenes.findIndex((s) => s.id === scene.id);
                    setDrag({
                      mode: "resize",
                      sceneId: scene.id,
                      startX: ev.clientX,
                      x: ev.clientX,
                      pxPerSecond: (rect?.width ?? 1) / seconds,
                      startDuration: scene.duration,
                      start: graph.scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0),
                    });
                  }}
                  onPointerMove={(ev) => {
                    ev.stopPropagation();
                    if (drag?.mode === "resize" && drag.sceneId === scene.id) setDrag({ ...drag, x: ev.clientX });
                  }}
                  onPointerUp={(ev) => {
                    // Sinon l'événement remonte à la scène et la modification serait envoyée deux fois
                    ev.stopPropagation();
                    endDrag();
                  }}
                  className={cn(
                    "absolute inset-y-0 -right-1.5 z-20 flex w-3 cursor-ew-resize touch-none items-center justify-center opacity-0 transition-opacity group-hover/tl:opacity-100 hover:opacity-100",
                    (selected || resizing) && "opacity-100",
                  )}
                >
                  <span className="h-5 w-1 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
                </span>
              )}
              {resizing && (
                <span className="pointer-events-none absolute -top-8 right-0 z-30 translate-x-1/2 rounded-md bg-fg px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-bg">
                  {formatSeconds(shown.scenes.find((s) => s.id === scene.id)?.duration ?? 0, t.locale)}
                </span>
              )}
            </div>
          );
        })}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full" style={{ transform: `translateX(${(frame / shownTotal) * 100}%)` }}>
          <div className="h-full w-0.5 -translate-x-1/2 rounded-full bg-fg shadow-[0_0_10px_var(--accent-glow)]" />
        </div>
      </div>
    </div>
  );
}

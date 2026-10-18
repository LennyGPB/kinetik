"use client";
import { Player, type PlayerRef } from "@remotion/player";
import { Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, type RefObject, type PointerEvent } from "react";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS, type VideoProps } from "@/remotion/props";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { recordingCopy } from "@/lib/recordings/copy";
import type { RecordingZoom } from "@/lib/recordings/model";
import { defaultRecordingMotion } from "@/lib/recordings/model";
import { moveRecordingZoom, resizeRecordingZoom } from "@/lib/recordings/timeline";
import { recordingTarget } from "@/lib/recordings/framing";

export function RecordingPreview({ videoProps, playerRef, onZoomsChange, disabled = false, showTimeline = true, onZoomSelect, selectedZoom }: { videoProps: VideoProps; playerRef: RefObject<PlayerRef | null>; onZoomsChange?: (zooms: RecordingZoom[]) => void; disabled?: boolean; showTimeline?: boolean; onZoomSelect?: (id: string) => void; selectedZoom?: string | null }) {
  const locale = useDictionary().locale;
  const c = recordingCopy(locale);
  const [targeting, setTargeting] = useState(false);
  const previousMotions = useRef(new Map<string, RecordingZoom["motion"]>());
  const recording = videoProps.graph.recording!;
  const has3D = recording.zooms.some((zoom) => zoom.motion && zoom.motion !== "none");
  const [localSelection, setLocalSelection] = useState<string | null>(null);
  const candidate = selectedZoom ?? localSelection;
  const active = recording.zooms.some((zoom) => zoom.id === candidate) ? candidate : recording.zooms[0]?.id;
  function selectZoom(id: string) { setLocalSelection(id); onZoomSelect?.(id); }
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; pointer: number; x: number; width: number; zooms: RecordingZoom[]; moved: boolean; edge?: "start" | "end" } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState<string | null>(null);
  function beginDrag(event: PointerEvent<HTMLButtonElement>, id: string, edge?: "start" | "end") {
    if (!onZoomsChange || disabled || event.button !== 0 || !event.isPrimary || drag.current) return;
    const width = track.current?.getBoundingClientRect().width ?? 0;
    if (!width) return;
    suppressClick.current = false;
    selectZoom(id);
    drag.current = { id, pointer: event.pointerId, x: event.clientX, width, zooms: recording.zooms, moved: false, edge };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId || !onZoomsChange || disabled) return;
    if (!current.moved && Math.abs(event.clientX - current.x) < 3) return;
    current.moved = true; suppressClick.current = true; setDragging(current.id);
    const original = current.zooms.find((zoom) => zoom.id === current.id)!;
    const delta = (event.clientX - current.x) / current.width * recording.duration;
    onZoomsChange(current.edge ? resizeRecordingZoom(current.zooms, current.id, current.edge, original[current.edge] + delta, recording.duration) : moveRecordingZoom(current.zooms, current.id, original.start + delta, recording.duration));
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancel: boolean) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null; setDragging(null);
    if (cancel && current.moved) onZoomsChange?.(current.zooms);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function clearClick(event: React.MouseEvent<HTMLButtonElement>) { event.stopPropagation(); suppressClick.current = false; }
  return <div className="w-full min-w-0">
    <div className="relative">
    <Player ref={playerRef} component={KinetikVideo} inputProps={targeting ? { ...videoProps, graph: { ...videoProps.graph, recording: { ...recording, zooms: [] } } } : videoProps} compositionWidth={DIMENSIONS[videoProps.format].width} compositionHeight={DIMENSIONS[videoProps.format].height} durationInFrames={durationInFrames(videoProps.graph)} fps={FPS} controls clickToPlay style={{ width: "100%", maxHeight: "65vh", marginInline: "auto", aspectRatio: `${DIMENSIONS[videoProps.format].width}/${DIMENSIONS[videoProps.format].height}`, borderRadius: 12, overflow: "hidden" }} errorFallback={() => <div role="alert" className="flex h-full items-center justify-center bg-surface-2 p-8 text-sm text-danger">{c.previewError}</div>} />
    {targeting && <button type="button" disabled={disabled} aria-label={locale === "fr" ? "Choisir la cible du zoom dans la capture" : "Choose zoom target in the recording"} className="absolute inset-0 z-10 cursor-crosshair rounded-xl border-2 border-accent focus-visible:outline-2 focus-visible:outline-accent" onKeyDown={(event) => { if (event.key === "Escape" || event.key === "Enter") { event.preventDefault(); setTargeting(false); } }} onClick={(event) => {
      if (event.detail === 0 || !onZoomsChange) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const point = recordingTarget(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height, DIMENSIONS[videoProps.format].width, DIMENSIONS[videoProps.format].height, recording);
      if (!point) return;
      onZoomsChange(recording.zooms.map((zoom) => zoom.id === active ? { ...zoom, ...point } : zoom)); setTargeting(false);
    }}><span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white">{locale === "fr" ? "Cliquez dans la capture pour cadrer le zoom" : "Click the recording to frame your zoom"}</span></button>}
    </div>
    {onZoomsChange && showTimeline && <div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant={targeting ? "soft" : "outline"} size="sm" disabled={disabled || !active} onClick={() => { if (targeting) { setTargeting(false); return; } const zoom = recording.zooms.find((item) => item.id === active); if (!zoom) return; playerRef.current?.pause(); playerRef.current?.seekTo(Math.round(Math.min(recording.duration - 1 / FPS, (zoom.start + zoom.end) / 2) * FPS)); setTargeting(true); }}>{targeting ? <X /> : <Crosshair />}{targeting ? c.cancel : locale === "fr" ? "Choisir la cible dans la capture" : "Choose target in video"}</Button><Button variant="outline" size="sm" disabled={disabled || !recording.zooms.length || targeting} onClick={() => {
      if (has3D) {
        previousMotions.current = new Map(recording.zooms.map((zoom) => [zoom.id, zoom.motion ?? "none"]));
        onZoomsChange(recording.zooms.map((zoom) => ({ ...zoom, motion: "none" })));
      } else {
        onZoomsChange(recording.zooms.map((zoom, index) => ({ ...zoom, motion: previousMotions.current.has(zoom.id) ? previousMotions.current.get(zoom.id) : defaultRecordingMotion(index) })));
      }
    }}>{has3D ? c.remove3D : c.restore3D}</Button></div>}
    {showTimeline && <><div ref={track} aria-label={c.zooms} className="relative mt-4 h-9 overflow-hidden rounded-lg border border-line bg-surface-2">
      {recording.zooms.map((zoom, index) => <div key={zoom.id} className="group absolute inset-y-1 min-w-1" style={{ left: `${zoom.start / recording.duration * 100}%`, width: `${(zoom.end - zoom.start) / recording.duration * 100}%` }}>
        <button type="button" aria-pressed={active === zoom.id} aria-label={`${c.zooms} ${index + 1} · ${zoom.start.toFixed(1)} s`} disabled={disabled} title={onZoomsChange ? c.dragZoom : undefined}
          onPointerDown={(event) => beginDrag(event, zoom.id)} onPointerMove={moveDrag} onPointerUp={(event) => finishDrag(event, false)} onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={(event) => finishDrag(event, true)}
          onKeyDown={(event) => { if (!onZoomsChange || disabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return; event.preventDefault(); selectZoom(zoom.id); onZoomsChange(moveRecordingZoom(recording.zooms, zoom.id, zoom.start + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 1 : 0.1), recording.duration)); }}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } selectZoom(zoom.id); playerRef.current?.seekTo(Math.round(Math.min(recording.duration - 1 / FPS, (zoom.start + zoom.end) / 2) * FPS)); }}
          style={{ touchAction: onZoomsChange ? "none" : undefined, cursor: onZoomsChange ? dragging === zoom.id ? "grabbing" : "grab" : "pointer" }}
          className="absolute inset-0 w-full select-none overflow-hidden rounded bg-accent text-xs font-medium text-accent-fg aria-pressed:bg-white aria-pressed:text-zinc-950 transition-[filter,box-shadow] duration-150 hover:brightness-125 hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.65)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg">{index + 1}</button>
        {onZoomsChange && active === zoom.id && <><button key={"start"} type="button" disabled={disabled} aria-label={`${c.start} · Zoom ${index + 1}`} title={c.start}
          onPointerDown={(event) => beginDrag(event, zoom.id, "start")} onPointerMove={moveDrag} onPointerUp={(event) => finishDrag(event, false)} onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={(event) => finishDrag(event, true)}
          onClick={clearClick}
          onKeyDown={(event) => { if (disabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return; event.preventDefault(); onZoomsChange(resizeRecordingZoom(recording.zooms, zoom.id, "start", zoom["start"] + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 1 : 0.1), recording.duration)); }}
          style={{ touchAction: "none" }} className={`absolute inset-y-0 z-20 flex w-3 cursor-ew-resize items-center justify-center rounded text-zinc-950 hover:bg-black/15 focus-visible:outline-2 focus-visible:outline-accent ${"left-0"}`}><span aria-hidden className="h-3 w-0.5 rounded bg-current opacity-50" /></button><button key={"end"} type="button" disabled={disabled} aria-label={`${c.end} · Zoom ${index + 1}`} title={c.end}
          onPointerDown={(event) => beginDrag(event, zoom.id, "end")} onPointerMove={moveDrag} onPointerUp={(event) => finishDrag(event, false)} onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={(event) => finishDrag(event, true)}
          onClick={clearClick}
          onKeyDown={(event) => { if (disabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return; event.preventDefault(); onZoomsChange(resizeRecordingZoom(recording.zooms, zoom.id, "end", zoom["end"] + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 1 : 0.1), recording.duration)); }}
          style={{ touchAction: "none" }} className={`absolute inset-y-0 z-20 flex w-3 cursor-ew-resize items-center justify-center rounded text-zinc-950 hover:bg-black/15 focus-visible:outline-2 focus-visible:outline-accent ${"right-0"}`}><span aria-hidden className="h-3 w-0.5 rounded bg-current opacity-50" /></button></>}
      </div>)}


    </div>
    <div className="mt-2 flex justify-between text-xs tabular-nums text-muted"><span>0:00</span><span>{Math.floor(recording.duration / 60)}:{String(Math.floor(recording.duration % 60)).padStart(2, "0")}</span></div>
    </>}
  </div>;
}

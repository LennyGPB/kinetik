import type { RecordingZoom } from "./model";

export function resizeRecordingZoom(zooms: RecordingZoom[], id: string, edge: "start" | "end", requested: number, duration: number): RecordingZoom[] {
  const zoom = zooms.find((item) => item.id === id);
  if (!zoom || !Number.isFinite(requested)) return zooms;
  const others = zooms.filter((item) => item.id !== id);
  const lower = Math.max(0, ...others.filter((item) => item.end <= zoom.start).map((item) => item.end));
  const upper = Math.min(duration, ...others.filter((item) => item.start >= zoom.end).map((item) => item.start));
  const snapped = Math.round(requested * 30) / 30;
  return zooms.map((item) => item.id !== id ? item : edge === "start"
    ? { ...item, start: Math.max(lower, Math.min(item.end - 0.6, snapped)) }
    : { ...item, end: Math.min(upper, Math.max(item.start + 0.6, snapped)) });
}

/** Move a shot inside its free interval, preserving duration and neighboring shots. */
export function moveRecordingZoom(zooms: RecordingZoom[], id: string, requestedStart: number, duration: number): RecordingZoom[] {
  const zoom = zooms.find((item) => item.id === id);
  if (!zoom || !Number.isFinite(requestedStart)) return zooms;
  const length = zoom.end - zoom.start;
  const others = zooms.filter((item) => item.id !== id);
  const minimum = Math.max(0, ...others.filter((item) => item.end <= zoom.start).map((item) => item.end));
  const upper = Math.min(duration, ...others.filter((item) => item.start >= zoom.end).map((item) => item.start));
  const maximum = upper - length;
  if (maximum < minimum) return zooms;
  const start = Math.max(minimum, Math.min(maximum, Math.round(requestedStart * 30) / 30));
  return zooms.map((item) => item.id === id ? { ...item, start, end: Math.min(upper, start + length) } : item);
}

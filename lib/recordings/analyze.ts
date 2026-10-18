import { RECORDING_MAX_BYTES, RECORDING_MAX_SECONDS } from "./model";
import { RecordingAnalyzer } from "./motion-analysis";

function waitFor(video: HTMLVideoElement, event: "loadedmetadata" | "seeked" | "loadeddata", signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const clear = () => { clearTimeout(timer); video.removeEventListener(event, done); video.removeEventListener("error", fail); signal.removeEventListener("abort", abort); };
    const done = () => { clear(); resolve(); };
    const fail = () => { clear(); reject(new Error("unreadable")); };
    const abort = () => { clear(); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(fail, 15000);
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", fail, { once: true });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

/** Analyze a local file: frames never leave the browser. Four samples/second, bounded memory. */
export async function analyzeRecording(file: File, onProgress: (value: number) => void, signal: AbortSignal) {
  if (file.size > RECORDING_MAX_BYTES) throw new Error("too_large");
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  try {
    const ready = waitFor(video, "loadedmetadata", signal);
    video.src = url;
    await ready;
    if (!Number.isFinite(video.duration) || video.duration < 1 || video.duration > RECORDING_MAX_SECONDS || !video.videoWidth || !video.videoHeight) throw new Error("duration");
    const duration = Math.floor(video.duration * 30) / 30;
    const canvas = document.createElement("canvas");
    const size = Math.min(320 / video.videoWidth, 320 / video.videoHeight);
    canvas.width = Math.max(16, Math.round(video.videoWidth * size));
    canvas.height = Math.max(16, Math.round(video.videoHeight * size));
    if (canvas.height > 768) throw new Error("unreadable");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("unreadable");
    const analyzer = new RecordingAnalyzer(canvas.width, canvas.height);
    for (let time = 0.001; time < duration; time += 0.25) {
      signal.throwIfAborted();
      const seeked = waitFor(video, "seeked", signal);
      video.currentTime = Math.min(time, duration - 0.001);
      await seeked;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      analyzer.push(time, current);
      onProgress(Math.min(100, Math.round(time / duration * 100)));
    }
    const zooms = analyzer.finish(duration);
    onProgress(100);
    return { duration, width: video.videoWidth, height: video.videoHeight, zooms: zooms.sort((a, b) => a.start - b.start) };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

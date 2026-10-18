import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { RenderInternals } from "@remotion/renderer";
import { detectTempoFromSamples } from "../lib/audio/tempo";
import type { MusicTrack } from "../config/music";

const EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac", ".opus"]);
type CachedTrack = { hash: string; track: MusicTrack };

function binary(type: "ffmpeg" | "ffprobe") {
  return RenderInternals.getExecutablePath({ type, indent: false, logLevel: "error", binariesDirectory: null });
}

/** Remotion's bundled FFmpeg supports PCM WAV; decode and filter locally. */
function samplesFromWav(wav: Buffer) {
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const size = wav.readUInt32LE(offset + 4);
    if (wav.toString("ascii", offset, offset + 4) === "data") {
      const start = offset + 8;
      const samples = Float32Array.from({ length: Math.floor(Math.min(size, wav.length - start) / 2) }, (_, i) => wav.readInt16LE(start + i * 2) / 32768);
      const w = 2 * Math.PI * 220 / 11025;
      const c = Math.cos(w), a = Math.sin(w) / (2 * Math.pow(10, 1 / 20)), a0 = 1 + a;
      const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, a1 = -2 * c / a0, a2 = (1 - a) / a0;
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < samples.length; i++) {
        const x = samples[i], y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = y; samples[i] = y;
      }
      return samples;
    }
    offset += 8 + size + size % 2;
  }
  throw new Error("Missing PCM audio data");
}

export async function syncMusicLibrary(root = process.cwd()) {
  const directory = path.join(root, "public/music");
  const manifest = path.join(root, "config/music-library.json");
  const cacheFile = path.join(root, ".cache/music-library.json");
  await mkdir(directory, { recursive: true });
  let cache: Record<string, CachedTrack> = {};
  try { cache = JSON.parse(await readFile(cacheFile, "utf8")); } catch { /* First scan. */ }
  let previousTracks: MusicTrack[] = [];
  try { previousTracks = JSON.parse(await readFile(manifest, "utf8")); } catch { /* First catalogue. */ }
  const previousIds = new Map(previousTracks.map((track) => [decodeURIComponent(track.src.slice("/music/".length)), track.id]));
  const nextCache: Record<string, CachedTrack> = {};
  const tracks: MusicTrack[] = [];
  const files = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name).sort();
  const ids = new Map(files.filter((file) => cache[file] || previousIds.has(file)).map((file) => [cache[file]?.track.id ?? previousIds.get(file)!, file]));
  for (const file of files) {
    const filePath = path.join(directory, file);
    const hash = createHash("sha256").update(await readFile(filePath)).digest("hex");
    let track = cache[file]?.hash === hash ? cache[file].track : undefined;
    if (!track) {
      console.log(`[music] Analyzing ${file}`);
      const metadata = JSON.parse(execFileSync(binary("ffprobe"), ["-v", "error", "-show_format", "-of", "json", filePath], { encoding: "utf8", timeout: 30_000 }));
      const duration = Number(metadata.format.duration);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid audio duration: ${file}`);
      const start = duration > 25 ? 5 : 0;
      const wav = execFileSync(binary("ffmpeg"), ["-v", "error", "-i", filePath, "-ss", String(start), "-t", "60", "-ac", "1", "-ar", "11025", "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"], { maxBuffer: 16 * 1024 * 1024, timeout: 60_000 });
      const tempo = detectTempoFromSamples(samplesFromWav(wav), start);
      if (!tempo) console.warn(`[music] No reliable tempo for ${file}; using 120 BPM.`);
      const title = path.basename(file, path.extname(file));
      const id = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "track";
      track = { id: cache[file]?.track.id ?? previousIds.get(file) ?? id, title, artist: "", mood: "", bpm: tempo?.bpm ?? 120, beatOffset: tempo?.beatOffset ?? 0, length: Math.round(duration), src: `/music/${encodeURIComponent(file)}` };
    }
    // Keep existing IDs stable; disambiguate files with the same title.
    if (ids.has(track.id) && ids.get(track.id) !== file) track = { ...track, id: `${track.id}-${createHash("sha256").update(file).digest("hex").slice(0, 8)}` };
    ids.set(track.id, file);
    nextCache[file] = { hash, track };
    tracks.push(track);
  }
  const content = JSON.stringify(tracks, null, 2) + "\n";
  let previous = "";
  try { previous = await readFile(manifest, "utf8"); } catch { /* New manifest. */ }
  if (previous !== content) {
    await mkdir(path.dirname(manifest), { recursive: true });
    await writeFile(manifest, content);
    console.log(`[music] Library updated: ${tracks.length} tracks.`);
  }
  await mkdir(path.dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, JSON.stringify(nextCache));
  return tracks;
}

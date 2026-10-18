import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { MUSIC_LIBRARY } from "../config/music";
import { VIDEO_STYLES } from "../config/styles";
import { demoVideoProps } from "../lib/projects/demo-video";

async function main() {
  const track = MUSIC_LIBRARY.find((item) => item.id === (process.argv[2] ?? "countless"));
  if (!track) throw new Error("Unknown library track");
  const style = VIDEO_STYLES.find((item) => item.id === "anvil")!;
  const props = demoVideoProps(style, "PORTRAIT", "fr");
  props.musicSrc = `data:audio/mp4;base64,${(await readFile(path.join(process.cwd(), "public", decodeURIComponent(track.src)))).toString("base64")}`;
  props.graph = { ...props.graph, bpm: track.bpm, beatOffset: track.beatOffset, musicTrackId: track.id, audio: { trimStart: 1.3 }, scenes: [
    { id: "intro", kind: "intro", title: "SUR LE BEAT.", duration: 3, transition: "cut" },
    { id: "feature", kind: "feature", title: "LE MÊME RYTHME.", duration: 3, transition: "cut" },
    { id: "cta", kind: "cta", title: "À VOUS DE JOUER.", duration: 3, transition: "cut" },
  ] };
  await mkdir("out/beat-sync", { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps: props, port: 4318 });
  const outputLocation = `out/beat-sync/${track.id}.mp4`;
  await renderMedia({ serveUrl, composition, inputProps: props, codec: "h264", audioCodec: "aac", scale: 0.3, outputLocation, port: 4318, concurrency: 2 });
  console.log(`Rendered ${outputLocation}: ${track.bpm} BPM, beat offset ${track.beatOffset}s, trim 1.3s`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

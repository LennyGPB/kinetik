import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { narrationCaptions } from "../../lib/audio/captions";
import { playableVoiceClips } from "../../lib/projects/voiceover";
import type { SceneGraph } from "../../lib/projects/scenes";

export function VoiceoverAudio({ graph }: { graph: SceneGraph }) {
  const { fps } = useVideoConfig();
  return <>{playableVoiceClips(graph, fps).map(({ scene, from, clip }) => (
    <Sequence key={`voice-${scene.id}`} from={from} durationInFrames={Math.ceil(clip.duration * fps)} name={`Voice · ${scene.title}`}>
      <Audio src={clip.src} volume={graph.voiceover?.volume ?? 1} />
    </Sequence>
  ))}</>;
}

export function NarrationCaptions({ graph }: { graph: SceneGraph }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!graph.voiceover?.captions) return null;
  const active = playableVoiceClips(graph, fps).find(({ from, clip }) => frame >= from && frame < from + clip.duration * fps);
  if (!active) return null;
  const time = (frame - active.from) / fps;
  const caption = narrationCaptions(active.clip).find((chunk) => time >= chunk.start && time <= chunk.end + 0.12);
  if (!caption) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end", alignItems: "center", padding: `0 ${width * 0.08}px ${height * 0.065}px` }}>
    <div style={{ maxWidth: width * 0.84, padding: "12px 22px", background: "rgba(0,0,0,0.82)", borderRadius: 12, color: "#ffffff", fontFamily: graph.fonts?.body ?? "sans-serif", fontWeight: 600,
      fontSize: Math.min(width, height) * 0.038, lineHeight: 1.35, textAlign: "center", whiteSpace: "normal" }}>{caption.text}</div>
  </AbsoluteFill>;
}

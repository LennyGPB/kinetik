import { AbsoluteFill, Audio, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { recordingFrame } from "../../lib/recordings/framing";
import type { VideoProps } from "../props";
import { recordingCamera, recordingTilt } from "../../lib/recordings/model";
import { DeviceShell } from "../../components/media/device-shell";

/** One continuous source; camera is applied inside the frame, leaving the stage still. */
export function ScreenRecordingVideo({ props }: { props: VideoProps }) {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const recording = props.graph.recording!;
  const camera = recordingCamera(recording.zooms, frame / fps);
  const tilt = recordingTilt(recording.zooms, frame / fps);
  const { bar, videoWidth, videoHeight, device } = recordingFrame(width, height, recording);
  const radius = recording.radius * Math.min(width, height) / 1080;
  const { volume = 0.25, trimStart = 0, fadeIn = true, fadeOut = true } = props.graph.audio ?? {};
  const content = <div style={{ width: videoWidth, height: videoHeight, overflow: "hidden", position: "relative", flexShrink: 0 }}>
    <div style={{ position: "absolute", inset: 0, transform: `translate(${camera.x * videoWidth}px, ${camera.y * videoHeight}px) scale(${camera.scale})` }}>
      <OffthreadVideo src={recording.src} muted={!recording.originalAudio} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  </div>;
  return <AbsoluteFill style={{ background: recording.background, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: device?.w ?? videoWidth, height: device?.h ?? videoHeight + bar, borderRadius: device ? undefined : radius, overflow: device ? "visible" : "hidden", boxShadow: device ? undefined : "0 24px 80px rgba(0,0,0,0.3)", background: device ? undefined : "#18181b", transform: `perspective(${Math.max(width, height) * 1.4}px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotateZ(${tilt.z ?? 0}deg)`, transformOrigin: "center center" }}>
      {device ? <DeviceShell inVideo model={recording.deviceMockup!}><div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{content}</div></DeviceShell> : <>
      {bar > 0 && <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.18, paddingLeft: bar * 0.4 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((color) => <span key={color} style={{ width: bar * 0.25, height: bar * 0.25, borderRadius: "50%", background: color }} />)}
      </div>}
      {content}
      </>}
    </div>
    {props.musicSrc && <Audio src={props.musicSrc} trimBefore={Math.round(trimStart * fps)} volume={(f) => volume * (fadeIn ? interpolate(f, [0, fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1) * (fadeOut ? interpolate(f, [Math.max(0, durationInFrames - fps * 2), durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1)} />}
    {props.watermark && <div style={{ position: "absolute", right: width * 0.025, bottom: height * 0.025, padding: "8px 16px", borderRadius: 20, background: "rgba(0,0,0,0.65)", color: "white", fontFamily: "sans-serif", fontSize: Math.min(width, height) * 0.022 }}>Made with Kinetik</div>}
  </AbsoluteFill>;
}

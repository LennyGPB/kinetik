import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoOverlay } from "../../lib/projects/overlays";
import type { VideoProps } from "../props";
import { useBodyFont } from "./theme";

/** Rendered outside SceneShell: a pinned logo stays still through scene transitions. */
export function OverlayLayer({ layer, props, duration }: { layer: VideoOverlay; props: VideoProps; duration: number }) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const fontFamily = useBodyFont();
  const unit = Math.min(width, height);
  const begin = Math.round((layer.start ?? 0) * fps);
  const end = layer.end === null ? duration : Math.min(duration, Math.round(layer.end * fps));
  if (frame < begin || frame >= end) return null;
  const progress = interpolate(frame - begin, [0, Math.max(1, Math.round(fps * 0.3))], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const src = layer.type === "logo" ? props.logoUrl : layer.type === "image" ? props.screenUrls[layer.screen ?? -1] : null;
  if ((layer.type === "logo" || layer.type === "image") && !src) return null;
  const size = unit * layer.width;
  // Image box fits inside the canvas, including portrait and landscape formats.
  const x = Math.max(size / 2, Math.min(width - size / 2, layer.x * width));
  const y = Math.max(size / 2, Math.min(height - size / 2, layer.y * height));
  return <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ position: "absolute", left: x, top: y, width: size,
      opacity: layer.opacity * (layer.animation === "none" ? 1 : progress),
      transform: `translate(-50%, -50%) translateY(${layer.animation === "slide" ? (1 - progress) * unit * 0.04 : 0}px) rotate(${layer.rotation}deg) scale(${layer.animation === "zoom" ? 0.8 + progress * 0.2 : 1})`,
      fontFamily, fontSize: layer.fontSize * unit, fontWeight: 600, lineHeight: 1.2,
      color: layer.color ?? "#ffffff", textAlign: "center", overflowWrap: "anywhere",
      ...(layer.type === "badge" ? { background: layer.background ?? props.palette[1], borderRadius: unit * 0.012, padding: unit * 0.012, boxSizing: "border-box" as const } : {}),
    }}>
      {src ? <Img src={src} style={{ display: "block", width: "100%", height: size, objectFit: "contain" }} /> : layer.text}
    </div>
  </AbsoluteFill>;
}

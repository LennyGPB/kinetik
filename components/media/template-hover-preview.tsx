"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { isStageTemplate } from "@/components/media/stage-thumbnail";
import type { VideoFormatId } from "@/config/formats";
import type { VideoStyle } from "@/config/styles";
import { demoVideoProps } from "@/lib/projects/demo-video";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS } from "@/remotion/props";

/**
 * One immediately playing, muted demo, cropped to the thumbnail without stretching.
 * `grow` (> 1): the preview leaves the card and widens smoothly to `grow` × its width, centred, revealing more of the video
 * (the video keeps the card's height, so it is never distorted). The parent must not clip it (no overflow-hidden).
 * 3D templates play a loop pre-rendered by the real engine (scripts/render-stage-previews.ts): computing Three.js live on hover
 * took seconds before the first frame. Their square thumbnail shows instantly meanwhile; a missing file falls back to the live player.
 */
export function TemplateHoverPreview({ style, locale, format = "SQUARE", frameRatio = 2 / 3, grow }: {
  style: VideoStyle; locale: "fr" | "en"; format?: VideoFormatId; frameRatio?: number; grow?: number;
}) {
  const props = useMemo(() => demoVideoProps(style, format, locale), [style, format, locale]);
  const playerRef = useRef<PlayerRef>(null);
  const [clipFailed, setClipFailed] = useState(false);
  const clip = isStageTemplate(style.id) && !clipFailed;
  useLayoutEffect(() => { playerRef.current?.play(); }, [clip]);
  const { width, height } = clip ? DIMENSIONS.SQUARE : DIMENSIONS[format];
  const ratio = width / height;
  const player = clip
    ? <video src={`/templates/${style.id}-preview-${locale}.mp4`} poster={`/templates/${style.id}-square.jpg`} autoPlay muted loop playsInline preload="auto" onError={() => setClipFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    : <Player ref={playerRef} component={KinetikVideo} inputProps={props} compositionWidth={width} compositionHeight={height} durationInFrames={durationInFrames(props.graph)} fps={FPS} autoPlay loop controls={false} clickToPlay={false} initiallyMuted style={{ width: "100%", height: "100%" }} />;
  if (grow && grow > 1) {
    return <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 z-20 overflow-hidden rounded-2xl shadow-[0_24px_60px_-18px_rgb(0_0_0/0.55)]"
      style={{ x: "-50%" }}
      initial={{ width: "100%" }}
      animate={{ width: `${grow * 100}%` }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Vidéo calée sur la hauteur de la carte et centrée : l'élargissement dévoile ses côtés */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2" style={{ aspectRatio: `${width} / ${height}` }}>{player}</div>
    </motion.div>;
  }
  return <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: `${Math.max(1, ratio / frameRatio) * 100}%`, height: `${Math.max(1, frameRatio / ratio) * 100}%` }}>
      {player}
    </div>
  </div>;
}

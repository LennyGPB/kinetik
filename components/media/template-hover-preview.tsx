"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { VideoFormatId } from "@/config/formats";
import type { VideoStyle } from "@/config/styles";
import { demoVideoProps } from "@/lib/projects/demo-video";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS } from "@/remotion/props";

/** One immediately playing, muted demo, cropped to the thumbnail without stretching. */
export function TemplateHoverPreview({ style, locale, format = "SQUARE", frameRatio = 2 / 3 }: {
  style: VideoStyle; locale: "fr" | "en"; format?: VideoFormatId; frameRatio?: number;
}) {
  const props = useMemo(() => demoVideoProps(style, format, locale), [style, format, locale]);
  const playerRef = useRef<PlayerRef>(null);
  useLayoutEffect(() => { playerRef.current?.play(); }, []);
  const { width, height } = DIMENSIONS[format];
  const ratio = width / height;
  return <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: `${Math.max(1, ratio / frameRatio) * 100}%`, height: `${Math.max(1, frameRatio / ratio) * 100}%` }}>
      <Player ref={playerRef} component={KinetikVideo} inputProps={props} compositionWidth={width} compositionHeight={height} durationInFrames={durationInFrames(props.graph)} fps={FPS} autoPlay loop controls={false} clickToPlay={false} initiallyMuted style={{ width: "100%", height: "100%" }} />
    </div>
  </div>;
}

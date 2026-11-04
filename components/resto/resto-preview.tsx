"use client";

import { Player, type PlayerRef } from "@remotion/player";
import type { RefObject } from "react";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS, videoDimensions, type VideoProps } from "@/remotion/props";

/** Aperçu joué dans le navigateur : gratuit, aucun rendu serveur. La clé remonte le lecteur quand la durée change. */
export function RestoPreview({ videoProps, playerRef, label, compact = false }: { videoProps: VideoProps; playerRef?: RefObject<PlayerRef | null>; label: string; compact?: boolean }) {
  const { width, height } = videoDimensions(videoProps);
  const frames = durationInFrames(videoProps.graph);
  return (
    <div className="mx-auto w-full" style={{ maxWidth: `min(100%, calc(${compact ? 42 : 70}dvh * ${width / height}))` }}>
      <div className="overflow-hidden rounded-2xl border border-line bg-black shadow-xl" style={{ aspectRatio: `${width} / ${height}` }} aria-label={label}>
        <Player
          key={`${frames}-${width}x${height}`}
          ref={playerRef}
          component={KinetikVideo}
          inputProps={videoProps}
          durationInFrames={frames}
          fps={FPS}
          compositionWidth={width}
          compositionHeight={height}
          controls
          autoPlay
          loop
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}

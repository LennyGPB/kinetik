"use client";

import { Player as RemotionPlayer, Thumbnail } from "@remotion/player";
import { durationInFrames, FPS, type VideoProps } from "@/remotion/props";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";

type Size = { width: number; height: number };

/**
 * Lecteurs Remotion de la galerie Créations, dans un fichier à part :
 * chargés à la demande pour ne pas alourdir le premier chargement de la landing (moteur vidéo + three.js).
 */
export function CommunityFrame({ props, frame, width, height }: { props: VideoProps; frame: number } & Size) {
  const total = durationInFrames(props.graph);
  return (
    <Thumbnail component={KinetikVideo} inputProps={props} durationInFrames={total} frameToDisplay={Math.min(total - 1, frame)} compositionWidth={width} compositionHeight={height} fps={FPS}
      style={width < height ? { width: "100%", height: "100%" } : { height: "100%", aspectRatio: `${width} / ${height}`, flexShrink: 0 }} />
  );
}

/** Prévisu muette au survol d'une carte (vidéo seule, sans contrôles). */
export function CommunityHoverPlayer({ props, width, height }: { props: VideoProps } & Size) {
  return <RemotionPlayer component={KinetikVideo} inputProps={props} durationInFrames={durationInFrames(props.graph)} compositionWidth={width} compositionHeight={height} fps={FPS} autoPlay loop initiallyMuted controls={false} style={width < height ? { width: "100%", height: "100%" } : { width: "100%", aspectRatio: `${width} / ${height}` }} />;
}

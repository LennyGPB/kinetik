"use client";

import { Player } from "@remotion/player";
import { useMemo } from "react";
import { videoTypeDemoProps, type VideoTypeDemoInput } from "@/lib/projects/video-type-demo";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS } from "@/remotion/props";
import { cn } from "@/lib/utils";

/** Exemple animé du type de vidéo choisi, avec le nom, le logo, les captures et les couleurs déjà saisis. */
export function VideoTypePreview({ className, ...input }: Omit<VideoTypeDemoInput, "locale"> & { className?: string }) {
  const t = useDictionary();
  const c = t.app.create.videoType;
  const { type, appName, styleId, colors, format, logoUrl, screens } = input;
  const props = useMemo(
    () => videoTypeDemoProps({ type, appName, styleId, colors, format, logoUrl, screens, locale: t.locale === "en" ? "en" : "fr" }),
    [type, appName, styleId, colors, format, logoUrl, screens, t.locale],
  );
  const { width, height } = DIMENSIONS[format];
  return (
    <div className={cn("relative w-full overflow-hidden bg-black", className)} style={{ aspectRatio: `${width} / ${height}` }}>
      {/* `key` : l'exemple repart du début à chaque changement de type */}
      <Player
        key={type}
        component={KinetikVideo}
        inputProps={props}
        compositionWidth={width}
        compositionHeight={height}
        durationInFrames={durationInFrames(props.graph)}
        fps={FPS}
        autoPlay
        loop
        controls={false}
        clickToPlay={false}
        initiallyMuted
        style={{ width: "100%", height: "100%" }}
      />
      <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">{c.previewBadge}</span>
    </div>
  );
}

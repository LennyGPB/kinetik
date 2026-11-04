"use client";

import { useMemo } from "react";
import { Player } from "@remotion/player";
import type { RestoStyleId } from "@/config/resto-templates";
import type { RestoContent } from "@/lib/resto/content";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS, videoDimensions } from "@/remotion/props";
import { restoVideoProps } from "./resto-form";
import { restoExample, restoExamplePhotos } from "./resto-examples";

/**
 * Un contenu Resto d'exemple, joué en boucle sans son ni commandes. `cover` : la vidéo remplit son cadre (recadrée au centre),
 * sinon elle garde ses proportions.
 */
export function RestoExampleVideo({ template, style, cover = false }: { template: RestoContent["template"]; style?: RestoStyleId; cover?: boolean }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const props = useMemo(() => restoVideoProps({ ...restoExample(template, locale, style), language: locale }, restoExamplePhotos(template), null), [template, style, locale]);
  const { width, height } = videoDimensions(props);
  const player = <Player component={KinetikVideo} inputProps={props} durationInFrames={durationInFrames(props.graph)} fps={FPS} compositionWidth={width} compositionHeight={height} autoPlay loop initiallyMuted acknowledgeRemotionLicense style={{ width: "100%", height: "100%" }} />;
  if (!cover) return player;
  return <div className="absolute inset-0 grid place-items-center overflow-hidden"><div className="w-full shrink-0" style={{ aspectRatio: `${width} / ${height}` }}>{player}</div></div>;
}

"use client";


import { Player } from "@remotion/player";
import { getStyle } from "@/config/styles";
import { demoVideoProps } from "@/lib/projects/demo-video";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS } from "@/remotion/props";
import type { VideoFormatId } from "@/config/formats";
import { siteConfig } from "@/config/site";

export default function HeroDemoVideo({ format, className }: { format: VideoFormatId; className?: string }) {
  const props = demoVideoProps(getStyle("gradient-flow")!, format, "en");
  props.appName = "Kinetik";
  props.logoUrl = "/medias/logo_kinetik_blanc.png";
  props.websiteUrl = siteConfig.url;
  props.graph.scenes = props.graph.scenes.map((scene) => scene.kind === "stat"
    ? { ...scene, kind: "feature", title: "Made for every screen", subtitle: "16:9 · 9:16 · 1:1" }
    : { ...scene, title: scene.title.replaceAll("Flowly", "Kinetik") });
  return <div className={className}><Player component={KinetikVideo} inputProps={props} compositionWidth={DIMENSIONS[format].width} compositionHeight={DIMENSIONS[format].height} durationInFrames={durationInFrames(props.graph)} fps={FPS} autoPlay loop controls={false} clickToPlay={false} style={{ width: "100%", height: "100%" }} /></div>;
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { getStyle } from "@/config/styles";
import { demoVideoProps } from "@/lib/projects/demo-video";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS } from "@/remotion/props";

export default function MotionModePreview({ templateId, fr }: { templateId: string; fr: boolean }) {
  const container = useRef<HTMLDivElement>(null), player = useRef<PlayerRef>(null);
  const props = useMemo(() => demoVideoProps(getStyle(templateId)!, "LANDSCAPE", fr ? "fr" : "en"), [templateId, fr]);
  useEffect(() => {
    let visible = false;
    const sync = () => { if (visible && !document.hidden) player.current?.play(); else player.current?.pause(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    if (container.current) observer.observe(container.current);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  return <div ref={container} className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
    <Player ref={player} component={KinetikVideo} inputProps={props} compositionWidth={960} compositionHeight={540} durationInFrames={durationInFrames(props.graph)} fps={FPS} loop controls={false} clickToPlay={false} spaceKeyToPlayOrPause={false} initiallyMuted style={{ width: "100%", height: "100%" }} />
  </div>;
}

"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Player, type PlayerRef } from "@remotion/player";
import { useReducedMotion } from "motion/react";
import { useRef } from "react";
import { LOGO_LAYOUTS, type LogoLayout } from "@/config/recipes";

import { cn } from "@/lib/utils";
import type { VideoProps } from "@/remotion/props";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";

export function LogoLayoutPicker({ videoProps, value, defaultValue, disabled, onChange }: {
  videoProps: VideoProps;
  value: LogoLayout;
  defaultValue: LogoLayout;
  disabled?: boolean;
  onChange: (value: LogoLayout) => void;
}) {
  return (
    <div className="grid max-h-[26rem] grid-cols-2 gap-2 overflow-y-auto p-0.5">
      {LOGO_LAYOUTS.map((layout) => (
        <LogoOption key={layout} layout={layout} videoProps={videoProps} selected={layout === value} template={layout === defaultValue} disabled={disabled} onChoose={() => onChange(layout)} />
      ))}
    </div>
  );
}

function LogoOption({ layout, videoProps, selected, template, disabled, onChoose }: {
  layout: LogoLayout;
  videoProps: VideoProps;
  selected: boolean;
  template: boolean;
  disabled?: boolean;
  onChoose: () => void;
}) {
  const t = useDictionary();

  const descriptions: Record<LogoLayout, string> = {
  orbit: t.copy["aa61eddc0f39"],
  poster: t.copy["6ccc221a69ed"],
  echo: t.copy["b01aacad32d4"],
  emblem: t.copy["9a893f6825e9"],
  signature: t.copy["cf59dc68da1b"],
  "app-icon": t.copy["e3e0e22a66ed"],
  typographic: t.copy["b45ab31d7dbf"],
  product: t.copy["f3b328cd630a"],
};

  const ref = useRef<PlayerRef>(null);
  const reduceMotion = useReducedMotion();
  const scene = videoProps.graph.scenes.find((item) => item.kind === "logo");
  if (!scene) return null;
  const preview: VideoProps = {
    ...videoProps,
    musicSrc: null,
    watermark: false,
    format: "LANDSCAPE",
    graph: { ...videoProps.graph, logoLayout: layout, scenes: [{ ...scene, logoLayout: layout, logoBackground: videoProps.graph.logoBackground, duration: 3, transition: "cut" }] },
  };
  const start = () => {
    if (reduceMotion || disabled) return;
    ref.current?.seekTo(0);
    ref.current?.play();
  };
  const stop = () => {
    ref.current?.pause();
    ref.current?.seekTo(70);
  };
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => !selected && onChoose()}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className={cn("overflow-hidden rounded-lg border text-left transition-colors disabled:opacity-50", selected ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}
    >
      <div aria-hidden="true" className="pointer-events-none aspect-video overflow-hidden border-b border-line">
        <Player ref={ref} component={KinetikVideo} inputProps={preview} compositionWidth={640} compositionHeight={360} durationInFrames={90} fps={30} initialFrame={70} loop controls={false} clickToPlay={false} style={{ width: "100%", height: "100%" }} />
      </div>
      <span className="block px-2.5 py-2">
        <span className="block text-xs font-medium text-fg">{t.app.editor.logoLayouts[layout]}</span>
        <span className="mt-1 block text-[11px] leading-relaxed text-muted">{descriptions[layout]}</span>
        {template && <span className="mt-1 block text-[10px] text-accent-text">{t.copy["03555edd4361"]}</span>}
        {layout === "product" && videoProps.screenUrls.length === 0 && <span className="mt-1 block text-[10px] text-muted">{t.copy["f0b9be896118"]}</span>}
      </span>
    </button>
  );
}

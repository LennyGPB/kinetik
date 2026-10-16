"use client";

import { Player } from "@remotion/player";
import { useState } from "react";
import Link from "@/lib/i18n/navigation";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { getStyle } from "@/config/styles";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { demoVideoProps } from "@/lib/projects/demo-video";
import { cn } from "@/lib/utils";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS } from "@/remotion/props";

/** Position de chaque carte dans l'éventail (gauche, centre, droite). */
const FAN = ["-rotate-6 translate-y-3", "z-10 -translate-y-1", "rotate-6 translate-y-3"];

/**
 * Templates mis en avant (bloc de création du dashboard), en éventail.
 * La carte active joue la vraie démo du template ; survol ou focus change de carte. Un seul lecteur à la fois.
 */
export function TemplateShowcase({ ids }: { ids: readonly string[] }) {
  const t = useDictionary();
  const styles = ids.map((id) => getStyle(id)).filter((style) => style !== undefined);
  const [activeId, setActiveId] = useState(styles[Math.floor(styles.length / 2)]?.id);
  const active = styles.find((style) => style.id === activeId);
  const props = active ? demoVideoProps(active, "PORTRAIT", t.locale) : null;
  const { width, height } = DIMENSIONS.PORTRAIT;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {styles.map((style, i) => {
        const isActive = style.id === activeId;
        return (
          <Link
            key={style.id}
            href={`/create?style=${style.id}`}
            onMouseEnter={() => setActiveId(style.id)}
            onFocus={() => setActiveId(style.id)}
            className={cn(
              "group relative aspect-[9/16] w-[30%] max-w-44 overflow-hidden rounded-2xl border bg-black shadow-[var(--shadow-lift)] transition-[transform,border-color] duration-500 ease-[var(--ease-out-expo)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
              FAN[i % FAN.length],
              isActive ? "scale-105 border-accent" : "border-line hover:scale-[1.02]",
            )}
          >
            {isActive && props ? (
              <Player
                key={style.id}
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
            ) : (
              <VideoPlaceholder ratio="9:16" palette={style.palette} scene={style.recipe.background} label="" bare />
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pt-10 pb-2.5 text-xs font-semibold text-white">{style.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

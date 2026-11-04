"use client";

import { useState } from "react";
import { Player, Thumbnail } from "@remotion/player";
import { ArrowUpRight, Gift } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS, videoDimensions, type VideoProps } from "@/remotion/props";
import { cn } from "@/lib/utils";

export type ContentItem = { id: string; name: string; type: string; welcome: boolean; videoProps: VideoProps };

/** Une vignette : une image de la vidéo au repos, la vidéo qui joue au survol (une seule à la fois). */
function Card({ item, badge, playing, onPlay, onStop, tilt }: { item: ContentItem; badge?: string; playing: boolean; onPlay: () => void; onStop: () => void; tilt?: number }) {
  const { width, height } = videoDimensions(item.videoProps);
  const frames = durationInFrames(item.videoProps.graph);
  const common = { component: KinetikVideo, inputProps: item.videoProps, durationInFrames: frames, fps: FPS, compositionWidth: width, compositionHeight: height, style: { width: "100%", height: "100%" } };
  return (
    <Link href={`/project/${item.id}`} onPointerEnter={(e) => { if (e.pointerType === "mouse") onPlay(); }} onPointerLeave={onStop} onFocus={onPlay} onBlur={onStop}
      className="group relative block overflow-hidden rounded-[1.4rem] border border-white/10 bg-black shadow-[0_24px_50px_-30px_rgb(0_0_0/0.9)] sm:[rotate:var(--tilt)] transition-[transform,rotate,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-1.5 hover:rotate-0 hover:border-violet-400/70 hover:shadow-[0_30px_60px_-24px_rgb(139_92_246/0.8)]"
      style={{ aspectRatio: "9 / 16", "--tilt": `${tilt ?? 0}deg` } as React.CSSProperties}>
      <div className="absolute inset-0 grid place-items-center">
        {/* Le 4:5 est centré dans la vignette 9:16 */}
        <div className="w-full" style={{ aspectRatio: `${width} / ${height}` }}>
          {playing ? <Player {...common} autoPlay loop initiallyMuted acknowledgeRemotionLicense /> : <Thumbnail {...common} frameToDisplay={Math.round(frames * 0.6)} />}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3.5 pt-14 pb-3.5">
        <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-white sm:text-sm">{item.name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-white/60">{item.type}</span>
      </div>
      {badge && item.welcome && <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[linear-gradient(145deg,#a78bfa,#7c3aed)] p-1.5 sm:px-2.5 sm:py-1 text-[11px] font-semibold text-white shadow-[0_6px_18px_-6px_rgb(139_92_246)]"><Gift className="size-3" /><span className="hidden sm:inline">{badge}</span></span>}
      <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/90 text-violet-700 opacity-0 transition-[opacity,transform] duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75"><ArrowUpRight className="size-4" /></span>
    </Link>
  );
}

/** Grille des contenus Resto. `fan` : les vignettes en éventail (vidéos de bienvenue). */
export function ContentGrid({ items, badge, fan = false }: { items: ContentItem[]; badge?: string; fan?: boolean }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const tilts = [-4, 0, 4];
  return (
    <ul className={cn(fan ? "-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:max-w-xl sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0" : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5")}>
      {items.map((item, i) => (
        <li key={item.id} className={cn(fan && "w-[58%] shrink-0 snap-center sm:w-auto", fan && i === 1 && "sm:-translate-y-3")}>
          <Card item={item} badge={badge} playing={playing === item.id} onPlay={() => setPlaying(item.id)} onStop={() => setPlaying((id) => (id === item.id ? null : id))} tilt={fan ? tilts[i % 3] : undefined} />
        </li>
      ))}
    </ul>
  );
}

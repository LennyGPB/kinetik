import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import type { SceneKind } from "@/config/styles";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./section-heading";

const ITEMS: { id: VideoFormatId; scene: SceneKind; palette: [string, string, string]; className: string }[] = [
  // Largeurs choisies pour que les trois cadres aient presque la même hauteur sur desktop
  { id: "LANDSCAPE", scene: "grid", palette: ["#0b1b3a", "#3b82f6", "#a78bfa"], className: "col-span-2 md:col-span-7" },
  { id: "PORTRAIT", scene: "type", palette: ["#140a2e", "#e9d5ff", "#f472b6"], className: "col-span-1 md:col-span-2" },
  { id: "SQUARE", scene: "bars", palette: ["#0a0a0a", "#facc15", "#a855f7"], className: "col-span-1 md:col-span-3" },
];

export function Formats() {
  return (
    <Section id="formats" className="overflow-hidden">
      <SectionHeading title={t.landing.formats.titleLine1} accent={t.landing.formats.titleLine2} subtitle={t.landing.formats.subtitle} />
      <RevealGroup className="mt-14 grid grid-cols-2 items-end gap-3 sm:gap-5 md:grid-cols-12" stagger={0.1}>
        {ITEMS.map((item) => {
          const format = VIDEO_FORMATS[item.id];
          const copy = t.landing.formats.items[item.id];
          return (
            <RevealItem key={item.id} className={cn("group flex flex-col gap-4", item.className)}>
              <div className="rounded-2xl border border-line-strong bg-surface p-1 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_30px_60px_-24px_var(--accent-glow)] sm:rounded-3xl sm:p-1.5">
                <VideoPlaceholder ratio={format.ratio} scene={item.scene} palette={item.palette} label="Flowly" className="rounded-xl sm:rounded-[1.25rem]" />
              </div>
              <div className="flex flex-col gap-1 px-1">
                <p className="font-display text-lg font-semibold">
                  {copy.label} <span className="font-mono text-sm font-normal text-accent-text">{format.ratio}</span>
                </p>
                <p className="text-[13px] text-muted">{copy.usage}</p>
              </div>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </Section>
  );
}

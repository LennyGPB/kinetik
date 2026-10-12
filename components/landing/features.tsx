import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./section-heading";

const f = t.landing.features.items;

function FeatureGraphic({ kind }: { kind: "beat" | "chat" | "brand" | "formats" | "fidelity" }) {
  const motion = "motion-safe:transition-transform motion-safe:duration-300";
  return (
    <span aria-hidden="true" className="relative flex h-9 w-12 shrink-0 items-center text-fg">
      {kind === "beat" && (
        <span className="relative flex h-7 items-center gap-1">
          {[10, 20, 28, 14, 22].map((height, index) => (
            <span key={index} style={{ height }} className={cn("w-0.5", index === 2 ? "bg-accent-text" : "bg-fg/50", motion, "motion-safe:group-hover:scale-y-75")} />
          ))}
          <span className={cn("absolute -left-1 h-8 w-px bg-fg", motion, "motion-safe:duration-700 motion-safe:group-hover:translate-x-8")} />
        </span>
      )}
      {kind === "chat" && (
        <span className={cn("relative flex h-6 w-9 -rotate-6 flex-col justify-center gap-1 border border-fg/50 px-1.5", motion, "motion-safe:group-hover:rotate-0")}>
          <span className="h-px w-4 bg-fg/60" /><span className="h-px w-3 bg-fg/30" />
          <span className={cn("absolute -right-1 -bottom-1 h-3 w-px bg-accent-text", motion, "motion-safe:group-hover:-translate-x-2")} />
        </span>
      )}
      {kind === "brand" && (
        <span className="relative flex items-center">
          <span className={cn("absolute top-0 left-0 h-6 w-4 -rotate-12 border border-fg/30 bg-surface", motion, "motion-safe:group-hover:-translate-x-1 motion-safe:group-hover:-rotate-20")} />
          <span className={cn("absolute top-0 left-2 h-6 w-4 rotate-12 border border-accent-text/60 bg-surface", motion, "motion-safe:group-hover:rotate-20")} />
          <span className="relative ml-3 mt-1 font-heading text-xl font-extralight">Aa</span>
        </span>
      )}
      {kind === "formats" && (
        <span className="flex items-end gap-1">
          <span className={cn("h-4 w-6 -rotate-6 border border-fg/50", motion, "motion-safe:group-hover:-translate-y-1")} />
          <span className={cn("h-7 w-3 rotate-6 border border-accent-text/70", motion, "motion-safe:group-hover:rotate-0")} />
        </span>
      )}
      {kind === "fidelity" && (
        <span className={cn("relative grid size-8 -rotate-6 place-items-center border border-fg/40", motion, "motion-safe:group-hover:rotate-0")}>
          <span className="absolute -top-px -left-px size-2 border-t border-l border-accent-text" />
          <span className="absolute -right-px -bottom-px size-2 border-r border-b border-accent-text" />
          <span className="font-mono text-[9px]">1:1</span>
        </span>
      )}
    </span>
  );
}

function Card({
  icon,
  title,
  description,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <RevealItem
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-bg-subtle transition-colors duration-300 hover:border-line-strong",
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-60" />
      <div className="relative flex min-h-48 flex-1 items-center justify-center p-5 sm:p-6">{children}</div>
      <div className="relative border-t border-line p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="mt-2 text-[15px] text-muted">{description}</p>
      </div>
    </RevealItem>
  );
}

// Hauteurs déterministes (pas de Math.random : rendu identique serveur/client)
const WAVE = Array.from({ length: 64 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) * 0.75);
const BEATS = [8, 20, 32, 44, 56];

function BeatSync() {
  return (
    <div className="w-full max-w-xl">
      <div className="relative flex h-24 items-center gap-[3px]">
        {WAVE.map((h, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-full", BEATS.includes(i) ? "bg-accent" : "bg-fg/15")}
            style={{ height: `${h * 100}%` }}
          />
        ))}
        <div className="pointer-events-none absolute inset-y-[-8px] left-0 w-full animate-[playhead_6s_linear_infinite] will-change-transform">
          <div className="h-full w-0.5 rounded-full bg-fg shadow-[0_0_12px_var(--accent-glow)]" />
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        {[
          ["Intro", "w-[18%]", "from-violet-500 to-fuchsia-500"],
          ["Logo", "w-[19%]", "from-indigo-500 to-violet-500"],
          ["Feature", "w-[19%]", "from-fuchsia-500 to-pink-500"],
          ["Screens", "w-[19%]", "from-sky-500 to-indigo-500"],
          ["CTA", "flex-1", "from-violet-600 to-purple-400"],
        ].map(([name, w, g]) => (
          <div key={name} className={cn("h-9 rounded-lg bg-gradient-to-r px-2 py-1.5 text-[11px] font-medium text-white", w, g)}>
            {name}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between font-mono text-[10px] text-subtle">
        <span>0:00</span>
        <span className="text-accent-text">128 BPM</span>
        <span>0:30</span>
      </div>
    </div>
  );
}

function ChatDemo() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2.5 text-sm">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent-gradient px-3.5 py-2.5 text-white shadow-[0_8px_24px_-10px_var(--accent-glow)]">
        {t.landing.features.chatDemo.user}
      </div>
      <div className="flex items-end gap-2">
        <LogoMark className="size-6 rounded-md" />
        <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 text-muted">
          {t.landing.features.chatDemo.assistant}
        </div>
      </div>
      <div className="flex items-center gap-2 pl-8">
        <span className="flex gap-1 rounded-full border border-line bg-surface px-3 py-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 animate-bounce rounded-full bg-subtle" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
      </div>
    </div>
  );
}

function BrandKit() {
  return (
    <div className="flex w-full max-w-xs items-center gap-4">
      <div className="grid size-20 shrink-0 place-items-center rounded-2xl border border-line bg-surface shadow-[var(--shadow-soft)]">
        <LogoMark className="size-11 rounded-xl" />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex -space-x-2">
          {["#7c3aed", "#d946ef", "#0ea5e9", "#0b0b14"].map((c) => (
            <span key={c} className="size-8 rounded-full ring-[3px] ring-bg-subtle transition-transform group-hover:-translate-y-1" style={{ background: c }} />
          ))}
        </div>
        <div className="flex items-baseline gap-2 rounded-xl border border-line bg-surface px-3 py-2">
          <span className="font-display text-2xl font-bold">Aa</span>
          <span className="truncate text-xs text-muted">Bricolage · Geist</span>
        </div>
      </div>
    </div>
  );
}

function Formats() {
  return (
    <div className="relative flex h-40 w-full max-w-xs items-end justify-center gap-3">
      <div className="aspect-video w-[52%] rounded-lg border-2 border-accent/70 bg-accent-soft transition-transform duration-500 group-hover:-translate-y-1" />
      <div className="aspect-[9/16] w-[22%] rounded-lg border-2 border-fuchsia-500/70 bg-fuchsia-500/10 transition-transform delay-75 duration-500 group-hover:-translate-y-2" />
      <div className="aspect-square w-[26%] rounded-lg border-2 border-indigo-500/70 bg-indigo-500/10 transition-transform delay-150 duration-500 group-hover:-translate-y-1" />
    </div>
  );
}

function Fidelity() {
  return (
    <div className="relative grid size-36 place-items-center">
      <div className="absolute inset-0 rounded-2xl border border-dashed border-accent/50" />
      {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-right-1 -bottom-1"].map((pos) => (
        <span key={pos} className={cn("absolute size-2 rounded-[2px] border border-accent bg-bg", pos)} />
      ))}
      <span className="absolute inset-x-0 top-1/2 h-px bg-accent/20" />
      <span className="absolute inset-y-0 left-1/2 w-px bg-accent/20" />
      <LogoMark className="size-16 rounded-2xl transition-transform duration-700 group-hover:scale-110" />
      <span className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-fg px-2 py-0.5 font-mono text-[10px] text-bg">
        <Lock className="size-2.5" /> 100%
      </span>
    </div>
  );
}

export function Features() {
  return (
    <Section id="features">
      <SectionHeading title={t.landing.features.titleLine1} accent={t.landing.features.titleLine2} />
      <RevealGroup className="mt-14 grid gap-4 md:grid-cols-6" stagger={0.08}>
        <Card className="md:col-span-4" icon={<FeatureGraphic kind="beat" />} title={f.beat.title} description={f.beat.description}>
          <BeatSync />
        </Card>
        <Card className="md:col-span-2" icon={<FeatureGraphic kind="chat" />} title={f.chat.title} description={f.chat.description}>
          <ChatDemo />
        </Card>
        <Card className="md:col-span-2" icon={<FeatureGraphic kind="brand" />} title={f.brand.title} description={f.brand.description}>
          <BrandKit />
        </Card>
        <Card className="md:col-span-2" icon={<FeatureGraphic kind="formats" />} title={f.formats.title} description={f.formats.description}>
          <Formats />
        </Card>
        <Card className="md:col-span-2" icon={<FeatureGraphic kind="fidelity" />} title={f.fidelity.title} description={f.fidelity.description}>
          <Fidelity />
        </Card>
      </RevealGroup>
    </Section>
  );
}

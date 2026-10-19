import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
import { EditorShowcase } from "./editor-showcase";
import { Section, SectionHeading } from "./section-heading";

function EditorGlyph() {
  const motion = "motion-safe:transition-transform motion-safe:duration-300";
  return (
    <span aria-hidden="true" className="relative flex h-9 w-12 shrink-0 items-center text-fg">
      <span className={cn("relative flex h-7 w-10 -rotate-6 flex-col justify-end border border-fg/50 p-1", motion, "motion-safe:group-hover:rotate-0")}>
        <span className="flex gap-0.5"><span className="h-1 w-3 bg-fg/40" /><span className="h-1 w-2 bg-accent-text" /><span className="h-1 flex-1 bg-fg/40" /></span>
        <span className={cn("absolute top-1 left-1.5 size-3 border border-accent-text", motion, "motion-safe:duration-500 motion-safe:group-hover:translate-x-4")} />
      </span>
    </span>
  );
}

export function Features() {
  const t = useDictionary();
  const editor = t.landing.features.items.editor;

  return (
    <Section id="features">
      <SectionHeading title={t.landing.features.titleLine1} accent={t.landing.features.titleLine2} />
      <EditorShowcase label={editor.title} />
      <Reveal className="group mx-auto mt-20 flex max-w-2xl flex-col items-center px-2 text-center sm:mt-24 sm:px-0">
        {/* Mobile: icon above the title so the heading stays centred; side by side from sm. */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-2.5">
          <EditorGlyph />
          <h3 className="text-lg font-semibold text-balance sm:text-xl">{editor.title}</h3>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted sm:mt-2">{editor.description}</p>
      </Reveal>
    </Section>
  );
}

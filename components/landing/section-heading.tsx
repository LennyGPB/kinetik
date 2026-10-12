import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  accent,
  subtitle,
  align = "center",
  className,
  children,
}: {
  /** Surtitre facultatif au-dessus du titre */
  eyebrow?: string;
  title: ReactNode;
  accent?: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Reveal className={cn("flex flex-col gap-4", align === "center" ? "mx-auto max-w-2xl items-center text-center" : "max-w-xl", accent && "max-w-5xl", className)}>
      {eyebrow && (
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-accent-text uppercase">
          <span className="h-px w-5 bg-accent/60" />
          {eyebrow}
        </span>
      )}
      <h2 className="text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.02] font-bold">
        {title}
        {accent && (
          <span className="block font-heading text-[clamp(1.5rem,4.4vw,3.5rem)] font-extralight text-accent-text">
            {accent}
          </span>
        )}
      </h2>
      {subtitle && <p className="text-base text-muted sm:text-lg">{subtitle}</p>}
      {children}
    </Reveal>
  );
}

export function Section({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("relative px-4 py-12 sm:px-6 sm:py-16 lg:py-20", className)}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

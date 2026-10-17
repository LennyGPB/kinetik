"use client";

import { purpleButtonStyle } from "@/components/ui/button";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useId, useState } from "react";
import { Reveal } from "@/components/motion/reveal";

import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./section-heading";

export function Faq() {
  const t = useDictionary();

  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <SectionHeading title={t.landing.faq.title} align="left" />
        <Reveal className="divide-y divide-line border-y border-line">
          {t.landing.faq.items.map((item, i) => {
            const isOpen = open === i;
            const panelId = `${baseId}-panel-${i}`;
            const buttonId = `${baseId}-button-${i}`;
            return (
              <div key={item.q}>
                <h3 className="font-sans text-base tracking-normal">
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-medium transition-colors hover:text-accent-text"
                  >
                    {item.q}
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 26 }}
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full border transition-colors",
                        isOpen ? purpleButtonStyle : "border-line-strong text-muted group-hover:border-accent/50",
                      )}
                    >
                      <Plus className="size-4" />
                    </motion.span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-expo)]",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pr-12 pb-6 text-[15px] leading-relaxed text-muted">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </Section>
  );
}

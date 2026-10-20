import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Reveal } from "@/components/motion/reveal";
import { PackCards, PlanCards } from "@/components/pricing/pricing-cards";

import { Section, SectionHeading } from "./section-heading";

export function Pricing() {
  const t = useDictionary();

  const p = t.landing.pricing;

  return (
    <Section id="pricing">
      <SectionHeading title={p.titleLine1} accent={p.titleLine2} />
      <div className="mt-10">
        <PlanCards />
      </div>
      <div className="mx-auto mt-14 max-w-3xl">
        <Reveal className="text-center">
          <h3 className="text-xl font-semibold">{p.packsTitle}</h3>
          <p className="mt-1 text-sm text-muted">{p.packsSubtitle}</p>
        </Reveal>
        <div className="mt-5">
          <PackCards reveal />
        </div>
      </div>
    </Section>
  );
}

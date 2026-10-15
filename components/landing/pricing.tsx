import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Reveal } from "@/components/motion/reveal";
import { CreditCosts } from "@/components/pricing/credit-costs";
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
      <div className="mt-16 grid gap-8 lg:grid-cols-5 lg:gap-10">
        <div className="lg:col-span-3">
          <Reveal>
            <h3 className="text-2xl font-semibold">{p.packsTitle}</h3>
            <p className="mt-1.5 text-muted">{p.packsSubtitle}</p>
          </Reveal>
          <div className="mt-6">
            <PackCards reveal />
          </div>
        </div>
        <div className="lg:col-span-2">
          <Reveal delay={0.1}>
            <h3 className="text-2xl font-semibold">{p.costsTitle}</h3>
          </Reveal>
          <CreditCosts className="mt-6" reveal />
          <Reveal delay={0.7}>
            <p className="mt-3 text-xs text-subtle">{p.provisional}</p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

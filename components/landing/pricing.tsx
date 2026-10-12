import { Reveal } from "@/components/motion/reveal";
import { CreditCosts } from "@/components/pricing/credit-costs";
import { PackCards, PlanCards } from "@/components/pricing/pricing-cards";
import { t } from "@/lib/i18n";
import { Section, SectionHeading } from "./section-heading";

const p = t.landing.pricing;

export function Pricing() {
  return (
    <Section id="pricing">
      <SectionHeading title={p.titleLine1} accent={p.titleLine2} />
      <div className="mt-10">
        <PlanCards />
      </div>
      <Reveal className="mt-16 grid gap-8 lg:grid-cols-5 lg:gap-10">
        <div className="lg:col-span-3">
          <h3 className="text-2xl font-semibold">{p.packsTitle}</h3>
          <p className="mt-1.5 text-muted">{p.packsSubtitle}</p>
          <div className="mt-6">
            <PackCards />
          </div>
        </div>
        <div className="lg:col-span-2">
          <h3 className="text-2xl font-semibold">{p.costsTitle}</h3>
          <CreditCosts className="mt-6" />
          <p className="mt-3 text-xs text-subtle">{p.provisional}</p>
        </div>
      </Reveal>
    </Section>
  );
}

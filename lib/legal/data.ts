import { CREDIT_COSTS, EDIT_PRICING } from "@/config/credits";
import { LEGAL_PLACEHOLDER, legalConfig } from "@/config/legal";
import { CREDIT_PACKS, RESTO_PLAN, SUBSCRIPTION_PLANS, formatPrice, restoVatFactor } from "@/config/pricing";
import { intlLocale, type Locale } from "@/lib/i18n";

/** Valeurs injectées dans les textes légaux : tarifs et coûts lus dans la config, pour rester synchronisés. */
export function legalData(locale: Locale) {
  const price = (amount: number) => formatPrice(amount, intlLocale[locale]);
  const or = (value: string | null) => value ?? LEGAL_PLACEHOLDER[locale];
  const { export: exp } = CREDIT_COSTS;
  return {
    ...legalConfig,
    name: or(legalConfig.publisherName),
    address: or(legalConfig.publisherAddress),
    status: legalConfig.status[locale],
    mediator: legalConfig.mediator,
    placeholder: LEGAL_PLACEHOLDER[locale],
    updated: new Intl.DateTimeFormat(intlLocale[locale], { dateStyle: "long", timeZone: "UTC" }).format(new Date(legalConfig.updatedAt)),
    // Prix payés : l'offre Resto est affichée hors taxes, la TVA s'y ajoute si l'éditeur n'est plus en franchise
    paidPlans: SUBSCRIPTION_PLANS.map((p) => {
      const vat = p.id === "RESTO" ? restoVatFactor() : 1;
      const at = (amount: number) => price(Math.round(amount * vat * 100) / 100);
      return { name: p.name, credits: p.credits, quality: p.maxQuality === "HD" ? "1080p" : "720p", monthly: at(p.monthlyPrice), yearly: at(p.yearlyPrice * 12), yearlyPerMonth: at(p.yearlyPrice) };
    }),
    resto: { pack: RESTO_PLAN.packCredits, plat: RESTO_PLAN.platCredits },
    packs: CREDIT_PACKS.map((p) => ({ credits: p.credits, price: price(p.price) })),
    costs: {
      generation: CREDIT_COSTS.generation, edit: CREDIT_COSTS.edit, editMax: EDIT_PRICING.max, editUnchanged: EDIT_PRICING.unchanged, translation: CREDIT_COSTS.translation, exportShort: exp.short, exportLong: exp.long, shortMaxSeconds: exp.shortMaxSeconds, export3dMultiplier: exp.premium3dMultiplier,
      pitchAnalysis: CREDIT_COSTS.pitch.analysis, pitchCreation: CREDIT_COSTS.pitch.creation,
      voicePerUnit: CREDIT_COSTS.voiceover.perUnit, voiceCharacters: CREDIT_COSTS.voiceover.perCharacters, voiceScript: CREDIT_COSTS.voiceover.script,
      recordingImport: CREDIT_COSTS.recordingImport,
      post: CREDIT_COSTS.post, store: CREDIT_COSTS.store,
    },
  };
}

export type LegalData = ReturnType<typeof legalData>;

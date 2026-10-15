import type { Locale } from "@/lib/i18n";
import { legalEn } from "./content.en";
import { legalFr } from "./content.fr";
import { legalData } from "./data";
import type { LegalDoc, LegalSlug } from "./types";

export { LEGAL_SLUGS, type LegalBlock, type LegalDoc, type LegalSlug } from "./types";

export function getLegalDocs(locale: Locale): Record<LegalSlug, LegalDoc> {
  const data = legalData(locale);
  return locale === "fr" ? legalFr(data) : legalEn(data);
}

export function getLegalUpdatedAt(locale: Locale) {
  return legalData(locale).updated;
}

/** Libellés courts de la navigation entre documents */
export const LEGAL_NAV: Record<Locale, Record<LegalSlug, string>> = {
  fr: { legal: "Mentions légales", terms: "CGU / CGV", privacy: "Confidentialité", cookies: "Cookies" },
  en: { legal: "Legal notice", terms: "Terms", privacy: "Privacy", cookies: "Cookies" },
};

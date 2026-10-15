import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { getLegalDocs, type LegalSlug } from "@/lib/legal";

export async function legalMetadata(slug: LegalSlug): Promise<Metadata> {
  const value = await getLocale();
  const locale = isLocale(value) ? value : "en";
  const doc = getLegalDocs(locale)[slug];
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `/${locale}/${slug}`, languages: { en: `/en/${slug}`, fr: `/fr/${slug}`, "x-default": `/en/${slug}` } },
  };
}

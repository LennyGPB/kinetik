import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { LEGAL_SLUGS } from "@/lib/legal/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { en: `${siteConfig.url}/en`, fr: `${siteConfig.url}/fr` };
  const home = ["en", "fr"].map((locale) => ({ url: `${siteConfig.url}/${locale}`, alternates: { languages }, changeFrequency: "weekly" as const, priority: locale === "en" ? 1 : 0.9 }));
  const legal = LEGAL_SLUGS.flatMap((slug) => ["en", "fr"].map((locale) => ({
    url: `${siteConfig.url}/${locale}/${slug}`,
    alternates: { languages: { en: `${siteConfig.url}/en/${slug}`, fr: `${siteConfig.url}/fr/${slug}` } },
    changeFrequency: "yearly" as const,
    priority: 0.3,
  })));
  return [...home, ...legal];
}

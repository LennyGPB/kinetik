import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PlatformMarquee } from "@/components/landing/platform-marquee";
import { Pricing } from "@/components/landing/pricing";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { StyleGallery } from "@/components/landing/style-gallery";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerDictionary();
  return { title: { absolute: t.meta.title }, description: t.meta.description,
    alternates: { canonical: `/${locale}`, languages: { en: "/en", fr: "/fr", "x-default": "/en" } },
    openGraph: { title: t.meta.title, description: t.meta.description, url: `${siteConfig.url}/${locale}`, locale: locale === "fr" ? "fr_FR" : "en_US", alternateLocale: locale === "fr" ? "en_US" : "fr_FR" },
  };
}

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="overflow-x-clip">
        <Hero />
        <PlatformMarquee />
        <StyleGallery />
        <HowItWorks />
        <Features />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

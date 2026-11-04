import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { RestaurantsLanding } from "@/components/resto/restaurants-landing";
import { isFeatureEnabled } from "@/config/features";
import { getPlan } from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/dal";
import { landingCopy } from "@/lib/resto/landing-copy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const l = landingCopy(locale).meta;
  return {
    title: { absolute: l.title }, description: l.description,
    alternates: { canonical: `/${locale}/restaurants`, languages: { en: "/en/restaurants", fr: "/fr/restaurants" } },
    openGraph: { title: l.title, description: l.description, url: `${siteConfig.url}/${locale}/restaurants` },
    // Pas indexée tant que l'offre n'est pas publiée
    ...(!isFeatureEnabled("resto") && { robots: { index: false, follow: false } }),
  };
}

/** Avant la publication de la feature : page réservée aux admins (lecture de session, sous Suspense). */
async function AdminOnly({ children }: { children: ReactNode }) {
  if ((await getCurrentUser())?.role !== "ADMIN") notFound();
  return children;
}

/** Page publique Kinetik Resto : visible quand la feature est publiée (et par les admins avant). */
export default function RestaurantsPage() {
  const plan = getPlan("RESTO");
  const page = (
    <>
      <SiteHeader />
      <main className="overflow-x-clip"><RestaurantsLanding monthly={plan.monthlyPrice} yearly={plan.yearlyPrice} /></main>
      <SiteFooter />
    </>
  );
  return isFeatureEnabled("resto") ? page : <Suspense fallback={null}><AdminOnly>{page}</AdminOnly></Suspense>;
}

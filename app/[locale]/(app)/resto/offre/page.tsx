import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { RestoOffer } from "@/components/resto/resto-offer";
import { getPlan, restoVatFactor } from "@/config/pricing";
import { requireUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";
import { canUseResto } from "@/lib/resto/access";
import { spaceCopy } from "@/lib/resto/space-copy";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: spaceCopy(t.locale).offer.kicker }; }

async function Offer() {
  const user = await requireUser();
  if (!canUseResto(user)) notFound();
  const plan = getPlan("RESTO");
  return <RestoOffer monthly={plan.monthlyPrice} yearly={plan.yearlyPrice} vatFactor={restoVatFactor()} subscribed={user.plan === "RESTO"} />;
}

/** Offre Kinetik Resto : vendue ici, jamais sur la page Tarifs générale. */
export default function RestoOfferPage() {
  return <Suspense fallback={<PageSkeleton withHeader={false} />}><Offer /></Suspense>;
}

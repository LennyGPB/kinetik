import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/app/page-skeleton";
import { RestoSettings, type RestoSettingsValue } from "@/components/resto/resto-settings";
import { RESTO_TEMPLATE_IDS } from "@/config/resto-templates";
import { formatPrice } from "@/config/pricing";
import { requireUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";
import { canUseResto } from "@/lib/resto/access";
import { getRestaurant } from "@/lib/resto/billing";
import { RESTO_NETWORKS } from "@/lib/resto/model";
import { spaceCopy } from "@/lib/resto/space-copy";
import { RESTO_TOPUP_PACK } from "@/lib/resto/topup";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: spaceCopy(t.locale).settings.title }; }

const pick = <T extends string>(values: string[], allowed: readonly T[]) => values.filter((v): v is T => (allowed as readonly string[]).includes(v));

async function Settings() {
  const user = await requireUser();
  if (!canUseResto(user)) notFound();
  const restaurant = await getRestaurant(user.id);
  if (!restaurant?.onboardedAt) redirect("/resto/bienvenue");
  const t = await getServerDictionary();
  const initial: RestoSettingsValue = {
    packContents: pick(restaurant.packContents, RESTO_TEMPLATE_IDS), networks: pick(restaurant.networks, RESTO_NETWORKS),
    packDay: restaurant.packDay, packEnabled: restaurant.packEnabled, autoTopUp: restaurant.autoTopUp,
  };
  return <RestoSettings initial={initial} topUpPrice={formatPrice(RESTO_TOPUP_PACK.price, t.locale === "en" ? "en-GB" : "fr-FR")} />;
}

export default async function RestoSettingsPage() {
  const t = await getServerDictionary();
  const s = spaceCopy(t.locale).settings;
  return (
    <div className="mx-auto max-w-xl pb-16">
      <PageHeader title={s.title} subtitle={s.subtitle} />
      <div className="mt-8"><Suspense fallback={<PageSkeleton withHeader={false} />}><Settings /></Suspense></div>
    </div>
  );
}

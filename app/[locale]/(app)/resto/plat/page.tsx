import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { PlatExpress } from "@/components/resto/plat-express";
import { RESTO_STYLE_IDS, type RestoStyleId } from "@/config/resto-templates";
import { requireUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";
import { localizedRedirect } from "@/lib/i18n/redirect";
import { canUseResto, needsRestoOffer } from "@/lib/resto/access";
import { getRestaurant } from "@/lib/resto/billing";
import { restoStart } from "@/lib/resto/pack";
import { spaceCopy } from "@/lib/resto/space-copy";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: spaceCopy(t.locale).express.title }; }

async function Express() {
  const user = await requireUser();
  if (!canUseResto(user)) notFound();
  if (needsRestoOffer(user)) await localizedRedirect("/resto/offre");
  const restaurant = await getRestaurant(user.id);
  // Sans accueil (restaurant, style), le formulaire complet prend le relais
  if (!restaurant?.onboardedAt) await localizedRedirect("/create?kind=dish");
  const { logo, format } = await restoStart(user.id);
  const style = (RESTO_STYLE_IDS as readonly string[]).includes(restaurant!.styleId ?? "") ? restaurant!.styleId as RestoStyleId : "bistrot";
  return <PlatExpress restaurantName={restaurant!.name} style={style} format={format} logo={logo} />;
}

/** Plat du jour express : une photo, et le reste vient de l'accueil et de la carte. */
export default function PlatExpressPage() {
  return <Suspense fallback={<PageSkeleton withHeader={false} />}><Express /></Suspense>;
}

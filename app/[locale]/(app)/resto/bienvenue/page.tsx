import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { RestoOnboarding } from "@/components/resto/resto-onboarding";
import { WaitForPlan } from "@/components/resto/wait-for-plan";
import { requireUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";
import { canUseResto } from "@/lib/resto/access";
import { getRestaurant } from "@/lib/resto/billing";
import { isPlacesConfigured } from "@/lib/resto/places";
import { spaceCopy } from "@/lib/resto/space-copy";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: spaceCopy(t.locale).welcome.title }; }

async function Welcome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!canUseResto(user)) notFound();
  if (user.plan !== "RESTO" && user.role !== "ADMIN") {
    // Retour de Stripe avant le webhook : on attend que l'abonnement soit enregistré
    if ((await searchParams).checkout === "success") return <WaitForPlan />;
    redirect("/resto/offre");
  }
  const restaurant = await getRestaurant(user.id);
  if (restaurant?.onboardedAt) redirect("/resto");
  return <RestoOnboarding initialName={restaurant?.name ?? ""} google={isPlacesConfigured()} />;
}

/** Accueil après paiement : une question par écran, puis 3 vidéos offertes. */
export default function RestoWelcomePage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Suspense fallback={<PageSkeleton withHeader={false} />}><Welcome searchParams={props.searchParams} /></Suspense>;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/app/page-skeleton";
import { CarteManager } from "@/components/resto/carte-manager";
import { requireUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";
import { canUseResto, needsRestoOffer } from "@/lib/resto/access";
import { localizedRedirect } from "@/lib/i18n/redirect";
import { getCarte } from "@/lib/resto/carte";
import { restoCopy } from "@/lib/resto/copy";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: restoCopy(t.locale).carte.title }; }

/** Lecture d'une carte par l'IA : quelques dizaines de secondes pour un PDF de plusieurs pages. */
export const maxDuration = 120;

async function CarteContent() {
  const user = await requireUser();
  if (!canUseResto(user)) notFound();
  // La lecture de carte utilise l'IA : réservée aux comptes avec une offre
  if (needsRestoOffer(user)) await localizedRedirect("/resto/offre");
  const carte = await getCarte(user.id);
  return <CarteManager initial={carte} available={carte !== null} returnTo="/resto" />;
}

export default async function CartePage() {
  const t = await getServerDictionary();
  const c = restoCopy(t.locale);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={c.carte.title} subtitle={c.carte.subtitle} />
      <div className="mt-8">
        <Suspense fallback={<PageSkeleton withHeader={false} />}><CarteContent /></Suspense>
      </div>
    </div>
  );
}

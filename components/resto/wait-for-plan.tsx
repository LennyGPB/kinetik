"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { spaceCopy } from "@/lib/resto/space-copy";

/** Attente d'un traitement serveur (webhook Stripe, préparation du pack) : la page se recharge quelques fois, puis prévient. */
export function AutoRefresh({ title, hint, slow, every = 2000, tries: max = 15 }: { title: string; hint: string; slow: string; every?: number; tries?: number }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= max) return;
    const timer = setTimeout(() => { router.refresh(); setTries((n) => n + 1); }, every);
    return () => clearTimeout(timer);
  }, [tries, router, every, max]);
  return (
    <div role="status" className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <Loader2 className="size-8 animate-spin text-violet-600" />
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm text-muted">{tries >= max ? slow : hint}</p>
    </div>
  );
}

/** Paiement validé, abonnement pas encore reçu par le webhook. */
export function WaitForPlan() {
  const t = useDictionary();
  const w = spaceCopy(t.locale).welcome;
  return <AutoRefresh title={w.confirming} hint={w.confirmingHint} slow={w.confirmingSlow} />;
}

/** Recharge discrète de la page pendant qu'un traitement serveur se termine (pack en préparation). */
export function SilentRefresh({ every = 5000, tries: max = 12 }: { every?: number; tries?: number }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= max) return;
    const timer = setTimeout(() => { router.refresh(); setTries((n) => n + 1); }, every);
    return () => clearTimeout(timer);
  }, [tries, router, every, max]);
  return null;
}

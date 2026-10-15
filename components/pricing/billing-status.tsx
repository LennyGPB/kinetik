"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { format } from "@/lib/i18n";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { cn, formatDate } from "@/lib/utils";
import { useCheckout } from "./pricing-cards";

/**
 * État de l'abonnement (renouvellement, résiliation programmée, paiement en échec) et accès au portail Stripe.
 * Au retour d'un paiement réussi : toast, puis rafraîchissement le temps que le webhook crédite le compte.
 */
export function BillingStatus({ status, periodEnd, cancelAtPeriodEnd, hasCustomer }: {
  status: string | null; periodEnd: Date | null; cancelAtPeriodEnd: boolean; hasCustomer: boolean;
}) {
  const t = useDictionary();
  const b = t.app.credits.billing;
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const { portal, pending } = useCheckout();
  const success = params.get("checkout") === "success";

  useEffect(() => {
    if (!success) return;
    toast({ title: b.success, description: b.successDesc, tone: "success" });
    router.replace("/credits", { scroll: false });
    const timers = [2500, 6000].map((ms) => setTimeout(() => router.refresh(), ms));
    return () => timers.forEach(clearTimeout);
  }, [success, toast, router, b.success, b.successDesc]);

  const pastDue = status === "past_due" || status === "unpaid";
  const line = pastDue ? b.pastDue
    : periodEnd && ["active", "trialing"].includes(status ?? "")
      ? format(cancelAtPeriodEnd ? b.cancelsOn : b.renewsOn, { date: formatDate(periodEnd, undefined, t.locale) })
      : null;
  if (!line && !hasCustomer) return null;

  return (
    <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm",
      pastDue ? "border-danger/40 bg-danger/5" : "border-line bg-bg-subtle")}>
      <p className={cn("flex items-center gap-2", pastDue ? "text-danger" : "text-muted")}>
        {pastDue && <AlertTriangle className="size-4 shrink-0" />}
        {line}
      </p>
      {hasCustomer && (
        <Button variant={pastDue ? "primary" : "outline"} size="sm" loading={pending === "portal:manage"} onClick={() => portal("manage")}>
          <CreditCard /> {b.manage}
        </Button>
      )}
    </div>
  );
}

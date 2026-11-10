"use client";

import { Check, Coins, Download, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { CREDIT_PACKS, formatPrice, PAID_PLANS } from "@/config/pricing";
import { format } from "@/lib/i18n";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { cn } from "@/lib/utils";
import { useCheckout } from "./pricing-cards";

const COPY = {
  fr: {
    title: "Ta vidéo est prête",
    text: "Abonne-toi pour la télécharger sans filigrane et continuer à créer.",
    editTitle: "Continue avec un abonnement",
    editText: "Les modifications par le chat et les téléchargements utilisent des crédits. Un abonnement t’en donne chaque mois.",
    yearlyTotal: "soit {price} facturés par an",
    monthlyNote: "sans engagement, résiliable à tout moment",
    pack: "Pas prêt à t’abonner ? {credits} crédits à {price}, sans engagement",
  },
  en: {
    title: "Your video is ready",
    text: "Subscribe to download it without a watermark and keep creating.",
    editTitle: "Keep going with a subscription",
    editText: "Chat edits and downloads use credits. A subscription gives you new ones every month.",
    yearlyTotal: "{price} billed yearly",
    monthlyNote: "no commitment, cancel anytime",
    pack: "Not ready to subscribe? {credits} credits for {price}, no commitment",
  },
} as const;

/** Plus petit pack : l'alternative sans abonnement, volontairement en retrait */
const STARTER_PACK = CREDIT_PACKS[0];

/**
 * Offres proposées quand un compte sans abonnement manque de crédits (téléchargement, modification).
 * Abonnements en premier (Pro mis en avant), le pack ponctuel en simple lien dessous.
 * `returnPath` : après paiement, Stripe ramène sur ce projet.
 */
export function UpgradePanel({ returnPath, reason = "download", heading = true }: { returnPath: string; reason?: "download" | "edit"; /** false : le titre est déjà celui de la fenêtre */ heading?: boolean }) {
  const t = useDictionary();
  const p = t.landing.pricing;
  const l = COPY[t.locale === "fr" ? "fr" : "en"];
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const { checkout, pending } = useCheckout();
  // Pro d'abord : c'est l'offre recommandée
  const plans = [...PAID_PLANS].sort((a, b) => Number(Boolean(b.highlighted)) - Number(Boolean(a.highlighted)));

  return (
    <div className="flex flex-col gap-5">
      {heading ? <div>
        <p className="flex items-center gap-2 text-lg font-semibold">
          {reason === "download" ? <Download className="size-5 text-accent-text" aria-hidden /> : <Sparkles className="size-5 text-accent-text" aria-hidden />}
          {reason === "download" ? l.title : l.editTitle}
        </p>
        <p className="mt-1 text-sm text-muted">{reason === "download" ? l.text : l.editText}</p>
      </div> : <p className="-mt-2 text-sm text-muted">{reason === "download" ? l.text : l.editText}</p>}

      <Segmented
        label={p.eyebrow}
        value={billing}
        onChange={setBilling}
        className="w-full [&>button]:flex-1"
        options={[
          { value: "monthly", label: p.monthly },
          { value: "yearly", label: <span className="inline-flex items-center gap-1.5">{p.yearly}<span className="rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-semibold text-accent-text">{p.yearlySave}</span></span> },
        ]}
      />

      <div className="flex flex-col gap-3">
        {plans.map((plan) => {
          const hl = plan.highlighted;
          const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const key = `${plan.id}:${billing}`;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
                hl ? "isolate bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] text-white shadow-[0_0_0_1px_rgb(196_181_253/0.6),0_20px_60px_-20px_rgb(139_92_246/0.8)]" : "border border-line bg-bg-subtle",
              )}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{plan.name}</span>
                  {hl && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-violet-700"><Sparkles className="size-3" aria-hidden /> {p.popular}</span>}
                </p>
                <p className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold tracking-tight">{formatPrice(price, t.locale)}</span>
                  <span className={cn("text-sm", hl ? "text-white/75" : "text-muted")}>{p.perMonth}</span>
                </p>
                <p className={cn("text-xs", hl ? "text-white/70" : "text-subtle")}>
                  {billing === "yearly" ? format(l.yearlyTotal, { price: formatPrice(plan.yearlyPrice * 12, t.locale) }) : l.monthlyNote}
                </p>
                <ul className={cn("mt-3 flex flex-col gap-1.5 text-sm", hl ? "text-white/90" : "text-muted")}>
                  <li className="flex items-center gap-2"><Coins className={cn("size-4 shrink-0", hl ? "text-white" : "text-accent-text")} aria-hidden />{format(p.creditsPerMonth, { count: plan.credits })}</li>
                  <li className="flex items-center gap-2"><Check className={cn("size-4 shrink-0", hl ? "text-white" : "text-accent-text")} aria-hidden />{p.planFeatures[plan.id][1]}</li>
                </ul>
              </div>
              <Button
                variant={hl ? "secondary" : "outline"}
                size="lg"
                className={cn("w-full shrink-0 sm:w-auto", hl && "bg-white font-semibold text-violet-700 hover:bg-white")}
                loading={pending === key}
                onClick={() => checkout({ kind: "plan", planId: plan.id, billing, returnPath })}
              >
                {format(p.choose, { plan: plan.name })}
              </Button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={Boolean(pending)}
        onClick={() => checkout({ kind: "pack", packId: STARTER_PACK.id, returnPath })}
        className="mx-auto min-h-10 rounded-md px-2 text-center text-sm text-muted underline-offset-4 hover:text-fg hover:underline disabled:opacity-60"
      >
        {pending === STARTER_PACK.id ? t.common.loading : format(l.pack, { credits: STARTER_PACK.credits, price: formatPrice(STARTER_PACK.price, t.locale) })}
      </button>
    </div>
  );
}

/** Même offre dans une fenêtre à part (ex. modification par le chat sans crédits). */
export function UpgradeDialog({ open, onClose, returnPath, reason = "edit" }: { open: boolean; onClose: () => void; returnPath: string; reason?: "download" | "edit" }) {
  const t = useDictionary();
  const l = COPY[t.locale === "fr" ? "fr" : "en"];
  return (
    <Dialog open={open} onClose={onClose} title={reason === "download" ? l.title : l.editTitle}>
      <UpgradePanel returnPath={returnPath} reason={reason} heading={false} />
    </Dialog>
  );
}

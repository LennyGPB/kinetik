"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Check, Coins, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useState } from "react";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button, buttonVariants } from "@/components/ui/button";
import { useComingSoon, useToast } from "@/components/ui/toaster";
import { Segmented } from "@/components/ui/segmented";
import { CREDIT_COSTS } from "@/config/credits";
import { CREDIT_PACKS, formatPrice, PLANS, type BillingInterval, type PlanId } from "@/config/pricing";
import { format } from "@/lib/i18n";
import { openBillingPortal, startCheckout, type CheckoutResult } from "@/lib/services/billing";
import { useRouter } from "@/lib/i18n/navigation";
import { cn, formatNumber } from "@/lib/utils";

type Mode = "marketing" | "app";

/** Bouton de l'offre mise en avant : blanc sur la carte violette */
const HIGHLIGHT_CTA = "bg-white text-violet-700 font-semibold shadow-[0_10px_30px_-8px_rgb(46_16_101/0.7)] hover:bg-white hover:opacity-100 hover:shadow-[0_12px_36px_-6px_rgb(255_255_255/0.45)]";

/** Lance un paiement ou ouvre le portail Stripe, puis redirige. `pending` : clé de l'action en cours (un seul clic à la fois). */
export function useCheckout() {
  const t = useDictionary();
  const toast = useToast();
  const comingSoon = useComingSoon();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const go = async (key: string, action: () => Promise<CheckoutResult>) => {
    if (pending) return;
    setPending(key);
    const result = await action().catch((): CheckoutResult => ({ ok: false, reason: "error" }));
    if (result.ok) return window.location.assign(result.url); // reste en chargement jusqu'au départ vers Stripe
    setPending(null);
    if (result.reason === "auth") router.push("/login?redirectTo=/credits");
    else if (result.reason === "not_implemented") comingSoon();
    else toast({ title: result.reason === "rate_limited" ? t.app.credits.billing.rateLimited : t.app.credits.billing.error, tone: "error" });
  };
  return {
    pending,
    checkout: (item: Parameters<typeof startCheckout>[0]) => go(item.kind === "pack" ? item.packId : `${item.planId}:${item.billing}`, () => startCheckout(item)),
    portal: (intent: "manage" | "cancel" = "manage") => go(`portal:${intent}`, () => openBillingPortal(intent)),
  };
}

export function PlanCards({ mode = "marketing", currentPlan, currentInterval }: { mode?: Mode; currentPlan?: PlanId; currentInterval?: BillingInterval | null }) {
  const t = useDictionary();

  const p = t.landing.pricing;

  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly"); // annuel proposé par défaut
  const { checkout, portal, pending } = useCheckout();
  const subscribed = Boolean(currentPlan && currentPlan !== "FREE");

  return (
    <div>
      <div className="flex justify-center">
        <Segmented
          label={p.eyebrow}
          value={billing}
          onChange={setBilling}
          options={[
            { value: "monthly", label: p.monthly },
            {
              value: "yearly",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {p.yearly}
                  <span className="rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-semibold text-accent-text">{p.yearlySave}</span>
                </span>
              ),
            },
          ]}
        />
      </div>

      <RevealGroup className="mt-10 grid gap-4 lg:grid-cols-3" stagger={0.1}>
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const interval: BillingInterval = billing === "monthly" ? "month" : "year";
          // Offre payante : « actuelle » seulement pour la même périodicité (sinon le bouton propose de basculer)
          const isCurrent = currentPlan === plan.id && (plan.id === "FREE" || currentInterval === interval);
          const b = t.app.credits.billing;
          const cta = plan.id === "FREE" && subscribed ? b.backToFree
            : isCurrent ? (plan.id === "FREE" ? t.app.credits.currentPlan : b.manage)
            : format(p.choose, { plan: plan.name });
          const busyKey = plan.id === "FREE" ? "portal:cancel" : isCurrent ? "portal:manage" : `${plan.id}:${billing}`;
          const onSelect = () => plan.id === "FREE" ? portal("cancel") : isCurrent ? portal("manage") : checkout({ kind: "plan", planId: plan.id, billing });
          const hl = plan.highlighted;
          return (
            <RevealItem
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl p-6 sm:p-7",
                // Offre mise en avant : carte violette pleine, halo et reflet qui la balaie (même rendu en clair et en sombre)
                hl
                  ? "isolate bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] text-white shadow-[0_0_0_1px_rgb(196_181_253/0.6),0_30px_90px_-20px_rgb(139_92_246/0.8),0_0_70px_-10px_rgb(168_85_247/0.55)]"
                  : "border border-line bg-bg-subtle",
              )}
            >
              {hl && (
                <>
                  <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl ring-1 ring-white/25 ring-inset">
                    <span className="absolute -top-28 left-1/2 h-60 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.22),transparent)]" />
                    <span className="absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.2)_50%,transparent_65%)] [animation-duration:4.5s] motion-reduce:hidden" />
                  </span>
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-[0_6px_24px_-4px_rgb(167_139_250/0.9)]">
                    <Sparkles className="size-3" /> {p.popular}
                  </span>
                </>
              )}
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={price}
                    initial={{ y: -16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 16, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="font-display text-5xl font-bold tracking-tight"
                  >
                    {formatPrice(price, t.locale)}
                  </motion.span>
                </AnimatePresence>
                {price > 0 && <span className={cn("text-sm", hl ? "text-white/75" : "text-muted")}>{p.perMonth}</span>}
              </div>
              <p className={cn("mt-2 inline-flex items-center gap-1.5 text-sm font-medium", hl ? "text-white" : "text-accent-text")}>
                <Coins className="size-4" />
                {format(plan.id === "FREE" ? p.startingCredits : p.creditsPerMonth, { count: plan.credits })}
              </p>
              <ul className={cn("mt-6 flex flex-1 flex-col gap-3 border-t pt-6", hl ? "border-white/20" : "border-line")}>
                {p.planFeatures[plan.id].map((feature) => (
                  <li key={feature} className={cn("flex items-start gap-2.5 text-[15px]", hl ? "text-white/90" : "text-muted")}>
                    <Check className={cn("mt-0.5 size-4 shrink-0", hl ? "text-white" : "text-accent-text")} />
                    {feature}
                  </li>
                ))}
              </ul>
              {mode === "marketing" ? (
                <Link
                  href={`/register?plan=${plan.id.toLowerCase()}`}
                  className={buttonVariants({ variant: hl ? "secondary" : "outline", size: "lg", className: cn("mt-8 w-full", hl && HIGHLIGHT_CTA) })}
                >
                  {plan.id === "FREE" ? t.common.startFree : cta}
                </Link>
              ) : (
                <Button
                  variant={hl ? "secondary" : "outline"}
                  size="lg"
                  className={cn("mt-8 w-full", hl && HIGHLIGHT_CTA)}
                  disabled={plan.id === "FREE" && !subscribed}
                  loading={pending === busyKey}
                  onClick={onSelect}
                >
                  {cta}
                </Button>
              )}
            </RevealItem>
          );
        })}
      </RevealGroup>
    </div>
  );
}

/**
 * Packs mis en avant (page Crédits de l'app) : grandes cartes avec le nombre de vidéos et le prix au crédit.
 * Le pack « Populaire » est recommandé (violet, bouton plein) ; les autres restent sobres.
 */
export function FeaturedPacks({ mode = "app" }: { mode?: Mode }) {
  const t = useDictionary();

  const p = t.landing.pricing;

  const { checkout, pending } = useCheckout();
  const basePrice = CREDIT_PACKS[0].price / CREDIT_PACKS[0].credits;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CREDIT_PACKS.map((pack) => {
        const recommended = pack.badge === "Populaire";
        const perCredit = pack.price / pack.credits;
        const saving = Math.round((1 - perCredit / basePrice) * 100);
        const buy = recommended ? "secondary" : "outline";
        return (
          <div
            key={pack.id}
            className={cn(
              "relative flex flex-col gap-5 rounded-2xl p-5 sm:p-6",
              // Mobile : le pack recommandé en premier ; desktop : à sa place (au centre). Même rendu que l'abonnement mis en avant
              recommended
                ? "isolate order-first bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] text-white shadow-[0_0_0_1px_rgb(196_181_253/0.6),0_30px_90px_-20px_rgb(139_92_246/0.8),0_0_70px_-10px_rgb(168_85_247/0.55)] sm:order-none"
                : "border border-line bg-bg-subtle",
            )}
          >
            {recommended && (
              <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl ring-1 ring-white/25 ring-inset">
                <span className="absolute -top-28 left-1/2 h-60 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.22),transparent)]" />
                <span className="absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.2)_50%,transparent_65%)] [animation-duration:4.5s] motion-reduce:hidden" />
              </span>
            )}
            {pack.badge && (
              recommended ? (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-[0_6px_24px_-4px_rgb(167_139_250/0.9)] sm:left-6">
                  <Sparkles className="size-3" /> {p.popular}
                </span>
              ) : (
                <span className="absolute top-4 right-4 rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-semibold text-muted">{pack.badge}</span>
              )
            )}
            <div>
              <p className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatNumber(pack.credits, t.locale)}</span>
                <span className={cn("text-sm", recommended ? "text-white/75" : "text-muted")}>{t.common.credits}</span>
              </p>
              <p className={cn("mt-1 text-sm", recommended ? "text-white/85" : "text-muted")}>{format(p.packVideos, { count: Math.floor(pack.credits / CREDIT_COSTS.generation) })}</p>
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold">{formatPrice(pack.price, t.locale)}</span>
                <span className={cn("text-xs", recommended ? "text-white/75" : "text-subtle")}>
                  {format(p.perCredit, { price: formatPrice(Math.round(perCredit * 1000) / 1000, t.locale) })}
                  {saving > 0 && <span className={cn("ml-1 font-medium", recommended ? "text-white" : "text-success")}>· {format(p.saving, { percent: saving })}</span>}
                </span>
              </p>
              {mode === "marketing" ? (
                <Link href="/register" className={buttonVariants({ variant: buy, className: cn("w-full", recommended && HIGHLIGHT_CTA) })}>
                  {p.buy}
                </Link>
              ) : (
                <Button variant={buy} className={cn("w-full", recommended && HIGHLIGHT_CTA)} loading={pending === pack.id} onClick={() => checkout({ kind: "pack", packId: pack.id })}>
                  <Coins /> {p.buy}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** `reveal` : les packs sont distribués un à un à l'arrivée dans la vue (landing). */
export function PackCards({ mode = "marketing", layout = "grid", reveal = false }: { mode?: Mode; layout?: "grid" | "list"; reveal?: boolean }) {
  const reduceMotion = useReducedMotion();
  // Les états initiaux ne dépendent jamais de useReducedMotion (null au rendu serveur) : sinon l'hydratation garde
  // les éléments invisibles. Animations réduites → même révélation, mais instantanée.
  const t = useDictionary();

  const p = t.landing.pricing;

  const stacked = layout === "grid";
  const { checkout, pending } = useCheckout();
  return (
    <div className={cn("grid gap-3", stacked && "sm:grid-cols-3")}>
      {CREDIT_PACKS.map((pack, index) => (
        <motion.div
          key={pack.id}
          initial={reveal ? { opacity: 0, y: 50, scale: 0.92, rotate: index % 2 ? 5 : -5, filter: "blur(8px)" } : false}
          whileInView={reveal ? { opacity: 1, y: 0, scale: 1, rotate: 0, filter: "blur(0px)" } : undefined}
          viewport={{ once: true, amount: 0.4 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.8, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "group relative flex items-center justify-between gap-4 rounded-2xl border border-line bg-bg-subtle p-5 transition-colors hover:border-accent/40",
            stacked && "sm:flex-col sm:items-stretch",
          )}
        >
          <div>
            <p className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="font-display text-3xl font-bold tracking-tight">{formatNumber(pack.credits, t.locale)}</span>
              <span className="text-sm font-medium text-muted">{t.common.credits}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted">{formatPrice(pack.price, t.locale)}</p>
          </div>
          {pack.badge && (
            <span className="absolute -top-2.5 right-4 rounded-full border border-accent/30 bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent-text">
              {pack.badge === "Populaire" ? p.popular : pack.badge}
            </span>
          )}
          {mode === "marketing" ? (
            <Link href="/register" className={buttonVariants({ variant: "soft", size: "sm", className: cn(stacked && "sm:mt-4 sm:w-full") })}>
              {p.buy}
            </Link>
          ) : (
            <Button variant="soft" size="sm" className={cn(stacked && "sm:mt-4 sm:w-full")} loading={pending === pack.id} onClick={() => checkout({ kind: "pack", packId: pack.id })}>
              {p.buy}
            </Button>
          )}
        </motion.div>
      ))}
    </div>
  );
}

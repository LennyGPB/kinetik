"use client";

import { Check, Coins, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Button, buttonVariants } from "@/components/ui/button";
import { useComingSoon } from "@/components/ui/toaster";
import { Segmented } from "@/components/ui/segmented";
import { CREDIT_COSTS } from "@/config/credits";
import { CREDIT_PACKS, formatPrice, PLANS, type PlanId } from "@/config/pricing";
import { format, t } from "@/lib/i18n";
import { startCheckout } from "@/lib/services/billing";
import { cn, formatNumber } from "@/lib/utils";

const p = t.landing.pricing;

type Mode = "marketing" | "app";

function useCheckout() {
  const comingSoon = useComingSoon();
  return async (item: Parameters<typeof startCheckout>[0]) => {
    const result = await startCheckout(item);
    if (!result.ok) comingSoon();
  };
}

export function PlanCards({ mode = "marketing", currentPlan }: { mode?: Mode; currentPlan?: PlanId }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly"); // annuel proposé par défaut
  const checkout = useCheckout();

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
          const isCurrent = currentPlan === plan.id;
          const cta = isCurrent ? t.app.credits.currentPlan : format(p.choose, { plan: plan.name });
          return (
            <RevealItem
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl p-6 sm:p-7",
                plan.highlighted ? "border-gradient shadow-[0_30px_80px_-30px_var(--accent-glow)]" : "border border-line bg-bg-subtle",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-accent-gradient px-3 py-1 text-xs font-semibold text-white shadow-[0_6px_20px_-6px_var(--accent-glow)]">
                  <Sparkles className="size-3" /> {p.popular}
                </span>
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
                    {formatPrice(price)}
                  </motion.span>
                </AnimatePresence>
                {price > 0 && <span className="text-sm text-muted">{p.perMonth}</span>}
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text">
                <Coins className="size-4" />
                {format(plan.id === "FREE" ? p.startingCredits : p.creditsPerMonth, { count: plan.credits })}
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-line pt-6">
                {p.planFeatures[plan.id].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[15px] text-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-text" />
                    {feature}
                  </li>
                ))}
              </ul>
              {mode === "marketing" ? (
                <Link
                  href={`/register?plan=${plan.id.toLowerCase()}`}
                  className={buttonVariants({ variant: plan.highlighted ? "primary" : "outline", size: "lg", className: "mt-8 w-full" })}
                >
                  {plan.id === "FREE" ? t.common.startFree : cta}
                </Link>
              ) : (
                <Button
                  variant={plan.highlighted ? "primary" : "outline"}
                  size="lg"
                  className="mt-8 w-full"
                  disabled={isCurrent}
                  onClick={() => checkout({ kind: "plan", planId: plan.id, billing })}
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
  const checkout = useCheckout();
  const basePrice = CREDIT_PACKS[0].price / CREDIT_PACKS[0].credits;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CREDIT_PACKS.map((pack) => {
        const recommended = pack.badge === "Populaire";
        const perCredit = pack.price / pack.credits;
        const saving = Math.round((1 - perCredit / basePrice) * 100);
        const buy = recommended ? "primary" : "outline";
        return (
          <div
            key={pack.id}
            className={cn(
              "relative flex flex-col gap-5 rounded-2xl border p-5 sm:p-6",
              // Mobile : le pack recommandé en premier ; desktop : à sa place (au centre)
              recommended ? "order-first border-accent bg-accent-soft sm:order-none" : "border-line bg-bg-subtle",
            )}
          >
            {pack.badge && (
              <span className={cn("absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", recommended ? "bg-accent text-accent-fg" : "border border-line-strong text-muted")}>
                {pack.badge}
              </span>
            )}
            <div>
              <p className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatNumber(pack.credits)}</span>
                <span className="text-sm text-muted">{t.common.credits}</span>
              </p>
              <p className="mt-1 text-sm text-muted">{format(p.packVideos, { count: Math.floor(pack.credits / CREDIT_COSTS.generation) })}</p>
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold">{formatPrice(pack.price)}</span>
                <span className="text-xs text-subtle">
                  {format(p.perCredit, { price: formatPrice(Math.round(perCredit * 1000) / 1000) })}
                  {saving > 0 && <span className="ml-1 font-medium text-success">· {format(p.saving, { percent: saving })}</span>}
                </span>
              </p>
              {mode === "marketing" ? (
                <Link href="/register" className={buttonVariants({ variant: buy, className: "w-full" })}>
                  {p.buy}
                </Link>
              ) : (
                <Button variant={buy} className="w-full" onClick={() => checkout({ kind: "pack", packId: pack.id })}>
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

export function PackCards({ mode = "marketing", layout = "grid" }: { mode?: Mode; layout?: "grid" | "list" }) {
  const stacked = layout === "grid";
  const checkout = useCheckout();
  return (
    <div className={cn("grid gap-3", stacked && "sm:grid-cols-3")}>
      {CREDIT_PACKS.map((pack) => (
        <div
          key={pack.id}
          className={cn(
            "group relative flex items-center justify-between gap-4 rounded-2xl border border-line bg-bg-subtle p-5 transition-colors hover:border-accent/40",
            stacked && "sm:flex-col sm:items-stretch",
          )}
        >
          <div>
            <p className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="font-display text-3xl font-bold tracking-tight">{formatNumber(pack.credits)}</span>
              <span className="text-sm font-medium text-muted">{t.common.credits}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted">{formatPrice(pack.price)}</p>
          </div>
          {pack.badge && (
            <span className="absolute -top-2.5 right-4 rounded-full border border-accent/30 bg-surface px-2 py-0.5 text-[11px] font-semibold text-accent-text">
              {pack.badge}
            </span>
          )}
          {mode === "marketing" ? (
            <Link href="/register" className={buttonVariants({ variant: "soft", size: "sm", className: cn(stacked && "sm:mt-4 sm:w-full") })}>
              {p.buy}
            </Link>
          ) : (
            <Button variant="soft" size="sm" className={cn(stacked && "sm:mt-4 sm:w-full")} onClick={() => checkout({ kind: "pack", packId: pack.id })}>
              {p.buy}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

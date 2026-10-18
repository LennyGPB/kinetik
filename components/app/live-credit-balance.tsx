"use client";
import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { formatNumber } from "@/lib/utils";
import { CREDIT_COSTS, getPostGenerationCost } from "@/config/credits";

const EVENT = "kinetik:credit-balance";
export function publishCreditBalance(balance: number) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: balance }));
}

export function LiveCreditBalance({ initialBalance, variant = "number" }: { initialBalance: number; variant?: "number" | "estimate" | "mobile" }) {
  const t = useDictionary();
  const [update, setUpdate] = useState<{ baseline: number; value: number } | null>(null);
  const balance = update?.baseline === initialBalance ? update.value : initialBalance;
  useEffect(() => {
    const receive = (event: Event) => {
      const value: unknown = (event as CustomEvent).detail;
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) setUpdate({ baseline: initialBalance, value });
    };
    window.addEventListener(EVENT, receive);
    return () => window.removeEventListener(EVENT, receive);
  }, [initialBalance]);
  if (variant === "mobile") return <Link href="/credits" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold" aria-label={`${formatNumber(balance, t.locale)} ${t.common.credits}`}><Coins className="size-4 text-accent-text" /><span aria-live="polite">{formatNumber(balance, t.locale)}</span></Link>;
  if (variant === "estimate") {
    const videos = Math.floor(balance / CREDIT_COSTS.generation), posts = Math.floor(balance / getPostGenerationCost(1));
    return <>{t.locale === "fr" ? `Génération : ≈ ${videos} vidéos ou ${posts} posts` : `Generation: ≈ ${videos} videos or ${posts} posts`}</>;
  }
  return <span aria-live="polite" className="text-3xl font-semibold tracking-tight tabular-nums">{formatNumber(balance, t.locale)}</span>;
}

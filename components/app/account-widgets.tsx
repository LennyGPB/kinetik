import { getServerDictionary } from "@/lib/i18n/server";
import { Coins, Plus } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CREDIT_COSTS } from "@/config/credits";
import { getPlan } from "@/config/pricing";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance } from "@/lib/credits/ledger";
import { format } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";
import { UserMenu } from "./user-menu";

/** Bloc compte de la sidebar (solde + menu utilisateur). Rendu sous <Suspense>. */
export async function SidebarAccount() {
  const t = await getServerDictionary();

  const user = await requireUser();
  const balance = await getCreditBalance(user.id);
  const plan = getPlan(user.plan);
  // Ce que représente le solde : nombre de vidéos générables (hors modifs et export)
  const videos = Math.floor(balance.total / CREDIT_COSTS.generation);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-bg-subtle p-3.5">
        {/* Halo d'accent discret en haut à droite */}
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-accent opacity-15 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <Coins className="size-3.5 text-accent-text" /> {t.app.balance}
          </span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-text">
            {format(t.app.plan, { plan: plan.name })}
          </span>
        </div>
        <p className="relative mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatNumber(balance.total, t.locale)}</span>
          <span className="text-sm text-muted">{t.common.credits}</span>
        </p>
        <p className={cn("relative mt-0.5 text-xs", videos ? "text-subtle" : "font-medium text-accent-text")}>
          {videos ? format(videos === 1 ? t.app.videosLeftOne : t.app.videosLeft, { count: videos }) : t.app.notEnoughForVideo}
        </p>
        <Link href="/credits" className={cn(buttonVariants({ variant: videos ? "soft" : "primary", size: "sm" }), "relative mt-3 w-full")}>
          <Plus /> {t.app.buyCredits}
        </Link>
      </div>
      <UserMenu name={user.name} email={user.email} admin={user.role === "ADMIN"} />
    </div>
  );
}

export async function MobileAccount() {
  const t = await getServerDictionary();

  const user = await requireUser();
  const balance = await getCreditBalance(user.id);
  return (
    <>
      <Link
        href="/credits"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold"
        aria-label={`${formatNumber(balance.total, t.locale)} ${t.common.credits}`}
      >
        <Coins className="size-4 text-accent-text" />
        {formatNumber(balance.total, t.locale)}
      </Link>
      <UserMenu name={user.name} email={user.email} admin={user.role === "ADMIN"} compact />
    </>
  );
}

export function SidebarAccountSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden>
      <div className="h-[150px] rounded-2xl bg-surface-2" />
      <div className="h-12 rounded-xl bg-surface-2" />
    </div>
  );
}

export function MobileAccountSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-2" aria-hidden>
      <div className="h-9 w-16 rounded-full bg-surface-2" />
      <div className="size-8 rounded-full bg-surface-2" />
    </div>
  );
}

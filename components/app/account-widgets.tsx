import { Coins, Plus } from "lucide-react";
import Link from "next/link";
import { getPlan } from "@/config/pricing";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance } from "@/lib/credits/ledger";
import { format, t } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils";
import { UserMenu } from "./user-menu";

/** Bloc compte de la sidebar (solde + menu utilisateur). Rendu sous <Suspense>. */
export async function SidebarAccount() {
  const user = await requireUser();
  const balance = await getCreditBalance(user.id);
  const plan = getPlan(user.plan);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-line bg-bg-subtle p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">{t.app.balance}</span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-text">
            {format(t.app.plan, { plan: plan.name })}
          </span>
        </div>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(balance.total)}</span>
          <span className="text-sm text-muted">{t.common.credits}</span>
        </p>
        <Link
          href="/credits"
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline"
        >
          <Plus className="size-3.5" /> {t.app.buyCredits}
        </Link>
      </div>
      <UserMenu name={user.name} email={user.email} />
    </div>
  );
}

export async function MobileAccount() {
  const user = await requireUser();
  const balance = await getCreditBalance(user.id);
  return (
    <>
      <Link
        href="/credits"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold"
        aria-label={`${formatNumber(balance.total)} ${t.common.credits}`}
      >
        <Coins className="size-4 text-accent-text" />
        {formatNumber(balance.total)}
      </Link>
      <UserMenu name={user.name} email={user.email} compact />
    </>
  );
}

export function SidebarAccountSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden>
      <div className="h-[104px] rounded-xl bg-surface-2" />
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

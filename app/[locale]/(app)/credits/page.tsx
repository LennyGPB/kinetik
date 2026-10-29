import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getServerDictionary } from "@/lib/i18n/server";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Infinity as InfinityIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/app/page-skeleton";
import { BillingStatus } from "@/components/pricing/billing-status";
import { CreditCosts } from "@/components/pricing/credit-costs";
import { FeaturedPacks, PlanCards } from "@/components/pricing/pricing-cards";
import { getPlan } from "@/config/pricing";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance, listCreditTransactions } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import { format } from "@/lib/i18n";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.credits.title }; }

/** Opérations affichées d'emblée dans l'historique */
const RECENT = 6;

type Transaction = Awaited<ReturnType<typeof listCreditTransactions>>[number];

function TransactionRow({ tx }: { tx: Transaction }) {
  const t = useDictionary();

  const c = t.app.credits;

  const credit = tx.amount > 0;
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", credit ? "bg-success/10 text-success" : "bg-surface-2 text-muted")}>
        {credit ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description}</p>
        <p className="text-xs text-subtle">
          {c.types[tx.type]} · {formatDate(tx.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, t.locale)}
        </p>
      </div>
      <span className={cn("font-mono text-sm font-semibold tabular-nums", credit ? "text-success" : "text-fg")}>
        {credit ? "+" : "−"}
        {Math.abs(tx.amount)}
      </span>
    </li>
  );
}

async function CreditsContent() {
  const t = await getServerDictionary();

  const c = t.app.credits;

  const user = await requireUser();
  const [balance, transactions, billing] = await Promise.all([
    getCreditBalance(user.id),
    listCreditTransactions(user.id),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { stripeCustomerId: true, subscriptionStatus: true, subscriptionInterval: true, cancelAtPeriodEnd: true, planRenewsAt: true } }),
  ]);
  const plan = getPlan(user.plan);

  return (
    <>
      {/* Solde : une seule carte compacte */}
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-bg-subtle p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm text-muted">
            {c.balance} · {plan.id === "FREE" ? t.app.noPlan : format(t.app.plan, { plan: plan.name })}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatNumber(balance.total, t.locale)}</span>
            <span className="text-muted">{t.common.credits}</span>
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-muted">
              <CalendarClock className="size-4" /> {c.subscription}
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatNumber(balance.subscription, t.locale)}
              <span className="ml-1.5 text-xs font-normal text-subtle">
                {balance.subscriptionExpiresAt ? format(c.expires, { date: formatDate(balance.subscriptionExpiresAt, undefined, t.locale) }) : null}
              </span>
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-muted">
              <InfinityIcon className="size-4" /> {c.packs}
            </dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatNumber(balance.pack, t.locale)}
              <span className="ml-1.5 text-xs font-normal text-subtle">{c.neverExpire}</span>
            </dd>
          </div>
        </dl>
      </div>

      <BillingStatus status={billing.subscriptionStatus} periodEnd={billing.planRenewsAt} cancelAtPeriodEnd={billing.cancelAtPeriodEnd} hasCustomer={Boolean(billing.stripeCustomerId)} />

      {/* Packs : l'action principale de la page */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">{c.rechargeTitle}</h2>
        <p className="mt-1 text-sm text-muted">{c.rechargeText}</p>
        <div className="mt-5">
          <FeaturedPacks />
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-xl font-semibold">{c.history}</h2>
          {transactions.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-8 text-center text-muted">{c.empty}</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-bg-subtle">
              <ul className="divide-y divide-line">
                {transactions.slice(0, RECENT).map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </ul>
              {/* Le reste de l'historique sur demande : les packs restent visibles sans faire défiler */}
              {transactions.length > RECENT && (
                <details className="group border-t border-line">
                  <summary className="cursor-pointer list-none px-4 py-3 text-center text-sm font-medium text-accent-text hover:bg-surface [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">{format(c.showAll, { count: transactions.length })}</span>
                    <span className="hidden group-open:inline">{c.showLess}</span>
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {transactions.slice(RECENT).map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t.landing.pricing.costsTitle}</h2>
          <CreditCosts className="mt-4" includePosts />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-6 text-xl font-semibold">{c.upgrade}</h2>
        <PlanCards mode="app" currentPlan={user.plan} currentInterval={billing.subscriptionInterval === "month" || billing.subscriptionInterval === "year" ? billing.subscriptionInterval : null} />
      </section>
    </>
  );
}

export default function CreditsPage() {
  const t = useDictionary();

  const c = t.app.credits;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={c.title} subtitle={c.subtitle} />
      <Suspense fallback={<PageSkeleton withHeader={false} />}>
        <CreditsContent />
      </Suspense>
    </div>
  );
}

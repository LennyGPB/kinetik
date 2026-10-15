import { format } from "@/lib/i18n";

import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { Suspense } from "react";
import { AdminHeader, AdminSkeleton, EmptyRow, Panel, PlanBadge, StatCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminStats, recentAdminLogs } from "@/lib/admin/queries";
import { formatDate, formatNumber } from "@/lib/utils";
import { adminActionLabel } from "@/lib/admin/labels";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.copy["0d214ec700d5"] }; }

async function Overview() {
  const t = await getServerDictionary();

  await requireAdmin();
  const [stats, logs] = await Promise.all([getAdminStats(), recentAdminLogs()]);
  const peak = Math.max(1, ...stats.signupsByDay.map((d) => d.count));

  return (
    <>
      <AdminHeader title={t.copy["0d214ec700d5"]} subtitle={t.copy["a4e72bfeb276"]} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.copy["7cf7725efaab"]} value={stats.users.total} hint={`+${formatNumber(stats.users.last7, t.locale)} sur 7 j · +${formatNumber(stats.users.last30, t.locale)} sur 30 j`} tone="accent" />
        <StatCard label={t.copy["211e5859340f"]} value={stats.subscribers.total} hint={`Starter ${formatNumber(stats.subscribers.STARTER, t.locale)} · Pro ${formatNumber(stats.subscribers.PRO, t.locale)}`} tone="accent" />
        <StatCard label={t.copy["4b87d3da6ae3"]} value={stats.users.total ? `${Math.round((stats.subscribers.total / stats.users.total) * 1000) / 10} %` : "—"} hint={`${formatNumber(stats.subscribers.FREE, t.locale)} comptes Free`} />
        <StatCard label="Admins" value={stats.users.admins} />
        <StatCard label={t.copy["b7c5258e03c5"]} value={stats.projects.total} hint={format(t.copy["938b38147f0c"], { p0: formatNumber(stats.projects.ready, t.locale) })} />
        <StatCard label={t.copy["d5d8c5cbfec0"]} value={stats.renders.done} hint={`${formatNumber(stats.renders.last30, t.locale)} sur 30 j`} />
        <StatCard label={t.copy["d5534975fa4b"]} value={stats.credits.spent30} hint={t.copy["bf543b35e54f"]} />
        <StatCard label={t.copy["f0739641f6a0"]} value={stats.credits.bought30} hint={t.copy["694639251ee6"]} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title={t.copy["be6702c5a645"]}>
          <div className="flex h-44 items-end gap-1.5 px-4 pt-6 pb-3 sm:px-5" role="img" aria-label={`Inscriptions par jour : ${stats.signupsByDay.map((d) => d.count).join(", ")}`}>
            {stats.signupsByDay.map((day) => (
              <div key={day.date.toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] text-subtle tabular-nums">{day.count || ""}</span>
                <div className="w-full rounded-t-md bg-accent" style={{ height: `${Math.max(3, (day.count / peak) * 100)}%`, opacity: day.count ? 1 : 0.25 }} />
                <span className="text-[10px] text-subtle tabular-nums">{day.date.getDate()}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={t.copy["6100c54ae64d"]} action={<Link href="/admin/users" className="text-xs font-medium text-accent-text hover:underline">{t.copy["ecca5f45eb3b"]}</Link>}>
          <ul className="divide-y divide-line">
            {stats.recentUsers.map((user) => (
              <li key={user.id}>
                <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <PlanBadge plan={user.plan} />
                  <span className="shrink-0 text-xs text-subtle">{formatDate(user.createdAt, { day: "numeric", month: "short" }, t.locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title={t.copy["478dad0c33a4"]} className="mt-4" action={<Link href="/admin/logs" className="text-xs font-medium text-accent-text hover:underline">{t.copy["43b7c75d56f0"]}</Link>}>
        {logs.length ? (
          <ul className="divide-y divide-line">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm sm:px-5">
                <span className="font-medium">{adminActionLabel(log.action, t.locale)}</span>
                {log.targetLabel && <span className="min-w-0 truncate text-muted">{log.targetLabel}</span>}
                <span className="ml-auto text-xs text-subtle">
                  {log.adminEmail} · {formatDate(log.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, t.locale)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRow>{t.copy["dd8a1c9dd43b"]}</EmptyRow>
        )}
      </Panel>
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Overview />
    </Suspense>
  );
}

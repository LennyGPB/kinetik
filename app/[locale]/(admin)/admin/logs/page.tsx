import { format } from "@/lib/i18n";

import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { Suspense } from "react";
import { AdminHeader, AdminSkeleton, EmptyRow, Pagination, withParams } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { adminActionLabel } from "@/lib/admin/labels";
import { listAdminLogs, parsePage } from "@/lib/admin/queries";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.copy["43b7c75d56f0"] }; }

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Détails enregistrés avec l'action (montant et motif des crédits, nombre de vidéos supprimées…). */
function describe(details: unknown, t: Awaited<ReturnType<typeof getServerDictionary>>) {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  const parts = [typeof d.amount === "number" && format(t.copy["7432df5351e6"], { p0: formatNumber(d.amount, t.locale) }), typeof d.reason === "string" && `« ${d.reason} »`, typeof d.projects === "number" && format(t.copy["7c8af842a66e"], { p0: d.projects })];
  return parts.filter(Boolean).join(" · ") || null;
}

async function LogsContent({ searchParams }: { searchParams: SearchParams }) {
  const t = await getServerDictionary();

  await requireAdmin();
  const page = parsePage((await searchParams).page);
  const { total, pages, logs } = await listAdminLogs({ page });

  return (
    <>
      <AdminHeader title={t.copy["43b7c75d56f0"]} subtitle={format(t.copy["81f559889249"], { p0: formatNumber(total, t.locale), p1: total > 1 ? "s" : "" })} />
      <div className="overflow-hidden rounded-2xl border border-line bg-bg-subtle">
        {logs.length ? (
          <ul className="divide-y divide-line">
            {logs.map((log) => {
              const details = describe(log.details, t);
              return (
                <li key={log.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", log.action === "unlock.failed" && "text-danger")}>
                      {adminActionLabel(log.action, t.locale)}
                      {log.targetLabel &&
                        (log.targetType === "user" && log.targetId && log.action !== "user.delete" ? (
                          <Link href={`/admin/users/${log.targetId}`} className="ml-2 font-normal text-muted hover:text-fg hover:underline">
                            {log.targetLabel}
                          </Link>
                        ) : (
                          <span className="ml-2 font-normal text-muted">{log.targetLabel}</span>
                        ))}
                    </p>
                    {details && <p className="mt-0.5 truncate text-xs text-muted">{details}</p>}
                  </div>
                  <p className="shrink-0 text-xs text-subtle">
                    {log.adminEmail} · {formatDate(log.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }, t.locale)}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyRow>{t.copy["80afdd622441"]}</EmptyRow>
        )}
      </div>
      <Pagination page={page} pages={pages} href={(p) => withParams("/admin/logs", { page: p })} />
    </>
  );
}

export default function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <LogsContent searchParams={searchParams} />
    </Suspense>
  );
}

import { format } from "@/lib/i18n";

import { getServerDictionary } from "@/lib/i18n/server";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";

import { Suspense } from "react";
import { CreditsForm, DeleteProjectButton, DeleteUserButton } from "@/components/admin/admin-forms";
import { AdminSkeleton, EmptyRow, Panel, PlanBadge, RoleBadge, StatCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminUser } from "@/lib/admin/queries";

import { cn, formatDate, formatNumber } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.copy["721e5b29abab"] }; }

async function UserContent({ params }: { params: Promise<{ id: string }> }) {
  const t = await getServerDictionary();

  const STATUS: Record<string, string> = { DRAFT: t.copy["8c6460cf71af"], GENERATING: t.copy["224a72a07852"], READY: t.copy["fec42774c853"], FAILED: t.copy["fdf3f6d53c9e"] };
  const FORMAT: Record<string, string> = { LANDSCAPE: "16:9", PORTRAIT: "9:16", SQUARE: "1:1" };

  const admin = await requireAdmin();
  const { id } = await params;
  const user = await getAdminUser(id);
  if (!user) notFound();

  const self = user.id === admin.id;
  const deleteBlocked = self ? t.copy["cced0cbff089"] : user.role === "ADMIN" ? t.copy["94a071d6a733"] : undefined;

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" />  {t.copy["23d3938b5ef0"]}
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold sm:text-3xl">
            <span className="truncate">{user.name}</span>
            <PlanBadge plan={user.plan} />
            <RoleBadge role={user.role} />
          </h1>
          <p className="mt-1 truncate text-muted">{user.email}</p>
          <p className="mt-2 text-xs text-subtle">

            {t.copy["a8fb5b4e67e3"]} {formatDate(user.createdAt, undefined, t.locale)} · {user.emailVerified ? t.copy["729e42a6560c"] : t.copy["d76e1016fc45"]}  {t.copy["b3ee0583272c"]} {user.loginMethods.join(", ") || "aucune"} ·{" "}
            {user.activeSessions}  {"session"}{user.activeSessions > 1 ? "s" : ""}  {"active"}{user.activeSessions > 1 ? "s" : ""}
          </p>
          <p className="mt-1 font-mono text-[11px] text-subtle">{user.id}</p>
        </div>
        <DeleteUserButton userId={user.id} email={user.email} disabledReason={deleteBlocked} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t.copy["caa3596424a1"]} value={user.balance.total} hint={t.copy["70fc1f64b995"]} tone="accent" />
        <StatCard label={t.copy["7a16066e54ee"]} value={user.balance.subscription} hint={user.balance.subscriptionExpiresAt ? `expirent le ${formatDate(user.balance.subscriptionExpiresAt, undefined, t.locale)}` : undefined} />
        <StatCard label={t.copy["98953b6ff147"]} value={user.balance.pack} hint={t.copy["95fd8e8cd875"]} />
        <StatCard label={t.copy["b7c5258e03c5"]} value={user.projects.length} hint={user.planRenewsAt ? `Renouvellement le ${formatDate(user.planRenewsAt, undefined, t.locale)}` : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel title={t.copy["db73ca0313e9"]}>
          <div className="p-4 sm:p-5">
            <CreditsForm userId={user.id} />
          </div>
        </Panel>

        <Panel title={format(t.copy["67bde9770c9b"], { p0: user.projects.length })}>
          {user.projects.length ? (
            <ul className="divide-y divide-line">
              {user.projects.map((project) => (
                <li key={project.id} className="flex items-center gap-3 py-2.5 pr-2 pl-4 sm:pl-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-muted">
                      {STATUS[project.status]} · {FORMAT[project.format]} · {project.duration}  {"s ·"} {project._count.versions}  {"version"}{project._count.versions > 1 ? "s" : ""} ·{" "}
                      {project._count.renders}  {"export"}{project._count.renders > 1 ? "s" : ""} · {formatDate(project.createdAt, undefined, t.locale)}
                    </p>
                  </div>
                  <DeleteProjectButton projectId={project.id} name={project.name} compact />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRow>{t.copy["15a28caefe8a"]}</EmptyRow>
          )}
        </Panel>
      </div>

      <Panel
        title={t.copy["09064496cf90"]}
        className="mt-4"
        action={<span className="text-xs text-subtle">{t.copy["9b43f33d9312"]}</span>}
      >
        {user.transactions.length ? (
          <ul className="divide-y divide-line">
            {user.transactions.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{tx.description}</p>
                  <p className="text-xs text-subtle">
                    {t.app.credits.types[tx.type]} · {formatDate(tx.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }, t.locale)}
                  </p>
                </div>
                <span className={cn("font-mono text-sm font-semibold tabular-nums", tx.amount > 0 ? "text-success" : "text-fg")}>
                  {tx.amount > 0 ? "+" : "−"}
                  {formatNumber(Math.abs(tx.amount), t.locale)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRow>{t.copy["dee786e0c237"]}</EmptyRow>
        )}
      </Panel>
    </>
  );
}

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <UserContent params={params} />
    </Suspense>
  );
}

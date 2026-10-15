import { format } from "@/lib/i18n";

import { getServerDictionary } from "@/lib/i18n/server";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { Suspense } from "react";
import { AdminHeader, AdminSkeleton, EmptyRow, Pagination, PlanBadge, RoleBadge, SearchForm, withParams } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { parsePage, searchUsers, type UserFilter } from "@/lib/admin/queries";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.copy["23d3938b5ef0"] }; }

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function UsersContent({ searchParams }: { searchParams: SearchParams }) {
  const t = await getServerDictionary();

  const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: t.copy["2ff599814388"] },
  { value: "subscribers", label: t.copy["211e5859340f"] },
  { value: "admins", label: "Admins" },
];

  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const filter = FILTERS.some((f) => f.value === params.filter) ? (params.filter as UserFilter) : "all";
  const page = parsePage(params.page);
  const { total, pages, users } = await searchUsers({ q, page, filter });

  return (
    <>
      <AdminHeader title={t.copy["23d3938b5ef0"]} subtitle={`${formatNumber(total, t.locale)} compte${total > 1 ? "s" : ""}${q ? format(t.copy["986c7193ca36"], { p0: q }) : ""}`} />
      <SearchForm action="/admin/users" q={q} placeholder={t.copy["d00f87d78d8c"]}>
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
      </SearchForm>
      <div className="mb-4 flex gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={withParams("/admin/users", { q, filter: f.value === "all" ? undefined : f.value })}
            aria-current={filter === f.value ? "page" : undefined}
            className={cn("flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors", filter === f.value ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg")}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-bg-subtle">
        {users.length ? (
          <ul className="divide-y divide-line">
            {users.map((user) => (
              <li key={user.id}>
                <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface sm:px-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold uppercase">{user.name.slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{user.name}</span>
                      <RoleBadge role={user.role} />
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <div className="hidden shrink-0 text-right text-xs text-muted sm:block">
                    <p className="font-mono text-sm text-fg tabular-nums">{formatNumber(user.credits, t.locale)}  {"cr."}</p>
                    <p>
                      {user.projects}  {t.copy["bc6b753e3015"]}{user.projects > 1 ? "s" : ""} · {formatDate(user.createdAt, undefined, t.locale)}
                    </p>
                  </div>
                  <PlanBadge plan={user.plan} />
                  <ChevronRight className="size-4 shrink-0 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyRow>{t.copy["a6c270932bc9"]}</EmptyRow>
        )}
      </div>
      <Pagination page={page} pages={pages} href={(p) => withParams("/admin/users", { q, filter: filter === "all" ? undefined : filter, page: p })} />
    </>
  );
}

export default function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}

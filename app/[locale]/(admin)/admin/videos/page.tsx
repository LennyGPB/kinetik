import { format } from "@/lib/i18n";

import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { Suspense } from "react";
import { DeleteProjectButton } from "@/components/admin/admin-forms";
import { AdminHeader, AdminSkeleton, EmptyRow, Pagination, SearchForm, withParams } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { listAdminProjects, parsePage } from "@/lib/admin/queries";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.copy["b7c5258e03c5"] }; }

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function VideosContent({ searchParams }: { searchParams: SearchParams }) {
  const t = await getServerDictionary();

  const STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: t.copy["8c6460cf71af"], className: "bg-surface-2 text-muted" },
  GENERATING: { label: t.copy["224a72a07852"], className: "bg-accent-soft text-accent-text" },
  READY: { label: t.copy["fec42774c853"], className: "bg-success/10 text-success" },
  FAILED: { label: t.copy["fdf3f6d53c9e"], className: "bg-danger/10 text-danger" },
};
  const FORMAT: Record<string, string> = { LANDSCAPE: "16:9", PORTRAIT: "9:16", SQUARE: "1:1" };

  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const page = parsePage(params.page);
  const { total, pages, projects } = await listAdminProjects({ q, page });

  return (
    <>
      <AdminHeader title={t.copy["b7c5258e03c5"]} subtitle={format(t.copy["3ad43cff59c7"], { p0: formatNumber(total, t.locale), p1: total > 1 ? "s" : "", p2: q ? ` pour « ${q} »` : "" })} />
      <SearchForm action="/admin/videos" q={q} placeholder={t.copy["b4798ae501ba"]} />
      <div className="overflow-hidden rounded-2xl border border-line bg-bg-subtle">
        {projects.length ? (
          <ul className="divide-y divide-line">
            {projects.map((project) => {
              const status = STATUS[project.status];
              return (
                <li key={project.id} className="flex items-center gap-3 py-3 pr-2 pl-4 sm:pl-5">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{project.name}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", status.className)}>{status.label}</span>
                    </p>
                    <p className="truncate text-xs text-muted">
                      <Link href={`/admin/users/${project.user.id}`} className="hover:text-fg hover:underline">
                        {project.user.email}
                      </Link>{" "}
                      · {FORMAT[project.format]} · {project.duration}  {"s ·"} {project._count.renders}  {"export"}{project._count.renders > 1 ? "s" : ""} · {formatDate(project.createdAt, undefined, t.locale)}
                    </p>
                  </div>
                  <DeleteProjectButton projectId={project.id} name={project.name} />
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyRow>{t.copy["77110a16e0a4"]}</EmptyRow>
        )}
      </div>
      <Pagination page={page} pages={pages} href={(p) => withParams("/admin/videos", { q, page: p })} />
    </>
  );
}

export default function AdminVideosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <VideosContent searchParams={searchParams} />
    </Suspense>
  );
}

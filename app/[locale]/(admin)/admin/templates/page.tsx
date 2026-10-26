import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { Suspense } from "react";
import { AdminTemplateList } from "@/components/admin/admin-templates";
import { AdminHeader, AdminSkeleton } from "@/components/admin/admin-ui";
import { isTemplateKind, MAX_POPULAR, TEMPLATE_KINDS, templatesOfKind, type TemplateKind } from "@/config/template-catalog";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { decorCopy } from "@/lib/decors/copy";
import { postCopy } from "@/lib/posts/copy";
import { storeCopy } from "@/lib/store/copy";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> { return { title: "Templates" }; }

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function TemplatesContent({ searchParams }: { searchParams: SearchParams }) {
  const t = await getServerDictionary();
  const fr = t.locale === "fr";
  await requireAdmin();
  const params = await searchParams;
  const kind: TemplateKind = isTemplateKind(params.kind) ? params.kind : "motion";

  const LABELS: Record<TemplateKind, string> = {
    motion: postCopy(t.locale).motion,
    product: fr ? "Produits physiques" : "Physical products",
    logo: t.styleCategories.logo,
    post: postCopy(t.locale).posts,
    store: storeCopy(t.locale).kind,
    decor: decorCopy(t.locale).title,
  };

  // Lecture directe (sans cache) : l'admin voit toujours l'état réel
  const rows = await db.templateSetting.findMany({ where: { OR: [{ hidden: true }, { popular: true }] } });
  const counts = Object.fromEntries(TEMPLATE_KINDS.map((k) => [k, { hidden: 0, popular: 0 }])) as Record<TemplateKind, { hidden: number; popular: number }>;
  const state = new Map<string, { hidden: boolean; popular: boolean }>();
  for (const row of rows) {
    if (!isTemplateKind(row.kind)) continue;
    const popular = row.popular && !row.hidden;
    if (row.hidden) counts[row.kind].hidden += 1;
    if (popular) counts[row.kind].popular += 1;
    if (row.kind === kind) state.set(row.templateId, { hidden: row.hidden, popular });
  }

  const items = templatesOfKind(kind, t.locale).map((item) => ({
    ...item,
    palette: [...item.palette],
    image: kind === "decor" ? `/decors/prepared/${item.id}-thumb.webp` : undefined,
    hidden: state.get(item.id)?.hidden ?? false,
    popular: state.get(item.id)?.popular ?? false,
  }));

  return (
    <>
      <AdminHeader
        title="Templates"
        subtitle={fr
          ? `Masque des templates de la galerie ou mets-en jusqu’à ${MAX_POPULAR} en « Populaire » par catégorie. Les projets existants ne sont pas touchés.`
          : `Hide templates from the gallery or mark up to ${MAX_POPULAR} as “Popular” per category. Existing projects are not affected.`}
      />
      <nav aria-label={fr ? "Catégories" : "Categories"} className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
        {TEMPLATE_KINDS.map((k) => (
          <Link
            key={k}
            href={k === "motion" ? "/admin/templates" : `/admin/templates?kind=${k}`}
            aria-current={k === kind ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
              k === kind ? "border-fg bg-fg text-bg" : "border-line text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {LABELS[k]}
            <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", k === kind ? "bg-bg/15" : "bg-surface-2")}>{counts[k].popular}/{MAX_POPULAR}</span>
          </Link>
        ))}
      </nav>
      <AdminTemplateList key={kind} kind={kind} items={items} />
    </>
  );
}

export default function AdminTemplatesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <TemplatesContent searchParams={searchParams} />
    </Suspense>
  );
}

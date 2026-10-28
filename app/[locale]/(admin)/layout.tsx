import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { Suspense } from "react";
import { AdminNav, AdminNavFallback } from "@/components/admin/admin-nav";
import { LogoMark } from "@/components/brand/logo";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return {
  title: { default: "Admin", template: t.copy["dc4832a3c7b0"] },
  robots: { index: false, follow: false },
}; }

/**
 * Cadre statique de l'espace admin. Rien ici ne dépend de la session : la navigation (qui révèle les sections)
 * est sous <Suspense> et ne s'affiche que pour un admin. Chaque page vérifie l'accès elle-même.
 */
export default function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  const t = useDictionary();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-display text-[17px] font-bold tracking-[-0.03em]" aria-label={t.copy["dccb338b0925"]}>
            <LogoMark className="size-7" />
            <span className="max-sm:hidden">{"Kinetik"}</span>
          </Link>
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-danger uppercase">{"Admin"}</span>
          <Suspense fallback={<AdminNavFallback />}>
            <AdminNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}

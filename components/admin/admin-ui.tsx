import { useDictionary } from "@/lib/i18n/use-dictionary";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import type { ReactNode } from "react";
import { cn, formatNumber } from "@/lib/utils";

/** Briques d'affichage du tableau de bord admin (composants serveur, sans état). */

export function AdminHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: number | string; hint?: ReactNode; tone?: "accent" }) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", tone === "accent" ? "border-accent/40 bg-accent-soft" : "border-line bg-bg-subtle")}>
      <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{typeof value === "number" ? formatNumber(value) : value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-bg-subtle", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PlanBadge({ plan }: { plan: "FREE" | "STARTER" | "PRO" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        plan === "FREE" ? "bg-surface-2 text-muted" : plan === "PRO" ? "bg-accent text-accent-fg" : "bg-accent-soft text-accent-text",
      )}
    >
      {plan === "FREE" ? "Free" : plan === "STARTER" ? "Starter" : "Pro"}
    </span>
  );
}

export function RoleBadge({ role }: { role: "USER" | "ADMIN" }) {

  if (role !== "ADMIN") return null;
  return <span className="inline-flex shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">{"Admin"}</span>;
}

/** Recherche en GET : l'URL reste partageable et le bouton retour fonctionne. */
export function SearchForm({ action, q, placeholder, children }: { action: string; q: string; placeholder: string; children?: ReactNode }) {
  const t = useDictionary();

  return (
    <form action={`/${t.locale}${action}`} role="search" className="mb-4 flex flex-col gap-2 sm:flex-row">
      <label className="relative flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-line-strong bg-surface pr-3 pl-10 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)] sm:text-sm"
        />
      </label>
      {children}
      <button type="submit" className="h-11 rounded-xl bg-fg px-5 text-sm font-semibold text-bg transition-opacity hover:opacity-90">

        {t.copy["733d1c742675"]}
      </button>
    </form>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  const t = useDictionary();

  if (pages <= 1) return null;
  const link = "flex h-10 items-center gap-1 rounded-full border border-line px-4 text-sm font-medium transition-colors hover:border-line-strong";
  return (
    <nav aria-label={"Pagination"} className="mt-4 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} className={link}>
          <ChevronLeft className="size-4" />  {t.copy["30b0e9a45aba"]}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted tabular-nums">

        {"Page"} {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={link}>

          {t.copy["df2df3bc713a"]} <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted sm:px-5">{children}</p>;
}

export function AdminSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <div className="h-9 w-56 rounded-xl bg-surface-2" />
      <div className="mt-3 mb-8 h-5 w-72 max-w-full rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

/** Lien construit avec les paramètres de recherche courants (q, filtre…) et une page. */
export function withParams(base: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "" && !(key === "page" && value === 1)) search.set(key, String(value));
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

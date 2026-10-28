import { LogOut } from "lucide-react";
import { getAdminState } from "@/lib/admin/auth";
import Link from "@/lib/i18n/navigation";
import { getServerDictionary } from "@/lib/i18n/server";
import { AdminNavLinks } from "./admin-nav-links";

/** Navigation admin : rendue seulement pour un admin (sinon rien, l'espace reste invisible). */
export async function AdminNav() {
  const t = await getServerDictionary();
  const state = await getAdminState();
  if (!state?.isAdmin) return null;
  return (
    <>
      <AdminNavLinks />
      <Link
        href="/dashboard"
        title={state.user.email}
        className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        <LogOut className="size-3.5" /> <span className="max-sm:hidden">{t.locale === "fr" ? "Quitter l’admin" : "Exit admin"}</span>
      </Link>
    </>
  );
}

/** Même encombrement que la navigation pendant son chargement (pas de saut de mise en page). */
export function AdminNavFallback() {
  return (
    <div aria-hidden className="flex min-w-0 flex-1 items-center gap-1">
      {Array.from({ length: 6 }, (_, i) => <span key={i} className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-surface-2/60 lg:w-28" />)}
    </div>
  );
}

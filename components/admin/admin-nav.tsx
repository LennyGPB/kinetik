import { getServerDictionary } from "@/lib/i18n/server";
import { Lock } from "lucide-react";
import { getAdminState } from "@/lib/admin/auth";
import { lockAdmin } from "@/lib/admin/actions";
import { AdminNavLinks } from "./admin-nav-links";

/** Navigation admin : rendue seulement pour un admin déverrouillé (sinon rien, l'espace reste invisible). */
export async function AdminNav() {
  const t = await getServerDictionary();

  const state = await getAdminState();
  if (!state?.unlockedUntil) return null;
  const minutes = Math.max(1, Math.round((state.unlockedUntil.getTime() - Date.now()) / 60_000));
  return (
    <>
      <AdminNavLinks />
      <form action={lockAdmin} className="ml-auto flex shrink-0 items-center gap-2">
        <span className="hidden text-xs text-subtle md:inline" title={state.user.email}>

          {t.copy["40585e470173"]} {minutes}  {"min"}
        </span>
        <button
          type="submit"
          className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          <Lock className="size-3.5" /> <span className="max-sm:hidden">{t.copy["017ac627d562"]}</span>
        </button>
      </form>
    </>
  );
}

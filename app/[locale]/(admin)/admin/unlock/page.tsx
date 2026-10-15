import { getServerDictionary } from "@/lib/i18n/server";
import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Suspense } from "react";
import { UnlockForm } from "@/components/admin/admin-forms";
import { getAdminState, isAdminPasswordConfigured } from "@/lib/admin/auth";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.copy["3e1eafe5296a"] }; }

async function UnlockGate() {
  const t = await getServerDictionary();

  const state = await getAdminState();
  if (!state) redirect("/login");
  // Compte non admin : l'espace admin n'existe pas pour lui
  if (!state.isAdmin) notFound();
  if (state.unlockedUntil) redirect("/admin");

  return (
    <div className="mx-auto mt-6 max-w-sm sm:mt-16">
      <div className="rounded-3xl border border-line bg-bg-subtle p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-danger/10 text-danger">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">{t.copy["bc2b8e2bd6f4"]}</h1>
        <p className="mt-1.5 mb-6 text-sm text-muted">

          {t.copy["5b9d4a4cafe1"]} <span className="font-medium text-fg">{state.user.email}</span>{t.copy["0c87753052e3"]}
        </p>
        {isAdminPasswordConfigured() ? (
          <UnlockForm />
        ) : (
          <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">

            {t.copy["187df19c724f"]} <code className="font-mono">{"npm run admin:password"}</code>  {t.copy["b2e22da6cc20"]}
          </p>
        )}
      </div>
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-16 h-80 max-w-sm animate-pulse rounded-3xl bg-surface-2" />}>
      <UnlockGate />
    </Suspense>
  );
}

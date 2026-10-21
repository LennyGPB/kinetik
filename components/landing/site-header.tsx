import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getServerDictionary } from "@/lib/i18n/server";
import Link from "@/lib/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeaderClient } from "./site-header-client";

/** Only account actions depend on the session; the marketing shell stays static. */
export function SiteHeader({ homeLinks = false }: { homeLinks?: boolean }) {
  return <SiteHeaderClient homeLinks={homeLinks}
    desktopAccount={<Suspense fallback={<span className="hidden h-8 w-28 animate-pulse rounded-full bg-surface-2 sm:block" aria-hidden />}><HeaderAccount /></Suspense>}
    mobileAccount={<Suspense fallback={<span className="col-span-2 h-12 animate-pulse rounded-full bg-surface-2" aria-hidden />}><HeaderAccount mobile /></Suspense>}
  />;
}

async function HeaderAccount({ mobile = false }: { mobile?: boolean }) {
  const [user, t] = await Promise.all([getCurrentUser(), getServerDictionary()]);
  if (user) return <Link href="/dashboard" className={buttonVariants({ variant: "purple", size: mobile ? "lg" : "sm", className: mobile ? "col-span-2" : "hidden sm:inline-flex" })}>{t.app.nav.dashboard}</Link>;
  return <>
    <Link href="/login" className={buttonVariants({ variant: mobile ? "outline" : "ghost", size: mobile ? "lg" : "sm", className: mobile ? undefined : "hidden sm:inline-flex" })}>{t.common.login}</Link>
    <Link href="/register" className={buttonVariants({ variant: "purple", size: mobile ? "lg" : "sm", className: mobile ? undefined : "hidden sm:inline-flex" })}>{t.common.getStarted}</Link>
  </>;
}

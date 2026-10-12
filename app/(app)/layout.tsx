import { Suspense } from "react";
import {
  MobileAccount,
  MobileAccountSkeleton,
  SidebarAccount,
  SidebarAccountSkeleton,
} from "@/components/app/account-widgets";
import { AppShell } from "@/components/app/app-shell";

/**
 * Le shell est statique ; les blocs dépendant de la session sont sous <Suspense>.
 * Chaque page place son propre <Suspense> autour de ses données (navigation instantanée).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell
      sidebarAccount={
        <Suspense fallback={<SidebarAccountSkeleton />}>
          <SidebarAccount />
        </Suspense>
      }
      mobileAccount={
        <Suspense fallback={<MobileAccountSkeleton />}>
          <MobileAccount />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}

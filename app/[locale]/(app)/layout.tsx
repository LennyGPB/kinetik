import { Suspense } from "react";
import {
  MobileAccount,
  MobileAccountSkeleton,
  SidebarAccount,
  SidebarAccountSkeleton,
} from "@/components/app/account-widgets";
import { AppShell } from "@/components/app/app-shell";
import { TemplateSettingsProvider } from "@/components/templates/template-settings";
import { getTemplateSettings } from "@/lib/templates/settings";
export const metadata = { robots: { index: false, follow: false } };

/**
 * Le shell est statique ; les blocs dépendant de la session sont sous <Suspense>.
 * Chaque page place son propre <Suspense> autour de ses données (navigation instantanée).
 * Les réglages des templates (masqués / populaires) sont en cache : ils font partie du shell statique.
 */
export default async function AppLayout({ children }: LayoutProps<"/[locale]">) {
  const templateSettings = await getTemplateSettings();
  return (
    <TemplateSettingsProvider value={templateSettings}>
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
    </TemplateSettingsProvider>
  );
}

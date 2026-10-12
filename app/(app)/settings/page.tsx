import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/components/app/page-skeleton";
import { SettingsForms } from "@/components/settings/settings-forms";
import { requireUser } from "@/lib/auth/dal";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.app.settings.title };

async function SettingsContent() {
  const user = await requireUser();
  return <SettingsForms name={user.name} email={user.email} hasPassword={user.hasPassword} />;
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t.app.settings.title} />
      <div className="mt-8">
        <Suspense fallback={<PageSkeleton withHeader={false} />}>
          <SettingsContent />
        </Suspense>
      </div>
    </div>
  );
}

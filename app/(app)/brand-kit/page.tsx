import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandKitForm } from "@/components/brand-kit/brand-kit-form";
import { PageHeader, PageSkeleton } from "@/components/app/page-skeleton";
import { requireUser } from "@/lib/auth/dal";
import { t } from "@/lib/i18n";
import { getDefaultBrandKit } from "@/lib/projects/queries";

export const metadata: Metadata = { title: t.app.brandKit.title };

async function BrandKitContent() {
  const user = await requireUser();
  const kit = await getDefaultBrandKit(user.id);
  return <BrandKitForm initial={kit} />;
}

export default function BrandKitPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t.app.brandKit.title} subtitle={t.app.brandKit.subtitle} />
      <div className="mt-8">
        <Suspense fallback={<PageSkeleton withHeader={false} />}>
          <BrandKitContent />
        </Suspense>
      </div>
    </div>
  );
}

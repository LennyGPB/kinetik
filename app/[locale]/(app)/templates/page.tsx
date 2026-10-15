import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-skeleton";
import { TemplatesGallery } from "@/components/templates/templates-gallery";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.templates.title }; }

// Page statique : la liste des templates vient de config/styles.ts.
export default function TemplatesPage() {
  const t = useDictionary();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t.app.templates.title} subtitle={t.app.templates.subtitle} />
      <div className="mt-8">
        <TemplatesGallery />
      </div>
    </div>
  );
}

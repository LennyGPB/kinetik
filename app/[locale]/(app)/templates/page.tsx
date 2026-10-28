import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-skeleton";
import { TemplatesGallery } from "@/components/templates/templates-gallery";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.templates.title }; }

/** Galerie ; ?tab=community (lien depuis la landing) ouvre directement les Créations. */
async function Gallery({ searchParams }: { searchParams: PageProps<"/[locale]/templates">["searchParams"] }) {
  const tab = (await searchParams).tab;
  return <TemplatesGallery initialKind={Array.isArray(tab) ? tab[0] : tab} />;
}

export default function TemplatesPage({ searchParams }: PageProps<"/[locale]/templates">) {
  const t = useDictionary();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t.app.templates.title} subtitle={t.app.templates.subtitle} />
      <div className="mt-8">
        <Suspense fallback={<TemplatesGallery />}>
          <Gallery searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

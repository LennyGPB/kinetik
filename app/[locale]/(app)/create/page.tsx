import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { CreateWizard } from "@/components/create/create-wizard";
import { ContentKind } from "@/components/posts/content-kind";
import { PostForm } from "@/components/posts/post-form";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance } from "@/lib/credits/ledger";

import { getDefaultBrandKit } from "@/lib/projects/queries";

export const maxDuration = 180;

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.create.title }; }

async function CreateContent({ searchParams }: { searchParams: PageProps<"/[locale]/create">["searchParams"] }) {
  const user = await requireUser();
  const [params, balance, brandKit] = await Promise.all([searchParams, getCreditBalance(user.id), getDefaultBrandKit(user.id)]);
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const kind = first(params.kind) === "post" ? "post" : "motion";
  return (
    <div className="mx-auto max-w-6xl">
    <ContentKind kind={kind} />
    {kind === "post" ? <PostForm balance={balance.total} brandKit={brandKit} initialAppName={first(params.app)?.slice(0, 40)} initialStyleId={first(params.style)} /> :
    <CreateWizard
      balance={balance.total}
      brandKit={brandKit}
      initialAppName={first(params.app)?.slice(0, 40)}
      initialStyleId={first(params.style)}
    />}
    </div>
  );
}

export default function CreatePage({ searchParams }: PageProps<"/[locale]/create">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CreateContent searchParams={searchParams} />
    </Suspense>
  );
}

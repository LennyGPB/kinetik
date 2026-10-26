import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { MotionCreateFlow } from "@/components/create/motion-create-flow";
import { CreatePicker } from "@/components/create/create-picker";
import { PhysicalProductCreate } from "@/components/create/physical-product-create";
import { RecordingCreate } from "@/components/recordings/recording-create";
import { PostForm } from "@/components/posts/post-form";
import { StoreForm } from "@/components/store/store-form";
import { DecorGallery } from "@/components/decors/decor-gallery";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance } from "@/lib/credits/ledger";

import { getDefaultBrandKit } from "@/lib/projects/queries";

export const maxDuration = 180;

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.create.title }; }

async function CreateContent({ searchParams }: { searchParams: PageProps<"/[locale]/create">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  // Sans choix précis : le carrousel des formats (?pick=motion ou ?kind=motion ouvre directement les choix Motion)
  const bareMotion = first(params.kind) === "motion" && !first(params.style) && !first(params.flow) && !first(params.analysis);
  if (bareMotion || (!first(params.kind) && !first(params.style) && !first(params.flow) && !first(params.analysis))) return <CreatePicker initialGroup={bareMotion || first(params.pick) === "motion" ? "motion" : null} />;
  const [balance, brandKit] = await Promise.all([getCreditBalance(user.id), getDefaultBrandKit(user.id)]);
  if (first(params.kind) === "product") return <PhysicalProductCreate balance={balance.total} initialStyleId={first(params.style)} />;
  if (first(params.kind) === "decor") return <div className="mx-auto max-w-6xl"><DecorGallery /></div>;

  const kind = first(params.kind) === "recording" ? "recording" : first(params.kind) === "post" ? "post" : first(params.kind) === "store" ? "store" : "motion";
  return (
    <div className="mx-auto max-w-6xl">
    {kind === "recording" ? <RecordingCreate balance={balance.total} /> : kind === "store" ? <StoreForm balance={balance.total} brandKit={brandKit} initialAppName={first(params.app)?.slice(0, 30)} initialStyleId={first(params.style)} /> : kind === "post" ? <PostForm balance={balance.total} brandKit={brandKit} initialAppName={first(params.app)?.slice(0, 40)} initialStyleId={first(params.style)} /> :
    <MotionCreateFlow
      balance={balance.total}
      brandKit={brandKit}
      initialAppName={first(params.app)?.slice(0, 40)}
      initialStyleId={first(params.style)}
      initialFlow={first(params.flow)}
      initialAnalysisId={first(params.analysis)?.slice(0, 100)}
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

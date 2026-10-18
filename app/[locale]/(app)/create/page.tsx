import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { MotionCreateFlow } from "@/components/create/motion-create-flow";
import { RecordingCreate } from "@/components/recordings/recording-create";
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

  const kind = first(params.kind) === "recording" ? "recording" : first(params.kind) === "post" ? "post" : "motion";
  return (
    <div className="mx-auto max-w-6xl">
    {kind === "recording" ? <RecordingCreate balance={balance.total} /> : kind === "post" ? <PostForm balance={balance.total} brandKit={brandKit} initialAppName={first(params.app)?.slice(0, 40)} initialStyleId={first(params.style)} /> :
    <MotionCreateFlow
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

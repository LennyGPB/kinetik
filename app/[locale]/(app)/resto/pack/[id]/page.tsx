import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/app/page-skeleton";
import { PackReview, type PackReviewItem } from "@/components/resto/pack-review";
import { AutoRefresh } from "@/components/resto/wait-for-plan";
import { featurePlan } from "@/config/pricing";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getServerDictionary } from "@/lib/i18n/server";
import { getEditorProject } from "@/lib/projects/queries";
import { buildVideoProps } from "@/lib/projects/video-props";
import { canUseResto } from "@/lib/resto/access";
import type { PackItem, PackSkipped } from "@/lib/resto/pack";
import { spaceCopy } from "@/lib/resto/space-copy";

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: spaceCopy(t.locale).pack.title }; }

async function Pack({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!canUseResto(user)) notFound();
  const pack = await db.restoPack.findFirst({ where: { id, userId: user.id } });
  if (!pack) notFound();
  const t = await getServerDictionary();
  const p = spaceCopy(t.locale).pack;
  if (pack.status === "PREPARING") return <AutoRefresh title={p.preparing} hint={p.preparingHint} slow={p.preparingHint} every={4000} tries={30} />;
  if (pack.status === "SKIPPED") return <p className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-6 text-center font-medium">{pack.reason === "closed" ? p.closed : p.empty}</p>;
  const { watermark } = featurePlan(user);
  const items = (await Promise.all((pack.items as PackItem[]).map(async (item): Promise<PackReviewItem | null> => {
    const project = await getEditorProject(user.id, item.projectId);
    const version = project?.versions.at(-1);
    return project && version ? { projectId: item.projectId, template: item.template, caption: item.caption, kept: item.kept, videoProps: buildVideoProps(project, version.graph, watermark) } : null;
  }))).filter((i): i is PackReviewItem => i !== null);
  return <PackReview packId={pack.id} status={pack.status} items={items} skipped={pack.skipped as PackSkipped[]} />;
}

/** Validation du pack de la semaine, depuis le téléphone. */
export default function PackPage(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<PageSkeleton withHeader={false} />}><Pack params={props.params} /></Suspense>;
}

import { getServerDictionary } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Suspense } from "react";
import { PitchCreate } from "@/components/create/pitch-create";
import { Editor } from "@/components/editor/editor";
import { RecordingEditor } from "@/components/recordings/recording-editor";
import { getPlan } from "@/config/pricing";
import { requireUser } from "@/lib/auth/dal";
import { getCreditBalance } from "@/lib/credits/ledger";

import { getEditorProject } from "@/lib/projects/queries";
import { db } from "@/lib/db";
import { getPostEditor } from "@/lib/posts/queries";
import { PostEditor } from "@/components/posts/post-editor";
import { getStoreEditor } from "@/lib/store/queries";
import { StoreEditor } from "@/components/store/store-editor";

export const maxDuration = 180;

export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.editor.title }; }

async function EditorLoader({ params }: { params: PageProps<"/[locale]/project/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser();
  const content = await db.project.findFirst({ where: { id, userId: user.id }, select: { kind: true } });
  if (!content) notFound();
  if (content.kind === "STORE") {
    const [store, balance] = await Promise.all([getStoreEditor(user.id, id), getCreditBalance(user.id)]);
    if (!store || !store.versions.length) notFound();
    return <StoreEditor key={store.id} project={store} initialBalance={balance.total} watermark={getPlan(user.plan).watermark} />;
  }
  if (content.kind === "POST") {
    const post = await getPostEditor(user.id, id);
    const balance = await getCreditBalance(user.id);
    if (!post || !post.versions.length) notFound();
    return <PostEditor key={post.id} project={post} initialBalance={balance.total} watermark={getPlan(user.plan).watermark} />;
  }
  const [project, balance] = await Promise.all([getEditorProject(user.id, id), getCreditBalance(user.id)]);
  if (!project) notFound();

  if (project.versions.at(-1)?.graph.pitch && project.status !== "READY") return <div className="min-h-dvh bg-bg p-4 sm:p-8"><PitchCreate balance={balance.total} resumeProjectId={project.id} /></div>;
  const { watermark, maxQuality } = getPlan(user.plan);
  if (project.versions.at(-1)?.graph.recording) return <RecordingEditor key={project.id} project={project} initialBalance={balance.total} plan={{ watermark, maxQuality }} />;
  // `key` : remonte l'éditeur quand la génération se termine (nouvelles versions côté serveur)
  return <Editor key={`${project.id}-${project.status}-${project.versions.length}`} project={project} initialBalance={balance.total} plan={{ watermark, maxQuality }} />;
}

function EditorSkeleton() {
  return (
    <div className="flex h-dvh animate-pulse flex-col" aria-busy="true">
      <div className="h-14 border-b border-line" />
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex flex-1 items-center justify-center bg-bg-subtle p-8">
          <div className="aspect-video w-full max-w-3xl rounded-3xl bg-surface-2" />
        </div>
        <div className="h-72 border-t border-line lg:h-auto lg:w-[400px] lg:border-t-0 lg:border-l" />
      </div>
    </div>
  );
}

export default function ProjectPage({ params }: PageProps<"/[locale]/project/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorLoader params={params} />
    </Suspense>
  );
}

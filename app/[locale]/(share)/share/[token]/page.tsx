import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getServerDictionary } from "@/lib/i18n/server";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";

import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Player } from "@/components/editor/player";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { format } from "@/lib/i18n";
import { getSharedVideo } from "@/lib/projects/queries";
import { buildVideoProps } from "@/lib/projects/video-props";
import { LIMITS, limitKey, requestIp, tooMany } from "@/lib/security/limits";
import { cn } from "@/lib/utils";
import { withSharedMedia } from "@/lib/storage/shared-media";
import { getSharedPost } from "@/lib/posts/queries";
import { PostPreview } from "@/components/posts/post-preview";

// Lien privé : jamais indexé
export async function generateMetadata(): Promise<Metadata> { const t = await getServerDictionary(); return { title: t.app.share.madeWith, robots: { index: false, follow: false } }; }

async function SharedVideo({ params }: { params: PageProps<"/[locale]/share/[token]">["params"] }) {
  const t = await getServerDictionary();

  const s = t.app.share;

  const { token } = await params;
  // Page publique : limite par IP (énumération de jetons, aspiration)
  const limited = await limitKey("share", await requestIp(), LIMITS.sharePage);
  if (!limited.ok) return <p className="text-center text-muted">{tooMany(limited)}</p>;
  const post = await getSharedPost(token);
  if (post) return <div className="w-full max-w-5xl"><h1 className="mb-6 text-center text-xl font-semibold">{post.name}</h1><div className="overflow-x-auto pb-4"><div className="flex w-max min-w-full justify-center">{post.document.pages.map((page, index) => <PostPreview key={page.id} document={post.document} index={index} appName={post.appName} logoUrl={post.logoUrl} screenUrls={post.screenUrls} screenRatios={post.screenRatios} watermark={post.watermark} className="w-[280px] shrink-0 sm:w-[340px]" />)}</div></div></div>;
  const shared = await getSharedVideo(token);
  if (!shared) notFound();

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-6">
      <h1 className="text-center text-xl font-semibold sm:text-2xl">{format(s.pageTitle, { name: shared.source.appName })}</h1>
      <Player videoProps={withSharedMedia(buildVideoProps(shared.source, shared.graph, shared.watermark), token)} />
    </div>
  );
}

function PlayerSkeleton() {
  return <div className="aspect-video w-full max-w-4xl animate-pulse rounded-3xl bg-surface-2" aria-busy="true" />;
}

/** Page publique d'un lien de partage : la dernière version, en lecture seule. */
export default function SharePage({ params }: PageProps<"/[locale]/share/[token]">) {
  const t = useDictionary();

  const s = t.app.share;

  return (
    <div className="flex min-h-dvh flex-col bg-bg-subtle">
      <header className="flex h-16 items-center justify-between border-b border-line bg-bg px-4 sm:px-6">
        <Link href="/" aria-label={t.a11y.home} className="rounded-full">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12">
        <Suspense fallback={<PlayerSkeleton />}>
          <SharedVideo params={params} />
        </Suspense>
      </main>
      <footer className="flex flex-col items-center gap-3 border-t border-line bg-bg px-4 py-6 text-sm text-muted sm:flex-row sm:justify-center">
        {s.madeWith}
        <Link href="/register" className={cn(buttonVariants({ size: "sm" }))}>
          {s.cta} <ArrowRight />
        </Link>
      </footer>
    </div>
  );
}

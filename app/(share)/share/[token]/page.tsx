import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Player } from "@/components/editor/player";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { format, t } from "@/lib/i18n";
import { getSharedVideo } from "@/lib/projects/queries";
import { buildVideoProps } from "@/lib/projects/video-props";
import { cn } from "@/lib/utils";

const s = t.app.share;

// Lien privé : jamais indexé
export const metadata: Metadata = { title: s.madeWith, robots: { index: false, follow: false } };

async function SharedVideo({ params }: { params: PageProps<"/share/[token]">["params"] }) {
  const { token } = await params;
  const shared = await getSharedVideo(token);
  if (!shared) notFound();

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-6">
      <h1 className="text-center text-xl font-semibold sm:text-2xl">{format(s.pageTitle, { name: shared.source.appName })}</h1>
      <Player videoProps={buildVideoProps(shared.source, shared.graph, shared.watermark)} />
    </div>
  );
}

function PlayerSkeleton() {
  return <div className="aspect-video w-full max-w-4xl animate-pulse rounded-3xl bg-surface-2" aria-busy="true" />;
}

/** Page publique d'un lien de partage : la dernière version, en lecture seule. */
export default function SharePage({ params }: PageProps<"/share/[token]">) {
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

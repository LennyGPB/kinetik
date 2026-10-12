import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { t } from "@/lib/i18n";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="relative flex flex-col px-4 py-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden lg:hidden" aria-hidden>
          <div className="absolute -top-40 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-70" />
        </div>
        <header className="flex items-center justify-between">
          <Link href="/" aria-label={t.a11y.home} className="rounded-full">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>

      <aside className="relative hidden p-3 lg:block" aria-hidden>
        <div className="relative h-full overflow-hidden rounded-[2rem]">
          <VideoPlaceholder ratio="fill" scene="blobs" palette={["#12062b", "#7c3aed", "#d946ef"]} label="" className="absolute inset-0" />
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="grid w-full max-w-md grid-cols-2 gap-3 [transform:rotate(-6deg)]">
              <div className="animate-float overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
                <VideoPlaceholder ratio="9:16" scene="type" palette={["#f5f0e6", "#111111", "#7c3aed"]} label="Flowly" />
              </div>
              <div className="flex flex-col gap-3 pt-12">
                <div className="animate-float overflow-hidden rounded-2xl border border-white/15 shadow-2xl [animation-delay:-2s]">
                  <VideoPlaceholder ratio="1:1" scene="rings" palette={["#0b0320", "#c026ff", "#22d3ee"]} />
                </div>
                <div className="animate-float overflow-hidden rounded-2xl border border-white/15 shadow-2xl [animation-delay:-4s]">
                  <VideoPlaceholder ratio="1:1" scene="bars" palette={["#0a0a0a", "#facc15", "#f43f5e"]} />
                </div>
              </div>
            </div>
          </div>
          <figure className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-black/30 p-6 text-white backdrop-blur-xl">
            <blockquote className="font-display text-xl leading-snug font-medium">{t.auth.visualQuote}</blockquote>
            <figcaption className="mt-3 text-sm text-white/70">{t.auth.visualAuthor}</figcaption>
          </figure>
        </div>
      </aside>
    </div>
  );
}

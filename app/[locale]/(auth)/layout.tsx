import { useDictionary } from "@/lib/i18n/use-dictionary";
import Link from "@/lib/i18n/navigation";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { Logo } from "@/components/brand/logo";
import { TemplatesWall } from "@/components/auth/templates-wall";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const t = useDictionary();

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
          <div className="flex items-center gap-2"><LanguageToggle /><ThemeToggle /></div>
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
      </div>

      <aside className="relative hidden h-dvh min-h-0 p-3 lg:sticky lg:top-0 lg:block" aria-hidden>
        <div className="relative h-full overflow-hidden rounded-[2rem] bg-[#07070c]">
          {/* Tous les templates en mur défilant, légèrement incliné ; fondus haut/bas pour la lisibilité de la citation */}
          <TemplatesWall className="absolute -inset-x-6 -inset-y-24 rotate-[-4deg] opacity-90" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#07070c_0%,transparent_18%,transparent_55%,rgb(7_7_12/0.92)_88%)]" />
          <figure className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-black/30 p-6 text-white backdrop-blur-xl">
            <blockquote className="font-display text-xl leading-snug font-medium">{t.auth.visualQuote}</blockquote>
            <figcaption className="mt-3 text-sm text-white/70">{t.auth.visualAuthor}</figcaption>
          </figure>
        </div>
      </aside>
    </div>
  );
}

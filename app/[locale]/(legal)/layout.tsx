import { useDictionary } from "@/lib/i18n/use-dictionary";
import Link from "@/lib/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/landing/site-footer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";

export default function LegalLayout({ children }: LayoutProps<"/[locale]">) {
  const t = useDictionary();

  return (
    <>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label={t.a11y.home} className="rounded-full">
          <Logo />
        </Link>
        <div className="flex items-center gap-2"><LanguageToggle /><ThemeToggle /></div>
      </header>
      <main className="px-4 pt-8 pb-24 sm:px-6">{children}</main>
      <SiteFooter />
    </>
  );
}

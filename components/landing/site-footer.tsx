import { useDictionary } from "@/lib/i18n/use-dictionary";
import Link from "@/lib/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { siteConfig } from "@/config/site";

const SOCIALS = Object.entries(siteConfig.social);

// Année fixée au build (pas de `new Date()` dans le shell statique).
const YEAR = 2026;

export function SiteFooter() {
  const t = useDictionary();

  const f = t.landing.footer;
  const COLUMNS = [
  {
    title: f.product,
    links: [
      { label: t.nav.styles, href: "/#styles" },
      { label: t.nav.features, href: "/#features" },
      { label: t.nav.pricing, href: "/#pricing" },
      { label: t.nav.faq, href: "/#faq" },
    ],
  },
  {
    title: f.company,
    links: [
      { label: f.links.about, href: "#" },
      { label: f.links.blog, href: "#" },
      { label: f.links.contact, href: "/support" },
    ],
  },
  {
    title: f.legal,
    links: [
      { label: f.links.legalNotice, href: "/legal" },
      { label: f.links.terms, href: "/terms" },
      { label: f.links.privacy, href: "/privacy" },
      { label: f.links.cookies, href: "/cookies" },
    ],
  },
];

  return (
    <footer className="border-t border-line px-4 pt-16 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm text-muted">{f.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIALS.map(([name, href]) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted capitalize transition-colors hover:border-line-strong hover:text-fg"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted transition-colors hover:text-fg">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-xs text-subtle">
            © {YEAR} {siteConfig.name}. {f.rights}
          </p>
          <ThemeToggle />
        </div>
        <p
          className="pointer-events-none mt-10 text-center font-display text-[clamp(4rem,20vw,16rem)] leading-[0.8] font-extrabold tracking-[-0.06em] text-fg/[0.04] select-none"
          aria-hidden
        >

          {"Kinetik"}
        </p>
      </div>
    </footer>
  );
}

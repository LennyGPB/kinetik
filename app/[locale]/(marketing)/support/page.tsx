import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { HelpCircle, Mail } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { SupportForm } from "@/components/support/support-form";
import { legalConfig } from "@/config/legal";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getServerDictionary } from "@/lib/i18n/server";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerDictionary();
  return {
    title: t.support.metaTitle,
    description: t.support.subtitle,
    alternates: { canonical: `/${locale}/support`, languages: { en: "/en/support", fr: "/fr/support", "x-default": "/en/support" } },
  };
}

export default function SupportPage() {
  const t = useDictionary();
  const s = t.support;

  return (
    <>
    <SiteHeader homeLinks />
    <main className="px-4 pt-28 pb-24 sm:px-6 sm:pt-32">
    <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
      <header className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{s.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{s.subtitle}</p>
        </div>
        <ul className="flex flex-col gap-3 text-sm">
          <li>
            <Link href="/#faq" className="group flex items-start gap-3 rounded-xl border border-line p-4 transition-colors hover:border-line-strong">
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-accent-text" />
              <span>
                <span className="font-medium text-fg">{s.faqTitle}</span>
                <span className="mt-0.5 block text-muted">{s.faqBody}</span>
              </span>
            </Link>
          </li>
          <li>
            <a href={`mailto:${legalConfig.contactEmail}`} className="flex items-start gap-3 rounded-xl border border-line p-4 transition-colors hover:border-line-strong">
              <Mail className="mt-0.5 size-4 shrink-0 text-accent-text" />
              <span>
                <span className="font-medium text-fg">{s.emailTitle}</span>
                <span className="mt-0.5 block break-all text-muted">{legalConfig.contactEmail}</span>
              </span>
            </a>
          </li>
        </ul>
      </header>
      <SupportForm />
    </div>
    </main>
    <SiteFooter />
    </>
  );
}

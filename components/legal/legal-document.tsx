import Link from "@/lib/i18n/navigation";
import { LEGAL_NAV, LEGAL_SLUGS, getLegalDocs, getLegalUpdatedAt, type LegalBlock, type LegalSlug } from "@/lib/legal";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";

const UPDATED = { fr: "Dernière mise à jour :", en: "Last updated:" } as const;

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p><RichText text={block} /></p>;
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-subtle">
      {block.list.map((item) => <li key={item}><RichText text={item} /></li>)}
    </ul>
  );
}

export function LegalDocument({ slug, locale }: { slug: LegalSlug; locale: Locale }) {
  const doc = getLegalDocs(locale)[slug];
  return (
    <article className="mx-auto w-full max-w-3xl">
      <nav aria-label={locale === "fr" ? "Documents légaux" : "Legal documents"} className="-mx-1 flex flex-wrap gap-1.5">
        {LEGAL_SLUGS.map((s) => (
          <Link
            key={s}
            href={`/${s}`}
            aria-current={s === slug ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              s === slug ? "border-line-strong bg-fg/[0.06] text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {LEGAL_NAV[locale][s]}
          </Link>
        ))}
      </nav>
      <header className="mt-10 border-b border-line pb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-subtle">{UPDATED[locale]} {getLegalUpdatedAt(locale)}</p>
      </header>
      <div className="mt-8 flex flex-col gap-10 text-[15px] leading-relaxed text-muted">
        {doc.intro && <div className="flex flex-col gap-4">{doc.intro.map((b, i) => <Block key={i} block={b} />)}</div>}
        {doc.sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-fg">{section.title}</h2>
            {section.blocks.map((b, i) => <Block key={i} block={b} />)}
          </section>
        ))}
      </div>
    </article>
  );
}

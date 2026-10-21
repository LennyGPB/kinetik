"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { POST_TEMPLATES, POST_FILTERS, matchesPostFilter, type PostFilter } from "@/config/post-templates";
import { Segmented } from "@/components/ui/segmented";
import { format } from "@/lib/i18n";
import { demoPost } from "@/lib/posts/document";
import { postCopy } from "@/lib/posts/copy";
import { PostPreview } from "./post-preview";
import { Dialog } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function PostTemplateGallery() {
  const t = useDictionary();
  const { locale } = t;
  const c = postCopy(locale);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<PostFilter>("all");
  const templates = POST_TEMPLATES.filter((template) => matchesPostFilter(template, filter));
  const labels = locale === "fr" ? { all: "Tous", kinetik: "Kinetik", photo: "Photo", typography: "Typographie", linked: "Carrousels liés" } : { all: "All", kinetik: "Kinetik", photo: "Photography", typography: "Typography", linked: "Linked carousels" };
  const template = POST_TEMPLATES.find((item) => item.id === open);
  return <>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 overflow-x-auto scrollbar-none">
        <Segmented label={c.posts} size="sm" value={filter} onChange={setFilter} options={POST_FILTERS.map((value) => ({ value, label: labels[value] }))} />
      </div>
      <p className="shrink-0 text-sm text-subtle" aria-live="polite">{format(t.app.templates.count, { count: templates.length })}</p>
    </div>
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {templates.map((item) => <li key={item.id}>
        <PostTemplateTile item={item} locale={locale} onOpen={setOpen} />
      </li>)}
    </ul>
    <Dialog open={Boolean(template)} onClose={() => setOpen(null)} title={template?.name ?? ""} description={template?.description[locale]} className="sm:max-w-5xl">
      {template && <div className="space-y-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">{template.linked ? c.linked : c.classic}</p><span className="flex gap-1.5" aria-hidden>{template.palette.map((color, index) => <span key={index} className="size-4 rounded-full ring-1 ring-white/20" style={{ background: color }} />)}</span></div><div className="overflow-x-auto"><div className="flex min-w-[600px]">{demoPost(template.id, locale).pages.map((page, index) => <PostPreview key={page.id} index={index} document={demoPost(template.id, locale)} demo className="w-1/3 shrink-0" />)}</div></div><p className="text-sm text-muted">{template.linked ? c.linkHint : c.classic} · {c.max}</p><p className="text-xs text-muted">{locale === "fr" ? "Photos de démonstration : importez vos propres images dans le formulaire ou l’éditeur." : "Demo photography: upload your own images in the form or editor."}</p><Link href={`/create?kind=post&style=${template.id}`} className={buttonVariants()}>{c.create}<ArrowRight /></Link></div>}
    </Dialog>
  </>;
}

const PostTemplateTile = memo(function PostTemplateTile({ item, locale, onOpen }: {
  item: (typeof POST_TEMPLATES)[number]; locale: "fr" | "en"; onOpen: (id: string) => void;
}) {
  const document = useMemo(() => demoPost(item.id, locale), [item.id, locale]);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active || reducedMotion) return;
    const timer = setInterval(() => setIndex((page) => (page + 1) % document.pages.length), 1200);
    return () => clearInterval(timer);
  }, [active, reducedMotion, document.pages.length]);
  const start = () => { if (!reducedMotion) { setActive(true); setIndex(1 % document.pages.length); } };
  const stop = () => { setActive(false); setIndex(0); };
  return <button type="button" aria-label={item.name} onClick={() => { stop(); onOpen(item.id); }} onMouseEnter={start} onMouseLeave={stop} onFocus={start} onBlur={stop} className="block w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
    <PostPreview document={document} index={index} demo />
  </button>;
});

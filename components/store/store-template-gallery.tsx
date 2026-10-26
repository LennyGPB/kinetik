"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { format } from "@/lib/i18n";
import { STORE_TEMPLATES, type StoreTemplate } from "@/config/store-templates";
import { demoStore } from "@/lib/store/document";
import { storeCopy } from "@/lib/store/copy";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { buttonVariants } from "@/components/ui/button";
import { StorePreview } from "./store-preview";

export function StoreTemplateGallery() {
  const t = useDictionary();
  const { locale } = t;
  const c = storeCopy(locale);
  const [open, setOpen] = useState<StoreTemplate | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "banner">("ios");
  const demo = useMemo(() => open ? demoStore(open.id, locale) : null, [open, locale]);
  return <>
    <div className="flex items-center justify-between gap-4"><p className="max-w-xl text-sm text-muted">{c.intro}</p><p className="shrink-0 text-sm text-subtle">{format(t.app.templates.count, { count: STORE_TEMPLATES.length })}</p></div>
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{STORE_TEMPLATES.map((item) => <li key={item.id}><StoreTile item={item} locale={locale} onOpen={() => setOpen(item)} /></li>)}</ul>
    <Dialog open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name ?? ""} description={open?.description[locale]} className="sm:max-w-5xl">
      {open && demo && <div className="space-y-5">
        <Segmented variant="pills" size="sm" label={c.preview} value={platform} onChange={setPlatform} options={[{ value: "ios", label: c.iphone }, { value: "android", label: c.android }, { value: "banner", label: c.banner }]} />
        {platform === "banner" ? <StorePreview document={demo} platform="banner" className="mx-auto w-full max-w-[560px] rounded-xl" /> : <div className="overflow-x-auto"><div className="flex min-w-[720px] gap-2">{demo.pages.map((page, index) => <StorePreview key={page.id} document={demo} index={index} platform={platform} className="w-1/6 shrink-0 rounded-lg" />)}</div></div>}
        <p className="text-xs text-muted">{c.demo}</p>
        <Link href={`/create?kind=store&style=${open.id}`} className={buttonVariants({ variant: "purple" })}>{c.use}<ArrowRight /></Link>
      </div>}
    </Dialog>
  </>;
}

const StoreTile = memo(function StoreTile({ item, locale, onOpen }: { item: StoreTemplate; locale: "fr" | "en"; onOpen: () => void }) {
  const document = useMemo(() => demoStore(item.id, locale), [item.id, locale]);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(1);
  useEffect(() => {
    if (!active || reducedMotion) return;
    const timer = setInterval(() => setIndex((page) => (page + 1) % document.pages.length), 1100);
    return () => clearInterval(timer);
  }, [active, reducedMotion, document.pages.length]);
  return <button type="button" aria-label={item.name} onClick={() => { setActive(false); onOpen(); }} onMouseEnter={() => setActive(true)} onMouseLeave={() => { setActive(false); setIndex(1); }} onFocus={() => setActive(true)} onBlur={() => { setActive(false); setIndex(1); }} className="relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" style={{ background: item.palette[0] }}>
    <div className="absolute inset-0 flex justify-center gap-[3%] px-[4%] pt-[6%]">{[index, (index + 1) % document.pages.length].map((page) => <StorePreview key={page} document={document} index={page} className="h-[94%] shrink-0 rounded-lg shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)]" />)}</div>
    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2.5 pt-8 text-sm font-semibold text-white">{item.name}</span>
  </button>;
});

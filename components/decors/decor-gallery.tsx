"use client";

import Image from 'next/image';
import { useState } from 'react';
import { ArrowUpRight, Monitor, Smartphone, Tablet, Layers } from 'lucide-react';
import { DECORS, DECOR_CATEGORIES, decorName, type DecorCategory, type DecorId } from '@/config/decors';
import { useDictionary } from '@/lib/i18n/use-dictionary';
import { decorCopy } from '@/lib/decors/copy';
import { Segmented } from '@/components/ui/segmented';
import { Dialog } from '@/components/ui/dialog';
import { DecorCreate } from './decor-create';

export function DecorGallery() {
  const { locale } = useDictionary(), c = decorCopy(locale);
  const [category, setCategory] = useState<DecorCategory | 'all'>('all');
  const [selected, setSelected] = useState<DecorId | null>(null);
  const [busy, setBusy] = useState(false);
  const visible = DECORS.filter(decor => category === 'all' || decor.category === category);
  const icons = { pc: Monitor, phone: Smartphone, tablet: Tablet, hybrid: Layers };
  return <section aria-label={c.title}>
    <Segmented variant="pills" label={c.title} size="sm" value={category} onChange={setCategory} options={(['all', ...DECOR_CATEGORIES] as const).map(value => ({ value, label: <span className="flex items-center gap-1.5">{value !== 'all' && (() => { const Icon = icons[value]; return <Icon className="size-3.5" aria-hidden />; })()}{c.categories[value]}</span> }))} />
    <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="font-heading text-2xl sm:text-3xl">{c.heading}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{c.subtitle}</p></div>
      <p className="shrink-0 text-xs leading-relaxed text-accent-text">{c.free}</p>
    </header>
    {visible.length ? <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map(decor => <li key={decor.id}>
        <button type="button" onClick={() => setSelected(decor.id)} className="group block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent rounded-xl" aria-label={`${c.use} · ${decorName(decor.id, locale)}`}>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2">
            <Image src={`/decors/prepared/${decor.id}-thumb.webp`} alt={decorName(decor.id, locale)} fill sizes="(min-width:1280px) 360px, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035] motion-reduce:transform-none" />
            <span className="absolute bottom-3 right-3 rounded-full bg-black/70 p-2 text-white transition-colors group-hover:bg-accent"><ArrowUpRight className="size-4" aria-hidden /></span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 px-1"><h3 className="text-sm font-semibold">{decorName(decor.id, locale)}</h3><span className="text-xs text-muted">{c.categories[decor.category]}</span></div>
        </button>
      </li>)}
    </ul> : <div className="mt-6 rounded-xl border border-line px-6 py-16 text-center"><Monitor className="mx-auto mb-4 size-8 text-accent-text" aria-hidden /><h3 className="font-semibold">{c.empty}</h3><button type="button" onClick={() => setCategory('pc')} className="mt-3 cursor-pointer rounded text-sm text-accent-text underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent">{c.emptyHelp}</button></div>}
    <Dialog open={selected !== null} onClose={() => { if (!busy) setSelected(null); }} title={selected ? decorName(selected, locale) : c.title} description={c.subtitle} className="sm:max-w-5xl">
      {selected && <DecorCreate key={selected} decorId={selected} onBusy={setBusy} />}
    </Dialog>
  </section>;
}

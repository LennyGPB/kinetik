"use client";
import Image from 'next/image';
import { Check } from 'lucide-react';
import { DECORS, decorName } from '@/config/decors';
import type { RecordingSettings } from '@/lib/recordings/model';
import { decorCopy } from '@/lib/decors/copy';
import { useDictionary } from '@/lib/i18n/use-dictionary';
import { Segmented } from '@/components/ui/segmented';

export function DecorControls({ value, onChange, disabled }: { value: RecordingSettings; onChange: (value: RecordingSettings) => void; disabled: boolean }) {
  const { locale } = useDictionary(), c = decorCopy(locale);
  return <fieldset disabled={disabled} className="space-y-6">
    <div><h2 className="mb-3 text-sm font-semibold">{c.title}</h2><div className="grid grid-cols-2 gap-3">{DECORS.map(decor => <button key={decor.id} type="button" aria-pressed={value.decorId === decor.id} onClick={() => onChange({ ...value, decorId: decor.id })} className={`relative overflow-hidden rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:opacity-60 ${value.decorId === decor.id ? 'ring-2 ring-accent' : ''}`}>
      <Image src={`/decors/prepared/${decor.id}-thumb.webp`} width={320} height={179} alt="" className="aspect-video w-full object-cover" />
      <span className="block bg-surface-2 px-2 py-2 text-xs">{decorName(decor.id, locale)}</span>{value.decorId === decor.id && <span className="absolute right-1.5 top-1.5 rounded-full bg-accent p-1 text-accent-fg"><Check className="size-3" aria-hidden /></span>}
    </button>)}</div></div>
    <div><h2 className="mb-3 text-sm font-semibold">{c.fit}</h2><Segmented size="sm" label={c.fit} value={value.decorFit ?? 'contain'} onChange={decorFit => onChange({ ...value, decorFit })} options={[{ value: 'contain', label: c.contain }, { value: 'cover', label: c.cover }]} /><p className="mt-3 text-xs leading-relaxed text-muted">{c.fitHelp}</p></div>
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={value.originalAudio} onChange={e => onChange({ ...value, originalAudio: e.target.checked })} className="size-4 accent-accent" />{c.audio}</label>
    <p className="border-t border-line pt-5 text-xs leading-relaxed text-muted">{c.saved}</p>
  </fieldset>;
}

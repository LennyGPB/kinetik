"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getRestoTemplate, type RestoTemplateId } from "@/config/resto-templates";
import { RESTO_NETWORKS, weekdayName, type RestoNetwork } from "@/lib/resto/model";
import { saveRestoSettings } from "@/lib/resto/pack-actions";
import { spaceCopy } from "@/lib/resto/space-copy";
import { Chips, PACK_CHOICES } from "./resto-onboarding";

export type RestoSettingsValue = { packContents: RestoTemplateId[]; networks: RestoNetwork[]; packDay: number; packEnabled: boolean; autoTopUp: boolean };

/** Interrupteur dans une carte : le texte à gauche, l'interrupteur violet à droite ; toute la carte est cliquable. */
function SwitchCard({ checked, onChange, title, hint, disabled }: { checked: boolean; onChange: (value: boolean) => void; title: string; hint: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn("flex w-full cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color] duration-300 sm:p-5", checked ? "border-violet-500/50 bg-violet-500/[0.08]" : "border-line bg-surface hover:border-line-strong")}>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold">{title}</span>
        <span className="text-sm leading-snug text-muted">{hint}</span>
      </span>
      <span aria-hidden className={cn("relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300", checked ? "bg-[linear-gradient(145deg,#a78bfa,#7c3aed)] shadow-[0_6px_18px_-6px_rgb(139_92_246)]" : "bg-white/10")}>
        <motion.span className="absolute top-1 left-1 size-6 rounded-full bg-white shadow" animate={{ x: checked ? 24 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
      </span>
    </button>
  );
}

/** Réglages du pack : contenus, réseaux, jour, et recharge automatique (case à cocher, jamais cochée d'office). */
export function RestoSettings({ initial, topUpPrice }: { initial: RestoSettingsValue; topUpPrice: string }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const s = spaceCopy(locale);
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const patch = (next: Partial<RestoSettingsValue>) => setValue((v) => ({ ...v, ...next }));

  async function save() {
    setSaving(true);
    const result = await saveRestoSettings(value).catch(() => null);
    setSaving(false);
    toast(result?.ok ? { title: s.settings.saved } : { title: s.settings.error, tone: "error" });
  }

  return (
    <div className="flex flex-col gap-8">
      <SwitchCard checked={value.packEnabled} onChange={(packEnabled) => patch({ packEnabled })} title={s.settings.enabled} hint={s.settings.enabledHint} disabled={saving} />
      <div className="flex flex-col gap-3"><h2 className="text-sm font-semibold">{s.welcome.contents}</h2>
        <Chips options={PACK_CHOICES} value={value.packContents} onChange={(packContents) => patch({ packContents })} label={(id) => getRestoTemplate(id)!.name[locale]} disabled={saving} /></div>
      <div className="flex flex-col gap-3"><h2 className="text-sm font-semibold">{s.welcome.networks}</h2>
        <Chips options={RESTO_NETWORKS} value={value.networks} onChange={(networks) => patch({ networks })} label={(id) => s.networks[id]} disabled={saving} /></div>
      <div className="flex flex-col gap-3">
        <label htmlFor="settings-day" className="text-sm font-semibold">{s.welcome.packDay}</label>
        <select id="settings-day" value={value.packDay} disabled={saving} onChange={(e) => patch({ packDay: Number(e.target.value) })} className="h-12 w-full max-w-xs rounded-xl border border-line-strong bg-surface px-3.5 text-base">
          {Array.from({ length: 7 }, (_, day) => <option key={day} value={day}>{weekdayName(day, locale)}</option>)}
        </select>
        <p className="text-sm text-muted">{s.welcome.packTime}</p>
      </div>
      {/* Consentement à la recharge : interrupteur jamais activé d'office */}
      <SwitchCard checked={value.autoTopUp} onChange={(autoTopUp) => patch({ autoTopUp })} title={s.settings.topUpTitle} hint={`${s.settings.topUp.replace("{price}", topUpPrice)} ${s.settings.topUpHint}`} disabled={saving} />
      <Button variant="purple" size="lg" className="w-full sm:w-auto sm:self-start" loading={saving} onClick={() => void save()}>{s.settings.save}</Button>
    </div>
  );
}

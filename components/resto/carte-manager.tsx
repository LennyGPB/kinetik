"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Check, FileText, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/i18n/navigation";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { restoCopy, type RestoCopy } from "@/lib/resto/copy";
import { formatPrice, parsePrice } from "@/lib/resto/model";
import type { Carte } from "@/lib/resto/carte";
import { saveMyCarte } from "@/lib/resto/menu-actions";
import type { ReadMenu } from "@/lib/resto/vision";
import { cn } from "@/lib/utils";
import { MenuReading } from "./menu-reading";

type RowDraft = { key: string; name: string; description: string; priceText: string; verified: boolean; imported: boolean };
type CategoryDraft = { key: string; name: string; dishes: RowDraft[] };

let seq = 0;
const key = () => `k${++seq}`;
const priceText = (cents: number | null, locale: "fr" | "en") => cents === null ? "" : formatPrice(cents, locale).replace(/€/g, "").trim();

function fromCarte(carte: Carte, locale: "fr" | "en"): CategoryDraft[] {
  return carte.categories.map((c) => ({ key: key(), name: c.name, dishes: c.dishes.map((d) => ({ key: key(), name: d.name, description: d.description, priceText: priceText(d.priceCents, locale), verified: d.verified, imported: false })) }));
}
/** Ce qui sort de la lecture : un plat difficile à lire reste « à vérifier » tant que le restaurateur ne l'a pas confirmé. */
function fromReading(menu: ReadMenu): CategoryDraft[] {
  return menu.categories.map((c) => ({ key: key(), name: c.name, dishes: c.dishes.map((d) => ({ key: key(), name: d.name, description: d.description, priceText: d.priceCents === null ? d.priceText : d.priceText, verified: !d.uncertain && (!d.priceText || d.priceCents !== null), imported: true })) }));
}

/** « Ma carte » : importer (photo, PDF, texte), vérifier ce que l'IA a lu, corriger, enregistrer. */
export function CarteManager({ initial, available, returnTo }: { initial: Carte | null; available: boolean; /** Page où revenir après l'enregistrement (absent : on reste, ex. pendant l'accueil) */ returnTo?: string }) {
  const router = useRouter();
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(locale);
  const [restaurantName, setRestaurantName] = useState(initial?.restaurantName ?? "");
  const [categories, setCategories] = useState<CategoryDraft[]>(() => initial ? fromCarte(initial, locale) : []);
  const [importing, setImporting] = useState(!initial?.categories.length);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false), [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  if (!available) return <p className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">{c.carte.unavailable}</p>;

  const toVerify = categories.flatMap((cat) => cat.dishes).filter((d) => !d.verified).length;
  const invalidPrices = categories.flatMap((cat) => cat.dishes).filter((d) => d.priceText.trim() && parsePrice(d.priceText) === null).length;
  const setCategory = (k: string, next: Partial<CategoryDraft>) => { setSaved(false); setCategories((list) => list.map((cat) => cat.key === k ? { ...cat, ...next } : cat)); };
  const setDish = (ck: string, dk: string, next: Partial<RowDraft>) => { setSaved(false); setCategories((list) => list.map((cat) => cat.key === ck ? { ...cat, dishes: cat.dishes.map((d) => d.key === dk ? { ...d, ...next } : d) } : cat)); };

  async function read() {
    setReading(true); setError("");
    try {
      const form = new FormData();
      for (const file of files) form.append("files", file);
      form.append("text", text); form.append("locale", locale);
      const response = await fetch("/api/resto/menu", { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.menu) { setError(c.carte.errors[(body.error as keyof RestoCopy["carte"]["errors"]) ?? "read_failed"] ?? c.carte.errors.read_failed); return; }
      const menu = body.menu as ReadMenu;
      if (!menu.categories.length) { setError(c.carte.errors.nothing); return; }
      setCategories(fromReading(menu)); setNotes(menu.notes); setImporting(false); setSaved(false);
    } catch { setError(c.carte.errors.read_failed); }
    finally { setReading(false); }
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const result = await saveMyCarte({ restaurantName: restaurantName.trim(), categories: categories.filter((cat) => cat.name.trim() && cat.dishes.some((d) => d.name.trim())).map((cat) => ({ name: cat.name.trim(), dishes: cat.dishes.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), description: d.description.trim(), priceText: d.priceText.trim(), verified: d.verified, imported: d.imported })) })) });
      if (!result.ok) { setError(result.error === "busy" ? c.carte.unavailable : c.carte.errors.save); return; }
      setCategories(fromCarte(result.carte, locale)); setNotes([]); setSaved(true);
      if (returnTo) { router.push(returnTo); router.refresh(); }
    } catch { setError(c.carte.errors.save); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      {importing && reading ? (
        <section className="rounded-2xl border border-violet-500/30 bg-surface p-5 sm:p-6">
          <MenuReading files={files} steps={c.carte.readingSteps} hint={c.carte.readingHint} />
        </section>
      ) : importing ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <div>
            <h2 className="text-lg font-semibold">{c.carte.importTitle}</h2>
            <p className="mt-1 text-sm text-muted">{c.carte.importIntro}</p>
          </div>
          <button type="button" onClick={() => input.current?.click()} className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-center transition-colors hover:border-violet-500">
            <span className="flex gap-2 text-muted"><ImagePlus className="size-6" /><FileText className="size-6" /></span>
            <span className="font-semibold">{files.length ? c.carte.filesChosen.replace("{n}", String(files.length)) : c.carte.pick}</span>
            <span className="text-xs text-muted">{c.carte.pickHint}</span>
          </button>
          <input ref={input} type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 7))} />
          <Field label={c.carte.orText} htmlFor="carte-text"><Textarea id="carte-text" value={text} maxLength={20000} rows={5} placeholder={c.carte.textPlaceholder} onChange={(e) => setText(e.target.value)} /></Field>
          <p className="flex items-start gap-2 text-xs text-muted"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet-500" />{c.carte.honest}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="purple" size="lg" loading={reading} disabled={reading || (!files.length && text.trim().length < 10)} onClick={() => void read()}>{reading ? c.carte.reading : c.carte.read}</Button>
            {categories.length > 0 && <Button variant="outline" size="lg" disabled={reading} onClick={() => setImporting(false)}>{c.previous}</Button>}
          </div>
        </section>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Field label={c.restaurantName} htmlFor="carte-resto" className="min-w-60 flex-1"><Input id="carte-resto" value={restaurantName} maxLength={40} placeholder={c.restaurantPlaceholder} onChange={(e) => { setRestaurantName(e.target.value); setSaved(false); }} /></Field>
          <Button variant="outline" onClick={() => setImporting(true)}><Sparkles />{c.carte.reimport}</Button>
        </div>
      )}

      {notes.length > 0 && <ul className="flex flex-col gap-1 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">{notes.map((n) => <li key={n}>• {n}</li>)}</ul>}
      {!importing && toVerify > 0 && <p className="flex items-center gap-2 text-sm font-medium text-warning"><AlertTriangle className="size-4" />{c.carte.toVerify.replace("{n}", String(toVerify))}</p>}

      {!importing && categories.map((cat) => (
        <section key={cat.key} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <Input aria-label={c.carte.category} value={cat.name} maxLength={40} onChange={(e) => setCategory(cat.key, { name: e.target.value })} className="h-10 flex-1 font-semibold" />
            <button type="button" aria-label={c.affiche.remove} onClick={() => setCategories((list) => list.filter((x) => x.key !== cat.key))} className="grid size-10 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2"><Trash2 className="size-4" /></button>
          </div>
          <ul className="flex flex-col gap-2">
            {cat.dishes.map((d) => {
              const badPrice = Boolean(d.priceText.trim()) && parsePrice(d.priceText) === null;
              return (
                <li key={d.key} className={cn("flex flex-col gap-2 rounded-xl border p-3", d.verified ? "border-line" : "border-warning/50 bg-warning/5")}>
                  <div className="flex items-center gap-2">
                    <Input aria-label={c.name} value={d.name} maxLength={60} onChange={(e) => setDish(cat.key, d.key, { name: e.target.value })} className="h-10 min-w-0 flex-1" />
                    <div className="relative w-24 shrink-0">
                      <Input aria-label={c.price} inputMode="decimal" value={d.priceText} maxLength={20} onChange={(e) => setDish(cat.key, d.key, { priceText: e.target.value })} className={cn("h-10 pr-7", badPrice && "border-danger")} />
                      <span aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted">€</span>
                    </div>
                    <button type="button" aria-label={c.affiche.remove} onClick={() => setCategory(cat.key, { dishes: cat.dishes.filter((x) => x.key !== d.key) })} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2"><Trash2 className="size-4" /></button>
                  </div>
                  <Input aria-label={c.description} value={d.description} maxLength={90} placeholder={c.descriptionPlaceholder} onChange={(e) => setDish(cat.key, d.key, { description: e.target.value })} className="h-9 text-sm" />
                  {!d.verified && <button type="button" disabled={badPrice} onClick={() => setDish(cat.key, d.key, { verified: true })} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-full bg-warning/15 px-3 text-xs font-semibold text-warning disabled:opacity-50"><Check className="size-3.5" />{c.carte.confirm}</button>}
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setCategory(cat.key, { dishes: [...cat.dishes, { key: key(), name: "", description: "", priceText: "", verified: true, imported: false }] })} className="inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded-full border border-dashed border-line-strong px-4 text-sm font-medium text-muted hover:border-violet-500 hover:text-violet-500"><Plus className="size-4" />{c.carte.addDish}</button>
        </section>
      ))}
      {!importing && <button type="button" onClick={() => setCategories((list) => [...list, { key: key(), name: c.carte.newCategory, dishes: [] }])} className="inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded-full border border-dashed border-line-strong px-4 text-sm font-medium text-muted hover:border-violet-500 hover:text-violet-500"><Plus className="size-4" />{c.carte.addCategory}</button>}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!importing && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
            {saved && <span className="text-sm text-success">{c.carte.saved}</span>}
            {invalidPrices > 0 && <span className="text-sm text-danger">{c.priceInvalid}</span>}
            <Button variant="purple" size="lg" loading={saving} disabled={saving || invalidPrices > 0 || !categories.length} onClick={() => void save()}>{c.carte.save}</Button>
          </div>
        </nav>
      )}
    </div>
  );
}

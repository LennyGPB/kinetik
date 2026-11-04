"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { uploadFile, type UploadedFile } from "@/lib/storage/client";
import { restoCopy } from "@/lib/resto/copy";
import { createResto } from "@/lib/resto/actions";
import { prepareRestoPhoto } from "@/lib/resto/photo-actions";
import { FormatPicker, RestaurantFields, StylePicker } from "./resto-form";
import { activeDays, DatesField, menuContentFromDraft, menuPreview, menuProblem, newMenuDraft, WeekDaysFields, type MenuDraft } from "./menu-form";
import { StepFlow, StepNav } from "./step-flow";
import { useCarte } from "./carte-picker";
import type { BrandStart } from "./plat-du-jour-create";

/**
 * Création du menu de la semaine en 3 étapes : les plats du jour par jour (photos facultatives) → restaurant et dates → style.
 * L'aperçu suit chaque changement dès qu'au moins 2 jours sont choisis. Rien n'est débité avant le téléchargement.
 */
export function MenuSemaineCreate({ brandKit }: { brandKit: BrandStart }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(locale);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [logo, setLogo] = useState<UploadedFile | null>(brandKit?.logo ?? null);
  const [uploading, setUploading] = useState<number | "logo" | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  const [draft, setDraft] = useState<MenuDraft>(() => newMenuDraft(locale, brandKit?.name && brandKit.name !== "Ma marque" ? brandKit.name : ""));
  const patch = (next: Partial<MenuDraft>) => setDraft((current) => ({ ...current, ...next }));
  const carte = useCarte();
  // Photos envoyées pour les jours encore choisis, dans l'ordre des jours
  const used = activeDays(draft).flatMap((d) => d.photoUrl ? [d.photoUrl] : []);
  const photos = files.filter((f) => used.includes(f.url));
  const photoUrls = photos.map((f) => f.url);
  const content = menuContentFromDraft(draft, photoUrls);
  const problem = menuProblem(draft, c);
  const busy = creating || uploading !== null;
  const photoKey = photoUrls.join("|");
  const preview = useMemo(() => menuPreview(draft, photoKey ? photoKey.split("|") : [], logo?.url ?? null, c), [draft, photoKey, logo?.url, c]);
  const ready = [!problem, Boolean(draft.restaurantName.trim()), Boolean(content)][step];
  const go = (next: number) => { setDirection(next > step ? 1 : -1); setStep(next); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function pickPhoto(day: number, file: File | undefined) {
    if (!file) return;
    setUploading(day); setError("");
    try {
      const uploaded = await uploadFile(file, "image");
      // L'IA cadre le plat et améliore la photo ; sans elle, l'originale est gardée
      const prepared = await prepareRestoPhoto({ photo: uploaded, locale }).catch(() => null);
      const used = prepared?.ok ? prepared.improved : uploaded;
      const analysis = prepared?.ok ? prepared.analysis : null;
      setFiles((list) => [...list, used]);
      setDraft((current) => ({ ...current, days: current.days.map((d) => d.day === day ? { ...d, photoUrl: used.url, focus: analysis?.focus ?? { x: 0.5, y: 0.5 }, ...(analysis?.dishName && !d.name.trim() && { name: analysis.dishName }) } : d) }));
    } catch { setError(c.photoError); }
    finally { setUploading(null); }
  }
  async function pickLogo(file: File | undefined) {
    if (!file) return;
    setUploading("logo"); setError("");
    try { setLogo(await uploadFile(file, "image")); } catch { setError(c.photoError); } finally { setUploading(null); }
  }

  async function create() {
    if (!content) return;
    const key = JSON.stringify({ photos: photoUrls, logo: logo?.url, content });
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    setCreating(true); setError("");
    try {
      const result = await createResto({ requestId: request.current.id, content, photos, logo, locale });
      if (!result.ok) { setError(c.createError); return; }
      router.replace(`/project/${result.id}`); router.refresh();
    } catch { setError(c.createError); }
    finally { setCreating(false); }
  }

  const body = [
    <div key="days" className="flex flex-col gap-3">
      <WeekDaysFields carte={carte} draft={draft} onChange={patch} copy={c} locale={locale} disabled={creating} photo={{ uploading: typeof uploading === "number" ? uploading : null, onPick: (day, file) => void pickPhoto(day, file) }} />
      {problem && <p className="text-sm text-muted">{problem}</p>}
    </div>,
    <div key="restaurant" className="flex flex-col gap-6">
      <RestaurantFields draft={draft} onChange={patch} copy={c} disabled={busy} logo={{ url: logo?.url ?? null, uploading: uploading === "logo", onPick: (file) => void pickLogo(file), onRemove: () => setLogo(null) }} />
      <DatesField draft={draft} onChange={patch} copy={c} locale={locale} disabled={busy} />
    </div>,
    <div key="style" className="flex flex-col gap-7">
      <StylePicker template="menu-semaine" draft={draft} onChange={patch} copy={c} locale={locale} plate={null} disabled={busy} preview={(style) => menuPreview(draft, photoUrls, logo?.url ?? null, c, { style })!} />
      <div className="flex flex-col gap-3"><h3 className="text-sm font-semibold">{c.formatTitle}</h3><FormatPicker draft={draft} onChange={patch} copy={c} disabled={busy} /></div>
    </div>,
  ][step];

  return (
    <StepFlow copy={c} title={c.menu.title} step={step} steps={c.menu.steps} intros={c.menu.stepIntro} direction={direction} preview={preview} error={error}
      nav={<StepNav copy={c} step={step} last={step === c.menu.steps.length - 1} ready={Boolean(ready)} busy={busy} creating={creating} createLabel={c.menu.create} onBack={() => go(step - 1)} onNext={() => go(step + 1)} onCreate={() => void create()} />}>
      {body}
    </StepFlow>
  );
}

"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { uploadFile, type UploadedFile } from "@/lib/storage/client";
import { restoCopy, type RestoCopy } from "@/lib/resto/copy";
import { createResto } from "@/lib/resto/actions";
import type { AfficheTemplateId } from "@/lib/resto/affiche";
import { FormatPicker, RestaurantFields, StylePicker } from "./resto-form";
import { afficheContentFromDraft, AfficheFieldsForm, affichePreview, newAfficheFields, type AfficheDraft } from "./affiche-form";
import { StepFlow, StepNav } from "./step-flow";
import type { BrandStart } from "./plat-du-jour-create";

/** Photo de fond facultative d'une affiche (création : envoi ; éditeur : retrait seulement). */
export function BackdropPhoto({ url, uploading, onPick, onRemove, copy, disabled }: { url: string | null; uploading?: boolean; onPick?: (file: File | undefined) => void; onRemove: () => void; copy: RestoCopy; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{copy.affiche.photo}</p>
      <div className="flex items-center gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
          {url ? <Image src={url} alt="" fill sizes="80px" className="object-cover" unoptimized /> : <div className="grid size-full place-items-center text-muted"><ImagePlus className="size-5" /></div>}
        </div>
        {onPick && <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-medium hover:border-line-strong">
          <input type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={(e) => onPick(e.target.files?.[0])} />
          {uploading ? copy.photoUploading : url ? copy.photoChange : copy.photoPick}
        </label>}
        {url && <button type="button" disabled={disabled} onClick={onRemove} className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted hover:underline"><X className="size-3.5" />{copy.affiche.remove}</button>}
      </div>
      <p className="text-xs text-muted">{copy.affiche.photoHint}</p>
    </div>
  );
}

/**
 * Création d'une affiche animée (happy hour, événement, avis, horaires, présentation) en 3 étapes :
 * le contenu → le restaurant (logo, photo de fond) → le style. L'aperçu suit chaque changement dès la première étape.
 */
export function AfficheCreate({ template, brandKit }: { template: AfficheTemplateId; brandKit: BrandStart }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(locale);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [photo, setPhoto] = useState<UploadedFile | null>(null);
  const [logo, setLogo] = useState<UploadedFile | null>(brandKit?.logo ?? null);
  const [uploading, setUploading] = useState<"photo" | "logo" | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  const [draft, setDraft] = useState<AfficheDraft>(() => ({ template, style: "bistrot", format: "PORTRAIT", language: locale, restaurantName: brandKit?.name && brandKit.name !== "Ma marque" ? brandKit.name : "", photoUrl: null, focus: { x: 0.5, y: 0.5 }, fields: newAfficheFields(template, c) }));
  const patch = (next: Partial<AfficheDraft>) => setDraft((current) => ({ ...current, ...next }));
  const photoUrls = photo && draft.photoUrl === photo.url ? [photo.url] : [];
  const content = afficheContentFromDraft(draft, photoUrls, c);
  const contentOk = Boolean(afficheContentFromDraft({ ...draft, restaurantName: draft.restaurantName || "x" }, photoUrls, c));
  const busy = creating || uploading !== null;
  const photoKey = photoUrls.join("|");
  const preview = useMemo(() => affichePreview(draft, photoKey ? photoKey.split("|") : [], logo?.url ?? null, c), [draft, photoKey, logo?.url, c]);
  const ready = [contentOk, Boolean(content), Boolean(content)][step];
  const go = (next: number) => { setDirection(next > step ? 1 : -1); setStep(next); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function upload(file: File | undefined, kind: "photo" | "logo") {
    if (!file) return;
    setUploading(kind); setError("");
    try {
      const uploaded = await uploadFile(file, "image");
      if (kind === "photo") { setPhoto(uploaded); patch({ photoUrl: uploaded.url }); } else setLogo(uploaded);
    } catch { setError(c.photoError); }
    finally { setUploading(null); }
  }

  async function create() {
    if (!content) return;
    const key = JSON.stringify({ photos: photoUrls, logo: logo?.url, content });
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    setCreating(true); setError("");
    try {
      const result = await createResto({ requestId: request.current.id, content, photos: photo && photoUrls.length ? [photo] : [], logo, locale });
      if (!result.ok) { setError(c.createError); return; }
      router.replace(`/project/${result.id}`); router.refresh();
    } catch { setError(c.createError); }
    finally { setCreating(false); }
  }

  const body = [
    <div key="content" className="flex flex-col gap-3">
      <AfficheFieldsForm fields={draft.fields} onChange={(fields) => patch({ fields })} copy={c} locale={locale} disabled={busy} />
      {!contentOk && <p className="text-sm text-muted">{c.affiche.invalid}</p>}
    </div>,
    <div key="restaurant" className="flex flex-col gap-6">
      <RestaurantFields draft={draft} onChange={patch} copy={c} disabled={busy} logo={{ url: logo?.url ?? null, uploading: uploading === "logo", onPick: (file) => void upload(file, "logo"), onRemove: () => setLogo(null) }} />
      <BackdropPhoto url={draft.photoUrl} uploading={uploading === "photo"} onPick={(file) => void upload(file, "photo")} onRemove={() => patch({ photoUrl: null })} copy={c} disabled={busy} />
    </div>,
    <div key="style" className="flex flex-col gap-7">
      <StylePicker template={template} draft={draft} onChange={patch} copy={c} locale={locale} plate={null} disabled={busy} preview={(style) => affichePreview(draft, photoUrls, logo?.url ?? null, c, { style })!} />
      <div className="flex flex-col gap-3"><h3 className="text-sm font-semibold">{c.formatTitle}</h3><FormatPicker draft={draft} onChange={patch} copy={c} disabled={busy} /></div>
    </div>,
  ][step];

  const intros = [c.affiche.intros[template], ...c.affiche.stepIntro.slice(1)];
  return (
    <StepFlow copy={c} title={c.affiche.titles[template]} step={step} steps={c.affiche.steps} intros={intros} direction={direction} preview={preview} previewFrom={0} error={error}
      nav={<StepNav copy={c} step={step} last={step === c.affiche.steps.length - 1} ready={Boolean(ready)} busy={busy} creating={creating} createLabel={c.affiche.create} onBack={() => go(step - 1)} onNext={() => go(step + 1)} onCreate={() => void create()} />}>
      {body}
    </StepFlow>
  );
}

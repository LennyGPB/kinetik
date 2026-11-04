"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { uploadFile, type UploadedFile } from "@/lib/storage/client";
import { restoCopy } from "@/lib/resto/copy";
import { createResto } from "@/lib/resto/actions";
import { prepareRestoPhoto, type PreparedPhoto } from "@/lib/resto/photo-actions";
import { PhotoChoice } from "./photo-choice";
import { CartePicker, useCarte } from "./carte-picker";
import { matchCarteDish } from "@/lib/resto/match";
import { formatPrice } from "@/lib/resto/model";
import { contentFromDraft, DescriptionField, FocusPicker, FormatPicker, NamePriceFields, previewProps, priceIsInvalid, RestaurantFields, StylePicker, type RestoDraft } from "./resto-form";
import { StepFlow, StepNav } from "./step-flow";

export type BrandStart = { name: string; logo: UploadedFile | null } | null;

/**
 * Création d'un plat du jour en 5 étapes courtes, pensée pour le téléphone :
 * photo → nom et prix → description → restaurant → style et format. Dès l'étape 2, l'aperçu suit chaque changement.
 * Rien n'est débité : seul le téléchargement de la vidéo l'est.
 */
export function PlatDuJourCreate({ brandKit }: { brandKit: BrandStart }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(locale);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [original, setOriginal] = useState<UploadedFile | null>(null);
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [useImproved, setUseImproved] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  // Photo utilisée : la version améliorée par défaut, l'originale si le restaurateur la préfère
  const photo = prepared && useImproved ? prepared.improved : original;
  const [logo, setLogo] = useState<UploadedFile | null>(brandKit?.logo ?? null);
  const [uploading, setUploading] = useState<"photo" | "logo" | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  // La vidéo est dans la langue du site du restaurateur (mots fixes et prix)
  const [draft, setDraft] = useState<RestoDraft>({ style: "bistrot", format: "PORTRAIT", language: locale, name: "", priceText: "", description: "", restaurantName: brandKit?.name && brandKit.name !== "Ma marque" ? brandKit.name : "", focus: { x: 0.5, y: 0.5 } });
  const patch = (next: Partial<RestoDraft>) => setDraft((current) => ({ ...current, ...next }));
  const carte = useCarte();
  const carteDishes = carte?.categories.flatMap((c) => c.dishes) ?? [];
  const content = contentFromDraft(draft);
  const busy = creating || uploading !== null || analyzing;
  const media = photo ? { photoUrl: photo.url, logoUrl: logo?.url ?? null, discUrl: prepared?.disc?.url ?? null } : null;
  const videoProps = useMemo(() => media && previewProps(draft, media, c), [draft, media?.photoUrl, media?.logoUrl, c]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Ce qui empêche d'avancer à chaque étape. */
  const ready = [Boolean(photo), Boolean(draft.name.trim()) && !priceIsInvalid(draft), true, Boolean(draft.restaurantName.trim()), Boolean(content)][step];
  const go = (next: number) => { setDirection(next > step ? 1 : -1); setStep(next); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function upload(file: File | undefined, kind: "photo" | "logo") {
    if (!file) return;
    setUploading(kind); setError("");
    try {
      const uploaded = await uploadFile(file, "image");
      if (kind !== "photo") { setLogo(uploaded); return; }
      setOriginal(uploaded); setPrepared(null); setUseImproved(true); patch({ focus: { x: 0.5, y: 0.5 }, hasDisc: false, ...(draft.style === "table3d" && { style: "bistrot" }) });
      // L'IA regarde la photo : cadrage, nom probable, assiette (sans elle, la photo reste utilisable telle quelle)
      setAnalyzing(true);
      try {
        const result = await prepareRestoPhoto({ photo: uploaded, locale, plate: true });
        if (result.ok) {
          setPrepared(result);
          // Plat reconnu sur la carte : nom, prix et description viennent de la carte (jamais un prix deviné)
          const dish = result.analysis?.dishName ? matchCarteDish(carteDishes, result.analysis.dishName) : null;
          setDraft((current) => ({ ...current, hasDisc: Boolean(result.disc), ...(result.analysis && { focus: result.analysis.focus }),
            ...(!current.name.trim() && (dish ? { name: dish.name, priceText: current.priceText || (dish.priceCents === null ? "" : formatPrice(dish.priceCents, locale).replace(/€/g, "").trim()), description: current.description || dish.description } : result.analysis?.dishName ? { name: result.analysis.dishName } : {})) }));
        }
      } finally { setAnalyzing(false); }
    } catch { setError(c.photoError); }
    finally { setUploading(null); }
  }

  async function create() {
    if (!photo || !content) return;
    const key = JSON.stringify({ photo: photo.url, logo: logo?.url, content });
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    setCreating(true); setError("");
    try {
      const result = await createResto({ requestId: request.current.id, content, photos: prepared?.disc && content.disc ? [photo, prepared.disc] : [photo], logo, locale });
      if (!result.ok) { setError(c.createError); return; }
      router.replace(`/project/${result.id}`); router.refresh();
    } catch { setError(c.createError); }
    finally { setCreating(false); }
  }

  const photoInput = <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files?.[0], "photo")} />;
  const body = [
    photo ? (
      <div className="flex flex-col gap-3">
        <FocusPicker url={photo.url} focus={draft.focus} onChange={(focus) => patch({ focus })} copy={c} disabled={busy} />
        <PhotoChoice copy={c} analyzing={analyzing} prepared={prepared} original={original} useImproved={useImproved} onChange={setUseImproved} disabled={creating} />
        <label className="self-start">{photoInput}<span className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-medium hover:border-line-strong">{uploading === "photo" ? c.photoUploading : c.photoChange}</span></label>
      </div>
    ) : (
      <label className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-surface text-center transition-colors hover:border-accent hover:bg-accent-soft/40">
        {photoInput}
        <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent-text"><ImagePlus className="size-6" /></span>
        <span className="text-base font-semibold">{uploading === "photo" ? c.photoUploading : c.photoPick}</span>
        <span className="text-sm text-muted">{c.photoHint}</span>
      </label>
    ),
    <div key="name" className="flex flex-col gap-2">
      <CartePicker carte={carte} copy={c} locale={locale} disabled={busy} onPick={(dish) => patch({ name: dish.name, priceText: dish.priceCents === null ? "" : formatPrice(dish.priceCents, locale).replace(/€/g, "").trim(), description: dish.description })} />
      <NamePriceFields draft={draft} onChange={patch} copy={c} disabled={busy} />
      {prepared?.analysis?.dishName && draft.name === prepared.analysis.dishName && <p className="text-xs text-muted">{c.ai.nameGuess}</p>}
    </div>,
    <DescriptionField key="description" draft={draft} onChange={patch} copy={c} disabled={busy} />,
    <RestaurantFields key="restaurant" draft={draft} onChange={patch} copy={c} disabled={busy} logo={{ url: logo?.url ?? null, uploading: uploading === "logo", onPick: (file) => void upload(file, "logo"), onRemove: () => setLogo(null) }} />,
    media && (
      <div key="style" className="flex flex-col gap-7">
        <StylePicker draft={draft} onChange={patch} copy={c} locale={locale} plate={prepared?.disc ?? null} disabled={busy} preview={(style) => previewProps(draft, media, c, { style })} />
        <div className="flex flex-col gap-3"><h3 className="text-sm font-semibold">{c.formatTitle}</h3><FormatPicker draft={draft} onChange={patch} copy={c} disabled={busy} /></div>
      </div>
    ),
  ][step];

  return (
    <StepFlow copy={c} title={c.createTitle} step={step} steps={c.steps} intros={c.stepIntro} direction={direction} preview={videoProps} error={error}
      nav={<StepNav copy={c} step={step} last={step === c.steps.length - 1} ready={Boolean(ready)} busy={busy} creating={creating} skip={step === 2 && !draft.description.trim()} createLabel={c.create} onBack={() => go(step - 1)} onNext={() => go(step + 1)} onCreate={() => void create()} />}>
      {body}
    </StepFlow>
  );
}

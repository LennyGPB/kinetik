"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Field, Input } from "@/components/ui/field";
import { uploadFile, type UploadedFile } from "@/lib/storage/client";
import { restoCopy } from "@/lib/resto/copy";
import { spaceCopy } from "@/lib/resto/space-copy";
import { getRestoTemplate, RESTO_TEMPLATE_IDS, type RestoStyleId, type RestoTemplateId } from "@/config/resto-templates";
import { RESTO_NETWORKS, weekdayName, type RestoNetwork } from "@/lib/resto/model";
import { finishRestoOnboarding } from "@/lib/resto/onboarding-actions";
import { prepareRestoPhoto, type PreparedPhoto } from "@/lib/resto/photo-actions";
import { cn } from "@/lib/utils";
import { afficheContentFromDraft, AfficheFieldsForm, affichePreview, fieldsFromData, newAfficheFields, type AfficheDraft, type AfficheFields } from "./affiche-form";
import { GooglePlaceSearch } from "./google-place-search";
import type { PlaceInfo } from "@/lib/resto/places";
import { BackdropPhoto } from "./affiche-create";
import { CarteManager } from "./carte-manager";
import { PhotoChoice } from "./photo-choice";
import { contentFromDraft, FocusPicker, NamePriceFields, previewProps, priceIsInvalid, RestaurantFields, StylePicker, type RestoDraft } from "./resto-form";
import { StepFlow, StepNav } from "./step-flow";

/** Contenus proposés dans le pack de la semaine (le plat du jour se demande à part) */
export const PACK_CHOICES = RESTO_TEMPLATE_IDS.filter((id) => id !== "plat-du-jour");
const PACK_DEFAULT: RestoTemplateId[] = ["menu-semaine", "formule-midi", "avis"];

export function Chips<T extends string>({ options, value, onChange, label, disabled }: { options: readonly T[]; value: T[]; onChange: (value: T[]) => void; label: (id: T) => string; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((id) => {
        const on = value.includes(id);
        return (
          <button key={id} type="button" aria-pressed={on} disabled={disabled} onClick={() => onChange(on ? value.filter((v) => v !== id) : [...value, id])}
            className={cn("inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors", on ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300" : "border-line hover:border-line-strong")}>
            {on && <Check className="size-4" />}{label(id)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Accueil d'un nouvel abonné Resto, une question par écran, pensé pour le téléphone :
 * restaurant → logo → plat signature (photo, puis nom et prix) → salle → horaires → carte → style → rythme.
 * À la fin, 3 vidéos de bienvenue offertes : présentation, plat signature, horaires.
 */
export function RestoOnboarding({ initialName, google = false }: { initialName: string; /** Recherche Google Places disponible */ google?: boolean }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(locale);
  const s = spaceCopy(locale);
  const w = s.welcome;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [style, setStyle] = useState<RestoStyleId>("bistrot");
  const [name, setName] = useState(initialName);
  const [presentation, setPresentation] = useState({ tagline: "", cuisine: "", address: "" });
  const [logo, setLogo] = useState<UploadedFile | null>(null);
  const [original, setOriginal] = useState<UploadedFile | null>(null);
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [useImproved, setUseImproved] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [ambiance, setAmbiance] = useState<UploadedFile | null>(null);
  const [dish, setDish] = useState({ name: "", priceText: "", focus: { x: 0.5, y: 0.5 } });
  const [hoursFields, setHoursFields] = useState<AfficheFields>(() => newAfficheFields("horaires", c));
  const [showCarte, setShowCarte] = useState(false);
  const [packContents, setPackContents] = useState<RestoTemplateId[]>(PACK_DEFAULT);
  const [networks, setNetworks] = useState<RestoNetwork[]>(["instagram"]);
  const [packDay, setPackDay] = useState(0);
  const [place, setPlace] = useState<{ placeId: string; phone: string; website: string } | null>(null);
  /** Fiche Google choisie : elle remplace les champs, le restaurateur vérifie chaque écran avant de valider. */
  const importPlace = (info: PlaceInfo) => {
    setName(info.name);
    setPresentation((current) => ({ ...current, cuisine: info.cuisine || current.cuisine, address: info.address || current.address }));
    if (info.hours) setHoursFields(fieldsFromData({ type: "horaires", mode: "hours", hours: info.hours, closure: null, note: "" }, locale));
    setPlace({ placeId: info.placeId, phone: info.phone, website: info.website });
  };
  const [uploading, setUploading] = useState<"photo" | "logo" | "ambiance" | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const requests = useRef<{ key: string; ids: [string, string, string] } | null>(null);

  const photo = prepared && useImproved ? prepared.improved : original;
  const busy = creating || uploading !== null || analyzing;
  const base = { style, format: "PORTRAIT" as const, language: locale as "fr" | "en", restaurantName: name.trim() };

  // Les 3 vidéos, construites comme dans les créations habituelles
  const backdrop = ambiance ?? photo;
  const presentationPhotos = backdrop ? [backdrop.url] : [];
  const presentationDraft: AfficheDraft = { ...base, template: "presentation", photoUrl: backdrop?.url ?? null, focus: ambiance ? { x: 0.5, y: 0.5 } : dish.focus, fields: { type: "presentation", ...presentation, highlights: ["", "", ""] } };
  const hoursDraft: AfficheDraft = { ...base, template: "horaires", photoUrl: null, focus: { x: 0.5, y: 0.5 }, fields: hoursFields };
  const dishDraft: RestoDraft = { ...base, name: dish.name, priceText: dish.priceText, description: "", focus: dish.focus, hasDisc: false };
  const contents = {
    presentation: afficheContentFromDraft(presentationDraft, presentationPhotos, c),
    hours: afficheContentFromDraft(hoursDraft, [], c),
    dish: photo ? contentFromDraft(dishDraft) : null,
  };

  const logoUrl = logo?.url ?? null;
  const previewKey = JSON.stringify([presentationDraft, hoursDraft, dishDraft, photo?.url, logoUrl, step]);
  const preview = useMemo(() => {
    if ((step === 2 || step === 3) && photo) return previewProps(dishDraft, { photoUrl: photo.url, logoUrl }, c);
    if (step === 5) return affichePreview(hoursDraft, [], logoUrl, c);
    return affichePreview(presentationDraft, presentationPhotos, logoUrl, c);
  }, [previewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = [
    Boolean(name.trim() && presentation.tagline.trim()),
    true,
    Boolean(photo),
    Boolean(dish.name.trim()) && !priceIsInvalid(dish),
    true,
    Boolean(contents.hours),
    true,
    true,
    Boolean(contents.presentation && contents.hours && contents.dish),
  ][step];
  const go = (next: number) => { setDirection(next > step ? 1 : -1); setStep(next); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function upload(file: File | undefined, kind: "photo" | "logo" | "ambiance") {
    if (!file) return;
    setUploading(kind); setError("");
    try {
      const uploaded = await uploadFile(file, "image");
      if (kind === "logo") { setLogo(uploaded); return; }
      if (kind === "ambiance") { setAmbiance(uploaded); return; }
      setOriginal(uploaded); setPrepared(null); setUseImproved(true);
      // L'IA cadre la photo et propose un nom (jamais un prix)
      setAnalyzing(true);
      try {
        const result = await prepareRestoPhoto({ photo: uploaded, locale, plate: false });
        if (result.ok) {
          setPrepared(result);
          setDish((current) => ({ ...current, ...(result.analysis && { focus: result.analysis.focus }), ...(!current.name.trim() && result.analysis?.dishName && { name: result.analysis.dishName }) }));
        }
      } finally { setAnalyzing(false); }
    } catch { setError(c.photoError); }
    finally { setUploading(null); }
  }

  async function finish() {
    if (!photo || !contents.presentation || !contents.hours || !contents.dish) return;
    const key = JSON.stringify({ contents, logo: logoUrl, photo: photo.url, ambiance: ambiance?.url });
    if (requests.current?.key !== key) requests.current = { key, ids: [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()] };
    const [presentationId, dishId, hoursId] = requests.current.ids;
    setCreating(true); setError("");
    try {
      const result = await finishRestoOnboarding({
        presentation: { requestId: presentationId, content: contents.presentation, photos: backdrop ? [backdrop] : [], logo, locale },
        dish: { requestId: dishId, content: contents.dish, photos: [photo], logo, locale },
        hours: { requestId: hoursId, content: contents.hours, photos: [], logo, locale },
        restaurant: { packContents, networks, packDay, placeId: place?.placeId ?? null, phone: place?.phone ?? "", website: place?.website ?? "" },
      });
      if (!result.ok) { setError(w.createError); return; }
      router.push("/resto"); router.refresh();
    } catch { setError(w.createError); }
    finally { setCreating(false); }
  }

  const photoInput = <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files?.[0], "photo")} />;
  const body = [
    <div key="restaurant" className="flex flex-col gap-5">
      {google && <GooglePlaceSearch onImport={importPlace} disabled={busy} />}
      <Field label={w.name} htmlFor="onb-name"><Input id="onb-name" value={name} maxLength={40} placeholder={w.namePlaceholder} disabled={busy} onChange={(e) => setName(e.target.value)} className="h-12 text-base" autoFocus /></Field>
      <Field label={w.tagline} htmlFor="onb-tagline"><Input id="onb-tagline" value={presentation.tagline} maxLength={60} placeholder={w.taglinePlaceholder} disabled={busy} onChange={(e) => setPresentation({ ...presentation, tagline: e.target.value })} className="h-12 text-base" /></Field>
      <Field label={w.cuisine} htmlFor="onb-cuisine"><Input id="onb-cuisine" value={presentation.cuisine} maxLength={30} placeholder={w.cuisinePlaceholder} disabled={busy} onChange={(e) => setPresentation({ ...presentation, cuisine: e.target.value })} className="h-12 text-base" /></Field>
      <Field label={w.address} htmlFor="onb-address"><Input id="onb-address" value={presentation.address} maxLength={60} placeholder={w.addressPlaceholder} disabled={busy} onChange={(e) => setPresentation({ ...presentation, address: e.target.value })} className="h-12 text-base" /></Field>
    </div>,
    // Le nom est déjà saisi : seul le logo est demandé ici
    <RestaurantFields key="logo" draft={{ restaurantName: name }} onChange={() => {}} copy={c} disabled={busy} logo={{ url: logoUrl, uploading: uploading === "logo", onPick: (file) => void upload(file, "logo"), onRemove: () => setLogo(null) }} />,
    photo ? (
      <div key="photo" className="flex flex-col gap-3">
        <FocusPicker url={photo.url} focus={dish.focus} onChange={(focus) => setDish({ ...dish, focus })} copy={c} disabled={busy} />
        <PhotoChoice copy={c} analyzing={analyzing} prepared={prepared} original={original} useImproved={useImproved} onChange={setUseImproved} disabled={creating} />
        <label className="self-start">{photoInput}<span className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-medium hover:border-line-strong">{uploading === "photo" ? c.photoUploading : c.photoChange}</span></label>
      </div>
    ) : (
      <label key="photo" className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-surface text-center transition-colors hover:border-accent hover:bg-accent-soft/40">
        {photoInput}
        <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent-text"><ImagePlus className="size-6" /></span>
        <span className="text-base font-semibold">{uploading === "photo" ? c.photoUploading : c.photoPick}</span>
        <span className="text-sm text-muted">{c.photoHint}</span>
      </label>
    ),
    <div key="name" className="flex flex-col gap-2">
      <NamePriceFields draft={dishDraft} onChange={(next) => setDish({ ...dish, ...(next.name !== undefined && { name: next.name }), ...(next.priceText !== undefined && { priceText: next.priceText }) })} copy={c} disabled={busy} />
      {prepared?.analysis?.dishName && dish.name === prepared.analysis.dishName && <p className="text-xs text-muted">{c.ai.nameGuess}</p>}
    </div>,
    <BackdropPhoto key="ambiance" url={ambiance?.url ?? null} uploading={uploading === "ambiance"} onPick={(file) => void upload(file, "ambiance")} onRemove={() => setAmbiance(null)} copy={c} disabled={busy} />,
    <AfficheFieldsForm key="hours" fields={hoursFields} onChange={(fields) => setHoursFields(fields.type === "horaires" ? { ...fields, mode: "hours" } : fields)} copy={c} locale={locale} disabled={busy} />,
    <div key="carte" className="flex flex-col gap-4">
      {showCarte
        ? <CarteManager initial={null} available />
        : <button type="button" onClick={() => setShowCarte(true)} className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-line-strong bg-surface px-4 text-base font-semibold transition-colors hover:border-accent hover:bg-accent-soft/40">{w.carteOpen}</button>}
      <p className="text-sm text-muted">{w.carteLater}</p>
    </div>,
    <StylePicker key="style" template="presentation" draft={{ style }} onChange={(next) => setStyle(next.style)} copy={c} locale={locale} plate={null} disabled={busy}
      preview={(id) => affichePreview(presentationDraft, presentationPhotos, logoUrl, c, { style: id })!} />,
    <div key="rhythm" className="flex flex-col gap-7">
      <div className="flex flex-col gap-3"><h3 className="text-sm font-semibold">{w.contents}</h3>
        <Chips options={PACK_CHOICES} value={packContents} onChange={setPackContents} label={(id) => getRestoTemplate(id)!.name[locale]} disabled={busy} /></div>
      <div className="flex flex-col gap-3"><h3 className="text-sm font-semibold">{w.networks}</h3>
        <Chips options={RESTO_NETWORKS} value={networks} onChange={setNetworks} label={(id) => s.networks[id]} disabled={busy} /></div>
      <div className="flex flex-col gap-3">
        <label htmlFor="onb-day" className="text-sm font-semibold">{w.packDay}</label>
        <select id="onb-day" value={packDay} disabled={busy} onChange={(e) => setPackDay(Number(e.target.value))} className="h-12 w-full max-w-xs rounded-xl border border-line-strong bg-surface px-3.5 text-base">
          {Array.from({ length: 7 }, (_, day) => <option key={day} value={day}>{weekdayName(day, locale)}</option>)}
        </select>
        <p className="text-sm text-muted">{w.packTime}</p>
      </div>
    </div>,
  ][step];

  const last = step === w.steps.length - 1;
  const optional = (step === 1 && !logo) || (step === 4 && !ambiance) || step === 6;
  return (
    <StepFlow copy={c} title={w.title} step={step} steps={w.steps} intros={w.intros} direction={direction} preview={preview} previewFrom={0} error={error}
      nav={<StepNav copy={{ ...c, free: w.free }} step={step} last={last} ready={Boolean(ready)} busy={busy} creating={creating} skip={optional} createLabel={w.create} onBack={() => go(step - 1)} onNext={() => go(step + 1)} onCreate={() => void finish()} />}>
      {body}
    </StepFlow>
  );
}

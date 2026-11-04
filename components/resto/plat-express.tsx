"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Sparkles } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { Button } from "@/components/ui/button";
import { uploadFile, type UploadedFile } from "@/lib/storage/client";
import { getRestoStyle, getRestoTemplate, stylesForPhoto, type RestoStyleId } from "@/config/resto-templates";
import type { RestoFormatId } from "@/config/formats";
import { restoCopy } from "@/lib/resto/copy";
import { spaceCopy } from "@/lib/resto/space-copy";
import { createResto } from "@/lib/resto/actions";
import { prepareRestoPhoto, type PreparedPhoto } from "@/lib/resto/photo-actions";
import { matchCarteDish } from "@/lib/resto/match";
import { formatPrice } from "@/lib/resto/model";
import { cn } from "@/lib/utils";
import { CartePicker, useCarte } from "./carte-picker";
import { PhotoChoice } from "./photo-choice";
import { RestoPreview } from "./resto-preview";
import { contentFromDraft, FormatPicker, NamePriceFields, previewProps, priceIsInvalid, type RestoDraft } from "./resto-form";

const priceText = (cents: number | null, locale: "fr" | "en") => cents === null ? "" : formatPrice(cents, locale).replace(/€/g, "").trim();

/**
 * Plat du jour express (abonnés Resto), pensé pour le téléphone en plein service :
 * une photo → l'IA reconnaît le plat sur la carte (nom, prix, description) → tout le reste vient de l'accueil
 * (restaurant, logo, style, dernier format) → « Créer » ouvre directement le téléchargement, avec la légende.
 */
export function PlatExpress({ restaurantName, style: defaultStyle, format: defaultFormat, logo }: { restaurantName: string; style: RestoStyleId; format: RestoFormatId; logo: UploadedFile | null }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const c = restoCopy(locale);
  const x = spaceCopy(locale).express;
  const router = useRouter();
  const carte = useCarte();
  const [original, setOriginal] = useState<UploadedFile | null>(null);
  const [prepared, setPrepared] = useState<PreparedPhoto | null>(null);
  const [useImproved, setUseImproved] = useState(true);
  const [busy, setBusy] = useState<"upload" | "analyze" | "create" | null>(null);
  const [error, setError] = useState("");
  const [fromCarte, setFromCarte] = useState(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  const [draft, setDraft] = useState<RestoDraft>({ style: defaultStyle, format: defaultFormat, language: locale, name: "", priceText: "", description: "", restaurantName, focus: { x: 0.5, y: 0.5 }, hasDisc: false });
  const patch = (next: Partial<RestoDraft>) => setDraft((current) => ({ ...current, ...next }));
  const photo = prepared && useImproved ? prepared.improved : original;
  const disc = prepared?.disc ?? null;
  const styles = stylesForPhoto(getRestoTemplate("plat-du-jour")!, { plate: disc });
  const content = contentFromDraft(draft);
  const media = photo ? { photoUrl: photo.url, logoUrl: logo?.url ?? null, discUrl: disc?.url ?? null } : null;
  const preview = useMemo(() => media && previewProps(draft, media, c), [draft, media?.photoUrl, media?.discUrl, c]); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy("upload"); setError(""); setFromCarte(false);
    try {
      const uploaded = await uploadFile(file, "image");
      setOriginal(uploaded); setPrepared(null); setUseImproved(true);
      setBusy("analyze");
      const result = await prepareRestoPhoto({ photo: uploaded, locale, plate: true }).catch(() => null);
      if (result?.ok) {
        setPrepared(result);
        const dishes = carte?.categories.flatMap((cat) => cat.dishes) ?? [];
        const dish = result.analysis?.dishName ? matchCarteDish(dishes, result.analysis.dishName) : null;
        setFromCarte(Boolean(dish));
        setDraft((current) => ({
          ...current, hasDisc: Boolean(result.disc), ...(result.analysis && { focus: result.analysis.focus }),
          // Table 3D seulement si l'assiette a été repérée
          ...(!result.disc && getRestoStyle(current.style)?.needs === "plate" && { style: "bistrot" as const }),
          ...(dish ? { name: dish.name, priceText: priceText(dish.priceCents, locale), description: dish.description } : result.analysis?.dishName ? { name: result.analysis.dishName } : {}),
        }));
      }
    } catch { setError(c.photoError); }
    finally { setBusy(null); }
  }

  async function create() {
    if (!photo || !content) return;
    const key = JSON.stringify({ photo: photo.url, content });
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    setBusy("create"); setError("");
    try {
      const result = await createResto({ requestId: request.current.id, content, photos: disc && content.disc ? [photo, disc] : [photo], logo, locale });
      if (!result.ok) { setError(c.createError); setBusy(null); return; }
      router.replace(`/project/${result.id}?express=1`);
    } catch { setError(c.createError); setBusy(null); }
  }

  const input = (capture: boolean) => <input type="file" accept="image/*" {...(capture && { capture: "environment" })} className="sr-only" disabled={busy !== null} onChange={(e) => void upload(e.target.files?.[0])} />;

  if (!photo) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 pb-16">
        <header><h1 className="text-2xl font-semibold sm:text-3xl">{x.title}</h1><p className="mt-1.5 text-muted">{x.intro}</p></header>
        <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-violet-500/50 bg-violet-500/5 text-center transition-colors hover:bg-violet-500/10">
          {input(true)}
          <span className="grid size-20 place-items-center rounded-full bg-violet-600 text-white shadow-[0_18px_40px_-16px_rgb(139_92_246/0.9)]"><Camera className="size-9" /></span>
          <span className="text-lg font-semibold">{busy === "upload" ? c.photoUploading : x.shoot}</span>
          <span className="max-w-64 text-sm text-muted">{x.shootHint}</span>
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-center rounded-full border border-line px-5 text-sm font-medium hover:border-line-strong">{input(false)}<ImagePlus className="size-4" />{x.gallery}</label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-6">
        <header><h1 className="text-2xl font-semibold sm:text-3xl">{x.title}</h1></header>
        {preview && <div className="lg:hidden"><RestoPreview videoProps={preview} label={c.preview} compact /></div>}
        {busy === "analyze"
          ? <p role="status" className="flex items-center gap-2 text-sm text-muted"><Sparkles className="size-4 animate-pulse text-violet-500" />{x.analyzing}</p>
          : fromCarte && <p className="rounded-xl bg-violet-500/10 px-3 py-2 text-sm text-violet-700 dark:text-violet-300">{x.fromCarte}</p>}
        <div className="flex flex-col gap-2">
          <CartePicker carte={carte} copy={c} locale={locale} disabled={busy !== null} onPick={(dish) => { setFromCarte(true); patch({ name: dish.name, priceText: priceText(dish.priceCents, locale), description: dish.description }); }} />
          <NamePriceFields draft={draft} onChange={patch} copy={c} disabled={busy !== null} />
        </div>
        <PhotoChoice copy={c} analyzing={false} prepared={prepared} original={original} useImproved={useImproved} onChange={setUseImproved} disabled={busy !== null} />
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{c.look}</h2>
          <div className="flex flex-wrap gap-2">
            {styles.map((id) => (
              <button key={id} type="button" aria-pressed={draft.style === id} disabled={busy !== null} onClick={() => patch({ style: id })}
                className={cn("inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors", draft.style === id ? "border-violet-500 bg-violet-600 text-white" : "border-line hover:border-line-strong")}>
                {getRestoStyle(id)!.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3"><h2 className="text-sm font-semibold">{c.formatTitle}</h2><FormatPicker draft={draft} onChange={patch} copy={c} disabled={busy !== null} /></div>
        <label className="inline-flex min-h-10 cursor-pointer items-center self-start rounded-full border border-line px-4 text-sm font-medium hover:border-line-strong">{input(false)}{c.photoChange}</label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
      {preview && <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start"><RestoPreview videoProps={preview} label={c.preview} /></aside>}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-1">
          <Button variant="purple" size="lg" className="w-full sm:ml-auto sm:w-auto" loading={busy === "create"} disabled={!content || busy !== null || priceIsInvalid(draft)} onClick={() => void create()}>{x.create}</Button>
          <p className="text-center text-xs text-muted sm:text-right">{x.createHint}</p>
        </div>
      </nav>
    </div>
  );
}

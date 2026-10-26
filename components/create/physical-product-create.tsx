"use client";
/* eslint-disable @next/next/no-img-element -- Private original and prepared product images retain their exact bytes. */

import { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, LayoutTemplate, Link2, Loader2, MessageSquare, Music2, Palette, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "./upload-zone";
import { StepProgress } from "./step-progress";
import { UrlMusicPicker } from "./url-music-picker";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { useRouter } from "@/lib/i18n/navigation";
import { publishCreditBalance } from "@/components/app/live-credit-balance";
import { LIQUID_TEMPLATES, PRODUCT_TEMPLATES, getProductTemplate, isProduct3D, type ProductTemplateId } from "@/config/physical-product";
import { getRecipe } from "@/config/recipes";
import { CREDIT_COSTS } from "@/config/credits";
import { physicalProductGraph, PhysicalProductSchema, type PhysicalProductInput } from "@/lib/products/model";
import { createPhysicalProduct } from "@/lib/products/actions";
import type { UploadedFile } from "@/lib/storage/client";
import type { UrlPreferences } from "@/lib/url-video/model";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, FPS, durationInFrames, type VideoProps } from "@/remotion/props";
import { getTrack } from "@/config/music";
import { cn } from "@/lib/utils";

type Photo = { original: UploadedFile; prepared?: UploadedFile; usePrepared: boolean; status: "pending" | "removed" | "transparent" | "original" | "error"; small?: boolean };
const field = "mt-2 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20";

export function PhysicalProductCreate({ balance, initialStyleId }: { balance: number; initialStyleId?: string }) {
  const locale = useDictionary().locale, fr = locale === "fr", router = useRouter();
  const [step, setStep] = useState(0), [furthest, setFurthest] = useState(0), [photos, setPhotos] = useState<Photo[]>([]);
  const [templateId, setTemplate] = useState<ProductTemplateId>(getProductTemplate(initialStyleId)?.id ?? "product-studio");
  const [name, setName] = useState(""), [hook, setHook] = useState(""), [benefits, setBenefits] = useState(["", "", ""]);
  const [price, setPrice] = useState(""), [cta, setCta] = useState(fr ? "Découvre le produit" : "Discover the product");
  const [websiteUrl, setWebsite] = useState(""), [sourceUrl, setSource] = useState("");
  const [logo, setLogo] = useState<UploadedFile | null>(null);
  const [saveBrand, setSaveBrand] = useState(true);
  const [colors, setColors] = useState<[string, string, string]>([...(getProductTemplate(initialStyleId) ?? getProductTemplate("product-studio")!).palette]);
  const [format, setFormat] = useState<PhysicalProductInput["format"]>("PORTRAIT"), [duration, setDuration] = useState<15 | 30>(15);
  const [music, setMusic] = useState<UrlPreferences>({ templateId: null, music: null });
  const [uploading, setUploading] = useState(false), [importing, setImporting] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  const request = useRef<{ key: string; id: string } | null>(null), alive = useRef(true), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (heading.current && heading.current.getBoundingClientRect().top < 0) heading.current.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [step]);
  const preparing = photos.some((photo) => photo.status === "pending"), busy = uploading || importing || preparing || pending;
  const images = photos.map((photo) => photo.usePrepared && photo.prepared ? photo.prepared : photo.original);
  const input: PhysicalProductInput = { requestId: "00000000-0000-4000-8000-000000000000", name: name || (fr ? "Ton produit" : "Your product"), hook: hook || name || (fr ? "Place à ton produit." : "Let your product shine."), benefits: benefits.filter((item) => item.trim()).length ? benefits.filter((item) => item.trim()) : [fr ? "Ton bénéfice principal" : "Your main benefit"], cta, price, websiteUrl, templateId, images, originals: photos.map((photo) => photo.original), logo, colors, format, duration, locale, musicTrackId: music.musicTrackId ?? null, music: music.music, saveBrand };
  const graph = physicalProductGraph({ ...input, images: images.length ? images : [{ url: "", fileName: "", mimeType: "image/png", sizeBytes: 0 }] });
  const props: VideoProps = { appName: input.name, locale, format, palette: colors, recipe: getRecipe(templateId), graph, logoUrl: logo?.url ?? null, screenUrls: images.map((file) => file.url), websiteUrl: websiteUrl || null, musicSrc: music.music?.url ?? getTrack(music.musicTrackId)?.src ?? null, watermark: false };
  async function prepare(files: UploadedFile[]) {
    const existing = new Set(photos.map((photo) => photo.original.url));
    const fresh = files.filter((file) => !existing.has(file.url)).slice(0, 4 - photos.length);
    setPhotos((current) => [...current, ...fresh.map((original): Photo => ({ original, usePrepared: false, status: "pending" }))].slice(0, 4));
    for (const original of fresh) {
      try {
        const response = await fetch("/api/products/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(original) });
        const result = await response.json();
        if (!response.ok) throw new Error();
        if (alive.current) setPhotos((current) => current.map((photo) => photo.original.url === original.url ? { ...photo, prepared: result.file, status: result.status, small: result.small, usePrepared: result.status !== "original" } : photo));
      } catch { if (alive.current) setPhotos((current) => current.map((photo) => photo.original.url === original.url ? { ...photo, status: "error" } : photo)); }
    }
  }
  async function importProduct() {
    setImporting(true); setError("");
    try {
      const response = await fetch("/api/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: sourceUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error();
      if (!alive.current) return;
      setName(result.name); setPrice(result.price); setWebsite(result.url);
      await prepare(result.images);
    } catch { if (alive.current) setError(fr ? "On n’a pas pu récupérer cette fiche. Importe tes photos ci-dessous pour continuer." : "We couldn’t read this listing. Upload your photos below to continue."); }
    finally { if (alive.current) setImporting(false); }
  }
  async function create() {
    if (busy) return;
    setPending(true); setError("");
    const key = JSON.stringify(input);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    try {
      const result = await createPhysicalProduct({ ...input, requestId: request.current.id });
      if (!result.ok) { setError(result.error === "insufficient_credits" ? fr ? "Tu n’as pas assez de crédits." : "Not enough credits." : fr ? "La création n’a pas abouti. Réessaie, tes choix sont conservés." : "Creation failed. Try again; your choices are preserved."); return; }
      publishCreditBalance(result.balance); router.push(`/project/${result.id}`); router.refresh();
    } catch { setError(fr ? "Connexion interrompue. Réessaie pour retrouver ta vidéo." : "Connection interrupted. Retry to recover your video."); }
    finally { if (alive.current) setPending(false); }
  }
  const dimensions = DIMENSIONS[format];
  const copy = fr ? FR : EN;
  const template = PRODUCT_TEMPLATES.find((item) => item.id === templateId)!;
  const liquid = LIQUID_TEMPLATES.includes(templateId);
  const noMusic = !music.music && !music.musicTrackId;

  /** L'étape est-elle complète ? Seules les photos et le message sont obligatoires. */
  function stepValid(index: number) {
    if (index === STEP.photos) return photos.length > 0;
    if (index === STEP.message || index === STEP.preview) return Boolean(name.trim() && hook.trim() && benefits.some((value) => value.trim()) && cta.trim()) && PhysicalProductSchema.safeParse(input).success;
    return true;
  }
  const valid = stepValid(step);
  function go(next: number) {
    if (busy) return;
    if (next > step) for (let index = step; index < next; index++) if (!stepValid(index)) return;
    setStep(next); setFurthest((value) => Math.max(value, next)); setError("");
  }

  return <div className="mx-auto max-w-6xl pb-8">
    <StepProgress
      label={fr ? "Étapes de création" : "Creation steps"}
      steps={copy.steps.map((label, index) => ({ label, icon: STEP_ICONS[index] ?? Sparkles }))}
      step={step}
      furthest={furthest}
      disabled={busy}
      onSelect={go}
      counter={fr ? `Étape ${step + 1} sur ${copy.steps.length}` : `Step ${step + 1} of ${copy.steps.length}`}
    />
    <div className={cn(step !== STEP.style && step !== STEP.preview && "mx-auto max-w-2xl")}>
      <header className="mb-7 sm:mb-9">
        <h1 ref={heading} tabIndex={-1} className="scroll-mt-8 text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">{copy.titles[step]}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{copy.descriptions[step]}</p>
      </header>
      {error && <p role="alert" className="mb-6 rounded-xl border border-danger/40 bg-surface p-4 text-sm leading-relaxed">{error}</p>}

      {step === STEP.photos && <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-labelledby="product-source-label">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text" aria-hidden><Link2 className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <label id="product-source-label" htmlFor="product-source" className="flex items-baseline justify-between gap-3 text-sm font-semibold">{fr ? "Importer depuis une fiche produit" : "Import from a product listing"}<span className="text-xs font-normal text-muted">{fr ? "Facultatif" : "Optional"}</span></label>
              <p className="mt-1 text-xs leading-relaxed text-muted">{fr ? "On récupère le nom, le prix et les photos. Si le site bloque l’import, ajoute simplement tes photos." : "We fetch the name, price and photos. If importing is blocked, just upload your photos."}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input id="product-source" className={cn(field, "mt-0 flex-1")} type="url" value={sourceUrl} onChange={(event) => setSource(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && sourceUrl.trim() && !busy && photos.length < 4) { event.preventDefault(); void importProduct(); } }} placeholder="https://…" disabled={busy} /><Button variant="outline" className="h-12 rounded-xl" loading={importing} disabled={busy || !sourceUrl.trim() || photos.length >= 4} onClick={() => void importProduct()}>{fr ? "Récupérer" : "Import"}</Button></div>
        </section>
        <div className="flex items-center gap-3 text-xs text-subtle" aria-hidden><span className="h-px flex-1 bg-line" />{fr ? "ou" : "or"}<span className="h-px flex-1 bg-line" /></div>
        <fieldset disabled={busy}><legend className="mb-3 flex w-full items-baseline justify-between text-sm font-semibold">{fr ? "Photos du produit" : "Product photos"}<span className="text-xs font-normal tabular-nums text-muted">{photos.length}/4</span></legend><UploadZone label={fr ? "Photos du produit" : "Product photos"} value={photos.map((photo) => photo.original)} className={!photos.length ? "[&>div]:grid-cols-1 [&>div]:sm:grid-cols-1 [&_label]:aspect-auto [&_label]:min-h-52" : undefined} multiple max={4} onBusyChange={setUploading} onChange={(files) => {
          setPhotos((current) => current.filter((photo) => files.some((file) => file.url === photo.original.url)));
          void prepare(files);
        }} hint={fr ? "PNG, JPG ou WebP · Fond uni recommandé · Une photo de face suffit" : "PNG, JPG or WebP · Plain background recommended · One front photo is enough"} /></fieldset>
        {photos.map((photo, index) => <section key={photo.original.url} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">{index === 0 ? fr ? "Photo principale" : "Main photo" : `${fr ? "Angle" : "Angle"} ${index + 1}`}</h2><span role="status" className="flex items-center gap-2 text-xs text-muted">{photo.status === "pending" ? <><Loader2 className="size-3.5 animate-spin" />{fr ? "Préparation…" : "Preparing…"}</> : photo.status === "removed" || photo.status === "transparent" ? <><Check className="size-3.5 text-success" />{fr ? "Prête pour la 2.5D" : "Ready for 2.5D"}</> : fr ? "Original conservé" : "Original preserved"}</span></div>
          <div className="grid grid-cols-2 gap-3 p-4">{[{ file: photo.original, prepared: false, title: fr ? "Original" : "Original" }, ...(photo.prepared ? [{ file: photo.prepared, prepared: true, title: fr ? "Détourée" : "Cut out" }] : [])].map((option) => <button key={String(option.prepared)} type="button" disabled={busy} onClick={() => setPhotos((items) => items.map((item) => item.original.url === photo.original.url ? { ...item, usePrepared: option.prepared } : item))} aria-pressed={photo.usePrepared === option.prepared} className={cn("rounded-xl border-2 p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", photo.usePrepared === option.prepared ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong")}><span className="block aspect-square overflow-hidden rounded-lg bg-[#E7E5E0] p-4"><img src={option.file.url} alt={option.title} className="h-full w-full object-contain" /></span><span className="mt-2.5 flex items-center justify-between px-1 text-sm font-medium">{option.title}{photo.usePrepared === option.prepared && <Check className="size-4 text-accent-text" />}</span></button>)}</div>
          {(photo.status === "original" || photo.status === "error" || photo.small) && <p className="px-4 pb-4 text-xs leading-relaxed text-muted">{photo.status === "original" || photo.status === "error" ? fr ? "Le fond n’a pas pu être retiré avec fiabilité. L’original reste utilisable ; un PNG détouré donnera plus de profondeur." : "We couldn’t reliably remove the background. Your original still works; a transparent PNG will give more depth." : fr ? "Image de petite taille : privilégie une photo plus nette pour un grand export." : "Small image: use a sharper photo for large exports."}</p>}
        </section>)}
        {!photos.length && <p className="flex gap-2 text-xs leading-relaxed text-muted"><ImagePlus className="size-4 shrink-0" />{fr ? "Le détourage automatique fonctionne sur les fonds unis. Verre, transparence ou fond complexe : importe de préférence un PNG déjà détouré." : "Automatic cutouts work on plain backgrounds. For glass, transparency or complex backgrounds, upload a transparent PNG."}</p>}
      </div>}

      {step === STEP.style && <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{PRODUCT_TEMPLATES.map((item) => {
        const previewGraph = physicalProductGraph({ ...input, templateId: item.id, colors: [...item.palette], format: "PORTRAIT", images });
        const selected = templateId === item.id;
        return <button key={item.id} type="button" aria-pressed={selected} onClick={() => { setTemplate(item.id); setColors([...item.palette]); }} className={cn("group overflow-hidden rounded-2xl border-2 text-left transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent hover:shadow-[0_12px_30px_-15px_rgb(139_92_246/0.5)]", selected ? "border-accent" : "border-line hover:border-line-strong")}>
          <div className="pointer-events-none aspect-[9/16] overflow-hidden"><Player component={KinetikVideo} inputProps={{ ...props, recipe: getRecipe(item.id), format: "PORTRAIT", palette: [...item.palette], graph: previewGraph, musicSrc: null }} compositionWidth={1080} compositionHeight={1920} durationInFrames={durationInFrames(previewGraph)} fps={FPS} autoPlay loop controls={false} clickToPlay={false} spaceKeyToPlayOrPause={false} initiallyMuted style={{ width: "100%", height: "100%" }} /></div>
          <div className={cn("p-5 transition-colors", selected ? "bg-accent-soft" : "bg-surface")}><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{item.name}</h2>{isProduct3D(item.id) && <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">3D</span>}{selected && <Check className="ml-auto size-5 text-accent-text" />}</div><p className="mt-2 text-sm leading-relaxed text-muted">{item.description[locale]}</p>{isProduct3D(item.id) && <p className="mt-3 text-xs text-accent-text">{fr ? "Export au tarif 3D habituel." : "Standard 3D export pricing."}</p>}</div>
        </button>;
      })}</div>}

      {step === STEP.message && <div className="space-y-6">
        <label className="block text-sm font-medium">{fr ? "Nom du produit" : "Product name"}<input className={field} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} /></label>
        <label className="block text-sm font-medium">{fr ? "Accroche" : "Opening hook"}<textarea className={field} rows={2} value={hook} maxLength={100} onChange={(event) => setHook(event.target.value)} placeholder={fr ? "Ce qui donne envie de le découvrir." : "A reason to discover your product."} /></label>
        <fieldset className="space-y-3"><legend className="mb-1 text-sm font-medium">{fr ? "Les bénéfices à montrer" : "Benefits to highlight"}</legend><p className="mb-3 text-xs text-muted">{fr ? "Un seul suffit. Des mots simples, des bénéfices réels." : "One is enough. Simple words, real benefits."}</p>{benefits.map((value, index) => <label key={index} className="flex items-center gap-3"><Check className="size-4 shrink-0 text-accent-text" aria-hidden /><span className="sr-only">{fr ? "Bénéfice" : "Benefit"} {index + 1}</span><input className={cn(field, "mt-0")} value={value} maxLength={140} onChange={(event) => setBenefits((items) => items.map((item, i) => i === index ? event.target.value : item))} placeholder={`${fr ? "Bénéfice" : "Benefit"} ${index + 1}${index ? fr ? " (facultatif)" : " (optional)" : ""}`} /></label>)}</fieldset>
        <div className="grid gap-5 border-t border-line pt-6 sm:grid-cols-2"><label className="block text-sm font-medium">{fr ? "Appel à l’action" : "Call to action"}<input className={field} value={cta} maxLength={80} onChange={(event) => setCta(event.target.value)} /></label><label className="block text-sm font-medium">{fr ? "Prix" : "Price"} <span className="font-normal text-muted">({fr ? "facultatif" : "optional"})</span><input className={field} value={price} maxLength={40} placeholder="49 €" onChange={(event) => setPrice(event.target.value)} /></label></div>
        <label className="block text-sm font-medium">{fr ? "Lien d’achat" : "Purchase link"} <span className="font-normal text-muted">({fr ? "facultatif" : "optional"})</span><input type="url" className={field} value={websiteUrl} maxLength={2000} onChange={(event) => setWebsite(event.target.value)} placeholder="https://…" /></label>
      </div>}

      {step === STEP.brand && <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5"><h2 className="text-sm font-semibold">Logo <span className="ml-1 text-xs font-normal text-muted">({fr ? "facultatif" : "optional"})</span></h2><p className="mb-4 mt-1 text-xs text-muted">{fr ? "PNG ou SVG, idéalement sur fond transparent." : "PNG or SVG, ideally with a transparent background."}</p><UploadZone label="Logo" value={logo ? [logo] : []} onChange={(files) => setLogo(files[0] ?? null)} onBusyChange={setUploading} /></section>
        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5"><div className="flex items-baseline justify-between gap-3"><h2 className="text-sm font-semibold">{fr ? "Couleurs" : "Colors"}</h2><button type="button" onClick={() => setColors([...template.palette])} className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-fg"><RotateCcw className="size-3.5" aria-hidden />{fr ? `Couleurs de ${template.name}` : `${template.name} colors`}</button></div><p className="mb-4 mt-1 text-xs text-muted">{fr ? "Clique sur une pastille pour l’ajuster." : "Click a swatch to adjust it."}</p>
          <div className="grid grid-cols-3 gap-3">{colors.map((color, index) => <label key={index} className="group cursor-pointer"><span className="relative block h-20 overflow-hidden rounded-xl border border-line-strong transition-transform group-hover:scale-[1.02] group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-accent" style={{ background: color }}><input type="color" value={color} aria-label={(fr ? ["Fond", "Texte", liquid ? "Liquide" : "Accent"] : ["Background", "Text", liquid ? "Liquid" : "Accent"])[index]} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => setColors((items) => items.map((item, i) => i === index ? event.target.value : item) as [string, string, string])} /></span><span className="mt-2 flex items-baseline justify-between gap-2 text-xs"><span className="font-medium">{(fr ? ["Fond", "Texte", liquid ? "Liquide" : "Accent"] : ["Background", "Text", liquid ? "Liquid" : "Accent"])[index]}</span><span className="font-mono uppercase text-muted">{color}</span></span></label>)}</div>
        </section>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 text-sm"><input type="checkbox" checked={saveBrand} onChange={(event) => setSaveBrand(event.target.checked)} className="mt-0.5 size-4 accent-accent" /><span className="font-medium">{fr ? "Conserver dans mon brand kit" : "Save to my brand kit"}<span className="mt-1 block text-xs font-normal text-muted">{fr ? "Retrouve ce logo et ces couleurs pour tes prochaines vidéos." : "Reuse this logo and these colors in your next videos."}</span></span></label>
      </div>}

      {step === STEP.sound && <section aria-label={fr ? "Bande-son" : "Soundtrack"}><UrlMusicPicker preferences={music} onChange={setMusic} onUploading={setUploading} disabled={pending} /></section>}

      {step === STEP.preview && <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="mx-auto w-full overflow-hidden rounded-2xl border border-line bg-surface" style={{ maxWidth: format === "PORTRAIT" ? 360 : "100%" }}><Player key={`${templateId}-${format}`} component={KinetikVideo} inputProps={props} compositionWidth={dimensions.width} compositionHeight={dimensions.height} durationInFrames={durationInFrames(graph)} fps={FPS} autoPlay loop controls initiallyMuted style={{ width: "100%", aspectRatio: `${dimensions.width}/${dimensions.height}` }} /></div>
        <div className="space-y-6">
          <fieldset><legend className="mb-3 text-sm font-semibold">Format</legend><div className="grid grid-cols-3 gap-2">{([["PORTRAIT", "9:16", "h-7 w-4"], ["LANDSCAPE", "16:9", "h-4 w-7"], ["SQUARE", "1:1", "size-5"]] as const).map(([value, ratio, shape]) => <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)} className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", format === value ? "border-accent bg-accent-soft text-fg" : "border-line-strong bg-surface text-muted hover:border-muted")}><span className="grid h-8 place-items-center" aria-hidden><span className={cn("rounded-[3px] border-2", shape, format === value ? "border-accent-text" : "border-muted")} /></span><span className="font-medium tabular-nums">{ratio}</span></button>)}</div></fieldset>
          <fieldset><legend className="mb-3 text-sm font-semibold">{fr ? "Durée" : "Duration"}</legend><div className="inline-flex w-full gap-1 rounded-xl bg-surface p-1">{([15, 30] as const).map((value) => <button key={value} type="button" aria-pressed={duration === value} onClick={() => setDuration(value)} className={cn("min-h-10 flex-1 rounded-lg text-sm font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", duration === value ? "bg-accent-soft text-accent-text" : "text-muted hover:text-fg")}>{value} s</button>)}</div></fieldset>
          <dl className="divide-y divide-line rounded-2xl border border-line px-4 text-sm">{([[fr ? "Template" : "Template", template.name, STEP.style], [fr ? "Photos" : "Photos", String(images.length), STEP.photos], [fr ? "Produit" : "Product", name, STEP.message], [fr ? "Musique" : "Music", music.music?.fileName ?? getTrack(music.musicTrackId)?.title ?? (fr ? "Sans musique" : "No music"), STEP.sound]] as const).map(([label, value, target]) => <div key={label} className="flex items-center gap-3 py-3"><dt className="w-20 shrink-0 text-muted">{label}</dt><dd className="min-w-0 flex-1 truncate font-medium">{value}</dd><button type="button" onClick={() => go(target)} className="min-h-9 shrink-0 rounded-md px-1 text-xs text-accent-text hover:underline">{fr ? "Modifier" : "Edit"}</button></div>)}</dl>
          <p className="text-xs leading-relaxed text-muted">{fr ? "Tu pourras ajuster les textes, les médias et le son dans l’éditeur. L’export est facturé séparément." : "Fine-tune copy, media and sound in the editor. Export is charged separately."}</p>
        </div>
      </div>}

      <footer className="sticky bottom-0 z-20 mt-9 border-t border-line bg-bg py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={busy || step === 0} className={cn("min-h-11", step === 0 && "invisible")} onClick={() => go(step - 1)}><ArrowLeft />{fr ? "Retour" : "Back"}</Button>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">{step === STEP.preview && <span className="text-xs text-muted">{CREDIT_COSTS.generation} {fr ? "crédits" : "credits"} · {balance} {fr ? "disponibles" : "available"}</span>}<Button variant="purple" className="group min-h-12 px-6" disabled={busy || !valid || (step === STEP.preview && balance < CREDIT_COSTS.generation)} loading={pending || preparing} onClick={() => step === STEP.preview ? void create() : go(step + 1)}>{preparing ? fr ? "Préparation…" : "Preparing…" : step === STEP.sound && noMusic ? copy.skipMusic : copy.next[step]}{!pending && !preparing && (step === STEP.preview ? <Sparkles /> : <ArrowRight className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />)}</Button></div>
        </div>
        {step === STEP.photos && !photos.length && <p className="mt-3 text-right text-xs text-muted">{fr ? "Ajoute au moins une photo pour continuer." : "Add at least one photo to continue."}</p>}
        {step === STEP.message && !valid && <p className="mt-3 text-right text-xs text-muted">{fr ? "Renseigne le nom, l’accroche, un bénéfice et l’appel à l’action." : "Fill in the name, hook, one benefit and the call to action."}</p>}
      </footer>
    </div>
  </div>;
}

const STEP = { photos: 0, style: 1, message: 2, brand: 3, sound: 4, preview: 5 } as const;
const STEP_ICONS = [Camera, LayoutTemplate, MessageSquare, Palette, Music2, Sparkles];
const FR = {
  steps: ["Photos", "Style", "Message", "Marque", "Son", "Aperçu"],
  titles: ["Ton produit, sous son meilleur jour.", "Choisis sa mise en scène.", "Qu’est-ce qui le rend unique ?", "Ton identité visuelle", "Quelle musique pour ta vidéo ?", "Prêt à entrer en scène."],
  descriptions: ["Importe une fiche produit ou ajoute jusqu’à 4 photos. On les détoure, tu valides le résultat. L’original reste disponible.", "Le même produit, plusieurs directions. Les mouvements restent légers pour respecter sa forme.", "Des mots simples, des bénéfices réels. Le prix et le lien sont facultatifs.", "Ajoute ton logo et ajuste les couleurs. Tout est facultatif : le template a déjà une palette.", "Choisis un son dans la bibliothèque, importe le tien ou passe cette étape. Tu pourras le changer dans l’éditeur.", "Vérifie le mouvement, les textes et le son avant d’ouvrir l’éditeur."],
  next: ["Choisir le style", "Écrire le message", "Passer à la marque", "Choisir la musique", "Voir l’aperçu", "Créer ma vidéo"],
  skipMusic: "Continuer sans musique",
};
const EN: typeof FR = {
  steps: ["Photos", "Style", "Message", "Brand", "Sound", "Preview"],
  titles: ["Your product, in its best light.", "Choose its setting.", "What makes it special?", "Your visual identity", "What music for your video?", "Ready for the spotlight."],
  descriptions: ["Import a product listing or add up to 4 photos. We cut them out; you review the result. Your original stays available.", "One product, different directions. Subtle movements preserve its shape.", "Simple words, real benefits. Price and link are optional.", "Add your logo and adjust the colors. Everything is optional: the template already has a palette.", "Pick a track from the library, upload your own or skip this step. You can change it in the editor.", "Review the motion, copy and sound before opening the editor."],
  next: ["Choose the style", "Write the message", "Go to brand", "Choose the music", "See the preview", "Create my video"],
  skipMusic: "Continue without music",
};

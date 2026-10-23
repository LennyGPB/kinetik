"use client";
/* eslint-disable @next/next/no-img-element -- Private original and prepared product images retain their exact bytes. */

import { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "./upload-zone";
import { UrlMusicPicker } from "./url-music-picker";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { useRouter } from "@/lib/i18n/navigation";
import { publishCreditBalance } from "@/components/app/live-credit-balance";
import { PRODUCT_TEMPLATES, getProductTemplate, isProduct3D, type ProductTemplateId } from "@/config/physical-product";
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
  const [step, setStep] = useState(0), [photos, setPhotos] = useState<Photo[]>([]);
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
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step]);
  const preparing = photos.some((photo) => photo.status === "pending"), busy = uploading || importing || preparing || pending;
  const images = photos.map((photo) => photo.usePrepared && photo.prepared ? photo.prepared : photo.original);
  const input: PhysicalProductInput = { requestId: "00000000-0000-4000-8000-000000000000", name: name || (fr ? "Ton produit" : "Your product"), hook: hook || name || (fr ? "Place à ton produit." : "Let your product shine."), benefits: benefits.filter((item) => item.trim()).length ? benefits.filter((item) => item.trim()) : [fr ? "Ton bénéfice principal" : "Your main benefit"], cta, price, websiteUrl, templateId, images, originals: photos.map((photo) => photo.original), logo, colors, format, duration, locale, musicTrackId: music.musicTrackId ?? null, music: music.music, saveBrand };
  const graph = physicalProductGraph({ ...input, images: images.length ? images : [{ url: "", fileName: "", mimeType: "image/png", sizeBytes: 0 }] });
  const props: VideoProps = { appName: input.name, locale, format, palette: colors, recipe: getRecipe(templateId), graph, logoUrl: logo?.url ?? null, screenUrls: images.map((file) => file.url), websiteUrl: websiteUrl || null, musicSrc: music.music?.url ?? getTrack(music.musicTrackId)?.src ?? null, watermark: false };
  const dimensions = DIMENSIONS[format];
  const steps = fr ? ["Photos", "Style", "Message & son", "Aperçu"] : ["Photos", "Style", "Message & sound", "Preview"];
  const titles = fr ? ["Ton produit, sous son meilleur jour.", "Choisis sa mise en scène.", "Qu’est-ce qui le rend unique ?", "Prêt à entrer en scène."] : ["Your product, in its best light.", "Choose its setting.", "What makes it special?", "Ready for the spotlight."];

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
  const valid = step === 0 ? photos.length > 0 : step === 1 ? true : Boolean(name.trim() && hook.trim() && benefits.some((value) => value.trim()) && cta.trim()) && PhysicalProductSchema.safeParse(input).success;

  return <div className="mx-auto max-w-6xl pb-8">
    <nav aria-label={fr ? "Création produit" : "Product creation"} className="mb-8 flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
      {steps.map((label, index) => <button key={label} type="button" disabled={busy || index > step} onClick={() => { setStep(index); setError(""); }} aria-label={label} aria-current={step === index ? "step" : undefined} className={cn("flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-xs focus-visible:outline-2 focus-visible:outline-accent sm:text-sm", step === index ? "bg-accent-soft font-semibold text-accent-text" : "text-muted disabled:opacity-60")}><span className="tabular-nums">{index < step ? <Check className="size-4" /> : index + 1}</span><span className={step === index ? "inline" : "hidden sm:inline"}>{label}</span></button>)}
    </nav>
    <header className="mb-8"><h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold tracking-tight outline-none sm:text-4xl">{titles[step]}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{step === 0 ? fr ? "Ajoute jusqu’à 4 photos. On prépare les images, tu valides le résultat. L’original reste disponible." : "Add up to 4 photos. We prepare them; you review the result. Your original stays available." : step === 1 ? fr ? "Le même produit, plusieurs directions. Les mouvements restent légers pour respecter sa forme." : "One product, different directions. Subtle movements preserve its shape." : step === 2 ? fr ? "Des mots simples, des bénéfices réels. Le prix et la musique sont facultatifs." : "Simple words, real benefits. Price and music are optional." : fr ? "Vérifie le mouvement, les textes et le son avant d’ouvrir l’éditeur." : "Review the motion, copy and sound before opening the editor."}</p></header>
    {error && <p role="alert" className="mb-6 rounded-xl border border-danger/40 bg-surface p-4 text-sm leading-relaxed">{error}</p>}
    {step === 0 && <div className="mx-auto max-w-3xl space-y-7">
      <div><label htmlFor="product-source" className="text-sm font-medium">{fr ? "Lien de la fiche produit" : "Product listing URL"} <span className="ml-2 text-xs text-muted">{fr ? "Facultatif" : "Optional"}</span></label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input id="product-source" className={cn(field, "mt-0 flex-1")} type="url" value={sourceUrl} onChange={(event) => setSource(event.target.value)} placeholder="https://…" disabled={busy} /><Button variant="outline" className="h-12 rounded-xl" loading={importing} disabled={busy || !sourceUrl.trim() || photos.length >= 4} onClick={() => void importProduct()}>{fr ? "Récupérer le produit" : "Import product"}</Button></div><p className="mt-2 text-xs leading-relaxed text-muted">{fr ? "Fiches e-commerce avec données produit publiques. Si le site bloque l’import, ajoute simplement tes photos." : "E-commerce listings with public product data. If importing is blocked, upload your photos instead."}</p></div>
      <fieldset disabled={busy}><UploadZone label={fr ? "Photos du produit" : "Product photos"} value={photos.map((photo) => photo.original)} className={!photos.length ? "[&>div]:grid-cols-1 [&>div]:sm:grid-cols-1 [&_label]:aspect-auto [&_label]:min-h-52" : undefined} multiple max={4} onBusyChange={setUploading} onChange={(files) => {
        setPhotos((current) => current.filter((photo) => files.some((file) => file.url === photo.original.url)));
        void prepare(files);
      }} hint={fr ? "PNG, JPG ou WebP · Fond uni recommandé · Une photo de face suffit" : "PNG, JPG or WebP · Plain background recommended · One front photo is enough"} /></fieldset>
      {photos.map((photo, index) => <section key={photo.original.url} className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3"><h2 className="text-sm font-medium">{index === 0 ? fr ? "Photo principale" : "Main photo" : `${fr ? "Angle" : "Angle"} ${index + 1}`}</h2><span role="status" className="flex items-center gap-2 text-xs text-muted">{photo.status === "pending" ? <><Loader2 className="size-3.5 animate-spin" />{fr ? "Préparation…" : "Preparing…"}</> : photo.status === "removed" || photo.status === "transparent" ? <><Check className="size-3.5 text-success" />{fr ? "Prête pour la 2.5D" : "Ready for 2.5D"}</> : fr ? "Original conservé" : "Original preserved"}</span></div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">{[{ file: photo.original, prepared: false, title: fr ? "Original" : "Original" }, ...(photo.prepared ? [{ file: photo.prepared, prepared: true, title: fr ? "Préparée" : "Prepared" }] : [])].map((option) => <button key={String(option.prepared)} type="button" disabled={busy} onClick={() => setPhotos((items) => items.map((item) => item.original.url === photo.original.url ? { ...item, usePrepared: option.prepared } : item))} aria-pressed={photo.usePrepared === option.prepared} className={cn("rounded-xl border-2 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", photo.usePrepared === option.prepared ? "border-accent" : "border-line hover:border-line-strong")}><span className="block aspect-square overflow-hidden rounded-lg bg-[#E7E5E0] p-5"><img src={option.file.url} alt={option.title} className="h-full w-full object-contain" /></span><span className="mt-3 flex items-center justify-between text-sm font-medium">{option.title}{photo.usePrepared === option.prepared && <Check className="size-4 text-accent-text" />}</span></button>)}</div>
        {(photo.status === "original" || photo.status === "error" || photo.small) && <p className="px-4 pb-4 text-xs leading-relaxed text-muted">{photo.status === "original" || photo.status === "error" ? fr ? "Le fond n’a pas pu être retiré avec fiabilité. L’original reste utilisable ; un PNG détouré donnera plus de profondeur." : "We couldn’t reliably remove the background. Your original still works; a transparent PNG will give more depth." : fr ? "Image de petite taille : privilégie une photo plus nette pour un grand export." : "Small image: use a sharper photo for large exports."}</p>}
      </section>)}
      {!photos.length && <p className="flex gap-2 text-xs leading-relaxed text-muted"><ImagePlus className="size-4 shrink-0" />{fr ? "Le détourage automatique fonctionne sur les fonds unis. Verre, transparence ou fond complexe : importe de préférence un PNG déjà détouré." : "Automatic cutouts work on plain backgrounds. For glass, transparency or complex backgrounds, upload a transparent PNG."}</p>}
    </div>}
    {step === 1 && <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 xl:grid-cols-4">{PRODUCT_TEMPLATES.map((template) => {
      const previewGraph = physicalProductGraph({ ...input, templateId: template.id, colors: [...template.palette], format: "PORTRAIT", images });
      return <button key={template.id} type="button" aria-pressed={templateId === template.id} onClick={() => { setTemplate(template.id); setColors([...template.palette]); }} className={cn("group overflow-hidden rounded-xl border-2 text-left transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent hover:shadow-[0_12px_30px_-15px_rgb(139_92_246/0.5)]", templateId === template.id ? "border-accent" : "border-line hover:border-line-strong")}>
        <div className="pointer-events-none aspect-[9/16] overflow-hidden"><Player component={KinetikVideo} inputProps={{ ...props, recipe: getRecipe(template.id), format: "PORTRAIT", palette: [...template.palette], graph: previewGraph, musicSrc: null }} compositionWidth={1080} compositionHeight={1920} durationInFrames={durationInFrames(previewGraph)} fps={FPS} autoPlay loop controls={false} clickToPlay={false} spaceKeyToPlayOrPause={false} initiallyMuted style={{ width: "100%", height: "100%" }} /></div>
        <div className="bg-surface p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{template.name}</h2>{isProduct3D(template.id) && <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-text">3D</span>}{templateId === template.id && <Check className="size-5 text-accent-text" />}</div><p className="mt-2 text-sm leading-relaxed text-muted">{template.description[locale]}</p>{isProduct3D(template.id) && <p className="mt-3 text-xs text-accent-text">{fr ? "Export au tarif 3D habituel." : "Standard 3D export pricing."}</p>}</div>
      </button>;
    })}</div>}
    {step === 2 && <div className="mx-auto max-w-2xl space-y-6">
      <label className="block text-sm font-medium">{fr ? "Nom du produit" : "Product name"}<input className={field} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} /></label>
      <label className="block text-sm font-medium">{fr ? "Accroche" : "Opening hook"}<textarea className={field} rows={2} value={hook} maxLength={100} onChange={(event) => setHook(event.target.value)} placeholder={fr ? "Ce qui donne envie de le découvrir." : "A reason to discover your product."} /></label>
      <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">{fr ? "Les bénéfices à montrer" : "Benefits to highlight"}</legend>{benefits.map((value, index) => <label key={index} className="block"><span className="sr-only">{fr ? "Bénéfice" : "Benefit"} {index + 1}</span><input className={cn(field, "mt-0")} value={value} maxLength={140} onChange={(event) => setBenefits((items) => items.map((item, i) => i === index ? event.target.value : item))} placeholder={`${fr ? "Bénéfice" : "Benefit"} ${index + 1}${index ? fr ? " (facultatif)" : " (optional)" : ""}`} /></label>)}</fieldset>
      <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">{fr ? "Appel à l’action" : "Call to action"}<input className={field} value={cta} maxLength={80} onChange={(event) => setCta(event.target.value)} /></label><label className="block text-sm font-medium">{fr ? "Prix (facultatif)" : "Price (optional)"}<input className={field} value={price} maxLength={40} placeholder="49 €" onChange={(event) => setPrice(event.target.value)} /></label></div>
      <label className="block text-sm font-medium">{fr ? "Lien d’achat (facultatif)" : "Purchase link (optional)"}<input type="url" className={field} value={websiteUrl} maxLength={2000} onChange={(event) => setWebsite(event.target.value)} placeholder="https://…" /></label>
      <details className="rounded-xl border border-line bg-surface p-5"><summary className="cursor-pointer text-sm font-semibold">{fr ? "Logo et couleurs" : "Logo and colors"}</summary><div className="mt-5 space-y-5"><UploadZone label="Logo" value={logo ? [logo] : []} onChange={(files) => setLogo(files[0] ?? null)} onBusyChange={setUploading} /><div className="flex flex-wrap gap-5">{colors.map((color, index) => <label key={index} className="text-xs text-muted">{(fr ? ["Fond", "Texte", "Accent"] : ["Background", "Text", "Accent"])[index]}<input type="color" value={color} className="mt-2 block h-10 w-16 cursor-pointer rounded border border-line" onChange={(event) => setColors((items) => items.map((item, i) => i === index ? event.target.value : item) as [string, string, string])} /></label>)}</div></div></details>
      <section className="border-t border-line pt-6"><h2 className="mb-4 text-sm font-semibold">{fr ? "Bande-son" : "Soundtrack"}</h2><UrlMusicPicker preferences={music} onChange={setMusic} onUploading={setUploading} disabled={pending} /></section>
    </div>}
    {step === 3 && <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="mx-auto w-full overflow-hidden rounded-xl border border-line bg-surface" style={{ maxWidth: format === "PORTRAIT" ? 360 : "100%" }}><Player key={`${templateId}-${format}`} component={KinetikVideo} inputProps={props} compositionWidth={dimensions.width} compositionHeight={dimensions.height} durationInFrames={durationInFrames(graph)} fps={FPS} autoPlay loop controls initiallyMuted style={{ width: "100%", aspectRatio: `${dimensions.width}/${dimensions.height}` }} /></div>
      <div className="space-y-6"><fieldset><legend className="mb-3 text-sm font-semibold">{fr ? "Format" : "Format"}</legend><div className="flex gap-2">{(["PORTRAIT", "LANDSCAPE", "SQUARE"] as const).map((value, index) => <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)} className={cn("min-h-11 flex-1 rounded-xl border text-sm", format === value ? "border-accent bg-accent-soft text-accent-text" : "border-line bg-surface")}>{["9:16", "16:9", "1:1"][index]}</button>)}</div></fieldset>
        <fieldset><legend className="mb-3 text-sm font-semibold">{fr ? "Durée" : "Duration"}</legend><div className="flex gap-2">{([15, 30] as const).map((value) => <button key={value} type="button" aria-pressed={duration === value} onClick={() => setDuration(value)} className={cn("min-h-11 flex-1 rounded-xl border text-sm", duration === value ? "border-accent bg-accent-soft text-accent-text" : "border-line bg-surface")}>{value} s</button>)}</div></fieldset>
        <dl className="divide-y divide-line text-sm">{[[fr ? "Template" : "Template", PRODUCT_TEMPLATES.find((item) => item.id === templateId)!.name], [fr ? "Photos" : "Photos", String(images.length)], [fr ? "Musique" : "Music", music.music?.fileName ?? getTrack(music.musicTrackId)?.title ?? (fr ? "Sans musique" : "No music")]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3"><dt className="text-muted">{label}</dt><dd className="truncate font-medium">{value}</dd></div>)}</dl>
        <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" checked={saveBrand} onChange={(event) => setSaveBrand(event.target.checked)} className="mt-1 size-4 accent-accent" /><span>{fr ? "Conserver dans mon brand kit" : "Save to my brand kit"}</span></label>
        <p className="text-xs leading-relaxed text-muted">{fr ? "Tu pourras ajuster les textes, les médias et le son dans l’éditeur. L’export est facturé séparément." : "Fine-tune copy, media and sound in the editor. Export is charged separately."}</p>
      </div>
    </div>}
    <footer className="sticky bottom-0 z-20 mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-line bg-bg py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button variant="ghost" disabled={busy || step === 0} className={cn(step === 0 && "invisible")} onClick={() => { setStep(step - 1); setError(""); }}><ArrowLeft />{fr ? "Retour" : "Back"}</Button>
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">{step === 3 && <span className="text-xs text-muted">{CREDIT_COSTS.generation} {fr ? "crédits" : "credits"} · {balance} {fr ? "disponibles" : "available"}</span>}<Button variant="purple" className="min-h-12" disabled={busy || !valid || (step === 3 && balance < CREDIT_COSTS.generation)} loading={pending || preparing} onClick={() => step === 3 ? void create() : (setStep(step + 1), setError(""))}>{preparing ? fr ? "Préparation…" : "Preparing…" : step === 3 ? fr ? "Créer ma vidéo" : "Create my video" : fr ? "Continuer" : "Continue"}{!pending && !preparing && (step === 3 ? <Sparkles /> : <ArrowRight />)}</Button></div>
    </footer>
  </div>;
}

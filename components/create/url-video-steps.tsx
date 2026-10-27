"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Check, ChevronDown, Globe, ImagePlus, Images, Loader2, Maximize2, MessageSquareText, Palette, Pencil, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";
import { Player } from "@remotion/player";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { UploadZone } from "./upload-zone";
import { UrlMusicPicker } from "./url-music-picker";
import { getTrack } from "@/config/music";
import { TemplatesGallery } from "@/components/templates/templates-gallery";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Link } from "@/lib/i18n/navigation";
import { BRAND_FONTS } from "@/config/fonts";
import { getStyle } from "@/config/styles";
import { buildVideoProps } from "@/lib/projects/video-props";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS } from "@/remotion/props";
import type { UploadedFile } from "@/lib/storage/client";
import type { UrlAnalysis, UrlPreferences, UrlReview } from "@/lib/url-video/model";
import type { urlVideoResult } from "@/lib/url-video/proposals";
import { urlVideoCopy } from "@/lib/url-video/copy";
import { urlFlowCopy } from "@/lib/url-video/flow-copy";
import { cn } from "@/lib/utils";

export type UrlResult = NonNullable<Awaited<ReturnType<typeof urlVideoResult>>>;
export type Milestone = { stage: string; count?: number };
type Locale = "fr" | "en";
type ReviewProps = { locale: Locale; review: UrlReview; onChange: (review: UrlReview) => void };
export const urlField = "w-full min-w-0 rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px] leading-relaxed text-fg outline-none transition-colors placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/15 disabled:opacity-60";

function OptionalSection({ title, description, icon, children, className }: {
  title: string; description: string; icon: ReactNode; children: ReactNode; className?: string;
}) {
  return <details className={cn("group rounded-xl border border-line-strong bg-surface transition-colors open:border-accent/40", className)}>
    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-4 text-left transition-colors hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:gap-4 sm:p-5 [&::-webkit-details-marker]:hidden">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-fg">{title}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{description}</span></span>
      <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180 group-open:text-accent-text motion-reduce:transition-none" aria-hidden />
    </summary>
    <div className="border-t border-line p-4 sm:p-5">{children}</div>
  </details>;
}

function GrowingTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight + 2}px`;
  }, [props.value]);
  return <textarea {...props} ref={ref} className={cn(urlField, "block resize-none overflow-hidden", props.className)} />;
}

export function UrlSourceStep({ locale, url, onUrl, disabled }: {
  locale: Locale; url: string; onUrl: (value: string) => void; disabled: boolean;
}) {
  const c = urlVideoCopy[locale], f = urlFlowCopy[locale];
  const gatherIcons = [MessageSquareText, Images, Palette];
  return <div className="space-y-8">
    <div>
      <label className="mb-3 block text-sm font-medium" htmlFor="product-url">{c.url}</label>
      <div className="relative">
        <Globe className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input id="product-url" autoComplete="url" inputMode="url" autoFocus value={url} disabled={disabled} onChange={(e) => onUrl(e.target.value)} placeholder={locale === "fr" ? "https://ton-site.com" : "https://your-website.com"} aria-describedby="product-url-hint" className={cn(urlField, "h-16 rounded-2xl pl-13 text-base sm:text-lg")} />
      </div>
      <p id="product-url-hint" className="mt-3 text-xs leading-relaxed text-muted">{f.sourceHint}</p>
    </div>
    <section aria-labelledby="url-gather-title">
      <h2 id="url-gather-title" className="mb-3 text-xs font-semibold tracking-[0.1em] text-subtle uppercase">{f.gatherTitle}</h2>
      <ul className="grid gap-3 sm:grid-cols-3">{f.gather.map((item, index) => {
        const Icon = gatherIcons[index] ?? Sparkles;
        return <li key={item.title} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-col">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text" aria-hidden><Icon className="size-4" /></span>
          <span className="min-w-0"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{item.text}</span></span>
        </li>;
      })}</ul>
    </section>
    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-text" aria-hidden />{c.free}</p>
  </div>;
}

export function UrlMusicStep({ locale, preferences, onPreferences, onUploading, disabled }: {
  locale: Locale; preferences: UrlPreferences; onPreferences: (value: UrlPreferences) => void; onUploading: (busy: boolean) => void; disabled: boolean;
}) {
  const f = urlFlowCopy[locale];
  return <section aria-label={f.music}>
    <UrlMusicPicker preferences={preferences} onChange={onPreferences} onUploading={onUploading} disabled={disabled} />
    {(preferences.music || preferences.musicTrackId) && <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Check className="size-3.5 text-success" aria-hidden />{f.musicReady}</p>}
  </section>;
}

export function UrlAnalysisProgress({ locale, busy, ready, milestones, failed = false }: { locale: Locale; busy: boolean; ready: boolean; milestones: Milestone[]; failed?: boolean }) {
  const c = urlVideoCopy[locale], f = urlFlowCopy[locale];
  const current = milestones.at(-1);
  const interrupted = failed && !ready && !busy;
  // « Analysé » : affiché quelques secondes quand l'analyse se termine sous les yeux, jamais si elle l'était déjà
  const [readyHidden, setReadyHidden] = useState(ready);
  useEffect(() => {
    if (!ready || readyHidden) return;
    const timer = setTimeout(() => setReadyHidden(true), 4000);
    return () => clearTimeout(timer);
  }, [ready, readyHidden]);
  if (ready && readyHidden) return null;
  if (!busy && !ready && !milestones.length) return null;
  const running = !ready && !interrupted;
  const detail = ready ? f.analysisReadyHelp : interrupted ? f.analysisFailedHelp : current ? c.stages[current.stage as keyof typeof c.stages] ?? f.wait : f.wait;
  return <div className={cn("relative mb-8 animate-enter overflow-hidden rounded-2xl border bg-surface px-5 py-4 sm:px-6 sm:py-5", ready ? "border-success/40" : interrupted ? "border-danger/40" : "border-accent/30 shadow-[0_0_0_1px_rgb(139_92_246/0.08),0_12px_40px_-18px_var(--accent-glow)]")}>
    {/* Halo violet qui dérive doucement derrière le contenu pendant l'analyse */}
    {running && <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 size-56 animate-drift rounded-full bg-accent/15 blur-3xl" />}
    <div role="status" className="relative flex items-center gap-4">
      <span className="relative grid size-11 shrink-0 place-items-center" aria-hidden>
        {running ? <>
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20 [animation-duration:2s] motion-reduce:animate-none" />
          <span className="absolute inset-0 rounded-full border-2 border-accent/20" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-accent border-t-accent [animation-duration:0.9s] loading-spin" />
          <Sparkles className="size-4 animate-pulse text-accent-text" />
        </> : <span className={cn("grid size-11 animate-pop place-items-center rounded-full", ready ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>{ready ? <Check className="size-5" /> : <X className="size-5" />}</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{ready ? f.analysisReady : interrupted ? f.analysisFailed : f.analysisRunning}</p>
        <p key={detail} className="mt-1 animate-enter text-xs leading-relaxed text-muted">{detail}</p>
      </div>
    </div>
    {/* Barre de progression indéterminée */}
    {running && <div aria-hidden className="relative mt-4 h-1 overflow-hidden rounded-full bg-accent/10"><div className="absolute inset-y-0 w-1/3 animate-loading loading-bar rounded-full bg-gradient-to-r from-transparent via-accent to-transparent" /></div>}
    {milestones.length > 0 && <details className="relative mt-3 text-xs text-muted"><summary className="cursor-pointer py-1 transition-colors hover:text-fg">{f.details}</summary><ul className="mt-3 grid gap-2 sm:grid-cols-2">{milestones.map((m) => <li key={m.stage} className="flex animate-enter items-center gap-2"><Check className="size-3 shrink-0 text-success" />{c.stages[m.stage as keyof typeof c.stages] ?? m.stage}{m.count !== undefined && ` · ${m.count}`}</li>)}</ul></details>}
  </div>;
}

export function UrlTemplateStep({ locale, preferences, onPreferences }: {
  locale: Locale; preferences: UrlPreferences; onPreferences: (value: UrlPreferences) => void;
}) {
  const f = urlFlowCopy[locale];
  return <div>
    <div className="mb-4 flex items-center justify-between gap-3 text-sm"><p className="font-medium">{f.browse}</p><p className="text-accent-text">{preferences.templateId ? `${f.selectedTemplate} : ${getStyle(preferences.templateId)?.name}` : f.chooseTemplate}</p></div>
    <div className="max-h-[620px] overflow-y-auto overscroll-contain rounded-xl border border-line p-3 sm:p-5"><TemplatesGallery compact selectedId={preferences.templateId} onSelect={(templateId) => onPreferences({ ...preferences, templateId })} /></div>
  </div>;
}

export function UrlMessageStep({ locale, review, onChange }: ReviewProps) {
  const c = urlVideoCopy[locale], f = urlFlowCopy[locale];
  const update = (key: keyof UrlReview["brief"], value: unknown) => onChange({ ...review, brief: { ...review.brief, [key]: value } });
  return <div className="mx-auto max-w-2xl space-y-7">
    <label className="block text-sm font-medium">{c.company}<input className={cn(urlField, "mt-2")} maxLength={40} value={review.brief.company} onChange={(e) => update("company", e.target.value)} /></label>
    <label className="block text-sm font-medium">{c.product}<GrowingTextarea className="mt-2" rows={3} maxLength={500} value={review.brief.product} onChange={(e) => update("product", e.target.value)} /></label>
    <label className="block text-sm font-medium">{c.audience}<GrowingTextarea className="mt-2" rows={2} maxLength={240} value={review.brief.audience} onChange={(e) => update("audience", e.target.value)} /></label>
    <fieldset><legend className="text-sm font-semibold">{c.benefits}</legend><p className="mb-3 mt-1 text-xs leading-relaxed text-muted">{f.benefitsHelp}</p>
      <div className="space-y-3">{review.brief.benefits.map((benefit, index) => <div key={index} className="flex items-start gap-3"><Check className="mt-4 size-4 shrink-0 text-accent-text" aria-hidden /><GrowingTextarea aria-label={`${c.benefits} ${index + 1}`} rows={2} maxLength={180} value={benefit} onChange={(e) => update("benefits", review.brief.benefits.map((v, i) => i === index ? e.target.value : v))} /></div>)}</div>
    </fieldset>
    <OptionalSection title={f.advancedMessage} description={locale === "fr" ? "Personnalise le ton et les premières secondes de ta vidéo." : "Fine-tune the tone and opening seconds of your video."} icon={<SlidersHorizontal className="size-5" />}>
      <div className="space-y-5"><label className="block text-sm font-medium">{c.tone}<select className={cn(urlField, "mt-2")} value={review.brief.tone} onChange={(e) => update("tone", e.target.value)}>{Object.entries(c.tones).map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
        <p className="text-xs leading-relaxed text-muted">{f.advancedMessageHelp}</p>
        <label className="block text-sm font-medium">{locale === "fr" ? "Accroche" : "Hook"}<GrowingTextarea className="mt-2" rows={2} maxLength={100} value={review.brief.hooks[0]} onChange={(e) => update("hooks", [e.target.value])} /></label>
      </div>
    </OptionalSection>
  </div>;
}

export function UrlAssetsStep({ locale, review, onChange, analysis, onAddScreens, onLogoUpload, uploading, onUploading }: ReviewProps & {
  analysis: UrlAnalysis; onAddScreens: (files: UploadedFile[]) => void; onLogoUpload: (file: File) => void; uploading: boolean; onUploading: (value: boolean) => void;
}) {
  const c = urlVideoCopy[locale], f = urlFlowCopy[locale];
  const [all, setAll] = useState(false), [preview, setPreview] = useState<string | null>(null);
  const visible = all ? analysis.screens : analysis.screens.filter((s) => review.screens.some((file) => file.url === s.url));
  const active = analysis.screens.find((s) => s.url === preview);
  return <div className="space-y-8">
    <div className="grid gap-7 sm:grid-cols-[220px_minmax(0,1fr)]">
      <section><h2 className="text-sm font-semibold">{c.logo}</h2>
        <div className="mt-3 flex h-32 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface p-5">
          {review.logo ? /* eslint-disable-next-line @next/next/no-img-element -- private brand asset */ <img src={review.logo.url} alt={c.logo} className="block h-full max-h-20 w-full max-w-44 object-contain" /> : <ImagePlus className="size-8 text-muted" aria-hidden />}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2"><label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-medium text-accent-text"><Upload className="size-3.5" />{review.logo ? c.replaceLogo : c.addLogo}<input type="file" className="sr-only" aria-label={c.addLogo} accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) onLogoUpload(file); }} /></label>{review.logo && <button type="button" disabled={uploading} onClick={() => onChange({ ...review, logo: null })} aria-label={f.removeLogo} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface hover:text-fg"><X className="size-4" /></button>}</div>
      </section>
      <section className="min-w-0"><h2 className="text-sm font-semibold">{c.colors}</h2><p className="mt-2 text-xs leading-relaxed text-muted">{f.paletteHelp}</p>
        <div className="mt-4 flex flex-wrap gap-3">{review.colors.map((color, index) => <label key={index} title={color} className="relative flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-line-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"><span className="absolute inset-0" style={{ background: color }} /><input type="color" aria-label={`${c.colors} ${index + 1}`} value={color} onChange={(e) => onChange({ ...review, colors: review.colors.map((v, i) => i === index ? e.target.value : v) })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label>)}</div>
        <OptionalSection className="mt-6" title={f.advancedBrand} description={`${review.brief.headingFont} / ${review.brief.bodyFont}`} icon={<SlidersHorizontal className="size-5" />}><div className="grid gap-3 sm:grid-cols-2">{(["headingFont", "bodyFont"] as const).map((key) => <label key={key} className="text-xs text-muted">{key === "headingFont" ? c.heading : c.body}<select className={cn(urlField, "mt-2")} value={review.brief[key]} onChange={(e) => onChange({ ...review, brief: { ...review.brief, [key]: e.target.value } })}>{BRAND_FONTS.map((font) => <option key={font}>{font}</option>)}</select></label>)}</div><p className="mt-3 text-xs leading-relaxed text-muted">{review.brief.fontNote}</p></OptionalSection>
      </section>
    </div>
    <section className="border-t border-line pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">{c.screens} <span className="ml-1 text-sm font-normal text-muted">{review.screens.length}/8</span></h2><button type="button" onClick={() => setAll(!all)} className="min-h-10 cursor-pointer rounded-lg px-3 text-sm font-medium text-accent-text transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{all ? f.selectedScreens : `${f.allScreens} (${analysis.screens.length})`}</button></div>
      <p className="mb-4 mt-1 text-sm leading-relaxed text-muted">{f.selectionHelp}</p>
      {review.screens.length === 0 && <p className="mb-4 text-sm text-danger">{f.noScreens}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visible.map((screen) => {
        const selected = review.screens.some((s) => s.url === screen.url);
        const sourceLabel = screen.format === "app" ? f.app : screen.format === "mobile" ? f.mobile : f.desktop;
        return <div key={screen.url} className="relative min-w-0">
          <button type="button" aria-pressed={selected} aria-label={`${screen.label} · ${sourceLabel}`} disabled={uploading || (!selected && review.screens.length >= 8)} onClick={() => {
            const { label: _label, source: _source, format: _format, ...file } = screen;
            onChange({ ...review, screens: selected ? review.screens.filter((s) => s.url !== screen.url) : [...review.screens, file] });
          }} className={cn("block w-full cursor-pointer overflow-hidden rounded-xl border-2 bg-surface text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40", selected ? "border-accent" : "border-line hover:border-line-strong")}>
            <span className="block aspect-[4/3] p-2">{/* eslint-disable-next-line @next/next/no-img-element -- private capture */}<img src={screen.url} alt="" className="h-full w-full object-contain" /></span>
            <span className="flex items-center gap-2 border-t border-line px-3 py-2.5 text-xs"><span className={cn("grid size-4 shrink-0 place-items-center rounded border", selected ? "border-accent bg-accent text-accent-fg" : "border-line-strong")}>{selected && <Check className="size-3" />}</span><span className="truncate">{sourceLabel}</span></span>
          </button>
          <button type="button" aria-label={`${f.zoom} ${screen.label}`} onClick={() => setPreview(screen.url)} className="absolute right-2 top-2 grid size-8 cursor-pointer place-items-center rounded-lg border border-white/20 bg-black/85 text-white transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><Maximize2 className="size-3.5" /></button>
        </div>;
      })}</div>
      <OptionalSection className="mt-5" title={f.addScreens} description={locale === "fr" ? "Complète la sélection avec tes images du produit." : "Add your own product images to the selection."} icon={<ImagePlus className="size-5" />}>
        <UploadZone label={f.addScreens} value={[]} onChange={onAddScreens} onBusyChange={onUploading} multiple max={8 - review.screens.length} />
      </OptionalSection>
    </section>
    <Dialog open={Boolean(active)} onClose={() => setPreview(null)} title={active?.label ?? c.screens} className="sm:max-w-5xl">{active && /* eslint-disable-next-line @next/next/no-img-element -- private capture */ <img src={active.url} alt={active.label} className="max-h-[75dvh] w-full object-contain" />}</Dialog>
  </div>;
}

export function UrlFinalStep({ locale, review, onChange, analysis, onEdit }: ReviewProps & { analysis: UrlAnalysis; onEdit: (step: number) => void }) {
  const c = urlVideoCopy[locale], f = urlFlowCopy[locale];
  const style = review.templateId ? getStyle(review.templateId) : null;
  return <div className="mx-auto max-w-3xl space-y-7">
    <div className="flex items-start gap-4 rounded-xl bg-surface p-5 sm:p-6">
      {review.logo && <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg p-2">{/* eslint-disable-next-line @next/next/no-img-element -- private logo */}<img src={review.logo.url} alt="" className="h-full w-full object-contain" /></div>}
      <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">{review.brief.company}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{review.brief.product}</p></div>
      <button type="button" onClick={() => onEdit(3)} aria-label={`${f.edit} ${c.product}`} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"><Pencil className="size-4" /></button>
    </div>
    <dl className="divide-y divide-line">
      {[{ label: f.template, value: style?.name ?? f.chooseTemplate, step: 1 }, { label: f.audio, value: review.music?.fileName ?? getTrack(review.musicTrackId)?.title ?? f.noMusic, step: 2 }, { label: c.screens, value: `${review.screens.length} ${f.selected}`, step: 4 }].map((row) => <div key={row.label} className="flex items-center gap-4 py-4"><dt className="w-24 shrink-0 text-sm text-muted">{row.label}</dt><dd className="min-w-0 flex-1 truncate text-sm font-medium">{row.value}</dd><button type="button" onClick={() => onEdit(row.step)} className="min-h-10 cursor-pointer text-sm text-accent-text hover:underline">{f.edit}</button></div>)}
    </dl>
    {style && <div className="sm:max-w-xs"><div className="relative aspect-video overflow-hidden rounded-xl bg-surface"><VideoPlaceholder ratio="fill" templateId={style.id} palette={style.palette} scene={style.recipe.background} label={style.name} /></div><p className="mt-2 text-xs text-muted">{style.name}</p></div>}
    {review.music && <audio controls preload="metadata" src={review.music.url} aria-label={review.music.fileName} className="h-10 w-full" />}
    <fieldset className="border-t border-line pt-6"><legend className="text-sm font-semibold">{f.output}</legend>
      <div className="mt-4 space-y-5">
        <div role="radiogroup" aria-label={c.format} className="grid grid-cols-3 gap-2">
          {([["PORTRAIT", c.portrait, "9:16", "h-7 w-4"], ["LANDSCAPE", c.landscape, "16:9", "h-4 w-7"], ["SQUARE", c.square, "1:1", "size-5"]] as const).map(([id, label, ratio, shape]) => {
            const selected = review.format === id;
            return <button key={id} type="button" role="radio" aria-checked={selected} onClick={() => onChange({ ...review, format: id })} className={cn("flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", selected ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:border-muted")}>
              <span className="grid h-8 place-items-center" aria-hidden><span className={cn("rounded-[3px] border-2", shape, selected ? "border-accent-text" : "border-muted")} /></span>
              <span className={cn("text-sm font-medium", selected ? "text-fg" : "text-muted")}>{label}</span>
              <span className="text-[11px] tabular-nums text-subtle">{ratio}</span>
            </button>;
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">{c.duration}</span>
          <div role="radiogroup" aria-label={c.duration} className="inline-flex gap-1 rounded-xl bg-surface p-1">
            {([10, 15, 30] as const).map((n) => {
              const selected = review.duration === n;
              return <button key={n} type="button" role="radio" aria-checked={selected} onClick={() => onChange({ ...review, duration: n as UrlReview["duration"] })} className={cn("min-h-10 min-w-16 rounded-lg px-3 text-sm font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", selected ? "bg-accent-soft text-accent-text" : "text-muted hover:text-fg")}>{n} s</button>;
            })}
          </div>
        </div>
      </div>
    </fieldset>
    {style?.category === "3d" && <p className="text-xs leading-relaxed text-muted">{f.premium}</p>}
    <label className="flex cursor-pointer items-start gap-3 border-t border-line pt-5"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-accent" checked={review.saveBrand} onChange={(e) => onChange({ ...review, saveBrand: e.target.checked })} /><span className="text-sm font-medium">{f.savedKit}<span className="mt-1 block text-xs font-normal leading-relaxed text-muted">{f.savedKitHelp}</span></span></label>
    {(analysis.brief.warnings.length > 0 || analysis.pages.length > 0) && <details className="text-xs text-muted"><summary className="cursor-pointer py-2">{c.sources}{analysis.brief.warnings.length > 0 && ` · ${c.warnings}`}</summary><div className="mt-3 space-y-3">{analysis.brief.warnings.map((warning, i) => <p key={i} className="leading-relaxed">{warning}</p>)}{analysis.pages.map((page) => <a key={page} href={page} target="_blank" rel="noreferrer" className="block break-all underline underline-offset-4">{page}</a>)}</div></details>}
  </div>;
}

export function UrlProposalResults({ locale, result, review }: { locale: Locale; result: UrlResult; review: UrlReview }) {
  const c = urlVideoCopy[locale], f = urlFlowCopy[locale];
  return <div className={cn("grid gap-6", result.proposals.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "mx-auto max-w-md")}>{result.proposals.map((proposal) => <section key={proposal.id} className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
    <div className="flex items-center justify-between gap-3 px-4 py-3"><h2 className="text-sm font-semibold">{getStyle(proposal.styleId)?.name ?? proposal.styleId}</h2><span className={cn("text-xs", proposal.status === "READY" ? "text-success" : "text-muted")}>{proposal.status === "READY" ? f.ready : proposal.status === "FAILED" ? f.failed : f.pending}</span></div>
    {proposal.graph && proposal.source ? <Player component={KinetikVideo} inputProps={buildVideoProps(proposal.source, proposal.graph, result.watermark)} durationInFrames={durationInFrames(proposal.graph)} fps={FPS} compositionWidth={DIMENSIONS[proposal.source.format].width} compositionHeight={DIMENSIONS[proposal.source.format].height} controls loop initiallyMuted style={{ width: "100%", aspectRatio: `${DIMENSIONS[proposal.source.format].width}/${DIMENSIONS[proposal.source.format].height}` }} /> : <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-3 border-y border-line p-5 text-center text-sm text-muted">{proposal.status === "GENERATING" && <Loader2 className="size-6 animate-spin motion-reduce:animate-none" />}{proposal.status === "FAILED" ? c.failed : c.pending}</div>}
    <div className="space-y-4 p-4"><p className="min-h-10 text-sm leading-relaxed">{review.brief.hooks[proposal.index] ?? review.brief.hooks[0]}</p>{proposal.status === "READY" && <Link href={`/project/${proposal.id}`} className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-center text-sm font-medium text-accent-fg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{c.edit}</Link>}</div>
  </section>)}</div>;
}

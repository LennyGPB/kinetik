"use client";

import Image from "next/image";
import { Thumbnail } from "@remotion/player";
import { Check, Crosshair, Store } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { RESTO_FORMAT_IDS, type RestoFormatId } from "@/config/formats";
import { getRestoStyle, getRestoTemplate, menuSemaineTimeline, stylesForPhoto, type RestoStyleId, type RestoTemplateId } from "@/config/resto-templates";
import { getTrack } from "@/config/music";
import { buildVideoProps } from "@/lib/projects/video-props";
import { restoGraph, type PlatDuJourContent, type RestoContent } from "@/lib/resto/content";
import type { RestoCopy } from "@/lib/resto/copy";
import { formatPrice, parsePrice } from "@/lib/resto/model";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS, videoDimensions, type VideoProps } from "@/remotion/props";
import { cn } from "@/lib/utils";

type Locale = "fr" | "en";

/** Saisie du restaurateur : le prix reste du texte tant qu'il n'est pas lu sans ambiguïté. */
export type RestoDraft = {
  style: RestoStyleId;
  format: RestoFormatId;
  language: Locale;
  name: string;
  priceText: string;
  description: string;
  restaurantName: string;
  focus: { x: number; y: number };
  /** L'assiette a été redressée en disque (Table 3D possible) */
  hasDisc?: boolean;
};

export function draftFromContent(content: PlatDuJourContent, fallback: Locale): RestoDraft {
  const language = content.language ?? fallback;
  return {
    style: content.style, format: content.format, language, name: content.dish.name,
    priceText: content.dish.priceCents === null ? "" : formatPrice(content.dish.priceCents, language).replace(/€/g, "").trim(),
    description: content.dish.description ?? "", restaurantName: content.restaurantName, focus: content.focus, hasDisc: typeof content.disc === "number",
  };
}

export const priceIsInvalid = (draft: Pick<RestoDraft, "priceText">) => Boolean(draft.priceText.trim()) && parsePrice(draft.priceText) === null;

/** Contenu prêt à enregistrer, ou null si un champ obligatoire manque ou si le prix n'est pas lisible. */
export function contentFromDraft(draft: RestoDraft): (PlatDuJourContent & { language: Locale }) | null {
  if (priceIsInvalid(draft) || !draft.name.trim() || !draft.restaurantName.trim()) return null;
  if (draft.style === "table3d" && !draft.hasDisc) return null;
  const priceCents = draft.priceText.trim() ? parsePrice(draft.priceText) : null;
  return {
    template: "plat-du-jour", style: draft.style, format: draft.format, language: draft.language, focus: draft.focus, restaurantName: draft.restaurantName.trim(),
    ...(draft.hasDisc && { disc: 1 }),
    dish: { name: draft.name.trim(), priceCents, ...(draft.description.trim() && { description: draft.description.trim() }) },
  };
}

/**
 * Props de l'aperçu (joué dans le navigateur). Champs vides : textes d'exemple, pour voir le style tout de suite ;
 * prix illisible : pas de prix plutôt qu'un prix deviné.
 */
export function previewProps(draft: RestoDraft, media: { photoUrl: string; logoUrl: string | null; discUrl?: string | null }, copy: RestoCopy, overrides: Partial<RestoDraft> = {}, base?: Pick<VideoProps, "graph">["graph"]): VideoProps {
  const shown = { ...draft, ...overrides };
  const content = contentFromDraft({ ...shown, name: shown.name || copy.namePlaceholder, restaurantName: shown.restaurantName || copy.restaurantPlaceholder, priceText: priceIsInvalid(shown) ? "" : shown.priceText })!;
  return restoVideoProps(content, media.discUrl ? [media.photoUrl, media.discUrl] : [media.photoUrl], media.logoUrl, base);
}

/** Props du lecteur pour n'importe quel contenu Resto (aperçu joué dans le navigateur). */
export function restoVideoProps(content: RestoContent & { language: Locale }, photoUrls: string[], logoUrl: string | null, base?: Pick<VideoProps, "graph">["graph"]): VideoProps {
  const graph = { ...restoGraph(content, photoUrls, content.language), ...(base?.audio && { audio: base.audio }) };
  return buildVideoProps({ appName: content.restaurantName, format: "PORTRAIT", styleId: null, colors: [], logoUrl, backgroundUrl: null, screenUrls: photoUrls, screenRatios: [], websiteUrl: null, musicSrc: getTrack(graph.musicTrackId)?.src ?? null, locale: content.language, custom: null }, graph, false);
}

/** Photo avec point de cadrage : un toucher place le point d'intérêt. */
export function FocusPicker({ url, focus, onChange, copy, disabled }: { url: string; focus: { x: number; y: number }; onChange: (focus: { x: number; y: number }) => void; copy: RestoCopy; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-label={copy.focus}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const clamp = (v: number) => Math.min(1, Math.max(0, Math.round(v * 1000) / 1000));
          onChange({ x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) });
        }}
        className="relative block aspect-[4/3] w-full cursor-crosshair overflow-hidden rounded-2xl border border-line bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed"
      >
        <Image src={url} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" unoptimized />
        <span className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-black/40 text-white shadow-lg transition-[left,top] duration-200" style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }}>
          <Crosshair className="size-4" />
        </span>
      </button>
      <p className="text-sm text-muted">{copy.focus}</p>
    </div>
  );
}

export function NamePriceFields({ draft, onChange, copy, disabled }: { draft: RestoDraft; onChange: (patch: Partial<RestoDraft>) => void; copy: RestoCopy; disabled?: boolean }) {
  const invalid = priceIsInvalid(draft);
  return (
    <div className="flex flex-col gap-5">
      <Field label={copy.name} htmlFor="resto-name">
        <Input id="resto-name" autoFocus value={draft.name} maxLength={60} placeholder={copy.namePlaceholder} disabled={disabled} onChange={(e) => onChange({ name: e.target.value })} className="h-12 text-base" />
      </Field>
      <Field label={copy.price} htmlFor="resto-price" hint={invalid ? undefined : copy.priceHint} error={invalid ? copy.priceInvalid : undefined}>
        <div className="relative max-w-48">
          <Input id="resto-price" inputMode="decimal" value={draft.priceText} maxLength={12} placeholder={copy.pricePlaceholder} disabled={disabled} aria-invalid={invalid} onChange={(e) => onChange({ priceText: e.target.value })} className="h-12 pr-9 text-base" />
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted">€</span>
        </div>
      </Field>
    </div>
  );
}

export function DescriptionField({ draft, onChange, copy, disabled }: { draft: RestoDraft; onChange: (patch: Partial<RestoDraft>) => void; copy: RestoCopy; disabled?: boolean }) {
  return (
    <Field label={copy.description} htmlFor="resto-description" hint={`${copy.descriptionHint} · ${draft.description.length}/90`}>
      <Textarea id="resto-description" autoFocus value={draft.description} maxLength={90} rows={3} placeholder={copy.descriptionPlaceholder} disabled={disabled} onChange={(e) => onChange({ description: e.target.value.replace(/\n/g, " ") })} className="min-h-24 text-base" />
    </Field>
  );
}

export function RestaurantFields({ draft, onChange, copy, disabled, logo }: {
  draft: { restaurantName: string }; onChange: (patch: { restaurantName: string }) => void; copy: RestoCopy; disabled?: boolean;
  /** Logo facultatif (absent dans l'éditeur : il reste celui de la création) */
  logo?: { url: string | null; uploading: boolean; onPick: (file: File | undefined) => void; onRemove: () => void };
}) {
  return (
    <div className="flex flex-col gap-6">
      <Field label={copy.restaurantName} htmlFor="resto-restaurant">
        <Input id="resto-restaurant" value={draft.restaurantName} maxLength={40} placeholder={copy.restaurantPlaceholder} disabled={disabled} onChange={(e) => onChange({ restaurantName: e.target.value })} className="h-12 text-base" />
      </Field>
      {logo && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{copy.logo}</p>
          <div className="flex items-center gap-3">
            <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-surface-2">
              {logo.url ? <Image src={logo.url} alt="" fill sizes="64px" className="object-contain p-2" unoptimized /> : <Store className="size-5 text-muted" />}
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-medium hover:border-line-strong">
              <input type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={(e) => logo.onPick(e.target.files?.[0])} />
              {logo.uploading ? copy.photoUploading : logo.url ? copy.photoChange : copy.logoPick}
            </label>
            {logo.url && <button type="button" className="text-sm text-muted hover:underline" disabled={disabled} onClick={logo.onRemove}>{copy.logoRemove}</button>}
          </div>
          <p className="text-xs text-muted">{copy.logoHint}</p>
        </div>
      )}
    </div>
  );
}

/** Image clé de chaque style : la fin du plat du jour (nom et prix affichés), le premier jour du menu. */
function heroFrame(props: VideoProps) {
  const resto = props.graph.resto;
  if (resto?.template === "menu-semaine") {
    const tl = menuSemaineTimeline(resto.style, resto.days.length);
    return Math.round((0.3 + (tl.dayStart(0) + tl.perDay * 0.75) * (60 / props.graph.bpm)) * FPS);
  }
  return Math.max(0, durationInFrames(props.graph) - 24);
}

/** Choix du style : chaque carte montre la photo du restaurateur dans ce style. */
export function StylePicker({ draft, onChange, copy, locale, plate, preview, disabled, columns = 4, template = "plat-du-jour" }: { draft: { style: RestoStyleId }; onChange: (patch: { style: RestoStyleId }) => void; copy: RestoCopy; locale: Locale; plate: unknown; preview: (style: RestoStyleId) => VideoProps; disabled?: boolean; columns?: 4 | "panel"; template?: RestoTemplateId }) {
  const styles = stylesForPhoto(getRestoTemplate(template)!, { plate });
  return (
    <div className={cn("grid grid-cols-2 gap-3", columns === 4 ? "sm:grid-cols-4" : "2xl:grid-cols-4")}>
      {styles.map((id) => {
        const style = getRestoStyle(id)!;
        const selected = draft.style === id;
        const props = preview(id);
        const { width, height } = videoDimensions({ ...props, graph: { ...props.graph, resto: { ...props.graph.resto!, format: "PORTRAIT" } } });
        return (
          <button key={id} type="button" aria-pressed={selected} disabled={disabled} onClick={() => onChange({ style: id })}
            className={cn("group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-surface text-left transition-[border-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1", selected ? "border-violet-500 shadow-[0_0_0_4px_rgb(139_92_246/0.18),0_18px_40px_-18px_rgb(139_92_246/0.8)]" : "border-line hover:border-line-strong hover:shadow-lg")}>
            <div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
              <Thumbnail component={KinetikVideo} inputProps={{ ...props, graph: { ...props.graph, resto: { ...props.graph.resto!, format: "PORTRAIT" } } }} frameToDisplay={heroFrame(props)} durationInFrames={durationInFrames(props.graph)} fps={FPS} compositionWidth={width} compositionHeight={height} style={{ width: "100%", height: "100%" }} />
              <span className={cn("absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-violet-600 text-white shadow-lg transition-[opacity,transform] duration-300", selected ? "scale-100 opacity-100" : "scale-50 opacity-0")}><Check className="size-4" /></span>
              {style.premium3d && <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">{copy.threeD}</span>}
            </div>
            <span className="flex flex-col gap-0.5 px-3 py-2.5">
              <span className="text-sm font-semibold">{style.name}</span>
              <span className="text-xs leading-snug text-muted">{style.description[locale]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Schéma d'un téléphone : plein écran (story / Reel) ou dans le fil sous le nom du compte (post 4:5). */
function FormatSchema({ format, active }: { format: RestoFormatId; active: boolean }) {
  const stroke = "currentColor";
  return (
    <svg viewBox="0 0 72 128" className={cn("h-28 w-auto transition-colors", active ? "text-accent-text" : "text-subtle")} aria-hidden>
      <rect x="2" y="2" width="68" height="124" rx="12" fill="none" stroke={stroke} strokeWidth="2.5" />
      <rect x="28" y="7" width="16" height="3" rx="1.5" fill={stroke} opacity=".5" />
      {format === "PORTRAIT" ? (
        <>
          <rect x="7" y="14" width="58" height="104" rx="5" fill={stroke} opacity=".22" />
          {[0, 1, 2].map((i) => <rect key={i} x={10 + i * 18} y="18" width="16" height="1.8" rx=".9" fill={stroke} opacity={i === 0 ? 0.9 : 0.4} />)}
          <circle cx="14" cy="26" r="3" fill={stroke} opacity=".6" />
          <path d="M32 60 L44 67 L32 74 Z" fill={stroke} opacity=".9" />
          <rect x="11" y="106" width="40" height="7" rx="3.5" fill="none" stroke={stroke} strokeWidth="1.2" opacity=".6" />
        </>
      ) : (
        <>
          <circle cx="13" cy="21" r="4" fill={stroke} opacity=".55" />
          <rect x="20" y="19" width="22" height="2.5" rx="1.25" fill={stroke} opacity=".55" />
          <rect x="7" y="29" width="58" height="72.5" rx="2" fill={stroke} opacity=".22" />
          <path d="M32 58 L44 65 L32 72 Z" fill={stroke} opacity=".9" />
          {[0, 1, 2].map((i) => <circle key={i} cx={12 + i * 9} cy="108" r="2.6" fill="none" stroke={stroke} strokeWidth="1.2" opacity=".7" />)}
          <rect x="7" y="115" width="38" height="2.2" rx="1.1" fill={stroke} opacity=".4" />
        </>
      )}
    </svg>
  );
}

export function FormatPicker({ draft, onChange, copy, disabled }: { draft: { format: RestoFormatId }; onChange: (patch: { format: RestoFormatId }) => void; copy: RestoCopy; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {RESTO_FORMAT_IDS.map((id) => {
        const active = draft.format === id;
        return (
          <button key={id} type="button" aria-pressed={active} disabled={disabled} onClick={() => onChange({ format: id })}
            className={cn("relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 px-3 pt-4 pb-3 text-center transition-[border-color,background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5", active ? "border-violet-500 bg-violet-500/10 shadow-[0_0_0_4px_rgb(139_92_246/0.15)]" : "border-line hover:border-line-strong")}>
            {active && <Check className="absolute top-2.5 right-2.5 size-4 text-accent-text" aria-hidden />}
            <FormatSchema format={id} active={active} />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{copy.formats[id].label} <span className="font-mono text-xs font-normal text-muted">{copy.formats[id].ratio}</span></span>
              <span className="text-xs leading-snug text-muted">{copy.formats[id].hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

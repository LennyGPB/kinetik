"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Player } from "@remotion/player";
import { useReducedMotion } from "motion/react";
import { ArrowRight, Check, Coins, Sparkles } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { LOGO_MOTIONS, LOGO_MOTION_DURATIONS, getLogoMotion, type LogoMotionId } from "@/config/logo-motion";
import { getRecipe } from "@/config/recipes";
import { MUSIC_LIBRARY, getTrack } from "@/config/music";
import { CREDIT_COSTS } from "@/config/credits";
import { VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import { logoMotionGraph } from "@/lib/projects/logo-motion";
import { createLogoMotion } from "@/lib/projects/logo-motion-actions";
import { publishCreditBalance } from "@/components/app/live-credit-balance";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { LogoWordArt } from "@/remotion/video/logo-word";
import { DIMENSIONS, FPS, type VideoProps } from "@/remotion/props";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { ColorInput } from "./color-input";

export function LogoMotionCreate({ balance, initialAppName, initialStyleId }: { balance: number; initialAppName?: string; initialStyleId?: string }) {
  const t = useDictionary(), fr = t.locale === "fr", router = useRouter();
  const reduce = useReducedMotion();
  const initial = getLogoMotion(initialStyleId) ?? LOGO_MOTIONS[0];
  const [templateId, setTemplateId] = useState<LogoMotionId>(initial.id);
  const [text, setText] = useState(initialAppName ?? "Kinetik");
  const [colors, setColors] = useState<[string, string, string]>([...initial.palette]);
  const [format, setFormat] = useState<VideoFormatId>("SQUARE");
  const [duration, setDuration] = useState<4 | 6 | 8>(6);
  const [music, setMusic] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const request = useRef<{ key: string; id: string } | null>(null);
  const template = getLogoMotion(templateId)!;
  const props = useMemo<VideoProps>(() => {
    const value = text.trim() || template.sample;
    const graph = logoMotionGraph({ requestId: "00000000-0000-4000-8000-000000000000", text: value, templateId, format, duration, colors, musicTrackId: music, locale: t.locale });
    return { appName: value, locale: t.locale, format, palette: colors, recipe: getRecipe(templateId), graph, logoUrl: null, screenUrls: [], websiteUrl: null, musicSrc: music ? getTrack(music)?.src ?? null : null, watermark: false };
  }, [text, template.sample, templateId, format, duration, colors, music, t.locale]);
  const dimensions = DIMENSIONS[format];
  const create = () => startTransition(async () => {
    setError(null);
    const input = { text: text.trim(), templateId, format, duration, colors, musicTrackId: music, locale: t.locale };
    const key = JSON.stringify(input);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    const result = await createLogoMotion({ ...input, requestId: request.current.id }).catch(() => null);
    if (!result?.ok) { setError(result?.error === "insufficient_credits" ? fr ? "Tu n’as pas assez de crédits pour créer cette signature." : "You don’t have enough credits to create this signature." : result?.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error); return; }
    publishCreditBalance(result.balance);
    router.push(`/project/${result.id}`);
    router.refresh();
  });
  return <div className="space-y-7">
    <div><h1 className="text-2xl font-semibold sm:text-3xl">Signature</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{fr ? "Ton nom ou ta marque, animé comme un générique. Change le mot : le mouvement s’adapte tout seul." : "Your name or brand, animated like a title sequence. Change the word and the motion adapts."}</p></div>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
      <fieldset disabled={pending} className="min-w-0 space-y-7 disabled:opacity-60">
        <Field label={fr ? "Quel texte veux-tu animer ?" : "What text would you like to animate?"} htmlFor="logo-motion-text"><Input id="logo-motion-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={48} placeholder={fr ? "Ton nom, ta marque, un mot…" : "Your name, your brand, a word…"} className="h-14 text-lg" /><div className="mt-2 flex justify-between gap-3 text-xs text-muted"><span>{fr ? "Un nom court donne le meilleur résultat." : "A short name gives the best result."}</span><span className="tabular-nums">{text.length}/48</span></div></Field>
        <section className="space-y-3"><h2 className="text-sm font-semibold">{fr ? "Choisis ton animation" : "Choose your animation"}</h2><div className="grid grid-cols-3 gap-2.5">{LOGO_MOTIONS.map((item) => <button key={item.id} type="button" aria-pressed={templateId === item.id} onClick={() => { setTemplateId(item.id); setColors([...item.palette]); }} className={cn("group relative min-w-0 overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", templateId === item.id ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong")}>
          <div className="relative aspect-square overflow-hidden"><LogoWordArt template={item.id} text={item.sample} colors={[...item.palette]} time={1.5} duration={6} /></div><span className="block px-2.5 py-3 text-xs font-semibold">{item.name}</span>{templateId === item.id && <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-accent text-accent-fg"><Check className="size-3" /></span>}
        </button>)}</div><p className="text-xs leading-relaxed text-muted">{template.description[t.locale]}</p></section>
        <div className="grid gap-5 sm:grid-cols-2"><Field label={fr ? "Format" : "Format"} htmlFor="logo-motion-format"><select id="logo-motion-format" value={format} onChange={(event) => setFormat(event.target.value as VideoFormatId)} className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent">{(["SQUARE", "PORTRAIT", "LANDSCAPE"] as const).map((id) => <option key={id} value={id}>{VIDEO_FORMATS[id].ratio}</option>)}</select></Field><div className="space-y-2"><p className="text-sm font-medium">{fr ? "Durée" : "Duration"}</p><Segmented label={fr ? "Durée" : "Duration"} value={String(duration)} onChange={(value) => setDuration(Number(value) as 4 | 6 | 8)} options={LOGO_MOTION_DURATIONS.map((value) => ({ value: String(value), label: `${value} s` }))} /></div></div>
        <details className="border-t border-line pt-4"><summary className="cursor-pointer rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent">{fr ? "Personnaliser les couleurs et le son" : "Customize colors and sound"}</summary><div className="mt-4 space-y-4">{colors.map((color, index) => <ColorInput key={`${templateId}-${index}`} value={color} label={(fr ? ["Fond", "Texte / lumière", "Accent"] : ["Background", "Text / light", "Accent"])[index]} onChange={(value) => setColors((current) => current.map((item, i) => i === index ? value : item) as [string, string, string])} />)}<Field label={fr ? "Musique" : "Music"} htmlFor="logo-motion-music"><select id="logo-motion-music" value={music ?? "none"} onChange={(event) => setMusic(event.target.value === "none" ? null : event.target.value)} className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent"><option value="none">{fr ? "Sans musique" : "No music"}</option>{MUSIC_LIBRARY.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}</select></Field></div></details>
      </fieldset>
      <div className="min-w-0 space-y-4 lg:sticky lg:top-8"><div className="flex items-center justify-between gap-3 text-xs text-muted"><span>{fr ? "Aperçu en direct" : "Live preview"}</span><span>{template.name} · {duration} s</span></div><div className="mx-auto overflow-hidden rounded-2xl border border-line-strong bg-surface" style={{ maxWidth: format === "PORTRAIT" ? 320 : "100%" }}><Player key={`${templateId}-${duration}`} component={KinetikVideo} inputProps={props} compositionWidth={dimensions.width} compositionHeight={dimensions.height} durationInFrames={duration * FPS} fps={FPS} autoPlay={!reduce} loop controls initiallyMuted style={{ width: "100%", aspectRatio: `${dimensions.width}/${dimensions.height}` }} /></div>
        <p className="text-xs leading-relaxed text-muted">{fr ? "Après la création, tu pourras encore modifier le texte et exporter la vidéo." : "After creation, you can still edit the text and export the video."}</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button size="lg" variant="purple" className="w-full" loading={pending} disabled={!text.trim() || balance < CREDIT_COSTS.generation} onClick={create}><Sparkles />{fr ? "Créer ma signature" : "Create my signature"}<ArrowRight /></Button><p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-muted"><Coins className="size-3.5" />{CREDIT_COSTS.generation} {t.common.credits}<span>· {fr ? "Export facturé séparément" : "Export charged separately"}</span></p>
        {balance < CREDIT_COSTS.generation && <p className="text-center text-xs text-danger">{fr ? "Crédits insuffisants pour la création." : "Not enough credits to create."}</p>}
      </div>
    </div>
  </div>;
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Coins, FileText, Globe, Loader2, Megaphone, Play, RotateCcw, Sparkles, TrendingUp, Upload, Users } from "lucide-react";
import { Player } from "@remotion/player";
import Link, { useRouter } from "@/lib/i18n/navigation";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { format as formatText } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { publishCreditBalance } from "@/components/app/live-credit-balance";
import { CreationVoicePicker, type CreationVoice } from "./voiceover-picker";
import { pitchCopy } from "@/lib/pitch/copy";
import { PITCH_DURATIONS, pitchGraph, type PitchOptions, type PitchPlan } from "@/lib/pitch/model";
import { getPitchReview, createPitchMotion } from "@/lib/pitch/actions";
import { generateNarration } from "@/lib/projects/voiceover-actions";
import { voiceStatus } from "@/lib/projects/voiceover";
import { BRAND_FONTS } from "@/config/fonts";
import { CREDIT_COSTS, getVoiceoverCost } from "@/config/credits";
import { MUSIC_LIBRARY, getTrack } from "@/config/music";
import { buildVideoProps } from "@/lib/projects/video-props";
import { DIMENSIONS, FPS, durationInFrames, type VideoProps } from "@/remotion/props";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { cn } from "@/lib/utils";

type Review = NonNullable<Awaited<ReturnType<typeof getPitchReview>>>;
/** Formulaire en deux temps : on règle la source (étapes 1-4, puis analyse payante), puis on relit le résultat (étapes 5-8). */
const STEPS = ["source", "audience", "format", "analyze", "brand", "story", "sound", "create"] as const;
type Step = (typeof STEPS)[number];
const FIRST_REVIEW_STEP = STEPS.indexOf("brand");

/** Grande option cliquable (public, durée, format). */
function OptionCard({ active, onClick, icon, title, hint, children }: { active: boolean; onClick: () => void; icon?: ReactNode; title: string; hint?: string; children?: ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("group relative flex w-full min-w-0 items-start gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:p-5", active ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent),0_18px_40px_-24px_var(--accent-glow)]" : "border-line bg-surface hover:border-line-strong")}>
    {icon && <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl transition-colors", active ? "bg-accent text-accent-fg" : "bg-surface-2 text-accent-text")}>{icon}</span>}
    <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span>{hint && <span className="mt-1 block text-sm leading-relaxed text-muted">{hint}</span>}{children}</span>
    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border transition-colors", active ? "border-accent bg-accent text-accent-fg" : "border-line-strong")}>{active && <Check className="size-3" strokeWidth={3} />}</span>
  </button>;
}

export function PitchCreate({ balance: initialBalance, resumeProjectId }: { balance: number; resumeProjectId?: string }) {
  const t = useDictionary(), c = pitchCopy(t.locale), router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [stepIndex, setStepIndex] = useState(0), [direction, setDirection] = useState(1);
  const [sourceMode, setSourceMode] = useState<"pdf" | "url">("pdf");
  const [file, setFile] = useState<File | null>(null), [url, setUrl] = useState("");
  const [options, setOptions] = useState<PitchOptions>({ duration: 60, tone: "investors", locale: t.locale, format: "LANDSCAPE" });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [progress, setProgress] = useState(""), [readStep, setReadStep] = useState(0);
  const [review, setReview] = useState<Review | null>(null), [plan, setPlan] = useState<PitchPlan | null>(null);
  const [voice, setVoice] = useState<CreationVoice | null>(null);
  const [musicId, setMusicId] = useState<string | null>(MUSIC_LIBRARY[0]?.id ?? null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null), active = useRef(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const step: Step = STEPS[stepIndex];
  useEffect(() => {
    if (!resumeProjectId) return;
    let cancelled = false;
    void getPitchReview(resumeProjectId).then((r) => { if (cancelled) return; if (!r) { setError(c.resumeFailed); return; } setReview(r); setPlan(r.plan); setOptions(r.metadata.options); setBalance(r.balance); setStepIndex(FIRST_REVIEW_STEP); }).catch(() => { if (!cancelled) setError(c.resumeFailed); });
    return () => { cancelled = true; };
  }, [resumeProjectId, c.resumeFailed]);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  // Pendant l'analyse, les trois étapes de lecture s'allument l'une après l'autre (indicatif : l'API ne renvoie pas d'avancement)
  useEffect(() => {
    if (!busy || plan) return;
    const timer = window.setInterval(() => setReadStep((value) => Math.min(2, value + 1)), 9000);
    return () => { window.clearInterval(timer); setReadStep(0); };
  }, [busy, plan]);

  function go(delta: number) {
    setError(""); setDirection(delta);
    setStepIndex((i) => Math.min(STEPS.length - 1, Math.max(plan ? FIRST_REVIEW_STEP : 0, i + delta)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function jump(target: Step) { setError(""); setDirection(-1); setStepIndex(STEPS.indexOf(target)); }
  function restart() { setReview(null); setPlan(null); setCreatedId(null); setError(""); setDirection(-1); setStepIndex(0); }
  const sourceReady = sourceMode === "pdf" ? Boolean(file) : /^https?:\/\//.test(url.trim());
  function next() {
    if (step === "source" && !sourceReady) { setError(c.sourceError); return; }
    if (step === "analyze") return void analyze();
    if (step === "create") return void create();
    go(1);
  }

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".pdf") || nextFile.size > 10 * 1024 * 1024) { setError(c.pageError); return; }
    setFile(nextFile); setError("");
  }
  async function analyze() {
    if (active.current) return;
    if (!sourceReady) { setError(c.sourceError); return; }
    active.current = true; setBusy(true); setError("");
    const signature = JSON.stringify([sourceMode, file?.name, file?.size, file?.lastModified, url, options]);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    try {
      const form = new FormData(); form.set("requestId", request.current.id); form.set("options", JSON.stringify(options));
      if (sourceMode === "pdf" && file) form.set("file", file); else form.set("url", url.trim());
      const response = await fetch("/api/pitch/analyze", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) { request.current = null; setError(result.error === "insufficient_content" ? c.shortSource : result.error === "insufficient_credits" ? c.low : result.error === "rate_limited" ? c.rate : ["invalid_pdf", "pdf_page_limit", "source_too_large"].includes(result.error) ? c.pageError : c.error); return; }
      const r = await getPitchReview(result.projectId);
      if (!r) throw new Error();
      setReview(r); setPlan(r.plan); setBalance(r.balance); publishCreditBalance(r.balance);
      setDirection(1); setStepIndex(FIRST_REVIEW_STEP); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setError(c.recover); }
    finally { active.current = false; setBusy(false); }
  }
  async function create() {
    if (active.current || !review || !plan) return;
    active.current = true; setBusy(true); setError(""); setProgress(c.creating);
    let motionCreated = false;
    try {
      const result = await createPitchMotion(review.projectId, { plan, voiceId: voice?.voiceId || null, musicTrackId: musicId });
      if (!result.ok) { setError(result.error === "insufficient_credits" ? c.low : c.error); return; }
      setCreatedId(result.projectId); setBalance(result.balance); publishCreditBalance(result.balance);
      motionCreated = true;
      let version = result.version;
      if (voice) {
        for (const [index, segment] of (version.graph.voiceover?.segments ?? []).entries()) {
          if (!segment.text.trim() || voiceStatus(version.graph, segment.sceneId) === "ready") continue;
          setProgress(`${c.generating} ${index + 1}/${plan.scenes.length}`);
          const audio = await generateNarration(result.projectId, version.id, version.graph.voiceover!, crypto.randomUUID(), segment.sceneId);
          if (!audio.ok) { setError(c.audioFailed); return; }
          version = audio.version; setBalance(audio.balance); publishCreditBalance(audio.balance);
        }
      }
      router.push(`/project/${result.projectId}`);
    } catch { setError(motionCreated ? c.audioFailed : c.recover); }
    finally { active.current = false; setBusy(false); setProgress(""); }
  }

  const audioCost = voice && plan ? plan.scenes.reduce((sum, s) => sum + getVoiceoverCost(s.narration), 0) : 0;
  const cost = CREDIT_COSTS.pitch.creation + audioCost;
  const stepCost = plan ? cost : CREDIT_COSTS.pitch.analysis;
  const fieldClass = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm outline-none focus:border-accent";
  const titles: Record<Step, [string, string]> = {
    source: [c.stepSource, c.sourceHelp], audience: [c.stepAudience, c.audienceHelp], format: [c.stepFormat, c.formatHelp], analyze: [c.stepAnalyze, c.analyzeHelp],
    brand: [c.stepBrand, c.brandHelp], story: [c.stepStory, c.storyHelp], sound: [c.stepSound, c.soundHelp], create: [c.stepCreate, c.createHelp],
  };
  const formats = [{ value: "LANDSCAPE", label: c.landscape, use: c.landscapeUse, shape: "h-7 w-12" }, { value: "PORTRAIT", label: c.portrait, use: c.portraitUse, shape: "h-12 w-7" }, { value: "SQUARE", label: c.square, use: c.squareUse, shape: "size-10" }] as const;
  const formatLabel = formats.find((f) => f.value === options.format);
  const sourceLabel = sourceMode === "pdf" ? file?.name : url.trim();

  const preview = review && plan ? (() => {
    const track = getTrack(musicId), screens = Object.fromEntries(review.assets.filter((a) => a.type === "SCREEN").map((a) => [a.fileName.replace(/\.png$/, ""), a.url]));
    const graph = pitchGraph(plan, review.metadata, screens, track ? { id: track.id, bpm: track.bpm, beatOffset: track.beatOffset ?? 0 } : null);
    const props: VideoProps = buildVideoProps({ appName: plan.company, format: options.format, locale: options.locale, styleId: "veil", colors: plan.brand.colors,
      logoUrl: review.assets.find((a) => a.type === "LOGO")?.url ?? null, screenUrls: Object.values(screens), screenRatios: [], websiteUrl: null, musicSrc: track?.src ?? null }, graph, true);
    return <Player component={KinetikVideo} inputProps={props} durationInFrames={durationInFrames(graph)} fps={FPS} compositionWidth={DIMENSIONS[options.format].width} compositionHeight={DIMENSIONS[options.format].height} controls loop initiallyMuted style={{ width: "100%", aspectRatio: `${DIMENSIONS[options.format].width}/${DIMENSIONS[options.format].height}`, maxHeight: 420 }} />;
  })() : null;

  const content = (() => {
    switch (step) {
      case "source": return <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard active={sourceMode === "pdf"} onClick={() => setSourceMode("pdf")} icon={<FileText className="size-5" />} title={c.pdf} hint={c.limits} />
          <OptionCard active={sourceMode === "url"} onClick={() => setSourceMode("url")} icon={<Globe className="size-5" />} title={c.link} hint={c.url} />
        </div>
        {sourceMode === "pdf" ? <div><input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label={c.pdf} onChange={(e) => chooseFile(e.target.files?.[0])} />
          <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files[0]); }} className={cn("flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent", file ? "border-accent/60 bg-accent-soft/60" : "border-line-strong bg-surface-2/40 hover:border-accent")}>
            <span className={cn("grid size-14 place-items-center rounded-2xl", file ? "bg-accent text-accent-fg" : "bg-accent-soft text-accent-text")}>{file ? <Check className="size-6" /> : <Upload className="size-6" />}</span>
            <span className="max-w-full break-words text-base font-semibold">{file?.name ?? c.drop}</span>
            <span className="text-sm text-accent-text">{file ? c.replace : c.browse}</span>
          </button></div>
          : <Field label={c.url} htmlFor="pitch-url"><Input id="pitch-url" type="url" inputMode="url" placeholder="https://…" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") next(); }} /></Field>}
        <p className="text-xs leading-relaxed text-muted">{c.sourceHint}</p>
      </div>;
      case "audience": return <div className="grid gap-3">
        {([["investors", <TrendingUp key="i" className="size-5" />, c.investorsHint], ["customers", <Users key="c" className="size-5" />, c.customersHint], ["social", <Megaphone key="s" className="size-5" />, c.socialHint]] as const).map(([tone, icon, hint]) =>
          <OptionCard key={tone} active={options.tone === tone} onClick={() => setOptions({ ...options, tone })} icon={icon} title={c[tone]} hint={hint} />)}
      </div>;
      case "format": return <div className="space-y-8">
        <div><h3 className="mb-3 text-sm font-medium">{c.duration}</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PITCH_DURATIONS.map((duration) => { const on = options.duration === duration; return <button key={duration} type="button" aria-pressed={on} onClick={() => setOptions({ ...options, duration })} className={cn("rounded-2xl border p-4 text-left transition-[border-color,background-color] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent", on ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]" : "border-line bg-surface hover:border-line-strong")}>
            <span className="block text-2xl font-semibold tabular-nums">{duration}<span className="ml-0.5 text-sm font-normal text-muted">s</span></span>
            <span className="mt-1 block text-xs text-muted">{c[`d${duration}` as "d30"]}</span>
          </button>; })}
        </div></div>
        <div><h3 className="mb-3 text-sm font-medium">{c.format}</h3><div className="grid gap-3 sm:grid-cols-3">
          {formats.map((item) => { const on = options.format === item.value; return <button key={item.value} type="button" aria-pressed={on} onClick={() => setOptions({ ...options, format: item.value })} className={cn("flex flex-col items-start gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:p-5", on ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]" : "border-line bg-surface hover:border-line-strong")}>
            <span className="grid h-14 w-full place-items-center"><span className={cn("rounded-md border-2 transition-colors", item.shape, on ? "border-accent-text bg-accent/20" : "border-line-strong")} /></span>
            <span><span className="block font-semibold">{item.label} <span className="font-mono text-xs font-normal text-muted">{item.value === "LANDSCAPE" ? "16:9" : item.value === "PORTRAIT" ? "9:16" : "1:1"}</span></span><span className="mt-1 block text-xs text-muted">{item.use}</span></span>
          </button>; })}
        </div></div>
      </div>;
      case "analyze": return busy ? <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8" role="status">
        <p className="text-lg font-semibold">{c.analyzing}</p><p className="mt-2 text-sm leading-relaxed text-muted">{c.analysisHelp}</p>
        <ol className="mt-6 space-y-4">{[c.readStep1, c.readStep2, c.readStep3].map((label, i) => <li key={label} className={cn("flex items-center gap-3 text-sm transition-colors", i <= readStep ? "text-fg" : "text-muted")}>
          <span className={cn("grid size-7 place-items-center rounded-full", i < readStep ? "bg-accent text-accent-fg" : i === readStep ? "bg-accent-soft text-accent-text" : "bg-surface-2")}>{i < readStep ? <Check className="size-3.5" strokeWidth={3} /> : i === readStep ? <Loader2 className="size-3.5 animate-spin" /> : <span className="text-xs">{i + 1}</span>}</span>{label}
        </li>)}</ol>
      </div> : <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {([["source", c.stepSource, sourceLabel], ["audience", c.stepAudience, c[options.tone]], ["format", c.stepFormat, `${options.duration} s · ${formatLabel?.label}`]] as const).map(([target, label, value]) => <div key={target} className="flex items-center gap-4 px-5 py-4">
          <span className="w-32 shrink-0 text-sm text-muted">{label}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{value}</span>
          <button type="button" onClick={() => jump(target)} className="shrink-0 text-xs font-medium text-accent-text hover:underline">{c.edit}</button>
        </div>)}
        <div className="flex items-center gap-3 px-5 py-4 text-sm"><Coins className="size-4 text-accent-text" /><span className="flex-1 text-muted">{c.analysisCost}</span><span className="font-semibold tabular-nums">{CREDIT_COSTS.pitch.analysis} {t.common.credits}</span></div>
      </div>;
      case "brand": return plan && <div className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{c.brand}</h3><span className="truncate text-xs text-muted">{review?.metadata.sourceName}</span></div>
        <Field label={c.company} htmlFor="pitch-company"><Input id="pitch-company" value={plan.company} maxLength={40} onChange={(e) => setPlan({ ...plan, company: e.target.value })} /></Field>
        <div><p className="mb-2 text-sm font-medium">{c.colors}</p><div className="flex gap-3">{plan.brand.colors.map((color, i) => <label key={i} className="flex flex-col items-center gap-1.5 text-xs text-muted"><input type="color" aria-label={`${c.colors} ${i + 1}`} value={color} onChange={(e) => setPlan({ ...plan, brand: { ...plan.brand, colors: plan.brand.colors.map((v, index) => index === i ? e.target.value : v) } })} className="size-12 cursor-pointer rounded-xl border border-line bg-surface p-1" /><span className="font-mono">{color}</span></label>)}</div></div>
        <div className="grid gap-3 sm:grid-cols-2">{(["heading", "body"] as const).map((key) => <label key={key} className="flex flex-col gap-2 text-sm font-medium">{c[key]}<select className={fieldClass} value={plan.brand[key]} onChange={(e) => setPlan({ ...plan, brand: { ...plan.brand, [key]: e.target.value } })}>{BRAND_FONTS.map((font) => <option key={font}>{font}</option>)}</select></label>)}</div>
        <p className="text-xs leading-relaxed text-muted">{c.detected} : {plan.brand.detectedHeading} / {plan.brand.detectedBody}. {plan.brand.fontNote}</p>
      </div>;
      case "story": return plan && <div className="space-y-5">
        {plan.warnings.length > 0 && <section className="rounded-2xl border border-line-strong bg-surface-2 p-5"><h3 className="mb-2 text-sm font-semibold">{c.warnings}</h3><ul className="list-disc space-y-2 pl-5 text-sm text-muted">{plan.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></section>}
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface px-5">{plan.scenes.map((scene, index) => <details key={scene.id} open={index === 0} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-accent"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{scene.title}</span><span className="hidden text-xs text-accent-text sm:inline">{c[scene.visual]}</span><span className="text-xs text-muted tabular-nums">{scene.duration.toFixed(1)} s</span><ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
          <div className="mt-5 space-y-4"><Field label={c.titleLabel} htmlFor={`title-${scene.id}`}><Input id={`title-${scene.id}`} value={scene.title} maxLength={80} onChange={(e) => setPlan({ ...plan, scenes: plan.scenes.map((s) => s.id === scene.id ? { ...s, title: e.target.value } : s) })} /></Field><Field label={c.subtitle} htmlFor={`subtitle-${scene.id}`}><Input id={`subtitle-${scene.id}`} value={scene.subtitle} maxLength={160} onChange={(e) => setPlan({ ...plan, scenes: plan.scenes.map((s) => s.id === scene.id ? { ...s, subtitle: e.target.value } : s) })} /></Field><Field label={c.narration} htmlFor={`narration-${scene.id}`}><Textarea id={`narration-${scene.id}`} value={scene.narration} rows={3} maxLength={800} onChange={(e) => setPlan({ ...plan, scenes: plan.scenes.map((s) => s.id === scene.id ? { ...s, narration: e.target.value } : s) })} /></Field><p className="text-xs font-medium text-accent-text">{c.evidence} · {scene.source}</p><blockquote className="border-l-2 border-line-strong pl-3 text-xs leading-relaxed text-muted">{scene.evidence}</blockquote></div>
        </details>)}</div>
      </div>;
      case "sound": return <div className="space-y-6">
        <CreationVoicePicker value={voice} onChange={setVoice} />
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6"><label className="flex flex-col gap-2 text-sm font-medium">{c.music}<select className={fieldClass} value={musicId ?? ""} onChange={(e) => setMusicId(e.target.value || null)}><option value="">{c.none}</option>{MUSIC_LIBRARY.map((track) => <option value={track.id} key={track.id}>{track.title}</option>)}</select></label></div>
      </div>;
      case "create": return <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface lg:hidden">{preview}</div>
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {([["brand", c.stepBrand, plan?.company], ["story", c.stepStory, `${plan?.scenes.length ?? 0} ${c.scenes}`], ["sound", c.stepSound, `${voice?.voiceName || t.voiceover.withoutVoice} · ${getTrack(musicId)?.title ?? c.none}`]] as const).map(([target, label, value]) => <div key={target} className="flex items-center gap-4 px-5 py-4">
            <span className="w-32 shrink-0 text-sm text-muted">{label}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{value}</span>
            <button type="button" onClick={() => jump(target)} className="shrink-0 text-xs font-medium text-accent-text hover:underline">{c.edit}</button>
          </div>)}
          <div className="px-5 py-4"><div className="flex items-center gap-3 text-sm"><Coins className="size-4 text-accent-text" /><span className="flex-1 text-muted">{c.cost}</span><span className="font-semibold tabular-nums">{cost} {t.common.credits}</span></div><p className="mt-2 text-xs leading-relaxed text-muted">{`${CREDIT_COSTS.pitch.creation} ${c.motionCost}${voice ? ` + ${audioCost} ${c.audioCost}` : ""}. ${c.reviewCost}`}{voice && ` ${c.captions}`}</p></div>
        </div>
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" />{progress}</p>}
      </div>;
    }
  })();

  return <div className="mx-auto max-w-6xl py-5 sm:py-8">
    {/* En-tête + progression */}
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0"><p className="text-sm font-medium text-accent-text">{formatText(c.step, { current: stepIndex + 1, total: STEPS.length })}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{titles[step][0]}</h1></div>
      <Badge tone="accent" className="shrink-0 py-1"><Coins className="size-3.5" /> {balance} {t.common.credits}</Badge>
    </div>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{titles[step][1]}</p>
    <div className="mt-5 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1} aria-label={c.title}>
      {STEPS.map((id, i) => <button key={id} type="button" disabled={busy || i >= stepIndex || (plan ? i < FIRST_REVIEW_STEP : false)} onClick={() => jump(id)} aria-label={titles[id][0]} className={cn("h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3 disabled:cursor-default", i === FIRST_REVIEW_STEP && "ml-2")}>
        <motion.span className="block h-full origin-left rounded-full bg-accent-gradient" initial={false} animate={{ scaleX: i <= stepIndex ? 1 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} />
      </button>)}
    </div>

    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <fieldset disabled={busy || Boolean(createdId)} className="min-w-0">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div key={step} custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: d * 40 }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: d * -40 }) }} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              {content}
            </motion.div>
          </AnimatePresence>
        </fieldset>

        {error && <div role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}{createdId && <Link href={`/project/${createdId}`} className="ml-2 font-semibold underline">{c.open}</Link>}</div>}
        {!review && resumeProjectId && !error && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" />{c.resume}</p>}

        {/* Navigation */}
        <div className="glass sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mt-8 flex items-center justify-between gap-3 rounded-full border border-line p-1.5 shadow-[var(--shadow-lift)] lg:bottom-6">
          {stepIndex === FIRST_REVIEW_STEP ? <Button variant="ghost" disabled={busy} onClick={restart}><RotateCcw />{c.changeSource}</Button>
            : stepIndex > 0 ? <Button variant="ghost" disabled={busy} onClick={() => go(-1)}><ArrowLeft />{t.common.back}</Button> : <span />}
          <Button variant="purple" loading={busy} disabled={Boolean(createdId) || ((step === "analyze" || step === "create") && balance < stepCost) || (step === "create" && Boolean(voice && !voice.voiceId))} onClick={next}>
            {step === "analyze" ? <><Sparkles />{busy ? c.analyzing : `${c.analyze} · ${CREDIT_COSTS.pitch.analysis}`}</> : step === "create" ? <><Sparkles />{busy ? progress || c.creating : `${c.create} · ${cost}`}</> : <>{c.next}<ArrowRight /></>}
          </Button>
        </div>
        {createdId && <Link href={`/project/${createdId}`} className="mt-4 block text-center text-sm font-medium text-accent-text underline">{c.open}</Link>}
      </div>

      {/* Colonne de droite : le fil type avant l'analyse, l'aperçu réel ensuite */}
      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <div className="overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-[var(--shadow-lift)]">
          {preview ? <>{preview}<div className="border-t border-line p-5"><h2 className="text-sm font-semibold">{c.preview}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{plan?.summary}</p></div></>
            : <div className="p-6"><div className="mb-6 flex items-center gap-3 text-muted"><FileText className="size-5" /><span className="h-px flex-1 bg-gradient-to-r from-line-strong to-accent/60" /><Play className="size-5 text-accent-text" /><span className="text-sm tabular-nums">{options.duration} s</span></div>
              <h2 className="mb-4 text-xl font-semibold">{c.example}</h2>
              {[c.exampleProblem, c.exampleSolution, c.exampleTraction, c.exampleCta].map((label, i) => <div key={label} className="flex items-center gap-4 border-t border-line py-3.5"><span className="grid size-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text">{i + 1}</span><span className="flex-1 text-sm font-medium">{label}</span><Check className="size-4 text-accent-text" /></div>)}
              <div className="mt-4 flex flex-wrap gap-2"><Badge>{c[options.tone]}</Badge><Badge>{formatLabel?.label}</Badge>{sourceLabel && <Badge className="max-w-full truncate">{sourceMode === "pdf" ? c.pdfChosen : c.linkChosen}</Badge>}</div>
              <p className="mt-5 text-xs leading-relaxed text-muted">{c.noFacts}</p></div>}
        </div>
      </aside>
    </div>
  </div>;
}

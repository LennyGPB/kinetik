"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Globe, Loader2, RotateCcw } from "lucide-react";
import { UrlStepNavigation } from "./url-step-navigation";
import { Button } from "@/components/ui/button";
import { publishCreditBalance } from "@/components/app/live-credit-balance";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { CREDIT_COSTS } from "@/config/credits";
import { uploadFile, type UploadedFile } from "@/lib/storage/client";
import { ReviewSchema, UrlPreferencesSchema, type UrlAnalysis, type UrlPreferences, type UrlReview } from "@/lib/url-video/model";
import { normalizeSiteUrl, reviewFromAnalysis, validUrlStep } from "@/lib/url-video/flow";
import { urlVideoCopy } from "@/lib/url-video/copy";
import { urlFlowCopy } from "@/lib/url-video/flow-copy";
import { cn } from "@/lib/utils";
/** Une seule vidéo par site (même valeur que côté serveur). */
const URL_VIDEO_COUNT = 1;
import { UrlSourceStep, UrlTemplateStep, UrlMusicStep, UrlMessageStep, UrlAssetsStep, UrlFinalStep, UrlProposalResults, UrlAnalysisProgress, type Milestone, type UrlResult } from "./url-video-steps";

/** Ordre des étapes. L'analyse du site tourne pendant le choix du style et de la musique. */
const STEP = { source: 0, template: 1, music: 2, message: 3, assets: 4, final: 5 } as const;
const LAST_STEP = STEP.final;

async function readEvents(response: Response, receive: (event: Record<string, unknown>) => void) {
  if (!response.ok) throw new Error((await response.json()).error ?? "default");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("network");
  const decoder = new TextDecoder();
  let pending = "", terminal = false;
  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "complete" || event.type === "error") terminal = true;
      receive(event);
    }
    if (done) break;
  }
  if (!terminal) throw new Error("network");
}

export function UrlVideoCreate({ balance: initialBalance, initialAnalysisId }: { balance: number; initialAnalysisId?: string }) {
  const locale = useDictionary().locale;
  const c = urlVideoCopy[locale], f = urlFlowCopy[locale];
  const [step, setStep] = useState(0), [furthest, setFurthest] = useState(0);
  const [url, setUrl] = useState("");
  const [preferences, setPreferencesState] = useState<UrlPreferences>({ templateId: null, music: null });
  const preferencesRef = useRef(preferences);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<UrlAnalysis | null>(null);
  const [review, setReview] = useState<UrlReview | null>(null);
  const [result, setResult] = useState<UrlResult | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [busy, setBusy] = useState<"analysis" | "generation" | null>(null);
  const [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(initialAnalysisId));
  const [error, setError] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const abort = useRef<AbortController | null>(null), alive = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); }; }, []);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (heading.current && heading.current.getBoundingClientRect().top < 0) {
      heading.current.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }, [step]);

  const changePreferences = useCallback((next: UrlPreferences) => {
    preferencesRef.current = next;
    setPreferencesState(next);
    setReview((current) => current ? { ...current, ...next } : current);
  }, []);

  const applyResult = useCallback((data: UrlResult) => {
    const nextPreferences = UrlPreferencesSchema.parse(data.review ?? data.analysis.preferences ?? {});
    changePreferences(nextPreferences);
    setPendingId(null);
    setResult(data); setAnalysis(data.analysis); setUrl(data.analysis.url);
    setBalance(data.balance); publishCreditBalance(data.balance);
    setReview(data.review ?? reviewFromAnalysis(data.analysisId, data.analysis, nextPreferences));
  }, [changePreferences]);

  const restore = useCallback(async (id: string) => {
    const snapshot = await fetch(`/api/url-video/analyze?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const state = await snapshot.json();
    if (!snapshot.ok) throw new Error(state.error ?? "default");
    if (!alive.current) return;
    if (state.pending) {
      setPendingId(id); setUrl(state.url);
      const next = UrlPreferencesSchema.parse(state.preferences ?? {});
      changePreferences(next);
      return;
    }
    const response = await fetch(`/api/url-video/proposals?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "default");
    if (alive.current) applyResult(data);
  }, [applyResult, changePreferences]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("analysis") ?? (params.has("flow") ? null : initialAnalysisId);
    if (!id) return;
    setRestoring(true);
    void restore(id).then(() => {
      if (!alive.current) return;
      const saved = Number(params.get("urlStep") ?? 1);
      const next = Number.isInteger(saved) && saved >= 0 && saved <= LAST_STEP ? saved : 1;
      setStep(next); setFurthest(next);
    }).catch((e) => { if (alive.current) setError(e.message); }).finally(() => { if (alive.current) setRestoring(false); });
  }, [initialAnalysisId, restore]);

  const generating = result?.proposals.some((p) => p.status === "GENERATING") ?? false;
  const locked = Boolean(result?.occupiedSlots);
  useEffect(() => {
    if (!generating || !review) return;
    const timer = setInterval(() => { void restore(review.analysisId).catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [generating, review?.analysisId, restore]);

  function remember(id: string, currentStep?: number) {
    const next = new URL(window.location.href);
    next.searchParams.set("flow", "url"); next.searchParams.set("analysis", id);
    if (currentStep !== undefined) next.searchParams.set("urlStep", String(currentStep));
    window.history.replaceState(null, "", next);
  }
  function go(next: number) {
    setStep(next); setFurthest((n) => Math.max(n, next)); setError("");
    const id = review?.analysisId ?? pendingId;
    if (id) remember(id, next);
  }
  function progress(event: Record<string, unknown>) {
    setMilestones((items) => [...items.filter((item) => item.stage !== event.stage), { stage: String(event.stage), count: typeof event.count === "number" ? event.count : undefined }]);
  }
  async function analyze() {
    if (busy) return;
    setBusy("analysis"); setError(""); setMilestones([]); abort.current = new AbortController();
    const startedWith = JSON.stringify(preferencesRef.current);
    try {
      const normalized = normalizeSiteUrl(url);
      await readEvents(await fetch("/api/url-video/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: normalized, locale, preferences: preferencesRef.current, ...(pendingId && { analysisId: pendingId }) }), signal: abort.current.signal }), (event) => {
        if (!alive.current) return;
        if (event.type === "progress") progress(event);
        if (event.type === "extracted") { setPendingId(String(event.analysisId)); remember(String(event.analysisId), 1); }
        if (event.type === "error") setError(String(event.error));
        if (event.type === "complete") {
          const found = event.analysis as UrlAnalysis;
          setPendingId(null); setAnalysis(found); setUrl(found.url); setResult(null);
          setReview(reviewFromAnalysis(String(event.analysisId), found, preferencesRef.current));
          remember(String(event.analysisId), 1);
          // Style ou musique changés pendant l'analyse : on les enregistre pour la reprise
          if (JSON.stringify(preferencesRef.current) !== startedWith) {
            void fetch("/api/url-video/analyze", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: String(event.analysisId), preferences: preferencesRef.current }) }).catch(() => {});
          }
        }
      });
    } catch (e) { if (alive.current) setError(e instanceof TypeError ? "network" : e instanceof Error ? e.message : "default"); }
    finally { if (alive.current) setBusy(null); }
  }

  async function savePreferences() {
    const id = review?.analysisId ?? pendingId;
    if (!id) return;
    const response = await fetch("/api/url-video/analyze", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisId: id, preferences: preferencesRef.current }) });
    if (!response.ok) throw new Error((await response.json()).error ?? "default");
  }
  async function generate() {
    if (!review || busy || generating) return;
    const input = ReviewSchema.parse({ ...review, ...preferencesRef.current });
    setBusy("generation"); setError(""); setMilestones([]); abort.current = new AbortController();
    try {
      await readEvents(await fetch("/api/url-video/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: abort.current.signal }), (event) => {
        if (!alive.current) return;
        if (event.type === "progress") progress(event);
        if (event.type === "error") setError(String(event.error));
        if (event.type === "result" || event.type === "complete") applyResult(event as unknown as UrlResult);
      });
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "network"); }
    finally { if (alive.current) { setBusy(null); void restore(review.analysisId).catch(() => {}); } }
  }
  /** L'étape est-elle complète ? Le style et la musique n'attendent pas la fin de l'analyse. */
  function stepValid(index: number) {
    if (index === STEP.source) return Boolean(url.trim());
    if (index === STEP.template) return Boolean(preferences.templateId);
    if (index === STEP.music) return true;
    if (index === STEP.message) return validUrlStep(2, review, preferences);
    if (index === STEP.assets) return validUrlStep(3, review, preferences);
    return validUrlStep(4, review, preferences);
  }
  async function next() {
    if (uploading || saving || busy === "generation") return;
    if (busy === "analysis" && step === STEP.source) return;
    if (step === STEP.source) {
      if (!url.trim() || busy) return;
      try { normalizeSiteUrl(url); } catch { setError("invalid_url"); return; }
      if (!analysis) { go(STEP.template); void analyze(); return; }
    } else if (!stepValid(step)) return;
    if (step === LAST_STEP) { void generate(); return; }
    if (step <= STEP.music && analysis) {
      setSaving(true); setError("");
      try { await savePreferences(); go(step + 1); }
      catch (e) { setError(e instanceof Error ? e.message : "default"); }
      finally { setSaving(false); }
    } else go(step + 1);
  }
  function changeUrl(value: string) {
    setUrl(value); setPendingId(null); setAnalysis(null); setReview(null); setResult(null); setMilestones([]); setError(""); setFurthest(0);
    const next = new URL(window.location.href); next.searchParams.delete("analysis"); next.searchParams.delete("urlStep"); window.history.replaceState(null, "", next);
  }
  function reset() {
    changeUrl(""); changePreferences({ music: null, templateId: null }); setStep(0);
  }
  async function addLogo(file: File) {
    setUploading(true); setError("");
    try { const logo = await uploadFile(file, "image"); if (alive.current) setReview((current) => current ? { ...current, logo } : current); }
    catch { setError("default"); }
    finally { if (alive.current) setUploading(false); }
  }
  function addScreens(files: UploadedFile[]) {
    setReview((current) => current ? { ...current, screens: [...current.screens, ...files.filter((file) => !current.screens.some((screen) => screen.url === file.url))].slice(0, 8) } : current);
    setAnalysis((current) => current ? { ...current, screens: [...current.screens, ...files.filter((file) => !current.screens.some((screen) => screen.url === file.url)).map((file) => ({ ...file, label: file.fileName.slice(0, 80), source: current.url, format: "app" as const }))].slice(0, 24) } : current);
  }

  const remaining = Math.max(0, URL_VIDEO_COUNT - (result?.occupiedSlots ?? 0)), cost = remaining * CREDIT_COSTS.generation;
  // L'analyse en cours ne bloque que l'étape du site : elle tourne en fond pendant le style et la musique
  const disabled = uploading || saving || busy === "generation" || (busy === "analysis" && step === STEP.source) || !stepValid(step) || (step === LAST_STEP && balance < cost);
  const noMusic = !preferences.music && !preferences.musicTrackId;
  const nextLabel = saving ? f.saving : step === STEP.music && noMusic ? f.skipMusic : f.nextLabels[step] ?? f.next;
  const common = review ? { locale, review, onChange: setReview } : null;
  const errorMessage = c.errors[error as keyof typeof c.errors] ?? c.errors.default;

  if (restoring) return <div role="status" className="mx-auto flex max-w-4xl items-center gap-3 py-16 text-sm text-muted"><Loader2 className="size-5 animate-spin motion-reduce:animate-none" />{c.restoring}</div>;
  return <div className="mx-auto max-w-4xl pb-4 pt-2 sm:pt-5" onKeyDown={(e) => { if (step === 0 && e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type !== "file") { e.preventDefault(); void next(); } }}>
    {!locked && <UrlStepNavigation locale={locale} step={step} furthest={furthest} disabled={busy === "generation" || saving || uploading} onSelect={go} />}
    <div className={cn(!locked && step !== STEP.template && step !== STEP.assets && "mx-auto max-w-2xl")}>
    <header className="mb-7 sm:mb-9">
      <h1 ref={heading} tabIndex={-1} className="scroll-mt-8 text-balance text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">{locked ? generating || busy === "generation" ? f.generating : c.choices : f.titles[step]}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{locked ? generating || busy === "generation" ? f.generatingHelp : f.resultsHelp : f.descriptions[step]}</p>
      {analysis && !locked && step >= STEP.message && <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted"><Globe className="size-3.5" aria-hidden /><span>{new URL(analysis.url).hostname}</span></div>}
    </header>
    {error && <div role="alert" className="mb-6 rounded-xl border border-danger/35 bg-surface px-5 py-4"><p className="text-sm leading-relaxed text-fg">{errorMessage}</p>{!analysis && !busy && step > STEP.source && <Button variant="outline" size="sm" className="mt-3" onClick={() => void analyze()}>{pendingId ? c.retryBrief : f.retryAnalysis}</Button>}</div>}

    {locked && result && review ? <>
      <UrlProposalResults locale={locale} result={result} review={review} />
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><Button variant="ghost" disabled={Boolean(busy) || generating} onClick={reset}><RotateCcw className="size-4" />{f.startOver}</Button>{remaining > 0 && <Button variant="purple" loading={busy === "generation"} disabled={Boolean(busy) || generating || balance < cost} onClick={() => void generate()}>{f.resume} · {cost} {c.credits}</Button>}</div>
    </> : <>
      {step === STEP.source && <UrlSourceStep locale={locale} url={url} onUrl={changeUrl} disabled={Boolean(busy)} />}
      {step === STEP.template && <><UrlAnalysisProgress locale={locale} busy={busy === "analysis"} ready={Boolean(analysis)} milestones={milestones} failed={Boolean(error)} /><UrlTemplateStep locale={locale} preferences={preferences} onPreferences={changePreferences} /></>}
      {step === STEP.music && <><UrlAnalysisProgress locale={locale} busy={busy === "analysis"} ready={Boolean(analysis)} milestones={milestones} failed={Boolean(error)} /><UrlMusicStep locale={locale} preferences={preferences} onPreferences={changePreferences} onUploading={setUploading} disabled={busy === "generation"} /></>}
      {step === STEP.message && common && <UrlMessageStep {...common} />}
      {step === STEP.assets && common && analysis && <UrlAssetsStep {...common} analysis={analysis} onAddScreens={addScreens} onLogoUpload={(file) => void addLogo(file)} uploading={uploading} onUploading={setUploading} />}
      {step === STEP.final && common && analysis && (busy === "generation" ? <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl bg-surface p-7 text-center"><Loader2 className="size-8 animate-spin text-accent-text motion-reduce:animate-none" /><p className="font-medium">{f.generating}</p><p className="max-w-md text-sm leading-relaxed text-muted">{f.generatingHelp}</p></div> : <UrlFinalStep {...common} analysis={analysis} onEdit={go} />)}
      {step >= STEP.message && !review && <><UrlAnalysisProgress locale={locale} busy={busy === "analysis"} ready={false} milestones={milestones} failed={Boolean(error)} /><Button className="mt-5" variant="outline" onClick={() => go(STEP.music)}>{f.back}</Button></>}
      <footer className="sticky bottom-0 z-20 mt-9 border-t border-line bg-bg py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:mt-10 sm:py-5">
        {step === LAST_STEP && <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><p className="text-sm font-semibold">{f.three} · {cost} {c.credits}</p><p className="text-xs text-muted">{balance} {c.credits} {f.creditBalance}</p></div>}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={step === STEP.source || busy === "generation" || saving || uploading} onClick={() => go(step - 1)} className={cn("min-h-11", step === STEP.source && "invisible")}><ArrowLeft className="size-4" />{f.back}</Button>
          <Button variant="purple" disabled={disabled} loading={saving || (busy === "analysis" && step === STEP.source) || busy === "generation"} className="group h-auto min-h-12 max-w-[75%] whitespace-normal px-6 py-3 text-center" onClick={() => void next()}>{nextLabel}{!saving && busy !== "generation" && step < LAST_STEP && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />}</Button>
        </div>
        {step === STEP.template && !preferences.templateId && <p className="mt-3 text-right text-xs text-muted">{f.chooseTemplate}</p>}
        {step === STEP.message && review && !stepValid(STEP.message) && <p className="mt-3 text-right text-xs text-danger">{f.checkMessage}</p>}
        {step === STEP.assets && review?.screens.length === 0 && <p className="mt-3 text-right text-xs text-danger">{f.noScreens}</p>}
        {step === LAST_STEP && <p className={cn("mt-3 text-xs leading-relaxed", balance < cost ? "text-danger" : "text-muted")}>{balance < cost ? c.noCredit : f.exportNote}</p>}
      </footer>
    </>}
    </div>
  </div>;
}

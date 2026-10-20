"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioPreview } from "@/components/media/audio-preview";
import { publishCreditBalance } from "@/components/app/live-credit-balance";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { format } from "@/lib/i18n";
import { CREDIT_COSTS, getVoiceoverCost } from "@/config/credits";
import { generateNarration, listNarrationVoices, saveNarration } from "@/lib/projects/voiceover-actions";
import { estimateVoiceSeconds, fitVoiceScenes, voiceSlots, voiceStatus, type Voiceover } from "@/lib/projects/voiceover";
import { totalDuration } from "@/lib/projects/scenes";
import type { ActionError, EditorVersion } from "@/lib/projects/types";
import type { NarrationVoice } from "@/lib/services/elevenlabs";
import { AudioLines, Captions, Check, ChevronDown, Clock3, Mic2, Sparkles, Volume2 } from "lucide-react";

/** Interrupteur (case native accessible, habillée en switch). Placé dans un <label>, il prend son texte. */
function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <span className="relative inline-flex h-6 w-11 shrink-0">
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)}
      className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-40 ${checked ? "bg-accent" : "bg-surface-3 ring-1 ring-line-strong ring-inset"}`}>
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.35)] transition-transform motion-reduce:transition-none ${checked ? "translate-x-5" : ""}`} />
    </span>
  </span>;
}

/** Ligne de réglage : titre (+ aide) à gauche, interrupteur à droite. */
function SettingRow({ title, hint, checked, disabled, onChange }: { title: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex items-start justify-between gap-4 py-1 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
    <span className="min-w-0 text-sm leading-6">{title}{hint && <span className="mt-1 block text-xs leading-relaxed text-muted">{hint}</span>}</span>
    <span className="pt-0.5"><Toggle checked={checked} disabled={disabled} onChange={onChange} /></span>
  </label>;
}

const SECTION = "text-[11px] font-semibold tracking-[0.12em] text-muted uppercase";

export function VoiceoverPanel({ projectId, version, onVersion, onBalance, onBusy }: {
  projectId: string; version: EditorVersion; onVersion: (v: EditorVersion) => void;
  onBalance: (balance: number) => void; onBusy: (busy: boolean) => void;
}) {
  const t = useDictionary();
  const m = t.voiceover;
  const fr = t.locale === "fr";
  const scenePanelId = useId();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(version);
  const [input, setInput] = useState<Voiceover>(() => ({
    enabled: version.graph.voiceover?.enabled ?? false, voiceId: version.graph.voiceover?.voiceId ?? "",
    language: version.graph.language ?? version.graph.voiceover?.language ?? "fr", volume: version.graph.voiceover?.volume ?? 1,
    duckMusic: version.graph.voiceover?.duckMusic ?? true,
    autoFit: version.graph.voiceover?.autoFit ?? true,
    captions: version.graph.voiceover?.captions ?? false,
    segments: version.graph.scenes.map((scene) => version.graph.voiceover?.segments.find((s) => s.sceneId === scene.id) ?? { sceneId: scene.id, text: version.graph.pitch?.plan?.scenes.find((s) => s.id === scene.id)?.narration ?? "" }),
  }));
  const [voices, setVoices] = useState<NarrationVoice[]>([]);
  const [voiceState, setVoiceState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  // Keep the same id after a lost response; the server can recover the saved version without a second charge.
  const retry = useRef<{ signature: string; requestId: string; baseId: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void listNarrationVoices().then((r) => {
      if (cancelled) return;
      if (!r.ok) { setVoiceState("error"); return; }
      setVoices(r.voices); setVoiceState("ready");
    }).catch(() => { if (!cancelled) setVoiceState("error"); });
    return () => { cancelled = true; };
  }, [reload]);

  const graph = { ...current.graph, voiceover: input };
  const slots = voiceSlots(graph);
  const selectedVoice = voices.find((v) => v.id === input.voiceId);
  const dirty = JSON.stringify(input) !== JSON.stringify(current.graph.voiceover);
  const missing = graph.scenes.filter((s) => ["missing", "stale"].includes(voiceStatus(graph, s.id)));
  const tooLong = graph.scenes.filter((s) => voiceStatus(graph, s.id) === "too_long");
  const fitted = tooLong.length && !graph.recording ? fitVoiceScenes(graph) : graph;
  const canFit = tooLong.some((s) => voiceStatus(fitted, s.id) === "ready");
  const totalCost = missing.reduce((sum, scene) => sum + getVoiceoverCost(input.segments.find((s) => s.sceneId === scene.id)?.text ?? ""), 0);

  function update(patch: Partial<Voiceover>) { setInput((old) => ({ ...old, ...patch })); setNotice(""); }
  function problem(code: ActionError, required?: number, available?: number) {
    return code === "insufficient_credits" ? format(m.insufficient, { required: required ?? 0, available: available ?? 0 })
      : code === "busy" ? m.busy : code === "rate_limited" ? m.rateLimited : m.error;
  }
  function accept(v: EditorVersion, balance: number) {
    setCurrent(v); setInput(v.graph.voiceover!); onVersion(v); onBalance(balance); publishCreditBalance(balance);
  }
  async function operate(kind: "save" | "script" | "audio", ids: string[] = [], extendSceneId?: string) {
    if (running.current) return;
    running.current = true; setBusy(true); onBusy(true); setError(""); setNotice("");
    let active = current;
    let settings = input;
    try {
      const targets = kind === "audio" ? ids : [undefined];
      for (let i = 0; i < targets.length; i++) {
        if (kind === "audio") setNotice(format(m.generating, { current: i + 1, total: targets.length }));
        const signature = JSON.stringify([kind, active.id, settings, targets[i]]);
        const request = retry.current?.signature === signature ? retry.current : { signature, requestId: crypto.randomUUID(), baseId: active.id };
        if (kind !== "save") retry.current = request;
        const result = kind === "save" ? await saveNarration(projectId, active.id, settings, extendSceneId)
          : await generateNarration(projectId, request.baseId, settings, request.requestId, targets[i]);
        if (!result.ok) { retry.current = null; setNotice(""); setError(problem(result.error, result.required, result.available)); return; }
        retry.current = null;
        accept(result.version, result.balance); active = result.version; settings = result.version.graph.voiceover!;
      }
      const before = totalDuration(current.graph), after = totalDuration(active.graph);
      setNotice(after > before ? format(m.savedAdjusted, { before: before.toFixed(1), after: after.toFixed(1) }) : m.saved);
    } catch { setNotice(""); setError(m.connection); }
    finally { running.current = false; setBusy(false); onBusy(false); }
  }

  const field = "w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-base text-fg outline-none placeholder:text-muted focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm";
  const ready = graph.scenes.filter((s) => voiceStatus(graph, s.id) === "ready").length;
  return <div className="flex min-h-0 flex-1 flex-col">
    <fieldset disabled={busy} className="grid min-h-0 min-w-0 flex-1 overflow-y-auto border-t border-line lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)] lg:overflow-hidden">
      <aside aria-label={m.voiceSettings} className="flex min-w-0 flex-col gap-7 border-b border-line bg-surface-2/40 p-5 sm:p-6 lg:overflow-y-auto lg:border-r lg:border-b-0">
        {/* Activation */}
        <label className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors ${input.enabled ? "border-accent/50 bg-accent-soft" : "border-line-strong bg-surface hover:border-accent/50"}`}>
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${input.enabled ? "bg-accent text-accent-fg" : "bg-surface-2 text-accent-text"}`}><Mic2 className="size-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{m.enabled}</span><span className="mt-0.5 block text-xs text-muted">{input.enabled ? (fr ? "Activée · une voix par scène" : "On · one voice per scene") : (fr ? "Désactivée" : "Off")}</span></span>
          <Toggle checked={input.enabled} onChange={(enabled) => update({ enabled })} />
        </label>

        {/* Réglages grisés tant que la voix off est coupée */}
        <div className={`flex flex-col gap-7 transition-opacity ${input.enabled ? "" : "pointer-events-none opacity-45"}`} aria-disabled={!input.enabled}>
          <section className="flex flex-col gap-3">
            <h3 className={SECTION}>{m.voiceSettings}</h3>
            <label className="flex flex-col gap-2 text-sm font-medium">{m.voice}
              <select className={field} value={input.voiceId} onChange={(e) => update({ voiceId: e.target.value })} disabled={!input.enabled || voiceState !== "ready"}>
                <option value="">{voiceState === "loading" ? m.loadingVoices : m.chooseVoice}</option>
                {voices.map((v) => <option key={v.id} value={v.id}>{v.name}{v.language ? ` · ${v.language}` : ""}</option>)}
              </select>
            </label>
            {voiceState === "error" && <div role="alert" className="text-sm text-danger">{m.unavailable} <Button variant="ghost" size="sm" onClick={() => { setVoiceState("loading"); setReload((n) => n + 1); }}>{m.retry}</Button></div>}
            {voiceState === "ready" && !voices.length && <p className="text-sm text-muted">{m.noVoices}</p>}
            {selectedVoice?.previewUrl && <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3"><p className="text-xs text-muted">{m.voiceSample}</p><AudioPreview key={selectedVoice.previewUrl} src={selectedVoice.previewUrl} label={m.preview} /></div>}
            <p className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"><span className="text-muted">{m.language}</span><span className="font-medium">{input.language === "fr" ? "Français" : "English"}</span></p>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className={SECTION}>{m.mixSettings}</h3>
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
              <label className="flex flex-col gap-2.5 text-sm">
                <span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Volume2 className="size-4 text-muted" />{m.volume}</span><span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums">{Math.round(input.volume * 100)} %</span></span>
                <input disabled={!input.enabled} type="range" min="0" max="100" value={Math.round(input.volume * 100)} onChange={(e) => update({ volume: Number(e.target.value) / 100 })} className="h-6 w-full cursor-pointer accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed" />
              </label>
              <div className="h-px bg-line" />
              <SettingRow title={m.captions} checked={input.captions ?? false} disabled={!input.enabled} onChange={(captions) => update({ captions })} />
              <SettingRow title={m.duck} checked={input.duckMusic} disabled={!input.enabled} onChange={(duckMusic) => update({ duckMusic })} />
              {!graph.recording && <SettingRow title={m.autoFit} hint={m.autoFitHelp} checked={input.autoFit ?? false} disabled={!input.enabled} onChange={(autoFit) => update({ autoFit })} />}
            </div>
          </section>
        </div>
        <p className="mt-auto text-xs leading-relaxed text-muted">{format(m.costHint, { cost: CREDIT_COSTS.voiceover.perUnit, characters: CREDIT_COSTS.voiceover.perCharacters })}</p>
      </aside>

      <section aria-label={m.scriptHeading} className="min-w-0 lg:overflow-y-auto">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4 sm:px-6">
          <div className="min-w-0"><h3 className="text-base font-semibold">{m.scriptHeading}</h3><div className="mt-2 flex items-center gap-3"><span className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-accent-gradient transition-[width]" style={{ width: `${graph.scenes.length ? (ready / graph.scenes.length) * 100 : 0}%` }} /></span><span className="text-xs text-muted tabular-nums">{format(m.sceneProgress, { ready, total: graph.scenes.length })}</span></div></div>
          <Button variant="soft" size="sm" disabled={!input.enabled} onClick={() => operate("script")}><Sparkles />{format(m.script, { cost: CREDIT_COSTS.voiceover.script })}</Button>
        </div>
        <div className="px-5 sm:px-6">
          {current.graph.voiceover?.setupPending && <p role="status" className="pt-5 text-sm leading-relaxed text-muted">{m.creationNext}</p>}
          {!input.enabled && <div className="flex min-h-[26rem] flex-col items-center justify-center py-12 text-center">
            <div aria-hidden="true" className="relative mb-6 grid size-20 place-items-center rounded-3xl bg-accent-soft text-accent-text shadow-[0_20px_50px_-20px_var(--accent-glow)]"><Mic2 className="size-8" /><span className="absolute -right-2 -bottom-2 grid size-8 place-items-center rounded-xl border border-line-strong bg-surface"><AudioLines className="size-4" /></span></div>
            <h4 className="text-lg font-semibold">{fr ? "Donne une voix à ta vidéo" : "Give your video a voice"}</h4>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{m.disabledHint}</p>
            <ul className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
              {([[Mic2, fr ? "Une voix par scène" : "One voice per scene"], [Captions, fr ? "Sous-titres synchronisés" : "Synced captions"], [Volume2, fr ? "Musique baissée pendant la voix" : "Music ducked under the voice"]] as const).map(([Icon, label]) => <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-muted"><Icon className="size-3.5 text-accent-text" />{label}</li>)}
            </ul>
            <Button variant="purple" className="mt-7" onClick={() => update({ enabled: true })}><Mic2 />{m.enabled}</Button>
          </div>}
          {input.enabled && <p className="py-4 text-xs leading-relaxed text-muted">{m.scriptHint}</p>}
          {canFit && input.enabled && <div className="mb-5 flex flex-col items-start gap-2 rounded-xl border border-line-strong bg-surface-2 p-4">
            <p className="text-sm leading-relaxed">{format(m.fitSummary, { before: totalDuration(graph).toFixed(1), after: totalDuration(fitted).toFixed(1) })}</p>
            <Button variant="soft" size="sm" onClick={() => operate("save", [], "all")}>{m.fitAll}</Button>
            <p className="text-xs text-muted">{m.fitFree}</p>
          </div>}
          <div hidden={!input.enabled} className="flex flex-col gap-3 pb-6">
            {graph.scenes.map((scene, index) => {
              const segment = input.segments.find((s) => s.sceneId === scene.id)!;
              const status = voiceStatus(graph, scene.id);
              const seconds = segment.clip && status !== "stale" ? segment.clip.duration : estimateVoiceSeconds(segment.text);
              const available = (slots.find((s) => s.scene.id === scene.id)?.duration ?? 0) / 30;
              const issue = status === "stale" || status === "too_long";
              return <section key={scene.id} className={`flex min-w-0 flex-col gap-3 rounded-2xl border bg-surface-2/30 p-4 transition-colors ${issue ? "border-danger/40" : status === "ready" ? "border-accent/30" : "border-line"}`}>
                <button type="button" aria-expanded={!collapsed[scene.id]} aria-controls={`${scenePanelId}-${scene.id}`} onClick={() => setCollapsed((previous) => ({ ...previous, [scene.id]: !previous[scene.id] }))} className="flex w-full items-center gap-3 rounded-lg py-1 text-left transition-colors hover:bg-surface-2/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold tabular-nums ring-1 ring-line-strong">{index + 1}</span><span className="min-w-0 flex-1"><span className="sr-only">{format(m.scene, { number: index + 1 })} · </span><span className="block break-words text-sm font-semibold">{scene.title}</span></span>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${issue ? "bg-danger/10 text-danger" : status === "ready" ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-muted"}`}>{status === "ready" && <Check className="size-3" />}{status === "stale" ? m.statusStale : status === "too_long" ? m.statusLong : m[status]}</span>
                  <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none ${collapsed[scene.id] ? "-rotate-90" : ""}`} />
                </button>
                <div id={`${scenePanelId}-${scene.id}`} hidden={Boolean(collapsed[scene.id])}>
                {!collapsed[scene.id] && <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-2 text-sm"><span className="sr-only">{m.text} · {index + 1}</span>
                  <textarea disabled={!input.enabled} value={segment.text} maxLength={1000} rows={3} placeholder={m.placeholder} className={`${field} min-h-24 resize-y leading-relaxed`} onChange={(e) => update({ segments: input.segments.map((s) => s.sceneId === scene.id ? { ...s, text: e.target.value } : s) })} />
                </label>
                <div className="flex items-start justify-between gap-3 text-xs text-muted"><p className="flex items-start gap-1.5"><Clock3 className="mt-0.5 size-3 shrink-0" />{format(segment.clip && status !== "stale" ? m.actual : m.estimate, { seconds: seconds.toFixed(1), available: available.toFixed(1) })}</p><span className="shrink-0 tabular-nums">{segment.text.length}/1000</span></div>
                {issue && <p className="text-xs leading-relaxed text-danger">{status === "too_long" ? m.tooLong : m.stale}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {segment.clip ? <audio key={segment.clip.src} src={segment.clip.src} controls preload="none" aria-label={`${m.preview} · ${index + 1}`} className="h-9 w-full min-w-0 sm:w-64" /> : <span />}
                  <div className="flex flex-wrap gap-2">
                    {status === "too_long" && !graph.recording && voiceStatus(fitted, scene.id) === "ready" && <Button size="sm" variant="soft" disabled={!input.enabled} onClick={() => operate("save", [], scene.id)}>{m.extend}</Button>}
                    <Button size="sm" variant="outline" disabled={!input.enabled || !segment.text.trim() || !selectedVoice} onClick={() => operate("audio", [scene.id])}>{format(segment.clip ? m.regenerate : m.generate, { cost: getVoiceoverCost(segment.text) })}</Button>
                  </div>
                </div>
                </div>}
                </div>
              </section>;
            })}
          </div>
        </div>
      </section>
    </fieldset>

    <footer className="shrink-0 border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      {notice && <p role="status" aria-live="polite" className="mb-3 text-sm text-muted">{notice}</p>}
      {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-xs leading-relaxed text-muted">{busy ? m.progress : dirty ? m.unsaved : m.savedClips}</p>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button variant={input.enabled && missing.length > 0 ? "outline" : "primary"} disabled={busy || !dirty} onClick={() => operate("save")}>{m.save}</Button>
          {input.enabled && missing.length > 0 && <Button loading={busy} disabled={!selectedVoice || busy} onClick={() => operate("audio", missing.map((s) => s.id))} className="h-auto min-h-10 whitespace-normal py-2"><Mic2 />{format(m.generateBatch, { count: missing.length, cost: totalCost })}</Button>}
        </div>
      </div>
    </footer>
  </div>;
}


"use client";
import { useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { ArrowLeft, ArrowRight, Check, MonitorUp, Upload, X } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { publishCreditBalance } from "@/components/app/live-credit-balance";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { recordingCopy } from "@/lib/recordings/copy";
import { analyzeRecording } from "@/lib/recordings/analyze";
import { uploadRecording } from "@/lib/recordings/upload";
import { createRecording } from "@/lib/recordings/actions";
import { RECORDING_MAX_BYTES, RecordingSettingsSchema, type RecordingSettings } from "@/lib/recordings/model";
import type { UploadedFile } from "@/lib/storage/client";
import { buildVideoProps } from "@/lib/projects/video-props";
import { FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import { CREDIT_COSTS } from "@/config/credits";
import { MUSIC_LIBRARY } from "@/config/music";
import { RecordingControls } from "./recording-controls";
import { RecordingPreview } from "./recording-preview";

export function RecordingCreate({ balance }: { balance: number }) {
  const [remaining, setRemaining] = useState(balance);
  const router = useRouter();
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [paidImport, setPaidImport] = useState<{ source: File; uploaded: Awaited<ReturnType<typeof uploadRecording>> } | null>(null);
  const t = useDictionary(), c = recordingCopy(t.locale);
  const [step, setStep] = useState(0), [furthest, setFurthest] = useState(0);
  const [activeZoom, setActiveZoom] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [settings, setSettings] = useState<RecordingSettings | null>(null);
  const [format, setFormat] = useState<VideoFormatId>("LANDSCAPE");
  const [music, setMusic] = useState<string | null>(null);
  const [phase, setPhase] = useState<"analyze" | "uploading" | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null), controller = useRef<AbortController | null>(null), player = useRef<PlayerRef>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const busy = phase !== null || pending;
  const valid = settings !== null && RecordingSettingsSchema.safeParse(settings).success;
  function go(next: number) {
    if (busy || (next > step && (!valid || (step === 0 && pickedFile)))) return;
    setError(""); setStep(next); setFurthest((old) => Math.max(old, next));
  }
  async function submit() {
    if (!file || !settings || !valid || !name.trim()) return;
    setError("");
    try {
      const result = await createRecording({ name, file, settings, format, musicTrackId: music });
      if (result && !result.ok) setError(result.error === "rate_limited" ? c.rate_limited : c.error);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
      setError(c.error);
    }
  }
  function selectFile(selected: File) {
    if (busy) return;
    if (selected.size > RECORDING_MAX_BYTES) { setError(c.too_large); return; }
    setPickedFile(selected); setPaidImport(null); setError("");
    if (input.current) input.current.value = "";
  }
  async function startCreation() {
    const selected = pickedFile;
    if (!selected || busy || controller.current) return;
    if (!paidImport && remaining < CREDIT_COSTS.recordingImport) { setError(c.insufficient); return; }
    const task = new AbortController(); controller.current = task;
    setError(""); setPhase(paidImport ? "analyze" : "uploading"); setProgress(0);
    try {
      let uploaded = paidImport?.source === selected ? paidImport.uploaded : null;
      if (!uploaded) {
        uploaded = await uploadRecording(selected, setProgress, task.signal);
        setPaidImport({ source: selected, uploaded });
        setRemaining(uploaded.balance);
        publishCreditBalance(uploaded.balance);
        router.refresh();
      }
      task.signal.throwIfAborted();
      setPhase("analyze"); setProgress(0);
      const analyzed = await analyzeRecording(selected, setProgress, task.signal);
      // The server's container metadata is authoritative; reject divergent browser interpretation.
      if (Math.abs(uploaded.duration - analyzed.duration) > 0.15 || uploaded.width !== analyzed.width || uploaded.height !== analyzed.height) throw new Error("unreadable");
      setFile(uploaded);
      setSettings({ ...analyzed, duration: uploaded.duration, background: "#7c3aed", padding: 7, radius: 18, frame: "browser", originalAudio: true });
      setName((old) => old || selected.name.replace(/\.[^.]+$/, "").slice(0, 40));
      setStep(1); setFurthest(1); setActiveZoom(null); setPickedFile(null); setPaidImport(null);
    } catch (e) {
      if (task.signal.aborted) return;
      const code = e instanceof Error ? e.message : "error";
      setError(code === "insufficient_credits" ? c.insufficient : code === "too_large" ? c.too_large : code === "duration" ? c.duration : code === "unsupported_codec" ? c.unsupported_codec : code === "storage_quota" ? c.storage_quota : code === "rate_limited" ? c.rate_limited : c.error);
    } finally { if (controller.current === task) { setPhase(null); controller.current = null; } if (input.current) input.current.value = ""; }
  }
  const props = file && settings ? buildVideoProps({ appName: name, format, styleId: null, colors: [settings.background], logoUrl: null, screenUrls: [], screenRatios: [], websiteUrl: null, musicSrc: null, locale: t.locale }, { schema: 1, energy: "calm", logoEmphasis: false, musicTrackId: music, bpm: 120, audio: { volume: 0.25, fadeIn: true, fadeOut: true }, recording: { ...settings, src: file.url }, scenes: [{ id: "recording", kind: "screens", title: "", duration: settings.duration, transition: "fade" }] }, false) : null;
  const hints = [c.intro, c.zoomHint, c.stageHint, c.finishHint];
  const selectClass = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60";
  return <div>
    <header className="mb-8">
      <h1 className="font-heading text-2xl sm:text-3xl">{c.title}</h1>
      <nav aria-label={c.title} className="mt-6 grid grid-cols-4 gap-2 sm:gap-4">
        {c.steps.map((label, index) => <button key={label} type="button" aria-current={index === step ? "step" : undefined} disabled={busy || index > furthest || (index > step && !valid)} onClick={() => go(index)} className="group min-w-0 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-default">
          <span className={`mb-2 block h-1 rounded-full ${index <= step ? "bg-accent" : "bg-surface-3"}`} />
          <span className={`flex items-center gap-1 text-xs sm:text-sm ${index === step ? "font-semibold text-fg" : "text-muted"}`}>{index < step ? <Check className="hidden size-3 shrink-0 sm:block" /> : null}{label}</span>
        </button>)}
      </nav>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">{hints[step]}</p>
    </header>
    {step === 0 && <p className="mb-5 text-sm font-medium text-accent-text">{CREDIT_COSTS.recordingImport} {c.importCost}</p>}
    <input ref={input} type="file" accept="video/mp4,video/quicktime,.mp4,.mov" aria-label={c.upload} className="hidden" onChange={(e) => { const selected = e.target.files?.[0]; if (selected) void selectFile(selected); }} />
    {step === 0 || !props ? <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const selected = e.dataTransfer.files[0]; if (selected) void selectFile(selected); }} className={`flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center ${dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-bg-subtle"}`}>
      <MonitorUp className="mb-5 size-10 text-accent-text" aria-hidden />
      {phase ? <><p role="status" className="text-sm font-medium">{phase === "analyze" ? c.analyze : c.uploading} · {progress}%</p><progress aria-label={phase === "analyze" ? c.analyze : c.uploading} value={progress} max={100} className="mt-4 h-2 w-full max-w-xs accent-accent" /><Button variant="ghost" className="mt-4" onClick={() => controller.current?.abort()}><X />{c.cancel}</Button></> : <><p className="mb-2 text-sm">{pickedFile?.name ?? file?.fileName ?? c.drop}</p><p className="mb-6 text-xs text-muted">{c.limits}</p><Button variant={pickedFile ? "outline" : "primary"} onClick={() => input.current?.click()}><Upload />{pickedFile || file ? c.replace : c.upload}</Button><p className="mt-4 text-xs text-muted">{c.selectHint}</p>{pickedFile && <Button className="mt-5" disabled={!paidImport && remaining < CREDIT_COSTS.recordingImport} onClick={() => void startCreation()}>{paidImport ? c.resumeCreation : `${c.startCreation} - ${CREDIT_COSTS.recordingImport} ${t.common.credits}`}</Button>}</>}
    </div> : <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <div className="min-w-0 lg:sticky lg:top-20">
        <RecordingPreview videoProps={props} playerRef={player} disabled={busy} showTimeline={step === 1} onZoomSelect={setActiveZoom} selectedZoom={activeZoom} onZoomsChange={step === 1 ? (zooms) => setSettings((current) => current ? { ...current, zooms } : current) : undefined} />
    {step === 1 && <div className="mt-5 flex items-center justify-between gap-3"><Button variant="ghost" disabled={busy} onClick={() => go(0)}><ArrowLeft />{c.previous}</Button><Button disabled={busy || !valid} onClick={() => go(2)}>{c.next}<ArrowRight /></Button></div>}
      </div>
      <aside className="min-w-0 border-t border-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
        {step !== 1 && <h2 className="mb-5 text-lg font-semibold">{c.steps[step]}</h2>}
        {step === 1 && <RecordingControls mode="zooms" selectedZoom={activeZoom} onSelectZoom={setActiveZoom} value={settings!} onChange={setSettings} onSeek={(time) => player.current?.seekTo(Math.round(time * 30))} currentTime={() => (player.current?.getCurrentFrame() ?? 0) / 30} disabled={busy} />}
        {step === 2 && <div className="space-y-6">
          <Field htmlFor="recording-format" label={c.format}><select id="recording-format" value={format} disabled={busy} onChange={(e) => setFormat(e.target.value as VideoFormatId)} className={selectClass}>{FORMAT_IDS.map((id) => <option key={id} value={id}>{VIDEO_FORMATS[id].ratio}</option>)}</select></Field>
          <RecordingControls mode="stage" value={settings!} onChange={setSettings} onSeek={() => {}} currentTime={() => 0} disabled={busy} />
        </div>}
        {step === 3 && <div className="space-y-6">
          <Field htmlFor="recording-name" label={c.name}><Input id="recording-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} /></Field>
          <Field htmlFor="recording-music" label={c.music}><select id="recording-music" value={music ?? ""} disabled={busy} onChange={(e) => setMusic(e.target.value || null)} className={selectClass}><option value="">{c.none}</option>{MUSIC_LIBRARY.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}</select></Field>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" disabled={busy} checked={settings!.originalAudio} onChange={(e) => setSettings((current) => current ? { ...current, originalAudio: e.target.checked } : current)} className="size-4 accent-accent" />{c.originalAudio}</label>
          <p className="text-xs leading-relaxed text-muted">{c.free}</p>
        </div>}
      </aside>
    </div>}
    {props && step !== 1 && <footer className="mt-8 border-t border-line pt-6">
      {step === 3 ? <AnimatedApply label={c.create} disabled={busy || !name.trim() || !valid} onApply={submit} onCancel={() => go(2)} onApplyingChange={setPending} /> : <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" disabled={busy || step === 0} onClick={() => go(step - 1)}><ArrowLeft />{c.previous}</Button>
        <Button disabled={busy || !valid || (step === 0 && pickedFile !== null)} onClick={() => go(step + 1)}>{c.next}<ArrowRight /></Button>
      </div>}
    </footer>}
    {step === 0 && !paidImport && remaining < CREDIT_COSTS.recordingImport && <p role="status" className="mt-4 text-sm text-danger">{c.insufficient}</p>}
    {error && <p role="alert" className="mt-5 text-sm text-danger">{error}</p>}
  </div>;
}


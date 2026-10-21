"use client";
import { useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { ArrowLeft, Download, Save, Share2, ScanSearch } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ProjectName } from "@/components/editor/project-name";
import { ExportDialog } from "@/components/editor/export-dialog";
import { ShareDialog } from "@/components/editor/share-dialog";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { recordingCopy } from "@/lib/recordings/copy";
import { saveRecording } from "@/lib/recordings/actions";
import { analyzeRecording } from "@/lib/recordings/analyze";
import { RecordingSettingsSchema, type RecordingSettings } from "@/lib/recordings/model";
import { buildVideoProps } from "@/lib/projects/video-props";
import type { EditorProject } from "@/lib/projects/types";
import type { PricingPlan } from "@/config/pricing";
import { RecordingPreview } from "./recording-preview";
import { DecorControls } from "@/components/decors/decor-controls";
import { decorCopy } from "@/lib/decors/copy";
import { RecordingControls } from "./recording-controls";

export function RecordingEditor({ project, initialBalance, plan }: { project: EditorProject; initialBalance: number; plan: Pick<PricingPlan, "watermark" | "maxQuality"> }) {
  const t = useDictionary(), c = recordingCopy(t.locale);
  const [version, setVersion] = useState(project.versions[project.versions.length - 1]);
  const [settings, setSettings] = useState<RecordingSettings>(version.graph.recording!);
  const [panel, setPanel] = useState<"zooms" | "stage">("zooms");
  const [activeZoom, setActiveZoom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false), [progress, setProgress] = useState(0);
  const analysis = useRef<AbortController | null>(null);
  const [exportOpen, setExportOpen] = useState(false), [shareOpen, setShareOpen] = useState(false);
  const [token, setToken] = useState(project.shareToken);
  const [balance, setBalance] = useState(initialBalance);
  const player = useRef<PlayerRef>(null);
  const decor = Boolean(settings.decorId);
  const dc = decorCopy(t.locale);
  const dirty = JSON.stringify(settings) !== JSON.stringify(version.graph.recording);
  const valid = RecordingSettingsSchema.safeParse(settings).success;
  const busy = saving || analyzing;
  const videoProps = buildVideoProps(project, { ...version.graph, recording: { ...settings, src: version.graph.recording!.src } }, plan.watermark);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => () => analysis.current?.abort(), []);
  async function recalculate() {
    if (busy || analysis.current) return;
    const task = new AbortController(); analysis.current = task;
    setAnalyzing(true); setProgress(0); setError("");
    try {
      const response = await fetch(version.graph.recording!.src, { signal: task.signal });
      if (!response.ok) throw new Error("unreadable");
      const file = new File([await response.blob()], "recording.mp4", { type: "video/mp4" });
      const result = await analyzeRecording(file, setProgress, task.signal);
      task.signal.throwIfAborted();
      setSettings((current) => ({ ...current, zooms: result.zooms }));
    } catch { if (!task.signal.aborted) setError(c.reanalyzeError); }
    finally { if (analysis.current === task) { analysis.current = null; setAnalyzing(false); } }
  }
  async function save() {
    setSaving(true); setError("");
    try {
      const result = await saveRecording(project.id, version.number, settings);
      if (!result.ok) { setError(result.error === "busy" ? c.conflict : result.error === "rate_limited" ? c.rate_limited : c.saveError); return false; }
      setVersion(result.version); setSettings(result.version.graph.recording!); return true;
    } catch { setError(c.saveError); return false; }
    finally { setSaving(false); }
  }
  return <div className="flex min-h-dvh flex-col bg-bg">
    <header className="sticky top-0 z-40 bg-bg flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" aria-label={c.back} className="rounded-full p-2 text-muted hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent" onClick={(e) => { if (dirty && !window.confirm(c.dirty + ". " + c.reset + " ?")) e.preventDefault(); }}><ArrowLeft className="size-4" /></Link><div className="min-w-0"><div className="max-w-64 sm:max-w-sm"><ProjectName projectId={project.id} initialName={project.name} /></div><p className="mt-0.5 text-xs text-muted">{decor ? dc.title : c.title} · {dirty ? c.dirty : c.saved}</p></div></div>
      <div className="flex items-center gap-2"><Button variant="ghost" size="icon" disabled={busy || !valid} aria-label={t.app.share.button} onClick={async () => { if (!dirty || await save()) setShareOpen(true); }}><Share2 /></Button><Button variant="outline" loading={saving} disabled={busy || !dirty || !valid} onClick={() => void save()}><Save />{c.save}</Button><Button disabled={busy || !valid} onClick={async () => { if (!dirty || await save()) setExportOpen(true); }}><Download />{c.export}</Button></div>
    </header>
    <div className="mx-auto grid w-full max-w-[1600px] flex-1 items-start gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <main className="min-w-0 lg:sticky lg:top-24"><RecordingPreview videoProps={videoProps} playerRef={player} showTimeline={!decor} selectedZoom={activeZoom} onZoomSelect={(id) => { setActiveZoom(id); setPanel("zooms"); }} disabled={busy} onZoomsChange={(zooms) => setSettings((current) => current ? { ...current, zooms } : current)} />{!decor && <p className="mt-6 text-xs text-muted">{c.cursor}</p>}{dirty && <Button variant="ghost" className="mt-3" disabled={busy} onClick={() => { setSettings(version.graph.recording!); setError(""); }}>{c.reset}</Button>}{error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}</main>
<aside className="min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">{decor ? <DecorControls value={settings} onChange={setSettings} disabled={busy} /> : <><div aria-label={c.title} className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">{(["zooms", "stage"] as const).map((item) => <button key={item} type="button" disabled={busy} aria-pressed={panel === item} onClick={() => setPanel(item)} className={`h-10 rounded-md text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${panel === item ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}>{item === "zooms" ? c.zooms : c.stage}</button>)}</div><RecordingControls mode={panel} selectedZoom={activeZoom} onSelectZoom={setActiveZoom} value={settings} onChange={setSettings} onSeek={(time) => player.current?.seekTo(Math.round(time * 30))} currentTime={() => (player.current?.getCurrentFrame() ?? 0) / 30} disabled={busy} />{panel === "stage" && <label className="mt-6 flex items-center gap-3 border-t border-line pt-5 text-sm"><input type="checkbox" disabled={busy} checked={settings.originalAudio} onChange={(e) => setSettings((current) => ({ ...current, originalAudio: e.target.checked }))} className="size-4 accent-accent" />{c.originalAudio}</label>}{panel !== "stage" && <div className="mt-6 space-y-3 border-t border-line pt-5"><Button variant="outline" className="w-full" loading={analyzing} disabled={busy} onClick={() => void recalculate()}><ScanSearch />{c.reanalyze}</Button>{analyzing ? <div role="status" className="space-y-2 text-xs text-muted"><p>{c.analyze} : {progress}%</p><progress aria-label={c.analyze} value={progress} max={100} className="h-2 w-full accent-accent" /><Button variant="ghost" size="sm" onClick={() => analysis.current?.abort()}>{c.cancel}</Button></div> : <p className="text-xs leading-relaxed text-muted">{c.reanalyzeHint}</p>}</div>}</>}</aside>
    </div>
    <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} projectId={project.id} defaultFormat={project.format} duration={settings.duration} plan={plan} balance={balance} onBalance={setBalance} exported={project.exported} videoProps={videoProps} />
    <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} projectId={project.id} token={token} onToken={setToken} />
  </div>;
}

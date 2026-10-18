"use client";

import { Plus, Trash2 } from "lucide-react";
import { DeviceMockupPicker } from "@/components/media/device-mockup-picker";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { recordingCopy } from "@/lib/recordings/copy";
import { defaultRecordingMotion, RECORDING_MOTIONS, RecordingSettingsSchema, type RecordingSettings, type RecordingZoom } from "@/lib/recordings/model";

export function RecordingControls({ value, onChange, onSeek, currentTime, disabled = false, mode = "all", selectedZoom, onSelectZoom }: {
  value: RecordingSettings; onChange: (value: RecordingSettings) => void; onSeek: (time: number) => void; currentTime: () => number; disabled?: boolean; mode?: "all" | "zooms" | "stage"; selectedZoom?: string | null; onSelectZoom?: (id: string) => void;
}) {
  const c = recordingCopy(useDictionary().locale);
  const [selected, setSelected] = useState<string | null>(null);
  const candidate = selectedZoom ?? selected;
  const active = value.zooms.some((zoom) => zoom.id === candidate) ? candidate : value.zooms[0]?.id;
  const set = <K extends keyof RecordingSettings>(key: K, next: RecordingSettings[K]) => onChange({ ...value, [key]: next });
  const updateZoom = (id: string, patch: Partial<RecordingSettings["zooms"][number]>) => set("zooms", value.zooms.map((z) => z.id === id ? { ...z, ...patch } : z));
  const add = () => {
    const start = Math.min(Math.max(0, currentTime()), value.duration - 0.6);
    const end = Math.min(start + 3, value.duration);
    const zooms = [...value.zooms, { id: crypto.randomUUID(), start, end, x: 0.5, y: 0.5, scale: 1.6, motion: defaultRecordingMotion(value.zooms.length) }];
    // Find the next available gap if the playhead is inside another zoom.
    const sorted = [...value.zooms].sort((a, b) => a.start - b.start);
    let candidate = start;
    for (const z of sorted) if (candidate < z.end && candidate + 0.6 > z.start) candidate = z.end;
    const next = sorted.find((z) => z.start >= candidate);
    const last = zooms[zooms.length - 1];
    last.start = candidate; last.end = Math.min(candidate + 3, next?.start ?? value.duration, value.duration);
    if (last.end - last.start < 0.6 - 1e-8) return;
    set("zooms", zooms.sort((a, b) => a.start - b.start));
    setSelected(last.id);
    onSelectZoom?.(last.id);
    onSeek(last.start);
  };
  return <fieldset disabled={disabled} className="min-w-0 space-y-7 disabled:opacity-60">
    {mode !== "zooms" && <section className="space-y-4">
      {mode === "all" && <h2 className="text-sm font-semibold">{c.stage}</h2>}
      <DeviceMockupPicker value={value.deviceMockup} onChange={(model) => set("deviceMockup", model)} />
      <div className="flex items-center justify-between gap-4"><label htmlFor="recording-bg" className="text-sm text-muted">{c.background}</label><input id="recording-bg" type="color" value={value.background} onChange={(e) => set("background", e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1 focus-visible:outline-2 focus-visible:outline-accent" /></div>
      <Slider id="recording-padding" label={c.padding} value={value.padding} min={0} max={16} step={1} unit="%" onChange={(v) => set("padding", v)} />
      {(!value.deviceMockup || value.deviceMockup === "none") && <Slider id="recording-radius" label={c.radius} value={value.radius} min={0} max={40} step={1} onChange={(v) => set("radius", v)} />}
      {(!value.deviceMockup || value.deviceMockup === "none") && <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={value.frame === "browser"} onChange={(e) => set("frame", e.target.checked ? "browser" : "none")} className="size-4 accent-accent" />{c.frame}</label>}
      {mode === "all" && <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={value.originalAudio} onChange={(e) => set("originalAudio", e.target.checked)} className="size-4 accent-accent" />{c.originalAudio}</label>}
    </section>}
    {mode !== "stage" && <section className={mode === "all" ? "border-t border-line pt-6" : ""}>
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">{c.zooms} <span className="ml-1 text-muted">{value.zooms.length}</span></h2><Button size="sm" variant="soft" disabled={value.zooms.length >= 30} onClick={add}><Plus />{c.add}</Button></div>
      {!value.zooms.length && <p className="text-sm leading-relaxed text-muted">{c.noZooms}</p>}
      <ol className={mode === "zooms" ? "space-y-2" : "divide-y divide-line"}>
        {value.zooms.map((zoom, i) => <li key={zoom.id} className={mode === "zooms" ? `space-y-4 rounded-xl px-3 py-3 ${active === zoom.id ? "bg-surface-2" : "hover:bg-surface"}` : "space-y-4 py-5 first:pt-0"}>
          <div className="flex items-center justify-between gap-2"><button type="button" aria-expanded={mode === "zooms" ? active === zoom.id : undefined} onClick={() => { setSelected(zoom.id); onSelectZoom?.(zoom.id); onSeek(zoom.start + 0.7); }} className="flex flex-1 items-center justify-between gap-3 rounded text-left text-sm font-medium text-accent-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-accent"><span>{c.zooms} {i + 1}</span><span className="text-xs tabular-nums text-muted">{zoom.start.toFixed(1)}–{zoom.end.toFixed(1)} s</span></button><Button size="icon" variant="ghost" aria-label={`${c.remove} ${i + 1}`} onClick={() => set("zooms", value.zooms.filter((z) => z.id !== zoom.id))}><Trash2 /></Button></div>
          {(mode !== "zooms" || active === zoom.id) && <div className="space-y-5 border-t border-line pt-4">
          <ZoomMotion value={zoom} onChange={(motion) => { updateZoom(zoom.id, { motion }); onSeek((zoom.start + zoom.end) / 2); }} />
          <div className="grid grid-cols-2 gap-3">
            <Field htmlFor={`start-${zoom.id}`} label={`${c.start} (s)`}><Input id={`start-${zoom.id}`} type="number" min={0} max={value.duration} step={0.1} value={Number(zoom.start.toFixed(2))} onChange={(e) => updateZoom(zoom.id, { start: Number(e.target.value) })} /></Field>
            <Field htmlFor={`end-${zoom.id}`} label={`${c.end} (s)`}><Input id={`end-${zoom.id}`} type="number" min={0} max={value.duration} step={0.1} value={Number(zoom.end.toFixed(2))} onChange={(e) => updateZoom(zoom.id, { end: Number(e.target.value) })} /></Field>
          </div>
          <Slider id={`scale-${zoom.id}`} label={c.scale} value={zoom.scale} min={1.2} max={2.5} step={0.1} unit="×" onChange={(scale) => updateZoom(zoom.id, { scale })} />
          <Slider id={`x-${zoom.id}`} label={c.horizontal} value={Math.round(zoom.x * 100)} min={0} max={100} step={1} unit="%" onChange={(x) => updateZoom(zoom.id, { x: x / 100 })} />
          <Slider id={`y-${zoom.id}`} label={c.vertical} value={Math.round(zoom.y * 100)} min={0} max={100} step={1} unit="%" onChange={(y) => updateZoom(zoom.id, { y: y / 100 })} />
          </div>}
        </li>)}
      </ol>
      {!RecordingSettingsSchema.safeParse(value).success && <p role="alert" className="mt-3 text-sm text-danger">{c.invalid}</p>}
    </section>}
    {mode === "all" && <p className="border-t border-line pt-4 text-xs leading-relaxed text-muted">{c.cursor}</p>}
  </fieldset>;
}

function ZoomMotion({ value, onChange }: { value: RecordingZoom; onChange: (motion: NonNullable<RecordingZoom["motion"]>) => void }) {
  const fr = useDictionary().locale === "fr";
  const labels = fr ? ["Aucune", "Inclinaison gauche", "Inclinaison droite", "Inclinaison vers le haut", "Orbite légère", "Bascule diagonale", "Balancier"] : ["None", "Tilt left", "Tilt right", "Tilt upward", "Gentle orbit", "Diagonal tilt", "Pendulum"];
  return <Field htmlFor={`motion-${value.id}`} label={fr ? "Mouvement 3D" : "3D motion"}><select id={`motion-${value.id}`} value={value.motion ?? "none"} onChange={(event) => onChange(event.target.value as NonNullable<RecordingZoom["motion"]>)} className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent">{RECORDING_MOTIONS.map((motion, index) => <option key={motion} value={motion}>{labels[index]}</option>)}</select></Field>;
}

function Slider({ id, label, value, min, max, step, unit = "", onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void }) {
  return <div className="space-y-2"><div className="flex items-center justify-between gap-2 text-sm"><label htmlFor={id} className="font-medium text-fg">{label}</label><output htmlFor={id} className="font-semibold tabular-nums text-fg">{value}{unit}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-5 w-full cursor-pointer accent-accent focus-visible:outline-2 focus-visible:outline-accent" /></div>;
}

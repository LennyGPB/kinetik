"use client";

import { useEffect, useState } from "react";
import { Button, purpleButtonStyle } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Check, Mic2, Pause, Play, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { listNarrationVoices } from "@/lib/projects/voiceover-actions";
import type { NarrationVoice } from "@/lib/services/elevenlabs";

export type CreationVoice = { voiceId: string; voiceName: string; autoFit: boolean };

export function CreationVoicePicker({ value, onChange }: { value: CreationVoice | null; onChange: (value: CreationVoice | null) => void }) {
  const t = useDictionary();
  const m = t.voiceover;
  const enabled = value !== null;
  const [voices, setVoices] = useState<NarrationVoice[]>([]);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void listNarrationVoices().then((r) => {
      if (cancelled) return;
      setLoaded(true); setFailed(!r.ok);
      if (r.ok) setVoices(r.voices);
    }).catch(() => { if (!cancelled) { setLoaded(true); setFailed(true); } });
    return () => { cancelled = true; };
  }, [enabled, reload]);
  return <section className="mt-6 flex flex-col gap-5 rounded-3xl border border-line bg-bg-subtle p-4 sm:p-6">
    <div><h2 className="text-xl font-semibold sm:text-2xl">{m.title}</h2><p className="mt-1.5 text-sm leading-relaxed text-muted">{m.creationIntro}</p></div>
    <Segmented label={m.creationTitle} value={enabled ? "voice" : "none"} onChange={(mode) => { setPlaying(null); onChange(mode === "voice" ? { voiceId: "", voiceName: "", autoFit: true } : null); }} options={[{ value: "voice", label: <span className="inline-flex items-center gap-2"><Mic2 className="size-4" />{m.withVoice}</span> }, { value: "none", label: m.withoutVoice }]} />
    {enabled && playing && <audio key={playing} src={voices.find((v) => v.id === playing)?.previewUrl ?? undefined} autoPlay onEnded={() => setPlaying(null)} onError={() => { setPlaying(null); setPlaybackError(true); }} />}
    {value && <>
      {!loaded && <p role="status" className="text-sm text-muted">{m.loadingVoices}</p>}
      {failed && <div role="alert" className="text-sm text-danger">{m.unavailable}<Button size="sm" variant="ghost" onClick={() => { setFailed(false); setLoaded(false); setReload((n) => n + 1); }}>{m.retry}</Button></div>}
      {loaded && !failed && !voices.length && <p className="text-sm text-muted">{m.noVoices}</p>}
      {loaded && !failed && voices.length > 0 && <ul role="radiogroup" aria-label={m.voice} className="flex max-h-80 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
        {voices.map((voice) => {
          const selected = voice.id === value.voiceId;
          const isPlaying = playing === voice.id;
          return <li key={voice.id} className={cn("flex min-w-0 items-center gap-3 rounded-2xl border-2 bg-surface p-2.5 pr-4 transition-colors", selected ? "border-accent" : "border-line hover:border-line-strong")}>
            <button type="button" disabled={!voice.previewUrl} aria-label={`${isPlaying ? t.app.create.music.pause : t.app.create.music.play} · ${voice.name}`} aria-pressed={isPlaying} onClick={() => { setPlaybackError(false); setPlaying(isPlaying ? null : voice.id); }} className={cn("grid size-11 shrink-0 place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40", isPlaying ? purpleButtonStyle : "bg-surface-2 text-fg hover:bg-surface-3")}>
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <button type="button" role="radio" aria-checked={selected} onClick={() => onChange({ ...value, voiceId: voice.id, voiceName: voice.name })}
              onKeyDown={(event) => {
                if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const index = voices.findIndex((v) => v.id === voice.id);
                const next = event.key === "Home" ? 0 : event.key === "End" ? voices.length - 1 : (index + (["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1) + voices.length) % voices.length;
                onChange({ ...value, voiceId: voices[next].id, voiceName: voices[next].name });
                event.currentTarget.closest("ul")?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
              }} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{voice.name}</span>{voice.language && <span className="mt-1 block text-xs text-muted">{voice.language}</span>}</span>
              <span aria-hidden="true" className={cn("grid size-5 shrink-0 place-items-center rounded-full border", selected ? "border-accent bg-accent text-accent-fg" : "border-line-strong")}>{selected && <Check className="size-3" />}</span>
            </button>
          </li>;
        })}
      </ul>}
      {playbackError && <p role="alert" className="text-xs text-danger">{m.sampleError}</p>}
      <label className="flex min-h-11 items-start gap-3 border-t border-line pt-5 text-sm"><input type="checkbox" checked={value.autoFit} onChange={(e) => onChange({ ...value, autoFit: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" /><span className="font-medium">{m.autoFit}<span className="mt-1.5 block text-xs leading-relaxed font-normal text-muted">{m.autoFitHelp}</span></span></label>
      <p className="text-xs leading-relaxed text-muted">{m.creationCost}</p>
    </>}
    {!enabled && <p className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-muted"><VolumeX className="mt-0.5 size-4 shrink-0 text-fg" />{m.noVoiceHint}</p>}
  </section>;
}

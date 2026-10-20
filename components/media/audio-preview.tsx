"use client";

import { useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/use-dictionary";

const timestamp = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** Native audio playback with controls from the site's design system. Mount with a source key. */
export function AudioPreview({ src, label }: { src: string; label: string }) {
  const t = useDictionary();
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);

  async function toggle() {
    if (!audio.current) return;
    if (!audio.current.paused) { audio.current.pause(); return; }
    setFailed(false); setLoading(true);
    try { if (audio.current.error) audio.current.load(); await audio.current.play(); }
    catch { setFailed(true); }
    finally { setLoading(false); }
  }

  return <div className="min-w-0">
    <audio ref={audio} src={src} preload="metadata" className="hidden" aria-hidden="true"
      onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(duration); }}
      onWaiting={() => setLoading(true)} onPlaying={() => setLoading(false)}
      onError={() => { setFailed(true); setPlaying(false); setLoading(false); }} />
    <div role="group" aria-label={label} className="flex min-w-0 items-center gap-3 rounded-xl border border-line-strong bg-surface-2/50 p-3">
      <Button variant="primary" size="icon" onClick={() => void toggle()} aria-label={`${playing ? t.app.create.music.pause : failed ? t.voiceover.retry : t.app.create.music.play} · ${label}`} aria-pressed={playing} aria-busy={loading}>
        {loading ? <Loader2 className="animate-spin" /> : playing ? <Pause /> : <Play className="translate-x-px" />}
      </Button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <input type="range" min="0" max={duration || 1} step="0.01" value={Math.min(time, duration || 1)} disabled={!duration || failed}
          aria-label={label} aria-valuetext={`${timestamp(time)} / ${timestamp(duration)}`}
          onChange={(e) => { const next = Number(e.target.value); if (audio.current) audio.current.currentTime = next; setTime(next); }}
          className="h-2 w-full cursor-pointer accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40" />
        <div className="flex justify-between text-xs text-muted tabular-nums"><span>{timestamp(time)}</span><span>{timestamp(duration)}</span></div>
      </div>
    </div>
    {failed && <p role="alert" className="mt-2 text-xs text-danger">{t.voiceover.sampleError}</p>}
  </div>;
}

"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Activity, Loader2 } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useState } from "react";
import { UploadZone } from "@/components/create/upload-zone";
import { Button } from "@/components/ui/button";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { MUSIC_LIBRARY } from "@/config/music";
import { detectTempo } from "@/lib/audio/tempo";
import { format } from "@/lib/i18n";
import { updateProjectSound } from "@/lib/projects/actions";
import type { AudioSettings } from "@/lib/projects/scenes";
import type { EditorProject, EditorVersion } from "@/lib/projects/types";
import type { UploadedFile } from "@/lib/storage/client";
import { cn } from "@/lib/utils";

type MusicMode = "library" | "upload" | "none";

/**
 * Fenêtre « Son » de l'éditeur : musique (bibliothèque, fichier, aucune), tempo détecté et réglages du son.
 * Un changement crée une nouvelle version, avec le tempo à jour (coupes et pulsations restent calées).
 */
export function SoundDialog({
  open,
  onClose,
  project,
  audio,
  onVersion,
}: {
  open: boolean;
  onClose: () => void;
  project: Pick<EditorProject, "id" | "media">;
  /** Réglages du son de la dernière version */
  audio: AudioSettings | undefined;
  onVersion: (version: EditorVersion) => void;
}) {
  const t = useDictionary();

  const m = t.app.sound;

  const { media } = project;
  const [mode, setMode] = useState<MusicMode>(media.music ? "upload" : media.musicTrackId ? "library" : "none");
  const [trackId, setTrackId] = useState(media.musicTrackId ?? MUSIC_LIBRARY[0]?.id ?? "");
  const [music, setMusic] = useState<UploadedFile[]>(media.music ? [media.music] : []);
  const [detecting, setDetecting] = useState(false);
  const [volume, setVolume] = useState(audio?.volume ?? 1);
  const [trimStart, setTrimStart] = useState(audio?.trimStart ?? 0);
  const [fadeIn, setFadeIn] = useState(audio?.fadeIn ?? false);
  const [fadeOut, setFadeOut] = useState(audio?.fadeOut ?? false);
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const file = music[0];

  /** Fichiers uploadés avant la détection automatique : on peut relancer l'analyse. */
  async function detect() {
    if (!file) return;
    setDetecting(true);
    const tempo = await detectTempo(await (await fetch(file.url)).blob());
    setDetecting(false);
    if (tempo) setMusic([{ ...file, ...tempo }]);
    else toast({ title: m.tempoUnknown, tone: "info" });
  }

  async function save() {
    setPending(true);
    try {
      const result = await updateProjectSound(project.id, {
        music: mode === "library" ? { mode, trackId } : mode === "upload" && file ? { mode, file } : { mode: "none" },
        audio: { volume, trimStart, fadeIn, fadeOut },
      });
      if (!result.ok) return toast({ title: result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      if (result.version) onVersion(result.version);
      router.refresh();
      toast({ title: m.saved, tone: "success" });
      onClose();
    } finally {
      setPending(false);
    }
  }

  const hasMusic = mode === "library" || (mode === "upload" && Boolean(file));

  return (
    <Dialog open={open} onClose={onClose} title={m.title} description={m.description} className="sm:max-w-xl">
      <div className="flex flex-col gap-5">
        <fieldset disabled={pending || applying} className="contents">
        <Segmented
          label={m.music}
          value={mode}
          onChange={setMode}
          className="w-full [&>button]:flex-1"
          options={[
            { value: "library", label: m.library },
            { value: "upload", label: m.upload },
            { value: "none", label: m.none },
          ]}
        />

        {mode === "library" && (
          <div className="flex flex-col gap-2">
            <select
              aria-label={m.library}
              value={trackId}
              onChange={(ev) => setTrackId(ev.target.value)}
              className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base outline-none focus:border-accent sm:text-sm"
            >
              {MUSIC_LIBRARY.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title} · {track.bpm} BPM
                </option>
              ))}
            </select>
            <audio key={trackId} src={MUSIC_LIBRARY.find((track) => track.id === trackId)?.src} controls preload="none" className="h-10 w-full" />
          </div>
        )}

        {mode === "upload" && (
          <div className="flex flex-col gap-2">
            <UploadZone label={m.upload} kind="audio" value={music} onChange={setMusic} hint={t.app.create.music.uploadHint} />
            {file && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <Activity className="size-4 text-accent-text" />
                {detecting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" /> {m.tempoDetecting}
                  </span>
                ) : file.bpm ? (
                  format(m.tempo, { bpm: Math.round(file.bpm * 10) / 10 })
                ) : (
                  <>
                    {m.tempoUnknown}
                    <Button size="sm" variant="soft" onClick={detect}>
                      {m.tempoDetect}
                    </Button>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {hasMusic && (
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-2/50 p-4">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{m.settings}</p>
            <Slider label={m.volume} value={Math.round(volume * 100)} min={0} max={100} unit="%" onChange={(v) => setVolume(v / 100)} />
            <Slider label={m.trimStart} value={trimStart} min={0} max={Math.max(60, Math.ceil(trimStart))} step={0.5} unit=" s" onChange={setTrimStart} />
            <div className="flex flex-wrap gap-2">
              <Toggle label={m.fadeIn} checked={fadeIn} onChange={setFadeIn} />
              <Toggle label={m.fadeOut} checked={fadeOut} onChange={setFadeOut} />
            </div>
          </div>
        )}

        </fieldset>
        <AnimatedApply disabled={pending || detecting || (mode === "library" && !trackId)} onApply={save} onCancel={onClose} onApplyingChange={setApplying} />
      </div>
    </Dialog>
  );
}

function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  const t = useDictionary();
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex justify-between">
        {label}
        <span className="font-mono text-xs text-muted tabular-nums">
          {value.toLocaleString(t.locale === "fr" ? "fr-FR" : "en-GB")}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(ev) => onChange(Number(ev.target.value))} className="w-full accent-[var(--accent)]" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", checked ? "border-accent bg-accent-soft text-accent-text" : "border-line text-muted hover:text-fg")}
    >
      {label}
    </button>
  );
}

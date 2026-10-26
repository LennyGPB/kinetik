"use client";

import { useState } from "react";
import { Check, Library, Upload, VolumeX } from "lucide-react";
import { MUSIC_LIBRARY, getTrack } from "@/config/music";
import type { UrlPreferences } from "@/lib/url-video/model";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { UploadZone } from "./upload-zone";
import { cn } from "@/lib/utils";

export function UrlMusicPicker({ preferences, onChange, onUploading, disabled }: {
  preferences: UrlPreferences; onChange: (value: UrlPreferences) => void; onUploading: (busy: boolean) => void; disabled: boolean;
}) {
  const t = useDictionary(), c = t.app.create.music;
  const [mode, setMode] = useState<"library" | "upload" | "none">(preferences.music ? "upload" : "library");
  const track = getTrack(preferences.musicTrackId);
  return <fieldset disabled={disabled} className="min-w-0">
    <legend className="sr-only">{c.heading}</legend>
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
      {([{ id: "library", label: c.library, Icon: Library }, { id: "upload", label: c.upload, Icon: Upload }, { id: "none", label: c.none, Icon: VolumeX }] as const).map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => {
        setMode(id);
        onChange({ ...preferences, music: id === "upload" ? preferences.music : null, musicTrackId: id === "library" ? preferences.musicTrackId : null });
      }} className={cn("flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 sm:text-sm", mode === id ? "bg-accent-soft text-accent-text" : "text-muted hover:text-fg")}><Icon className="hidden size-4 shrink-0 sm:block" aria-hidden /><span>{label}</span></button>)}
    </div>
    <div className="mt-4">
      {mode === "library" ? <>
        <div className="max-h-[26rem] overflow-y-auto overscroll-contain rounded-xl border border-line p-2">
          {MUSIC_LIBRARY.map((item) => <label key={item.id} className={cn("flex min-h-16 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-2", track?.id === item.id && "bg-accent-soft")}>
            <input type="radio" name="url-music-track" value={item.id} checked={track?.id === item.id} onChange={() => onChange({ ...preferences, music: null, musicTrackId: item.id })} className="size-4 shrink-0 accent-accent" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted">{item.bpm} BPM · {Math.floor(item.length / 60)}:{String(Math.floor(item.length % 60)).padStart(2, "0")}</span></span>
            {track?.id === item.id && <Check className="size-4 shrink-0 text-accent-text" aria-hidden />}
          </label>)}
        </div>
        {track && <audio key={track.id} controls preload="none" src={track.src} aria-label={track.title} className="mt-4 h-10 w-full" />}
      </> : mode === "upload" ? <>
        <UploadZone kind="audio" label={c.upload} value={preferences.music ? [preferences.music] : []} onChange={(files) => onChange({ ...preferences, music: files[0] ?? null, musicTrackId: null })} onBusyChange={onUploading} hint={c.uploadHint} />
        {preferences.music && <audio controls preload="metadata" src={preferences.music.url} aria-label={preferences.music.fileName} className="mt-4 h-10 w-full" />}
      </> : <p className="flex items-start gap-3 rounded-xl border border-line p-4 text-sm leading-relaxed text-muted"><VolumeX className="mt-0.5 size-4 shrink-0" aria-hidden />{c.noneHint}</p>}
    </div>
  </fieldset>;
}

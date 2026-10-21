"use client";

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import { Upload, ArrowRight, Film } from 'lucide-react';
import { decorName, type DecorId } from '@/config/decors';
import { getExportCost } from '@/config/credits';
import { publishCreditBalance } from '@/components/app/live-credit-balance';
import { useDictionary } from '@/lib/i18n/use-dictionary';
import { useRouter } from '@/lib/i18n/navigation';
import { decorCopy } from '@/lib/decors/copy';
import { decorPreview } from '@/lib/decors/preview';
import { createRecording } from '@/lib/recordings/actions';
import { uploadRecording } from '@/lib/recordings/upload';
import { RECORDING_MAX_BYTES, RECORDING_MAX_SECONDS } from '@/lib/recordings/model';
import { RecordingPreview } from '@/components/recordings/recording-preview';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';

type Source = { file: File; url: string; duration: number; width: number; height: number };
export function DecorCreate({ decorId, onBusy }: { decorId: DecorId; onBusy: (busy: boolean) => void }) {
  const { locale } = useDictionary(), c = decorCopy(locale), router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [fit, setFit] = useState<'contain' | 'cover'>('contain'), [audio, setAudio] = useState(true);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null), player = useRef<PlayerRef>(null), task = useRef<AbortController | null>(null);
  const [uploaded, setUploaded] = useState<{ source: File; file: Awaited<ReturnType<typeof uploadRecording>> } | null>(null);
  const probe = useRef<HTMLVideoElement | null>(null), pendingUrl = useRef<string | null>(null);
  const probeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { task.current?.abort(); if (probeTimer.current) clearTimeout(probeTimer.current); if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current); if (probe.current) { probe.current.onloadedmetadata = null; probe.current.onerror = null; probe.current.removeAttribute('src'); probe.current.load(); } onBusy(false); }, [onBusy]);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  function select(file: File) {
    if (busy || loading) return;
    setError('');
    if (file.size > RECORDING_MAX_BYTES) { setError(c.tooLarge); return; }
    if (!/\.(mp4|mov)$/i.test(file.name)) { setError(c.genericError); return; }
    setLoading(true); onBusy(true);
    const url = URL.createObjectURL(file), video = document.createElement('video');
    pendingUrl.current = url; probe.current = video; video.preload = 'metadata';
    const finish = () => { if (probeTimer.current) clearTimeout(probeTimer.current); probeTimer.current = null; setLoading(false); onBusy(false); probe.current = null; video.removeAttribute('src'); video.load(); pendingUrl.current = null; };
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration < 1 || video.duration > RECORDING_MAX_SECONDS || !video.videoWidth) { URL.revokeObjectURL(url); setError(c.duration); }
      else { setSource({ file, url, duration: video.duration, width: video.videoWidth, height: video.videoHeight }); setUploaded(null); }
      video.onloadedmetadata = null; video.onerror = null; finish();
    };
    video.onerror = () => { URL.revokeObjectURL(url); setError(c.genericError); video.onloadedmetadata = null; video.onerror = null; finish(); };
    probeTimer.current = setTimeout(() => { URL.revokeObjectURL(url); setError(c.genericError); video.onloadedmetadata = null; video.onerror = null; finish(); }, 15000);
    video.src = url;
    if (input.current) input.current.value = '';
  }
  async function create() {
    if (!source || busy || task.current) return;
    const controller = new AbortController(); task.current = controller;
    setBusy(true); onBusy(true); setError(''); setProgress(0);
    try {
      let file = uploaded?.source === source.file ? uploaded.file : null;
      if (!file) {
        const paid = await uploadRecording(source.file, setProgress, controller.signal, 'decor');
        controller.signal.throwIfAborted();
        setUploaded({ source: source.file, file: paid });
        publishCreditBalance(paid.balance);
        file = paid;
      }
      controller.signal.throwIfAborted();
      const props = decorPreview({ decorId, src: file.url, duration: file.duration, width: file.width, height: file.height, fit, audio, locale });
      const result = await createRecording({ name: source.file.name.replace(/\.[^.]+$/, '').slice(0,40) || decorName(decorId, locale), file, settings: props.graph.recording!, format: 'LANDSCAPE', musicTrackId: null });
      if (result && !result.ok) setError(result.error === 'rate_limited' ? c.limited : c.genericError);
    } catch (e) {
      if (e instanceof Error && e.message.includes('NEXT_REDIRECT')) throw e;
      const code = e instanceof Error ? e.message : '';
      if (!controller.signal.aborted) setError(code === 'insufficient_credits' ? c.insufficient : code === 'storage_quota' ? c.quota : code === 'rate_limited' ? c.limited : code === 'duration' ? c.duration : c.genericError);
    } finally { task.current = null; setBusy(false); onBusy(false); router.refresh(); }
  }
  // Never mount a player with the selected video before the server confirms payment.
  const paid = source && uploaded?.source === source.file ? uploaded.file : null;
  const props = paid ? decorPreview({ decorId, src: paid.url, duration: paid.duration, width: paid.width, height: paid.height, fit, audio, locale }) : null;
  return <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
    <div className="min-w-0">
      {props ? <RecordingPreview videoProps={props} playerRef={player} showTimeline={false} /> : <div className="relative aspect-video overflow-hidden rounded-xl"><Image src={`/decors/prepared/${decorId}-thumb.webp`} alt={decorName(decorId, locale)} fill sizes="(min-width:1024px) 650px, 90vw" className="object-cover" /></div>}
      <button type="button" disabled={busy || loading} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); if (!busy && !loading) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) select(file); }} className={`mt-4 flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-5 py-5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait ${dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:bg-surface-2'}`}>
        {source ? <Film className="size-5 text-accent-text" aria-hidden /> : <Upload className="size-5 text-accent-text" aria-hidden />}
        <span className="text-sm font-medium">{loading ? c.preview + '…' : source ? c.replace : c.drop}</span>
        <span className="text-xs text-muted">{source ? source.file.name : c.browse}</span>
      </button>
      <input ref={input} type="file" accept="video/mp4,video/quicktime,.mp4,.mov" aria-label={c.upload} className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) select(file); }} />
      <p className="mt-3 text-xs text-muted">{c.formats}</p>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    </div>
    <aside className="flex flex-col gap-5">
      <fieldset disabled={busy || loading} className="space-y-5">
        <div><h3 className="mb-3 text-sm font-medium">{c.fit}</h3><Segmented size="sm" label={c.fit} value={fit} onChange={setFit} options={[{value:'contain',label:c.contain},{value:'cover',label:c.cover}]} /><p className="mt-3 text-xs leading-relaxed text-muted">{c.fitHelp}</p></div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-accent" checked={audio} onChange={e => setAudio(e.target.checked)} />{c.audio}</label>
      </fieldset>
      <div className="mt-auto border-t border-line pt-5"><p className="text-sm font-medium text-accent-text">{paid ? c.saved : c.free}</p><p className="mt-2 text-xs text-muted">{source ? `${getExportCost({duration:paid?.duration ?? source.duration, decor:true})} ${locale === 'fr' ? 'crédits à l’export' : 'credits to export'} · ${Math.ceil(paid?.duration ?? source.duration)} s` : c.cost}</p></div>
      <Button className="w-full" loading={busy} disabled={!source || busy || loading} onClick={() => void create()}>{paid ? c.create : c.unlock}<ArrowRight /></Button>
      {busy && <div role="status" className="space-y-2 text-xs text-muted"><p>{progress < 100 ? `${c.uploading} · ${progress}%` : c.creating}</p><progress aria-label={c.uploading} value={progress} max={100} className="h-1 w-full accent-accent" /></div>}
    </aside>
  </div>;
}

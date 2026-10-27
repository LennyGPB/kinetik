"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, RotateCcw, Send, Trash2 } from "lucide-react";
import { Player } from "@/components/editor/player";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { VIDEO_FORMATS } from "@/config/formats";
import {
  captureThumbnail, deleteMotion, publishMotion, removeStudioAsset, removeThumbnail, renameMotion, restoreStudioMessage, saveStudioCode, sendStudioMessage, setMotionFlags, uploadStudioAsset, uploadThumbnail,
} from "@/lib/custom-motion/admin-actions";
import { demoIssues } from "@/lib/custom-motion/contract";
import { customPreviewProps } from "@/lib/custom-motion/graph";
import type { StudioView } from "@/lib/custom-motion/studio-queries";
import { cn } from "@/lib/utils";
import { onCustomMotionError } from "@/remotion/custom/runtime";

type Tab = "settings" | "code" | "images" | "versions";

/** Studio « Claude privé » : conversation avec Claude à gauche, aperçu en direct et détails à droite. */
export function Studio({ initial }: { initial: StudioView }) {
  const [studio, setStudio] = useState(initial);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [format, setFormat] = useState<"LANDSCAPE" | "PORTRAIT" | "SQUARE">(initial.meta?.formats[0] ?? "LANDSCAPE");
  const [tab, setTab] = useState<Tab>("settings");
  const [pending, startTransition] = useTransition();
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => onCustomMotionError(setRuntimeError), []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "end" }); }, [studio.messages.length, sending]);

  const formats = studio.meta?.formats ?? [];
  const shownFormat = formats.includes(format) ? format : formats[0] ?? "LANDSCAPE";
  const issues = studio.meta && studio.demo ? demoIssues(studio.meta, studio.demo) : [];
  const ready = Boolean(studio.compiled && studio.meta && studio.demo && !issues.length);

  const apply = (result: { ok: true; studio: StudioView } | { ok: false; error: string }) => {
    if (result.ok) {
      // Nouveau code : l'erreur relevée dans l'aperçu ne le concerne plus
      if (result.studio.compiled !== studio.compiled) setRuntimeError(null);
      setStudio(result.studio);
      setError(null);
    }
    else setError(result.error);
  };

  async function send() {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setStudio((s) => ({ ...s, messages: [...s.messages, { id: `local-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString(), restorable: false }] }));
    setMessage("");
    try {
      apply(await sendStudioMessage(studio.id, text, runtimeError));
    } catch {
      setError("La demande a échoué (délai dépassé ou session admin expirée). Recharge la page.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <input
          defaultValue={studio.name}
          aria-label="Nom de la vidéo"
          maxLength={60}
          onBlur={(e) => { const name = e.target.value.trim(); if (name && name !== studio.name) startTransition(async () => { const r = await renameMotion(studio.id, name); if (r.ok) setStudio((s) => ({ ...s, name })); }); }}
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none focus:underline"
        />
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", studio.published ? "bg-green-500/15 text-green-500" : "bg-surface-2 text-muted")}>{studio.published ? "En ligne" : "Brouillon"}</span>
        <Button size="sm" disabled={!ready || pending || sending} onClick={() => startTransition(async () => apply(await publishMotion(studio.id)))} title={ready ? "Fige l’état actuel en nouvelle version, visible dans la galerie" : "Il faut un code qui compile, des réglages et une démo cohérents"}>
          Publier {studio.versions.length ? `la v${studio.versions[0].number + 1}` : ""}
        </Button>
        {studio.versions.length > 0 && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => apply(await setMotionFlags(studio.id, { published: !studio.published })))}>
            {studio.published ? "Retirer de la galerie" : "Remettre dans la galerie"}
          </Button>
        )}
        <Button size="sm" variant={studio.popular ? "soft" : "ghost"} disabled={pending} onClick={() => startTransition(async () => apply(await setMotionFlags(studio.id, { popular: !studio.popular })))}>
          {studio.popular ? "★ Populaire" : "☆ Populaire"}
        </Button>
        <Button size="icon" variant="ghost" aria-label="Supprimer" disabled={pending} onClick={() => { if (confirm("Supprimer cette vidéo du studio ?")) startTransition(async () => { const r = await deleteMotion(studio.id); if (r && !r.ok) setError(r.error); }); }}>
          <Trash2 className="size-4" />
        </Button>
      </header>
      {error && <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* Conversation */}
        <section aria-label="Conversation avec Claude" className="flex h-[75dvh] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!studio.messages.length && <p className="text-sm text-muted">Décris la vidéo : ambiance, scènes, textes, effets, rythme. Claude écrit le code, déclare ce que l’utilisateur pourra changer et prépare un contenu par défaut.</p>}
            {studio.messages.map((m) => (
              <div key={m.id} className={cn("rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap", m.role === "user" ? "ml-8 bg-accent-soft text-fg" : "mr-4 bg-surface-2")}>
                {m.content}
                {m.restorable && (
                  <button type="button" disabled={pending || sending} onClick={() => { if (confirm("Revenir au code, aux réglages et à la démo de ce moment ?")) startTransition(async () => apply(await restoreStudioMessage(studio.id, m.id))); }} className="mt-2 flex items-center gap-1 text-xs text-muted hover:text-fg">
                    <RotateCcw className="size-3" /> Revenir à cet état
                  </button>
                )}
              </div>
            ))}
            {sending && <p className="animate-pulse text-sm text-accent-text">Claude travaille… (1 à 4 minutes pour une nouvelle vidéo)</p>}
            <div ref={chatEnd} />
          </div>
          {runtimeError && (
            <p className="border-t border-line bg-danger/10 px-4 py-2 text-xs text-danger">Erreur dans l’aperçu : elle sera envoyée à Claude avec ton prochain message.</p>
          )}
          <form className="flex items-end gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }}
              rows={3}
              maxLength={8000}
              placeholder={runtimeError ? "Ex. : corrige l’erreur" : "Ex. : une intro néon qui se dessine sur le beat…"}
              className="min-h-20 flex-1 resize-none rounded-xl border border-line-strong bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <Button type="submit" size="icon" aria-label="Envoyer (Ctrl + Entrée)" disabled={!message.trim() || sending} loading={sending}><Send className="size-4" /></Button>
          </form>
        </section>

        {/* Aperçu et détails */}
        <section aria-label="Aperçu" className="flex min-w-0 flex-col gap-4">
          {formats.length > 1 && <Segmented label="Format" size="sm" value={shownFormat} onChange={setFormat} options={formats.map((id) => ({ value: id, label: VIDEO_FORMATS[id].ratio }))} />}
          {studio.compiled && studio.meta && studio.demo && !issues.length ? (
            <Player preview key={`${shownFormat}-${studio.compiled.length}-${JSON.stringify(studio.demo).length}`} videoProps={customPreviewProps({ code: studio.compiled, meta: studio.meta, assets: studio.assets }, studio.demo, shownFormat, "fr")} />
          ) : (
            <div className="grid aspect-video place-items-center rounded-3xl border border-dashed border-line-strong text-center text-sm text-muted">
              <p className="max-w-sm px-6">{issues.length ? `Démo incohérente : ${issues.join(" ; ")}` : "L’aperçu apparaîtra dès que Claude aura écrit le code, les réglages et la démo."}</p>
            </div>
          )}

          <nav className="flex gap-1.5">
            {([["settings", "Réglages"], ["code", "Code"], ["images", "Images"], ["versions", "Versions"]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={cn("h-8 rounded-full px-3.5 text-sm font-medium", tab === id ? "bg-fg text-bg" : "text-muted hover:text-fg")}>{label}</button>
            ))}
          </nav>
          {tab === "settings" && <SettingsTab studio={studio} />}
          {tab === "code" && <CodeTab key={studio.source.length} studio={studio} onSaved={setStudio} />}
          {tab === "images" && <ImagesTab studio={studio} onChange={apply} />}
          {tab === "versions" && (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
              {studio.versions.length ? studio.versions.map((v) => (
                <li key={v.number} className="flex justify-between px-4 py-2.5"><span>Version {v.number}</span><span className="text-muted">{new Date(v.createdAt).toLocaleString("fr-FR")} · {v.projects} projet{v.projects > 1 ? "s" : ""}</span></li>
              )) : <li className="px-4 py-3 text-muted">Pas encore publiée. Les projets des utilisateurs restent sur la version qu’ils ont choisie.</li>}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SettingsTab({ studio }: { studio: StudioView }) {
  const { meta, demo } = studio;
  if (!meta) return <p className="text-sm text-muted">Pas encore de réglages déclarés.</p>;
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4 text-sm">
      <p className="text-muted">Formats : {meta.formats.map((f) => VIDEO_FORMATS[f].ratio).join(", ")} · {meta.minScenes} à {meta.maxScenes} scènes · logo {meta.usesLogo ? "oui" : "non"} · photos : {meta.photos}</p>
      <div className="flex flex-wrap gap-3">
        {meta.colors.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5"><span className="size-4 rounded-full ring-1 ring-line" style={{ background: demo?.colors[i] }} />{c.label}</span>
        ))}
      </div>
      <ul className="space-y-2">
        {meta.sceneTypes.map((t) => (
          <li key={t.type} className="rounded-xl bg-surface-2 px-3 py-2">
            <span className="font-semibold">{t.label}</span> <span className="text-muted">({t.type}) · {t.minDuration} à {t.maxDuration} s · {t.repeatable ? "répétable" : "fixe"}</span>
            <div className="text-xs text-muted">{t.texts.length ? t.texts.map((f) => `${f.label} (${f.max})`).join(" · ") : "aucun texte"}</div>
          </li>
        ))}
      </ul>
      {demo && <p className="text-muted">Démo : {demo.scenes.length} scènes · {demo.scenes.reduce((s, x) => s + x.duration, 0).toFixed(1)} s · musique {demo.musicTrackId ?? "aucune"}</p>}
    </div>
  );
}

function CodeTab({ studio, onSaved }: { studio: StudioView; onSaved: (studio: StudioView) => void }) {
  const [code, setCode] = useState(studio.source);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={24} className="w-full rounded-2xl border border-line bg-bg p-3 font-mono text-xs leading-relaxed outline-none focus:border-accent" />
      {errors.length > 0 && <ul className="text-xs text-danger">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <Button size="sm" className="self-end" disabled={code === studio.source} loading={pending} onClick={() => startTransition(async () => {
        const result = await saveStudioCode(studio.id, code);
        if (result.ok) { onSaved(result.studio); setErrors(result.errors); }
      })}>Enregistrer le code</Button>
    </div>
  );
}

function ImagesTab({ studio, onChange }: { studio: StudioView; onChange: (result: { ok: true; studio: StudioView } | { ok: false; error: string }) => void }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
    <ThumbnailPanel studio={studio} onChange={onChange} />
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 text-sm">
      <p className="text-muted">Images utilisables par Claude dans le code via <code>props.assets[&quot;nom&quot;]</code>. Préviens-le dans le chat de ce qu’elles représentent.</p>
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="nom (ex. texture)" maxLength={32} className="h-9 w-44 rounded-full border border-line-strong bg-bg px-3 text-sm outline-none focus:border-accent" />
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file || !name.trim()) return;
          const form = new FormData();
          form.set("file", file);
          form.set("name", name);
          startTransition(async () => { onChange(await uploadStudioAsset(studio.id, form)); setName(""); });
          e.target.value = "";
        }} />
        <Button size="sm" variant="outline" disabled={!name.trim()} loading={pending} onClick={() => input.current?.click()}><ImagePlus className="size-4" /> Ajouter une image</Button>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {Object.entries(studio.assets).map(([key, url]) => (
          <li key={key} className="overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element -- fichier privé servi par /api/uploads */}
            <img src={url} alt={key} className="aspect-square w-full object-cover" />
            <div className="flex items-center justify-between px-2 py-1 text-xs"><span className="truncate">{key}</span><button type="button" aria-label={`Retirer ${key}`} onClick={() => startTransition(async () => onChange(await removeStudioAsset(studio.id, key)))} className="text-muted hover:text-danger"><Trash2 className="size-3.5" /></button></div>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}

/** Miniature de la carte dans la galerie : image de la démo à un instant donné, ou image envoyée. */
function ThumbnailPanel({ studio, onChange }: { studio: StudioView; onChange: (result: { ok: true; studio: StudioView } | { ok: false; error: string }) => void }) {
  const total = studio.demo?.scenes.reduce((sum, scene) => sum + scene.duration, 0) ?? 0;
  const [seconds, setSeconds] = useState(() => Math.round(total * 0.4 * 10) / 10);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element -- image publique servie par /api/uploads */}
        {studio.thumbnail && <img src={studio.thumbnail} alt="Miniature" className="size-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-semibold">Miniature de la galerie</p>
        <p className="text-xs text-muted">Image de la démo à l’instant choisi (en 9:16 si la vidéo le gère), ou ta propre image. Sans miniature, la carte montre un dégradé.</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            À
            <input type="number" min={0} max={total} step={0.1} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="h-9 w-20 rounded-full border border-line-strong bg-bg px-3 text-sm text-fg outline-none focus:border-accent" />
            s
          </label>
          <Button size="sm" variant="outline" disabled={!studio.compiled || !studio.demo} loading={pending} onClick={() => startTransition(async () => onChange(await captureThumbnail(studio.id, seconds)))}>Capturer</Button>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.set("file", file);
            startTransition(async () => onChange(await uploadThumbnail(studio.id, form)));
            e.target.value = "";
          }} />
          <Button size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}><ImagePlus className="size-4" /> Envoyer une image</Button>
          {studio.thumbnail && <button type="button" aria-label="Retirer la miniature" disabled={pending} onClick={() => startTransition(async () => onChange(await removeThumbnail(studio.id)))} className="text-muted hover:text-danger"><Trash2 className="size-4" /></button>}
        </div>
      </div>
    </div>
  );
}

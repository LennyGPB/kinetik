"use client";

import { Check, Monitor, Smartphone } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { UploadedFile } from "@/lib/storage/client";
import { cn } from "@/lib/utils";

const errors: Record<string, string> = {
  invalid_url: "Indique le lien HTTP ou HTTPS d’un site public.",
  rate_limited: "Trop de captures en cours. Réessaie dans quelques minutes.",
  unauthorized: "Reconnecte-toi pour importer des captures.",
  browser_unavailable: "Le service de capture n’est pas disponible pour le moment. Tu peux importer tes images manuellement.",
  site_unavailable: "Cette page est inaccessible ou bloque la capture. Essaie un autre lien public.",
  capture_timeout: "La page met trop de temps à charger. Réessaie ou importe tes images.",
};

export function WebsiteCapture({ value, onChange, initialUrl = "", disabled = false }: {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  initialUrl?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const [url, setUrl] = useState(initialUrl);
  const [format, setFormat] = useState<"desktop" | "mobile">("desktop");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const remaining = Math.max(0, 8 - value.length);

  async function capture() {
    if (!url.trim() || pending) return;
    setPending(true); setError(""); setNotice(""); setFiles([]); setSelected([]);
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim(), format }), signal: controller.current.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "capture_failed");
      setFiles(result.files);
      setSelected(result.files.slice(0, Math.max(0, 8 - latest.current.length)).map((file: UploadedFile) => file.url));
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(errors[cause instanceof Error ? cause.message : ""] ?? "Impossible de capturer ce site. Essaie un autre lien ou importe tes images.");
    } finally { setPending(false); }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line-strong bg-bg p-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-fg">Capturer depuis un lien</label>
        <p className="mt-1 text-xs leading-relaxed text-muted">Une page publique, jusqu’à trois captures. Les espaces connectés restent à importer manuellement.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id={id} type="url" inputMode="url" autoComplete="url" value={url} disabled={pending || disabled} onChange={(event) => setUrl(event.target.value)} placeholder="https://ton-site.com" className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg outline-none focus:border-accent disabled:opacity-50" />
        <div className="flex shrink-0 gap-1" role="group" aria-label="Format des captures">
          {(["desktop", "mobile"] as const).map((item) => {
            const Icon = item === "desktop" ? Monitor : Smartphone;
            return <button key={item} type="button" disabled={pending || disabled} aria-pressed={format === item} onClick={() => setFormat(item)} className={cn("flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", format === item ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-black text-white hover:border-accent")}><Icon className="size-3.5" aria-hidden />{item === "desktop" ? "Desktop" : "Mobile"}</button>;
          })}
        </div>
        <Button loading={pending} disabled={disabled || !url.trim() || !remaining} onClick={capture} className="cursor-pointer rounded-lg">{pending ? "Capture…" : "Capturer"}</Button>
      </div>
      <div aria-live="polite">
        {pending && <p className="text-xs text-muted">Chargement de la page et de ses images… Cela peut prendre quelques secondes.</p>}
        {error && <p role="alert" className="text-xs leading-relaxed text-danger">{error}</p>}
        {notice && <p className="text-xs text-accent-text">{notice}</p>}
        {!remaining && <p className="text-xs text-muted">8 screens maximum. Retire une image pour en ajouter une autre.</p>}
      </div>
      {files.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {files.map((file, index) => {
              const checked = selected.includes(file.url);
              return (
                <button key={file.url} type="button" disabled={disabled || (!checked && selected.length >= remaining)} aria-pressed={checked} aria-label={`Sélectionner la capture ${index + 1}`} onClick={() => setSelected((current) => checked ? current.filter((url) => url !== file.url) : [...current, file.url])} className={cn("relative cursor-pointer overflow-hidden rounded-lg border-2 bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40", checked ? "border-accent" : "border-line hover:border-accent")}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- image capturée et stockée par Kinetik */}
                  <img src={file.url} alt={`Capture ${index + 1} du site`} className="aspect-[4/3] w-full object-contain" />
                  {checked && <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent text-accent-fg"><Check className="size-3" aria-hidden /></span>}
                </button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" disabled={disabled || !selected.length || !remaining} className="cursor-pointer self-end" onClick={() => {
            const additions = files.filter((file) => selected.includes(file.url)).slice(0, Math.max(0, 8 - latest.current.length));
            onChange([...latest.current, ...additions]);
            setFiles([]); setSelected([]); setNotice(`${additions.length} capture${additions.length > 1 ? "s ajoutées" : " ajoutée"} aux screens.`);
          }}>Ajouter {Math.min(selected.length, remaining)} capture{Math.min(selected.length, remaining) > 1 ? "s" : ""}</Button>
        </>
      )}
    </div>
  );
}

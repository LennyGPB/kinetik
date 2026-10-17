"use client";

import { purpleButtonStyle } from "@/components/ui/button";


import { format } from "@/lib/i18n";

import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Check, ChevronLeft, ChevronRight, Loader2, Maximize2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { UploadedFile } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import type { WebsiteAnalysis } from "./use-website-analysis";

export function WebsiteSuggestions({ analysis, retry, screens, onScreens }: {
  analysis: WebsiteAnalysis;
  retry: () => void;
  screens: UploadedFile[];
  onScreens: (screens: UploadedFile[]) => void;
}) {
  const t = useDictionary();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const closePreview = useCallback(() => setPreviewUrl(null), []);
  const previewIndex = analysis.files.findIndex((file) => file.url === previewUrl);
  const preview = analysis.status === "ready" ? analysis.files[previewIndex] : undefined;
  const previewSelected = screens.some((file) => file.url === preview?.url);
  if (analysis.status === "idle") return null;
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line-strong bg-surface p-3" aria-label={t.copy["8a7ab24ab01a"]}>
      <div>
        <h3 className="text-sm font-semibold">{t.copy["7ef256fa20e6"]}</h3>
        <p className="mt-1 text-xs text-muted">{t.copy["4883a35ab5c1"]}</p>
      </div>
      {analysis.status === "loading" ? (
        <div role="status" aria-live="polite" className="capture-loading-panel rounded-xl border border-accent/40 bg-accent-soft p-4">
          <div className="flex items-center gap-3">
            <span className="capture-loading-icon grid size-11 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/15 text-accent-text" aria-hidden>
              <Loader2 className="capture-loading-spinner size-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">{t.copy["11cb15899d42"]}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t.copy["ac8239ed5dc7"]}</p>
            </div>
          </div>
          <div aria-hidden className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="capture-loading-card relative aspect-[4/3] overflow-hidden rounded-lg border border-accent/25 bg-bg p-2 sm:p-3" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="mb-2 flex gap-1">{[0, 1, 2].map((dot) => <span key={dot} className="size-1 rounded-full bg-muted/40" />)}</div>
                <div className="h-2 w-3/4 rounded bg-accent/35" />
                <div className="mt-2 h-1 w-full rounded bg-surface-3" />
                <div className="mt-1 h-1 w-2/3 rounded bg-surface-3" />
                <div className="mt-3 h-8 rounded bg-accent/15 sm:h-12" />
                <div className="capture-loading-scan pointer-events-none absolute inset-x-0 top-0 h-1/3 border-b-2 border-accent bg-gradient-to-t from-accent/25 to-transparent" style={{ animationDelay: `${index * 0.35}s` }} />
              </div>
            ))}
          </div>
        </div>
      ) : <WebsiteAnalysisStatus analysis={analysis} retry={retry} />}
      {analysis.status === "ready" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {analysis.files.map((file, index) => {
            const selected = screens.some((screen) => screen.url === file.url);
            return (
              <div key={file.url} className="relative min-w-0">
              <button type="button" aria-pressed={selected} disabled={!selected && screens.length >= 8} onClick={() => onScreens(selected ? screens.filter((screen) => screen.url !== file.url) : [...screens, file])} className={cn("w-full cursor-pointer overflow-hidden rounded-lg border-2 bg-bg transition-colors disabled:cursor-not-allowed disabled:opacity-40", selected ? "border-accent" : "border-line-strong hover:border-accent")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- capture stockée par Kinetik */}
                <img src={file.url} alt={format(t.copy["5e1239568775"], { p0: index + 1 })} className="aspect-[4/3] w-full object-contain" />
                <span className="flex items-center justify-between gap-2 border-t border-line px-2 py-2 text-xs text-fg">

                  {t.copy["1900b478a586"]} {index + 1}
                  <span className={cn("grid size-5 place-items-center rounded border", selected ? "border-accent bg-accent text-accent-fg" : "border-line-strong")}>{selected && <Check className="size-3" aria-hidden />}</span>
                </span>
              </button>
              <button type="button" onClick={() => setPreviewUrl(file.url)} aria-label={`Agrandir la capture ${index + 1}`} title={t.copy["88c7e3b5554f"]} className="absolute top-2 right-2 grid size-9 cursor-pointer place-items-center rounded-lg border border-white/20 bg-black/85 text-white transition-colors hover:border-accent hover:bg-accent focus-visible:outline-2 focus-visible:outline-accent">
                <Maximize2 className="size-4" aria-hidden />
              </button>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={Boolean(preview)} onClose={closePreview} title={format(t.copy["5e1239568775"], { p0: previewIndex + 1 })} className="sm:max-w-[94vw]">
        {preview && <>
          <div className="flex items-center justify-center overflow-hidden rounded-xl border border-line bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçu de la capture originale */}
            <img src={preview.url} alt={format(t.copy["3ac74098b4d2"], { p0: previewIndex + 1 })} className="max-h-[65dvh] w-full object-contain" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" aria-label={t.copy["488e25152736"]} disabled={previewIndex <= 0} onClick={() => setPreviewUrl(analysis.files[previewIndex - 1].url)} className="grid size-10 cursor-pointer place-items-center rounded-lg border border-line-strong bg-black text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" /></button>
              <span className="font-mono text-xs text-muted">{previewIndex + 1} / {analysis.files.length}</span>
              <button type="button" aria-label={t.copy["dd375560b0f4"]} disabled={previewIndex >= analysis.files.length - 1} onClick={() => setPreviewUrl(analysis.files[previewIndex + 1].url)} className="grid size-10 cursor-pointer place-items-center rounded-lg border border-line-strong bg-black text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="size-4" /></button>
            </div>
            <button type="button" aria-pressed={previewSelected} disabled={!previewSelected && screens.length >= 8} onClick={() => onScreens(previewSelected ? screens.filter((file) => file.url !== preview.url) : [...screens, preview])} className={cn("flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40", previewSelected ? purpleButtonStyle : "border-line-strong bg-black text-white hover:border-accent hover:bg-accent")}>
              {previewSelected && <Check className="size-4" aria-hidden />}{previewSelected ? t.copy["9cc75a37d7ea"] : t.copy["b6ef413dd1af"]}
            </button>
          </div>
        </>}
      </Dialog>
    </section>
  );
}

export function WebsiteAnalysisStatus({ analysis, retry }: { analysis: WebsiteAnalysis; retry: () => void }) {
  const t = useDictionary();

  return (
    <div aria-live="polite">
      {analysis.status === "loading" && <p className="flex items-center gap-2 text-xs text-muted"><Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />{t.copy["231029aa89a5"]}</p>}
      {analysis.status === "error" && <div className="flex flex-col items-start gap-2"><p className="text-xs leading-relaxed text-muted">{analysis.error}</p><button type="button" onClick={retry} className="min-h-9 cursor-pointer rounded-lg border border-line-strong bg-black px-3 text-xs font-medium text-white hover:border-accent hover:bg-accent">{t.copy["af273d956b5b"]}</button></div>}
    </div>
  );
}

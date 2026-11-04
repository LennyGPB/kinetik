"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { RestoCopy } from "@/lib/resto/copy";
import type { PreparedPhoto } from "@/lib/resto/photo-actions";
import type { UploadedFile } from "@/lib/storage/client";
import { cn } from "@/lib/utils";

/** Après l'envoi : l'IA regarde la photo, puis le restaurateur choisit la version améliorée ou l'originale. */
export function PhotoChoice({ copy, analyzing, prepared, original, useImproved, onChange, disabled }: {
  copy: RestoCopy; analyzing: boolean; prepared: PreparedPhoto | null; original: UploadedFile | null; useImproved: boolean; onChange: (improved: boolean) => void; disabled?: boolean;
}) {
  if (analyzing) return <p role="status" className="flex items-center gap-2 text-sm text-muted"><Sparkles className="size-4 animate-pulse text-violet-500" />{copy.ai.analyzing}</p>;
  if (!prepared || !original) return null;
  const options = [{ improved: true, url: prepared.improved.url, label: copy.ai.improved }, { improved: false, url: original.url, label: copy.ai.original }];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button key={o.label} type="button" aria-pressed={useImproved === o.improved} disabled={disabled} onClick={() => onChange(o.improved)}
            className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl border-2 p-1.5 pr-3 text-left text-sm font-medium transition-colors", useImproved === o.improved ? "border-violet-500 bg-violet-500/10" : "border-line hover:border-line-strong")}>
            <span className="relative size-11 shrink-0 overflow-hidden rounded-lg"><Image src={o.url} alt="" fill sizes="44px" className="object-cover" unoptimized /></span>
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{prepared.analysis ? (prepared.disc ? copy.ai.doneWithPlate : copy.ai.done) : copy.ai.noAnalysis}</p>
    </div>
  );
}

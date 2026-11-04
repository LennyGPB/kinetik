"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { generateRestoCaption } from "@/lib/resto/caption-actions";
import { spaceCopy } from "@/lib/resto/space-copy";

/** Légende prête à copier sous le post : écrite à la demande (ou tout de suite avec `auto`), à partir des seuls faits du contenu. */
export function CaptionCard({ projectId, initial, auto = false }: { projectId: string; initial: string | null; auto?: boolean }) {
  const t = useDictionary();
  const c = spaceCopy(t.locale).caption;
  const [caption, setCaption] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  async function generate(regenerate = false) {
    setLoading(true); setFailed(false);
    const result = await generateRestoCaption(projectId, regenerate).catch(() => null);
    setLoading(false);
    if (result?.ok) setCaption(result.caption); else setFailed(true);
  }

  useEffect(() => {
    if (!auto || initial || started.current) return;
    started.current = true;
    void generate();
  }, [auto, initial]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="w-full rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase"><Sparkles className="size-3.5 text-violet-500" />{c.title}</h2>
        {caption && <div className="flex gap-1">
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => void generate(true)} aria-label={c.again}><RefreshCw className={loading ? "animate-spin" : undefined} /></Button>
          <Button variant="soft" size="sm" onClick={() => void navigator.clipboard.writeText(caption).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>{copied ? <Check /> : <Copy />}{copied ? c.copied : c.copy}</Button>
        </div>}
      </div>
      {caption ? <p className="mt-3 text-sm whitespace-pre-line">{caption}</p>
        : <div className="mt-3 flex flex-col items-start gap-2">
          <p className="text-sm text-muted">{loading ? c.writing : c.hint}</p>
          {!loading && <Button variant="outline" size="sm" onClick={() => void generate()}><Sparkles />{c.write}</Button>}
        </div>}
      {failed && <p role="alert" className="mt-2 text-xs text-danger">{c.error}</p>}
    </section>
  );
}

"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Check, Copy, ExternalLink, Link2, Link2Off } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";

import { setShareLink } from "@/lib/projects/actions";

/** Lien public en lecture seule vers la dernière version (page /share/<token>). */
export function ShareDialog({ open, onClose, projectId, token, onToken }: { open: boolean; onClose: () => void; projectId: string; token: string | null; onToken: (token: string | null) => void }) {
  const t = useDictionary();

  const s = t.app.share;

  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  // Le dialog ne s'affiche qu'au clic (côté client) ; la garde évite une erreur au rendu serveur
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : "";

  function toggle(enabled: boolean) {
    startTransition(async () => {
      const result = await setShareLink(projectId, enabled);
      if (!result.ok) return toast({ title: t.common.error, tone: "error" });
      onToken(result.token);
    });
  }

  /** Création du lien : renvoie une promesse pour que le bouton glissé attende la réponse. */
  async function enable() {
    const result = await setShareLink(projectId, true);
    if (!result.ok) return void toast({ title: t.common.error, tone: "error" });
    onToken(result.token);
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: s.copied, tone: "success" });
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onClose={onClose} title={s.title} description={s.description}>
      {token ? (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {s.linkLabel}
            <div className="flex gap-2">
              <input readOnly value={url} onFocus={(ev) => ev.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 font-mono text-sm outline-none focus:border-accent" />
              <Button onClick={copy} className="h-11 shrink-0">
                {copied ? <Check /> : <Copy />} {s.copy}
              </Button>
            </div>
          </label>
          <div className="flex flex-wrap justify-between gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline">
              <ExternalLink className="size-4" /> {s.open}
            </a>
            <Button variant="ghost" size="sm" loading={pending} onClick={() => toggle(false)} className="text-danger">
              {!pending && <Link2Off />} {s.disable}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{s.disabledHint}</p>
          <AnimatedApply onApply={enable} onCancel={onClose} label={s.enable} icon={<Link2 className="size-4" aria-hidden />} />
        </div>
      )}
    </Dialog>
  );
}

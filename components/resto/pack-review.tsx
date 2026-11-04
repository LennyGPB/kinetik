"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Copy, Download, Pencil, X } from "lucide-react";
import Link, { useRouter } from "@/lib/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getRestoTemplate, type RestoTemplateId } from "@/config/resto-templates";
import { validatePack } from "@/lib/resto/pack-actions";
import { countLabel, spaceCopy, type SpaceCopy } from "@/lib/resto/space-copy";
import type { SkipReason } from "@/lib/resto/pack-builder";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS, videoDimensions, type VideoProps } from "@/remotion/props";
import { cn } from "@/lib/utils";

export type PackReviewItem = { projectId: string; template: RestoTemplateId; caption: string; kept: boolean; videoProps: VideoProps };

/** Petit aperçu d'un contenu, lancé au toucher (plusieurs vidéos à la fois seraient trop lourdes sur téléphone). */
function ItemPreview({ videoProps, label }: { videoProps: VideoProps; label: string }) {
  const { width, height } = videoDimensions(videoProps);
  const frames = durationInFrames(videoProps.graph);
  return (
    <div className="relative w-28 shrink-0 overflow-hidden rounded-xl bg-black shadow-[0_14px_30px_-16px_rgb(0_0_0/0.9)] sm:w-36" style={{ aspectRatio: `${width} / ${height}` }} aria-label={label}>
      <Player component={KinetikVideo} inputProps={videoProps} durationInFrames={frames} fps={FPS} compositionWidth={width} compositionHeight={height}
        controls loop clickToPlay initialFrame={Math.max(0, Math.round(frames * 0.6))} acknowledgeRemotionLicense style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

/** Légende repliée sur 3 lignes, dépliable, avec un bouton Copier bien visible. */
function Caption({ text, copy }: { text: string; copy: SpaceCopy["pack"] }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="cursor-pointer text-left">
        <span className="flex items-center justify-between gap-2 text-xs font-semibold text-muted">{copy.caption}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} /></span>
        <span className={cn("mt-1 block text-sm whitespace-pre-line", !open && "line-clamp-3")}>{text}</span>
      </button>
      <Button variant="soft" size="sm" className="self-start" onClick={() => void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
        {copied ? <Check /> : <Copy />}{copied ? copy.copied : copy.copy}
      </Button>
    </div>
  );
}

/**
 * Validation du pack, pensée pour le téléphone : une carte compacte par contenu (petit aperçu, légende, Garder / Retirer,
 * Corriger), puis un seul bouton en bas d'écran. Une fois validé, chaque contenu se télécharge depuis son éditeur, sans débit.
 */
export function PackReview({ packId, status, items, skipped }: { packId: string; status: "READY" | "VALIDATED"; items: PackReviewItem[]; skipped: { template: RestoTemplateId; reason: SkipReason }[] }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const s = spaceCopy(locale);
  const p = s.pack;
  const router = useRouter();
  const toast = useToast();
  const [kept, setKept] = useState(() => new Set(items.filter((i) => i.kept).map((i) => i.projectId)));
  const [pending, setPending] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  const validated = status === "VALIDATED";
  const shown = validated ? items.filter((i) => i.kept) : items;
  const setKeep = (id: string, keep: boolean) => setKept((set) => { const next = new Set(set); if (keep) next.add(id); else next.delete(id); return next; });

  async function validate() {
    setPending(true); setInsufficient(false);
    const result = await validatePack(packId, [...kept]).catch(() => null);
    setPending(false);
    if (result?.ok) { if (result.autoTopUp) toast({ title: p.toppedUp }); router.refresh(); return; }
    if (result?.error === "insufficient_credits") setInsufficient(true);
    else toast({ title: p.error, tone: "error" });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-36">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold sm:text-3xl">{p.title}</h1>
        <p className="text-sm text-muted sm:text-base">{validated ? p.validated : p.intro}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {shown.map((item, index) => {
          const on = validated || kept.has(item.projectId);
          const name = getRestoTemplate(item.template)!.name[locale];
          return (
            <motion.li key={item.projectId} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
              className={cn("flex gap-4 rounded-2xl border p-3 transition-[border-color,background-color,opacity] duration-300 sm:p-4", on ? "border-white/[0.08] bg-[linear-gradient(180deg,rgb(255_255_255/0.05),rgb(255_255_255/0.01))] [background-color:var(--bg-subtle)]" : "border-dashed border-line bg-transparent opacity-60")}>
              <ItemPreview videoProps={item.videoProps} label={name} />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate font-semibold sm:text-lg">{name}</h2>
                  {!on && <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">{p.removed}</span>}
                </div>
                <div className="hidden sm:block"><Caption text={item.caption} copy={p} /></div>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {validated ? (
                    <Link href={`/project/${item.projectId}`} className={buttonVariants({ variant: "purple", className: "h-11 px-5" })}><Download />{p.download}</Link>
                  ) : <>
                    {/* Garder / Retirer : deux choix nets, celui actif en violet */}
                    <div role="radiogroup" aria-label={name} className="relative grid grid-cols-2 rounded-full border border-line bg-surface p-1">
                      {([true, false] as const).map((keep) => {
                        const active = on === keep;
                        return (
                          <button key={String(keep)} type="button" role="radio" aria-checked={active} onClick={() => setKeep(item.projectId, keep)}
                            className={cn("relative flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors", active ? "text-white" : "text-muted hover:text-fg")}>
                            {active && <motion.span layoutId={`keep-${item.projectId}`} className={cn("absolute inset-0 rounded-full", keep ? "bg-[linear-gradient(145deg,#a78bfa,#7c3aed)]" : "bg-neutral-700")} transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                            <span className="relative flex items-center gap-1.5">{keep ? <Check className="size-4" /> : <X className="size-4" />}{keep ? p.keep : p.remove}</span>
                          </button>
                        );
                      })}
                    </div>
                    {on && <Link href={`/project/${item.projectId}`} className={buttonVariants({ variant: "outline", className: "h-11 px-4" })}><Pencil />{p.edit}</Link>}
                  </>}
                </div>
              </div>
              {/* Sur téléphone, la légende passe sous la carte (voir plus bas) */}
            </motion.li>
          );
        })}
      </ul>

      {/* Légendes, sur téléphone : regroupées sous les contenus pour garder les cartes compactes */}
      <div className="flex flex-col gap-3 sm:hidden">
        {shown.filter((i) => validated || kept.has(i.projectId)).map((item) => item.caption && (
          <div key={item.projectId} className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-muted">{getRestoTemplate(item.template)!.name[locale]}</p>
            <Caption text={item.caption} copy={p} />
          </div>
        ))}
      </div>

      {skipped.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">{p.skipped.title}</h2>
          <ul className="flex flex-col gap-1.5 text-sm text-muted">
            {skipped.map((x) => <li key={x.template}>{x.reason === "create_once" ? `${getRestoTemplate(x.template)!.name[locale]} : ${p.skipped.create_once}` : p.skipped[x.reason]}</li>)}
          </ul>
          {skipped.some((x) => x.reason === "not_enough_dishes" || x.reason === "no_courses") && <Link href="/resto/carte" className="self-start text-sm font-medium text-accent-text hover:underline">{p.carte}</Link>}
        </section>
      )}

      {!validated && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            <AnimatePresence>
              {insufficient && (
                <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden text-sm">
                  <p className="font-medium text-danger">{p.insufficient}</p>
                  <p className="text-muted">{p.insufficientHint} <Link href="/resto/reglages" className="font-medium text-accent-text hover:underline">{s.settings.link}</Link> · <Link href="/credits" className="font-medium text-accent-text hover:underline">{p.buy}</Link></p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-3">
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className="font-semibold">{countLabel(p.item, kept.size)}</p>
                <p className="text-xs text-muted">{kept.size ? p.cost : p.none}</p>
              </div>
              <Button variant="purple" size="lg" className="h-14 w-full text-base sm:w-auto sm:px-10" loading={pending} disabled={!kept.size} onClick={() => void validate()}>
                <Check />{pending ? p.validating : p.validate.replace("{n}", countLabel(p.item, kept.size))}
              </Button>
            </div>
            <p className="text-center text-xs text-muted sm:hidden">{kept.size ? p.cost : p.none}</p>
          </div>
        </nav>
      )}
    </div>
  );
}

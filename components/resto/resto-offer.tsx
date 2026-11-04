"use client";

import { useState } from "react";
import { ArrowRight, CalendarCheck, Check, Gift, Lock, MonitorPlay, ScanText, ShieldCheck, Smartphone, Soup, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link, { useRouter } from "@/lib/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useComingSoon, useToast } from "@/components/ui/toaster";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { startCheckout, type CheckoutResult } from "@/lib/services/billing";
import { formatPrice } from "@/config/pricing";
import { spaceCopy } from "@/lib/resto/space-copy";

/** Une icône par ligne de « Chaque mois » (dans l'ordre de space-copy) */
const FEATURE_ICONS = [CalendarCheck, Soup, MonitorPlay, ScanText, Gift];
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Offre Kinetik Resto : prix affiché hors taxes (clientèle pro), annuel proposé par défaut et mis en avant.
 * `vatFactor` vaut 1 tant que l'éditeur est en franchise de TVA : le prix payé est alors le prix affiché.
 */
export function RestoOffer({ monthly, yearly, vatFactor, subscribed }: { monthly: number; yearly: number; vatFactor: number; subscribed: boolean }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const o = spaceCopy(locale).offer;
  const tag = locale === "fr" ? "fr-FR" : "en-GB";
  const router = useRouter();
  const toast = useToast();
  const comingSoon = useComingSoon();
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [pending, setPending] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const price = billing === "monthly" ? monthly : yearly;
  const ttc = Math.round(price * vatFactor * 100) / 100;

  async function subscribe(confirmSwitch = false) {
    if (pending) return;
    setPending(true);
    const result = await startCheckout({ kind: "plan", planId: "RESTO", billing, confirmSwitch }).catch((): CheckoutResult => ({ ok: false, reason: "error" }));
    if (result.ok) return window.location.assign(result.url);
    setPending(false);
    if (result.reason === "switch_confirm") { setConsent(false); setSwitching(result.currentPlan); return; }
    setSwitching(null);
    if (result.reason === "auth") router.push("/login?redirectTo=/resto/offre");
    else if (result.reason === "not_implemented") comingSoon();
    else toast({ title: o.errors[result.reason], tone: "error" });
  }

  const STEP_ICONS = [ScanText, CalendarCheck, Smartphone];
  return (
    <div className="relative mx-auto grid max-w-6xl gap-10 pb-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16 lg:pt-6">
      <div aria-hidden className="pointer-events-none absolute -top-32 right-0 -z-10 hidden size-[560px] rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] lg:block" />

      <div className="flex flex-col gap-10">
        <motion.header className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[0.98] font-extrabold tracking-[-0.04em]">
            {o.title}
            <span className="block font-heading text-[clamp(1.5rem,3.4vw,2.5rem)] leading-[1.2] font-extralight tracking-normal text-accent-text">{o.titleAccent}</span>
          </h1>
          <p className="max-w-md text-muted text-pretty sm:text-lg">{o.subtitle}</p>
        </motion.header>

        {/* Les 3 étapes, reliées par un fil */}
        <ol className="relative flex flex-col gap-3">
          <span aria-hidden className="absolute top-6 bottom-6 left-[27px] w-px bg-gradient-to-b from-violet-500/70 via-violet-500/30 to-transparent" />
          {o.how.map(([title, text], i) => {
            const Icon = STEP_ICONS[i];
            return (
              <motion.li key={title} className="relative flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-[linear-gradient(180deg,rgb(255_255_255/0.05),rgb(255_255_255/0.01))] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] [background-color:var(--bg-subtle)]"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.1 }}>
                <span className="relative grid size-[22px] shrink-0 translate-x-[5px] translate-y-1 place-items-center rounded-full bg-violet-600 text-[11px] font-bold text-white shadow-[0_0_0_4px_var(--bg)]">{i + 1}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 pl-1">
                  <span className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-accent-text" />{title}</span>
                  <span className="text-sm leading-snug text-muted">{text}</span>
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>

      <motion.aside className="order-first flex flex-col items-center gap-4 lg:sticky lg:top-24 lg:order-none" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}>
        {subscribed ? (
          <div className="flex w-full flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-8 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-violet-600 text-white"><Check className="size-6" /></span>
            <p className="font-medium">{o.current}</p>
            <Link href="/resto" className={buttonVariants({ variant: "purple", size: "lg" })}>{o.open}</Link>
          </div>
        ) : <>
          <Segmented label={o.kicker} value={billing} onChange={setBilling} options={[
            { value: "yearly", label: <span className="inline-flex items-center gap-1.5">{o.yearly}<span className="rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-semibold text-accent-text">{o.saving}</span></span> },
            { value: "monthly", label: o.monthly },
          ]} />

          {/* Carte violette : même rendu que l'offre mise en avant de la home */}
          <section className="relative isolate w-full rounded-[2rem] bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] p-6 text-white shadow-[0_0_0_1px_rgb(196_181_253/0.6),0_30px_90px_-20px_rgb(139_92_246/0.8),0_0_70px_-10px_rgb(168_85_247/0.55)] sm:p-8">
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem] ring-1 ring-white/25 ring-inset">
              <span className="absolute -top-28 left-1/2 h-60 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.22),transparent)]" />
              <span className="absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.2)_50%,transparent_65%)] [animation-duration:4.5s] motion-reduce:hidden" />
            </span>
            {billing === "yearly" && <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-[0_6px_24px_-4px_rgb(167_139_250/0.9)]"><Sparkles className="size-3" />{o.popular}</span>}
            <p className="font-semibold text-white/80">{o.kicker}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={price} className="font-display text-6xl leading-none font-bold tracking-tight tabular-nums" initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 18, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>{formatPrice(price, tag)}</motion.span>
              </AnimatePresence>
              <span className="text-sm text-white/75">{o.ht} {o.perMonth}</span>
            </div>
            <p className="mt-2 min-h-5 text-sm text-white/75">
              {billing === "yearly" ? <><span className="line-through opacity-70">{formatPrice(monthly, tag)}</span> · {o.billedYearly.replace("{total}", formatPrice(Math.round(price * 12 * vatFactor * 100) / 100, tag))}</> : o.noCommitment}
            </p>
            <ul className="mt-6 flex flex-col gap-3 border-t border-white/20 pt-6">
              {o.includes.map((line, i) => {
                const Icon = FEATURE_ICONS[i] ?? Check;
                return <li key={line} className="flex items-start gap-3 text-[15px] text-white/90"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/15"><Icon className="size-4" /></span><span className="pt-0.5">{line}</span></li>;
              })}
            </ul>
            <Button variant="secondary" size="lg" className="group mt-7 h-14 w-full bg-white text-base text-violet-700 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.5)] hover:bg-white" loading={pending && !switching} onClick={() => void subscribe()}>{o.cta}<ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" /></Button>
            <div className="mt-4 flex flex-col gap-1.5 text-xs text-white/75">
              <span className="flex items-center gap-2"><ShieldCheck className="size-4 shrink-0" />{o.noCommitment}</span>
              <span className="flex items-center gap-2"><Lock className="size-4 shrink-0" />{o.paymentNote}</span>
            </div>
          </section>
          <p className="text-center text-xs text-subtle">{vatFactor === 1 ? o.vatExempt : o.vatIncluded.replace("{ttc}", formatPrice(ttc, tag))}</p>
        </>}
      </motion.aside>

      <Dialog open={switching !== null} onClose={() => setSwitching(null)} title={o.switchTitle.replace("{plan}", switching === "PRO" ? "Pro" : "Starter")} description={o.switchBody}>
        <label className="flex cursor-pointer items-start gap-3 text-left text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-violet-600" />
          <span>{o.switchConsent} <Link href="/terms" className="underline" target="_blank">{locale === "fr" ? "CGV" : "Terms"}</Link></span>
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setSwitching(null)} disabled={pending}>{o.cancel}</Button>
          <Button variant="purple" loading={pending} disabled={!consent} onClick={() => void subscribe(true)}>{o.switchConfirm}</Button>
        </div>
      </Dialog>
    </div>
  );
}

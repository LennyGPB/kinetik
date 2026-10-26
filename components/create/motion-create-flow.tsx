"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getLogoMotion } from "@/config/logo-motion";
import { PitchCreate } from "./pitch-create";
import { MotionModePicker, type MotionMode } from "./motion-mode-picker";
import type { BrandKitData } from "@/lib/projects/queries";
import Link from "@/lib/i18n/navigation";
import { CreateWizard } from "./create-wizard";
import { LogoMotionCreate } from "./logo-motion-create";
import { UrlVideoCreate } from "./url-video-create";

export function MotionCreateFlow(props: { balance: number; brandKit: BrandKitData | null; initialAppName?: string; initialStyleId?: string; initialFlow?: string; initialAnalysisId?: string }) {
  const fr = useDictionary().locale === "fr";
  // ?flow= vient des cartes de la page de création (url, manual, logo, pitch)
  const [mode, setMode] = useState<MotionMode | null>(() => props.initialFlow === "url" ? "url" : props.initialFlow === "manual" ? "motion" : props.initialFlow === "pitch" ? "pitch" : props.initialFlow === "logo" || getLogoMotion(props.initialStyleId) ? "logo" : null);
  if (mode) return <div><Link href="/create?pick=motion" className="group mb-6 inline-flex min-h-10 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-xs font-medium text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:mb-8"><ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden />{fr ? "Changer de mode" : "Change mode"}</Link>{mode === "url" ? <UrlVideoCreate balance={props.balance} initialAnalysisId={props.initialAnalysisId} /> : mode === "logo" ? <LogoMotionCreate balance={props.balance} initialAppName={props.initialAppName} initialStyleId={props.initialStyleId} /> : mode === "pitch" ? <PitchCreate balance={props.balance} /> : <CreateWizard {...props} />}</div>;
  return <MotionModePicker fr={fr} onContinue={setMode} />;
}

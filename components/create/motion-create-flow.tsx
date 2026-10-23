"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { getLogoMotion } from "@/config/logo-motion";
import { PitchCreate } from "./pitch-create";
import { MotionModePicker, type MotionMode } from "./motion-mode-picker";
import type { BrandKitData } from "@/lib/projects/queries";
import { Button } from "@/components/ui/button";
import { CreateWizard } from "./create-wizard";
import { LogoMotionCreate } from "./logo-motion-create";
import { UrlVideoCreate } from "./url-video-create";

export function MotionCreateFlow(props: { balance: number; brandKit: BrandKitData | null; initialAppName?: string; initialStyleId?: string; initialFlow?: string; initialAnalysisId?: string }) {
  const fr = useDictionary().locale === "fr";
  const [mode, setMode] = useState<MotionMode | null>(() => props.initialFlow === "url" ? "url" : getLogoMotion(props.initialStyleId) ? "logo" : null);
  if (mode) return <div><Button variant="outline" size="sm" className="group mb-6 min-h-10 gap-2.5 rounded-xl border-line bg-surface px-3.5 text-xs text-muted hover:text-fg sm:mb-8" onClick={() => setMode(null)}><ArrowLeft className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" />{fr ? "Changer de mode" : "Change mode"}</Button>{mode === "url" ? <UrlVideoCreate balance={props.balance} initialAnalysisId={props.initialAnalysisId} /> : mode === "logo" ? <LogoMotionCreate balance={props.balance} initialAppName={props.initialAppName} initialStyleId={props.initialStyleId} /> : mode === "pitch" ? <PitchCreate balance={props.balance} /> : <CreateWizard {...props} />}</div>;
  return <MotionModePicker fr={fr} onContinue={setMode} />;
}

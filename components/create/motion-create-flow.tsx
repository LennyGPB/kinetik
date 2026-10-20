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

export function MotionCreateFlow(props: { balance: number; brandKit: BrandKitData | null; initialAppName?: string; initialStyleId?: string }) {
  const fr = useDictionary().locale === "fr";
  const [mode, setMode] = useState<MotionMode | null>(() => getLogoMotion(props.initialStyleId) ? "logo" : null);
  if (mode) return <div><Button variant="ghost" size="sm" className="mb-5" onClick={() => setMode(null)}><ArrowLeft />{fr ? "Changer de mode" : "Change mode"}</Button>{mode === "logo" ? <LogoMotionCreate balance={props.balance} initialAppName={props.initialAppName} initialStyleId={props.initialStyleId} /> : mode === "pitch" ? <PitchCreate balance={props.balance} /> : <CreateWizard {...props} />}</div>;
  return <MotionModePicker fr={fr} onContinue={setMode} />;
}

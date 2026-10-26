"use client";

import { Globe, LayoutTemplate, MessageSquare, Music2, Palette, Sparkles } from "lucide-react";
import { urlFlowCopy } from "@/lib/url-video/flow-copy";
import { StepProgress } from "./step-progress";

const icons = [Globe, LayoutTemplate, Music2, MessageSquare, Palette, Sparkles];

export function UrlStepNavigation({ locale, step, furthest, disabled, onSelect }: {
  locale: "fr" | "en"; step: number; furthest: number; disabled: boolean; onSelect: (step: number) => void;
}) {
  const f = urlFlowCopy[locale];
  return <StepProgress
    label={locale === "fr" ? "Étapes de création" : "Creation steps"}
    steps={f.steps.map((label, index) => ({ label, icon: icons[index] ?? Sparkles }))}
    step={step}
    furthest={furthest}
    disabled={disabled}
    onSelect={onSelect}
    counter={`${f.step} ${step + 1} ${f.of} ${f.steps.length}`}
  />;
}

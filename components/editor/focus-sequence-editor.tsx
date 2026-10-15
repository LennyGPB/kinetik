"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { MAX_FOCUS_STEPS, type ScreenFocus } from "@/lib/projects/scenes";
import { FocusEditor } from "./focus-editor";

export function FocusSequenceEditor({ screens, sceneScreens, value, sceneTitle, duration, disabled, onApply, onCancel }: {
  screens: { url: string; ratio: number | null }[];
  /** Screens montrés par la scène : le premier est présélectionné pour un nouveau cadrage. */
  sceneScreens: string[];
  value: ScreenFocus[];
  sceneTitle: string;
  duration: number;
  disabled: boolean;
  onApply: (focuses: ScreenFocus[]) => void;
  onCancel: () => void;
}) {
  const t = useDictionary();
  const tl = t.app.editor.timeline;
  const [steps, setSteps] = useState(value);
  const [editing, setEditing] = useState<number | null>(value.length ? null : 0);
  const [applying, setApplying] = useState(false);
  const locked = disabled || applying;
  const limit = Math.min(MAX_FOCUS_STEPS, Math.max(1, Math.floor(duration / 1.5)));
  const move = (index: number, direction: number) => setSteps((current) => {
    const next = [...current];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next;
  });

  if (editing !== null) return <FocusEditor
    key={editing}
    screens={screens}
    defaultSrc={sceneScreens[0]}
    value={steps[editing] ?? null}
    sceneTitle={sceneTitle}
    disabled={disabled}
    onCancel={() => setEditing(null)}
    onApply={(focus) => {
      setSteps((current) => focus ? current.map((step, i) => i === editing ? focus : step).concat(editing === current.length ? [focus] : []) : current.filter((_, i) => i !== editing));
      setEditing(null);
    }}
  />;

  return <Dialog open onClose={onCancel} title={tl.focusSequenceTitle} description={tl.focusSequenceHint}>
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col divide-y divide-line">
        {steps.map((step, index) => <li key={index} className="flex items-center gap-3 py-3">
          <span className="w-5 shrink-0 text-sm tabular-nums text-muted">{index + 1}</span>
          <button type="button" disabled={locked} onClick={() => setEditing(index)} className="min-w-0 flex-1 cursor-pointer text-left text-sm focus-visible:outline-2 focus-visible:outline-accent">
            <span className="block font-medium">{tl.focusModes[step.mode]}{step.mode === "popout" ? ` · ${tl.focusAnimations[step.animation ?? "lift"]}` : ""}</span>
            <span className="block truncate text-xs">{step.title || sceneTitle}</span>
            <span className="block truncate text-xs text-muted">{step.label || `${Math.round(step.w * 100)} % × ${Math.round(step.h * 100)} %`} · {(duration / steps.length).toFixed(1)} s</span>
          </button>
          <div className="flex shrink-0 gap-1">
            <button type="button" disabled={locked || index === 0} aria-label={tl.focusMoveUp} onClick={() => move(index, -1)} className="rounded-md p-2 hover:bg-bg-subtle disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" disabled={locked || index === steps.length - 1} aria-label={tl.focusMoveDown} onClick={() => move(index, 1)} className="rounded-md p-2 hover:bg-bg-subtle disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button type="button" disabled={locked} aria-label={tl.focusEditStep} onClick={() => setEditing(index)} className="rounded-md p-2 hover:bg-bg-subtle disabled:opacity-30"><Pencil className="size-4" /></button>
            <button type="button" disabled={locked} aria-label={tl.focusRemove} onClick={() => setSteps((current) => current.filter((_, i) => i !== index))} className="rounded-md p-2 text-danger hover:bg-danger/10 disabled:opacity-30"><Trash2 className="size-4" /></button>
          </div>
        </li>)}
      </ol>
      <button type="button" disabled={locked || steps.length >= limit} onClick={() => setEditing(steps.length)} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-sm hover:bg-bg-subtle disabled:cursor-default disabled:opacity-40"><Plus className="size-4" />{tl.focusAddStep}</button>
      {steps.length >= limit && <p className="text-xs text-muted">{limit < MAX_FOCUS_STEPS ? tl.focusDurationHint : tl.focusLimitHint}</p>}
      <AnimatedApply disabled={locked} onApplyingChange={setApplying} onBegin={() => {}} onApply={() => onApply(steps)} onCancel={onCancel} />
    </div>
  </Dialog>;
}

"use client";

import { ArrowRight, Check, Clock, RectangleHorizontal, RectangleVertical, Square } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import type { VideoFormatId } from "@/config/formats";
import { format, t } from "@/lib/i18n";
import { createVariants } from "@/lib/projects/actions";
import type { SceneGraph } from "@/lib/projects/scenes";
import { availableVariants, SHORT_DURATION, VARIANT_KINDS, type VariantKind } from "@/lib/projects/variants";
import { cn } from "@/lib/utils";

const v = t.app.variants;
const ICONS = { PORTRAIT: RectangleVertical, SQUARE: Square, LANDSCAPE: RectangleHorizontal, short: Clock } satisfies Record<VariantKind, unknown>;

/** Déclinaisons en un clic : autres formats et version courte, chacune devient un nouveau projet. */
export function VariantsDialog({ open, onClose, projectId, format: current, graph }: { open: boolean; onClose: () => void; projectId: string; format: VideoFormatId; graph: SceneGraph }) {
  const available = availableVariants(current, graph);
  const [picked, setPicked] = useState<VariantKind[]>([]);
  const [created, setCreated] = useState<{ id: string; name: string; kind: VariantKind }[] | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggle(kind: VariantKind) {
    setPicked((list) => (list.includes(kind) ? list.filter((k) => k !== kind) : [...list, kind]));
  }

  function submit() {
    startTransition(async () => {
      const result = await createVariants(projectId, picked);
      if (!result.ok) return toast({ title: result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      setCreated(result.projects);
      setPicked([]);
      toast({ title: v.done, tone: "success" });
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={v.title} description={v.description}>
      {created ? (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {created.map((project) => {
              const Icon = ICONS[project.kind];
              return (
                <li key={project.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
                    <Check className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Icon className="size-4 text-muted" /> {v.kinds[project.kind].title}
                    </span>
                    <span className="block truncate text-xs text-muted">{project.name}</span>
                  </span>
                  <Link href={`/project/${project.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-accent-text hover:underline">
                    {v.open} <ArrowRight className="size-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Button variant="ghost" onClick={() => setCreated(null)} className="self-start">
            {v.another}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="grid gap-2 sm:grid-cols-2">
            {VARIANT_KINDS.map((kind) => {
              const Icon = ICONS[kind];
              const enabled = available.includes(kind);
              const checked = picked.includes(kind);
              const reason = kind === "short" ? format(v.alreadyShort, { seconds: SHORT_DURATION }) : v.current;
              return (
                <li key={kind}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    disabled={!enabled}
                    onClick={() => toggle(kind)}
                    className={cn(
                      "flex h-full w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,background-color] disabled:cursor-not-allowed disabled:opacity-45",
                      checked ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", checked ? "bg-accent-gradient text-white" : "bg-surface-2 text-muted")}>
                      {checked ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{v.kinds[kind].title}</span>
                      <span className="block text-xs text-muted">{enabled ? v.kinds[kind].hint : reason}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-center text-xs text-subtle sm:text-left">{v.free}</span>
            <Button size="lg" disabled={!picked.length} loading={pending} onClick={submit}>
              {picked.length > 1 ? format(v.create, { count: picked.length }) : v.createOne}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

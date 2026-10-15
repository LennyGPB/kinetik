"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Coins, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useTransition } from "react";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { CREDIT_COSTS } from "@/config/credits";
import { VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import type { SceneKind } from "@/config/styles";

import { startGeneration } from "@/lib/projects/actions";
import { cn } from "@/lib/utils";

export function DraftScreen({
  projectId,
  appName,
  format,
  palette,
  scene,
  failed,
}: {
  projectId: string;
  appName: string;
  format: VideoFormatId;
  palette: [string, string, string];
  scene: SceneKind;
  failed?: boolean;
}) {
  const t = useDictionary();

  const e = t.app.editor;

  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex w-full max-w-md flex-col items-center text-center">
        <div className={cn("w-full overflow-hidden rounded-3xl border border-line-strong opacity-80 grayscale-[40%]", format === "PORTRAIT" ? "max-w-[180px]" : format === "SQUARE" ? "max-w-[260px]" : "max-w-xs")}>
          <VideoPlaceholder ratio={VIDEO_FORMATS[format].ratio} palette={palette} scene={scene} label={appName} paused />
        </div>
        <h1 className="mt-8 text-xl font-semibold">{failed ? e.failedTitle : e.draftTitle}</h1>
        <p className="mt-2 text-muted">{failed ? e.failedText : e.draftText}</p>
        <Button
          size="lg"
          className="mt-8"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await startGeneration(projectId);
              if (!result.ok) toast({ title: result.error === "insufficient_credits" ? e.insufficient : result.error === "rate_limited" ? e.rateLimited : t.common.error, tone: "error" });
            })
          }
        >
          {!pending && <Sparkles />} {e.draftCta}
        </Button>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-subtle">
          <Coins className="size-3.5" /> {CREDIT_COSTS.generation} {t.common.credits}
        </p>
      </motion.div>
    </div>
  );
}

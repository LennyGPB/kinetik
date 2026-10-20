"use client";

import { useCallback, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import type { EditorVersion } from "@/lib/projects/types";
import { VoiceoverPanel } from "./voiceover-panel";

export function VoiceoverDialog({ projectId, version, onClose, onVersion, onBalance }: {
  projectId: string; version: EditorVersion; onClose: () => void;
  onVersion: (version: EditorVersion) => void; onBalance: (balance: number) => void;
}) {
  const m = useDictionary().voiceover;
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  return <Dialog open onClose={close} title={m.title} description={m.dialogDescription}
    className="flex h-[92dvh] flex-col overflow-hidden sm:max-w-[1600px] lg:h-[min(860px,90dvh)]"
    contentClassName="-mx-6 -mb-6 flex min-h-0 flex-1 flex-col overflow-hidden">
    <VoiceoverPanel projectId={projectId} version={version} onVersion={onVersion} onBalance={onBalance} onBusy={setBusy} />
  </Dialog>;
}

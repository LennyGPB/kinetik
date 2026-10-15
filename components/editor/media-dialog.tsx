"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { useRouter } from "@/lib/i18n/navigation";
import { useState } from "react";
import { UploadZone } from "@/components/create/upload-zone";
import { WebsiteCapture } from "@/components/create/website-capture";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";

import { updateProjectMedia } from "@/lib/projects/actions";
import type { EditorProject } from "@/lib/projects/types";
import type { UploadedFile } from "@/lib/storage/client";

/**
 * Fenêtre « Médias » de l'éditeur : logo et screens (ordre compris).
 * Les fichiers sont communs à toutes les versions du projet : aucune version n'est créée.
 * La musique a sa propre fenêtre (sound-dialog.tsx).
 */
export function MediaDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project: Pick<EditorProject, "id" | "media" | "websiteUrl"> }) {
  const t = useDictionary();

  const m = t.app.media;

  const { media } = project;
  const [logo, setLogo] = useState<UploadedFile[]>(media.logo ? [media.logo] : []);
  const [screens, setScreens] = useState<UploadedFile[]>(media.screens);
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function save() {
    setPending(true);
    try {
      const result = await updateProjectMedia(project.id, { logo: logo[0] ?? null, screens });
      if (!result.ok) return toast({ title: result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      // Recharge les médias du projet (aperçu, mise en avant)
      router.refresh();
      toast({ title: m.saved, tone: "success" });
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={m.title} description={m.description} className="sm:max-w-2xl">
      <div className="flex flex-col gap-6">
        <fieldset disabled={pending || applying} className="contents">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{m.logo}</h3>
          <UploadZone label={m.logo} value={logo} onChange={setLogo} />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">{m.screens}</h3>
            <span className="text-xs text-subtle">{m.screensHint}</span>
          </div>
          <UploadZone label={m.screens} value={screens} onChange={setScreens} multiple max={8} reorderable />
          <WebsiteCapture value={screens} onChange={setScreens} initialUrl={project.websiteUrl ?? ""} disabled={pending} />
        </section>

        </fieldset>
        <AnimatedApply disabled={pending} onApply={save} onCancel={onClose} onApplyingChange={setApplying} />
      </div>
    </Dialog>
  );
}

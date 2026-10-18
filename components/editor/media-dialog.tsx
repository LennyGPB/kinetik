"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { useRouter } from "@/lib/i18n/navigation";
import { useState } from "react";
import { UploadZone } from "@/components/create/upload-zone";
import { WebsiteCapture } from "@/components/create/website-capture";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { getRecipe } from "@/config/recipes";

import { updateProjectMedia } from "@/lib/projects/actions";
import type { EditorProject } from "@/lib/projects/types";
import type { UploadedFile } from "@/lib/storage/client";

/**
 * Fenêtre « Médias » de l'éditeur : logo et screens (ordre compris).
 * Les fichiers sont communs à toutes les versions du projet : aucune version n'est créée.
 * La musique a sa propre fenêtre (sound-dialog.tsx).
 */
export function MediaDialog({ open, onClose, project, styleId }: { open: boolean; onClose: () => void; project: Pick<EditorProject, "id" | "media" | "websiteUrl" | "styleId">; styleId?: string | null }) {
  const t = useDictionary();

  const m = t.app.media;

  const { media } = project;
  const [logo, setLogo] = useState<UploadedFile[]>(media.logo ? [media.logo] : []);
  const [screens, setScreens] = useState<UploadedFile[]>(media.screens);
  const [background, setBackground] = useState<UploadedFile[]>(media.background ? [media.background] : []);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const hasPhotoBackground = Boolean(getRecipe(styleId ?? project.styleId).photoTreatment);
  const backgroundLabel = t.locale === "fr" ? "Image de fond" : "Background image";
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function save() {
    setPending(true);
    try {
      const result = await updateProjectMedia(project.id, { logo: logo[0] ?? null, screens, background: background[0] ?? null });
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
        {hasPhotoBackground && <section className="flex flex-col gap-2 border-b border-line pb-6">
          <h3 className="text-sm font-semibold">{backgroundLabel}</h3>
          <p className="text-sm text-muted">{t.locale === "fr" ? "Cette image habille le fond de toutes les scènes. Elle reste indépendante de tes captures et de ton logo." : "This image appears behind every scene, independently of your screenshots and logo."}</p>
          <UploadZone label={backgroundLabel} value={background} onChange={setBackground} onBusyChange={setUploadingBackground} />
          {screens.length > 0 && <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">{t.locale === "fr" ? "Ou utiliser un média du projet" : "Or use a project image"}</span>
            <select aria-label={backgroundLabel} value={screens.some((screen) => screen.url === background[0]?.url) ? background[0].url : ""} onChange={(event) => { const file = screens.find((screen) => screen.url === event.target.value); if (file) setBackground([file]); }} className="h-11 min-w-0 rounded-xl border border-line-strong bg-surface px-3 text-base sm:text-sm">
              <option value="">{t.locale === "fr" ? "Choisir une image…" : "Choose an image…"}</option>
              {screens.map((screen) => <option key={screen.url} value={screen.url}>{screen.fileName}</option>)}
            </select>
          </label>}
          <p className="text-xs text-subtle">{t.locale === "fr" ? "Sans image de fond dédiée, le template utilise les images choisies dans tes scènes. Retire l’image pour revenir à ce mode." : "Without a dedicated background, the template uses your scene images. Remove the image to return to this mode."}</p>
        </section>}
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
        <AnimatedApply disabled={pending || uploadingBackground} onApply={save} onCancel={onClose} onApplyingChange={setApplying} />
      </div>
    </Dialog>
  );
}

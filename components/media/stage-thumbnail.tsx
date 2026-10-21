import type { AspectRatio } from "@/config/formats";
import { STAGE_THEMES } from "@/config/stage-motion";

/** Templates en vraie 3D (une miniature par format dans public/templates/). */
export function isStageTemplate(templateId: string | undefined) {
  return Boolean(templateId && Object.values(STAGE_THEMES).some((theme) => theme.templateId === templateId));
}

/**
 * Miniature d'un template 3D : la 3D ne peut pas être rendue côté serveur, la galerie montre donc de vraies images
 * du moteur (générées par `node --import tsx scripts/review-stage.ts --template=<id> --thumbnails`, dans public/templates/).
 * Le badge « 3D » signale l'export facturé plus cher (config/credits.ts, mentionné dans les CGV).
 */
export function StageThumbnail({ templateId, ratio }: { templateId: string; ratio: AspectRatio | "fill" }) {
  const file = ratio === "16:9" ? "landscape" : ratio === "1:1" ? "square" : "portrait";
  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/templates/${templateId}-${file}.jpg`} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-black">3D</span>
    </div>
  );
}

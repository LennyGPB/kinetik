import { getProductTemplate } from "../../config/physical-product";
import { getRecipe } from "../../config/recipes";
import { physicalProductGraph } from "./model";
import type { VideoProps } from "../../remotion/props";
import type { VideoFormatId } from "../../config/formats";

/** Fictional product, exclusively used in labeled template previews. */
export function demoPhysicalProductProps(id: string, format: VideoFormatId, locale: "fr" | "en"): VideoProps {
  const template = getProductTemplate(id)!;
  const fr = locale === "fr";
  const graph = physicalProductGraph({ requestId: "00000000-0000-4000-8000-000000000000", name: "FORME", hook: fr ? "Une autre idée du quotidien." : "A fresh take on the everyday.", benefits: fr ? ["Ton rituel. Ton rythme.", "Place à l’essentiel."] : ["Your ritual. Your rhythm.", "Room for the essentials."], cta: fr ? "Découvre FORME." : "Discover FORME.", price: "", websiteUrl: "", templateId: template.id, images: [{ url: "/product-demos/forme.png", fileName: "forme.png", mimeType: "image/png", sizeBytes: 0 }], originals: [], logo: null, colors: [...template.palette], format, duration: 15, locale, music: null, musicTrackId: null });
  return { appName: "FORME", locale, format, palette: [...template.palette], recipe: getRecipe(id), graph, logoUrl: null, screenUrls: ["/product-demos/forme.png"], musicSrc: null, websiteUrl: null, watermark: false };
}

import { getProductTemplate } from "../../config/physical-product";
import { getRecipe } from "../../config/recipes";
import { physicalProductGraph } from "./model";
import type { VideoProps } from "../../remotion/props";
import type { VideoFormatId } from "../../config/formats";

type Demo = { name: string; image: string; fileName: string; hook: [string, string]; benefits: [[string, string], [string, string]]; cta: [string, string] };

/** Produits fictifs des aperçus (fr, en). FORME par défaut ; Flux 3D et Glacier 3D montrent des canettes (OHM, NORDA ; scripts/make-demo-can.ts), Brume 3D un parfum (ÉLAN ; scripts/make-demo-perfume.ts). */
const FORME: Demo = { name: "FORME", image: "/product-demos/forme.png", fileName: "forme.png", hook: ["Une autre idée du quotidien.", "A fresh take on the everyday."], benefits: [["Ton rituel. Ton rythme.", "Your ritual. Your rhythm."], ["Place à l’essentiel.", "Room for the essentials."]], cta: ["Découvre FORME.", "Discover FORME."] };
const DEMOS: Record<string, Demo> = {
  "product-flux-3d": { name: "OHM", image: "/product-demos/ohm-can.png", fileName: "ohm-can.png", hook: ["L’énergie en mouvement.", "Energy in motion."], benefits: [["Frais. Intense. Sans détour.", "Cold. Intense. No detours."], ["Une canette, toute la nuit.", "One can, all night long."]], cta: ["Ouvre une OHM.", "Crack open an OHM."] },
  "product-glacier-3d": { name: "NORDA", image: "/product-demos/norda-can.png", fileName: "norda-can.png", hook: ["Glacée jusqu’à la dernière gorgée.", "Ice cold to the last sip."], benefits: [["Agrumes et bulles fines.", "Citrus and fine bubbles."], ["À servir bien frappée.", "Best served ice cold."]], cta: ["Goûte NORDA.", "Taste NORDA."] },
  "product-brume-3d": { name: "ÉLAN", image: "/product-demos/elan-perfume.png", fileName: "elan-perfume.png", hook: ["Iris blanc. Peau nue.", "White iris. Bare skin."], benefits: [["Une brume qui reste.", "A mist that lingers."], ["Verre épais, geste simple.", "Heavy glass, simple ritual."]], cta: ["Découvre ÉLAN.", "Discover ÉLAN."] },
};
export function demoProduct(id: string) { return DEMOS[id] ?? FORME; }

/** Fictional product, exclusively used in labeled template previews. */
export function demoPhysicalProductProps(id: string, format: VideoFormatId, locale: "fr" | "en"): VideoProps {
  const template = getProductTemplate(id)!;
  const demo = demoProduct(template.id), l = locale === "fr" ? 0 : 1;
  const graph = physicalProductGraph({ requestId: "00000000-0000-4000-8000-000000000000", name: demo.name, hook: demo.hook[l], benefits: demo.benefits.map((item) => item[l]), cta: demo.cta[l], price: "", websiteUrl: "", templateId: template.id, images: [{ url: demo.image, fileName: demo.fileName, mimeType: "image/png", sizeBytes: 0 }], originals: [], logo: null, colors: [...template.palette], format, duration: 15, locale, music: null, musicTrackId: null });
  return { appName: demo.name, locale, format, palette: [...template.palette], recipe: getRecipe(id), graph, logoUrl: null, screenUrls: [demo.image], musicSrc: null, websiteUrl: null, watermark: false };
}

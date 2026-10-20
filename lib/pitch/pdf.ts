import "server-only";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import type { PitchCrop } from "./model";

export async function openPitchPdf(data: Buffer) {
  if (data.length > 10 * 1024 * 1024 || data.toString("ascii", 0, 5) !== "%PDF-") throw new Error("invalid_pdf");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const root = path.join(process.cwd(), "node_modules/pdfjs-dist").split(path.sep).join("/");
  const task = getDocument({ data: new Uint8Array(data), useSystemFonts: true, fontExtraProperties: true, canvasMaxAreaInBytes: 16_000_000, stopAtErrors: true,
    standardFontDataUrl: `${root}/standard_fonts/`, cMapUrl: `${root}/cmaps/`, wasmUrl: `${root}/wasm/`, cMapPacked: true });
  const document = await task.promise;
  if (document.numPages < 1 || document.numPages > 20) { await task.destroy(); throw new Error("pdf_page_limit"); }
  return { document, numPages: document.numPages, destroy: () => task.destroy() };
}

export async function pdfCrop(document: Awaited<ReturnType<typeof openPitchPdf>>, crop: PitchCrop) {
  const page = await document.document.getPage(crop.page);
  const original = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(2, 1600 / Math.max(original.width, original.height)) });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
  return cropImage(canvas.toBuffer("image/png"), crop);
}

export async function cropImage(data: Buffer, crop: Pick<PitchCrop, "x" | "y" | "width" | "height">) {
  const meta = await sharp(data).metadata();
  if (!meta.width || !meta.height) throw new Error("invalid_visual");
  const left = Math.min(meta.width - 1, Math.floor(crop.x * meta.width)), top = Math.min(meta.height - 1, Math.floor(crop.y * meta.height));
  const width = Math.max(1, Math.min(meta.width - left, Math.round(crop.width * meta.width))), height = Math.max(1, Math.min(meta.height - top, Math.round(crop.height * meta.height)));
  return { data: await sharp(data).extract({ left, top, width, height }).png().toBuffer(), width, height };
}

/** Embedded font names are stronger evidence than a visual guess. */
export async function pdfFontNames(pdf: Awaited<ReturnType<typeof openPitchPdf>>) {
  const fonts = new Set<string>();
  for (let i = 1; i <= Math.min(pdf.numPages, 8); i++) {
    const page = await pdf.document.getPage(i);
    await page.getOperatorList();
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("fontName" in item) || !page.commonObjs.has(item.fontName)) continue;
      const font = page.commonObjs.get(item.fontName) as { name?: string };
      if (font?.name) fonts.add(font.name.replace(/^[A-Z]{6}\+/, "").slice(0, 100));
    }
  }
  return [...fonts].slice(0, 12);
}

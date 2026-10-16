import { POST_FORMATS, getPostTemplate } from "@/config/post-templates";
import type { PostDocument } from "./document";
import { professionalPostSvg } from "./professional-svg";
import type { PostRenderMedia } from "./professional-svg";
import { photoPostSvg } from "./photo-svg";

const esc = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
function lines(text: string, max: number) {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      // Long URLs and unbroken words must also wrap within the text box.
      const chunks = word.match(new RegExp(`.{1,${max}}`, "gu")) ?? [];
      for (const chunk of chunks) {
        if (line && line.length + chunk.length + 1 > max) { result.push(line); line = ""; }
        line += (line ? " " : "") + chunk;
      }
    }
    result.push(line);
  }
  return result;
}
function textBlock(text: string, x: number, y: number, size: number, width: number, maxLines: number, fill: string, weight: number, center: boolean) {
  let wrapped = lines(text, Math.max(8, Math.floor(width / (size * 0.62))));
  if (wrapped.length > maxLines) wrapped = [...wrapped.slice(0, maxLines - 1), wrapped[maxLines - 1].slice(0, -1) + "…"];
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" text-anchor="${center ? "middle" : "start"}">${wrapped.map((line, i) => `<tspan x="${x}" dy="${i ? size * 1.16 : 0}">${esc(line)}</tspan>`).join("")}</text>`;
}

/** Shared deterministic SVG for previews and raster exports. No user HTML or CSS is interpolated. */
export function postSvg(doc: PostDocument, index: number, media: PostRenderMedia = {}) {
  const page = doc.pages[index];
  if (!page) throw new Error("invalid_page");
  const photographic = photoPostSvg(doc, index, media);
  if (photographic) return photographic;
  const professional = professionalPostSvg(doc, index, media);
  if (professional) return professional;
  const { width: w, height: h } = POST_FORMATS[doc.format];
  const [bg, fg, accent] = doc.colors;
  const template = getPostTemplate(doc.templateId)!;
  const count = doc.linked ? doc.pages.length : 1;
  const shift = doc.linked ? index * w : 0;
  let decor = "";
  if (template.layout === "orbit") {
    const points = Array.from({ length: count }, (_, i) => `C ${i * w + 270} ${h * 0.96},${i * w + 810} ${h * 0.62},${(i + 1) * w} ${h * 0.79}`).join(" ");
    decor = `<g transform="translate(${-shift},0)"><path d="M 0 ${h * 0.79} ${points}" fill="none" stroke="${accent}" stroke-width="76"/><path d="M 0 ${h * 0.79} ${points}" fill="none" stroke="${bg}" stroke-width="2"/></g>`;
  } else if (template.layout === "paper") {
    decor = `<g transform="translate(${-shift},0)">${Array.from({ length: count + 1 }, (_, i) => `<ellipse cx="${i * w}" cy="${h * 0.95}" rx="590" ry="${h * 0.26}" fill="${accent}" opacity="0.18"/><path d="M ${i * w - 200} ${h} L ${i * w + 70} ${h * 0.72} L ${i * w + 390} ${h}" fill="${accent}" opacity="0.16"/>`).join("")}</g>`;
  } else if (template.layout === "signal") {
    decor = `<rect x="0" y="${h - 160}" width="${w}" height="160" fill="${accent}"/><circle cx="970" cy="150" r="150" fill="${fg}" opacity="0.07"/>`;
  } else {
    decor = `<path d="M 72 172 H 1008" stroke="${fg}" opacity="0.3"/><rect x="72" y="${h - 150}" width="100" height="8" fill="${accent}"/>`;
  }
  const center = page.align === "center";
  const hasImage = page.layout !== "text" && page.imageIndex !== null && Boolean(media.screenUrls?.[page.imageIndex]);
  const x = (center ? w / 2 : 76) + page.offsetX;
  const titleY = (template.layout === "editorial" ? 285 : 260) + page.offsetY;
  const titleMax = hasImage ? 4 : 5;
  let titleSize = Math.min(page.titleSize, hasImage ? 84 : 110);
  let bodySize = 29;
  const measure = () => {
    const titleLines = lines(page.title, Math.floor(920 / (titleSize * 0.62))).length;
    const bodyLines = lines(page.body, Math.floor(900 / (bodySize * 0.62))).length;
    const bodyY = titleY + (titleLines - 1) * titleSize * 1.16 + 65;
    return { titleLines, bodyLines, bodyY, end: bodyY + (bodyLines - 1) * bodySize * 1.16 };
  };
  // Fit the full permitted copy, reserving a real image area and footer at every ratio.
  const contentBottom = h - (hasImage ? 370 : 195);
  while ((measure().titleLines > titleMax || measure().end > contentBottom) && titleSize > 44) titleSize -= 2;
  while (measure().end > contentBottom && bodySize > 20) bodySize -= 1;
  const { bodyY, bodyLines } = measure();
  const imageY = Math.max(bodyY + (bodyLines - 1) * bodySize * 1.16 + 55, h * 0.49);
  const imageH = Math.max(100, h - imageY - 200);
  const imageW = page.layout === "split" ? 720 : 920;
  const imageX = (w - imageW) / 2;
  // Export callers replace private upload paths with embedded, rasterized data URIs.
  const safeImage = (url: string | null | undefined) => url && (/^\/api\/uploads\/[A-Za-z0-9_/.\-]+(?:\?share=[A-Za-z0-9_-]{16,64})?$/.test(url) || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)) ? esc(url) : "";
  const image = hasImage ? safeImage(media.screenUrls?.[page.imageIndex!]) : "";
  const logo = safeImage(media.logoUrl);
  const family = doc.font === "serif" ? "Georgia,serif" : doc.font === "mono" ? "monospace" : "Arial,sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(page.title)}">
  <rect width="${w}" height="${h}" fill="${bg}"/>${decor}<g font-family="${family}">
  ${logo ? `<image href="${logo}" x="76" y="64" width="180" height="68" preserveAspectRatio="xMinYMid meet"/>` : textBlock(media.appName ?? "KINETIK", 76, 110, 25, 700, 1, fg, 700, false)}
  ${textBlock(page.kicker, x, titleY - 70, 24, 920, 1, accent, 700, center)}
  ${textBlock(page.title, x, titleY, titleSize, 920, 10, fg, 700, center)}
  ${textBlock(page.body, x, bodyY, bodySize, 900, 15, fg, 400, center)}
  ${image ? `<rect x="${imageX - 10}" y="${imageY - 10}" width="${imageW + 20}" height="${imageH + 20}" rx="22" fill="${fg}" opacity="0.08"/><image href="${image}" x="${imageX}" y="${imageY}" width="${imageW}" height="${imageH}" preserveAspectRatio="xMidYMid meet"/>` : ""}
  ${textBlock(page.cta, 76, h - 90, 27, 800, 1, template.layout === "signal" ? bg : fg, 700, false)}
  <text x="1004" y="${h - 90}" fill="${template.layout === "signal" ? bg : fg}" font-size="23" text-anchor="end">${String(index + 1).padStart(2, "0")} / ${String(doc.pages.length).padStart(2, "0")}</text>
  ${media.watermark ? `<text x="540" y="${h - 28}" font-size="19" text-anchor="middle" fill="${template.layout === "signal" ? bg : fg}">Made with Kinetik</text>` : ""}</g></svg>`;
}

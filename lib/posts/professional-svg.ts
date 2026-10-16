import { POST_FORMATS, getPostTemplate } from "@/config/post-templates";
import type { PostDocument } from "./document";

export type PostRenderMedia = { appName?: string; logoUrl?: string | null; screenUrls?: string[]; screenRatios?: (number | null)[]; watermark?: boolean; demo?: boolean };
const PROFESSIONAL_LAYOUTS = ["swiss", "studio", "ledger", "frame", "outline", "continuum"];
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
const safeImage = (url: string | null | undefined) => url && (/^\/api\/uploads\/[A-Za-z0-9_/.\-]+(?:\?share=[A-Za-z0-9_-]{16,64})?$/.test(url) || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)) ? escape(url) : "";

// Conservative glyph widths keep large titles and unbroken words inside their allotted column.
function textWidth(value: string, size: number) {
  return Array.from(value).reduce((sum, char) => sum + (/[MW@%]/u.test(char) ? 0.95 : /[ilI.,:;'!| ]/u.test(char) ? 0.3 : /[A-Z0-9]/u.test(char) ? 0.72 : /[^\u0000-\u024f]/u.test(char) ? 1 : 0.59) * size, 0);
}
function wrap(value: string, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of value.trim().split(/\s+/u).filter(Boolean)) {
    if (line && textWidth(`${line} ${word}`, size) > width) { lines.push(line); line = ""; }
    for (const char of word) {
      if (textWidth(line + char, size) > width && line) { lines.push(line); line = ""; }
      line += char;
    }
    line += " ";
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
function text(value: string, x: number, top: number, width: number, height: number, size: number, fill: string, options: { center?: boolean; weight?: number; min?: number } = {}) {
  let rows = wrap(value, size, width);
  while (rows.length * size * 1.2 > height && size > (options.min ?? 18)) { size -= 1; rows = wrap(value, size, width); }
  const anchor = options.center ? x + width / 2 : x;
  return `<text x="${anchor}" y="${top + size}" fill="${fill}" font-size="${size}" font-weight="${options.weight ?? 400}" text-anchor="${options.center ? "middle" : "start"}">${rows.map((row, i) => `<tspan x="${anchor}" dy="${i ? size * 1.2 : 0}">${escape(row.trim())}</tspan>`).join("")}</text>`;
}
const rule = (x1: number, y: number, x2: number, color: string, opacity = 0.25) => `<path d="M ${x1} ${y} H ${x2}" fill="none" stroke="${color}" opacity="${opacity}"/>`;

/** Distinct editorial compositions; all geometry uses native document dimensions. */
export function professionalPostSvg(doc: PostDocument, index: number, media: PostRenderMedia): string | null {
  const template = getPostTemplate(doc.templateId);
  if (!template || !PROFESSIONAL_LAYOUTS.includes(template.layout)) return null;
  const page = doc.pages[index];
  const { width: w, height: h } = POST_FORMATS[doc.format];
  const [bg, fg, accent] = doc.colors;
  const margin = 76;
  const width = w - margin * 2;
  const logo = safeImage(media.logoUrl);
  const image = page.layout !== "text" && page.imageIndex !== null ? safeImage(media.screenUrls?.[page.imageIndex]) : "";
  const center = page.align === "center";
  const font = doc.font === "serif" ? "Georgia,serif" : doc.font === "mono" ? "monospace" : "Arial,sans-serif";
  const number = String(index + 1).padStart(2, "0");
  const dx = page.offsetX; const dy = page.offsetY;
  const heading = (x: number, top: number, tw: number, th: number, centered = center) => text(page.title, x + dx, top + dy, tw, th, page.titleSize, fg, { center: centered, weight: 700, min: 28 });
  const body = (x: number, top: number, tw: number, th: number, centered = center) => text(page.body, x + dx, top + dy, tw, th, 29, fg, { center: centered });
  const kicker = (x: number, top: number, tw: number, centered = center) => text(page.kicker, x + dx, top + dy, tw, 56, 22, accent, { center: centered, weight: 600 });
  const photo = (x: number, y: number, iw: number, ih: number, frame = false) => {
    if (!image) return "";
    if (page.layout === "split") { x += iw * 0.1; iw *= 0.8; }
    return `${frame ? `<rect x="${x - 12}" y="${y - 12}" width="${iw + 24}" height="${ih + 24}" rx="10" fill="${fg}" opacity="0.07"/>` : ""}<image href="${image}" x="${x}" y="${y}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet"/>`;
  };
  let composition = "";
  let footer = rule(margin, h - 152, w - margin, fg);

  if (template.layout === "swiss") {
    composition = `<rect x="76" y="170" width="54" height="6" fill="${accent}"/>${kicker(margin, 207, width)}${heading(margin, 270, width, image ? h * 0.21 : h * 0.3)}
      ${image ? body(margin, h * 0.44, width, h * 0.12) + photo(margin, h * 0.59, width, h * 0.25, true) : `${rule(margin, h * 0.6, w - margin, fg)}<text x="76" y="${h * 0.81}" font-size="${h * 0.17}" fill="${accent}" font-weight="400">${number}</text>${body(410, h * 0.64, 594, h * 0.19, false)}`}`;
  } else if (template.layout === "studio") {
    composition = `<rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="${accent}" opacity="0.3"/>
      ${kicker(116, h * 0.195, 848)}${heading(116, h * 0.27, 848, h * 0.24)}${rule(480, h * 0.535, 600, accent, 0.7)}
      ${body(200, h * 0.57, 680, h * (image ? 0.11 : 0.2))}${photo(170, h * 0.71, 740, h * 0.14)}`;
    footer = "";
  } else if (template.layout === "ledger") {
    composition = `${rule(margin, 166, w - margin, fg, 0.7)}${kicker(margin, 194, 650, false)}
      <text x="1004" y="255" text-anchor="end" font-size="76" fill="${accent}" font-family="Georgia,serif">${number}</text>
      ${heading(margin, h * 0.26, 730, h * 0.26)}${rule(margin, h * 0.54, w - margin, fg)}
      ${image ? body(margin, h * 0.57, 330, h * 0.27, false) + photo(460, h * 0.58, 544, h * 0.25) : `${text(media.appName ?? "KINETIK", margin, h * 0.59, 260, 100, 22, accent, { weight: 600 })}${body(410, h * 0.59, 594, h * 0.25, false)}`}`;
  } else if (template.layout === "frame") {
    composition = `${kicker(margin, h * 0.17, width)}${heading(margin, h * 0.235, width, h * 0.22)}${body(margin, h * 0.48, width, h * 0.11)}
      <rect x="76" y="${h * 0.64}" width="928" height="${h * 0.2}" rx="14" fill="${fg}" opacity="0.045"/>
      ${image ? photo(112, h * 0.655, 856, h * 0.17) : `<text x="540" y="${h * 0.79}" text-anchor="middle" font-size="${h * 0.13}" fill="${accent}" font-weight="400" letter-spacing="-4">${escape((media.appName ?? "Kinetik").slice(0, 2).toUpperCase())}</text>`}`;
  } else if (template.layout === "outline") {
    const total = doc.linked ? doc.pages.length * w : w;
    const shift = doc.linked ? index * w : 0;
    const guideY = h - 205;
    composition = `<g transform="translate(${-shift},0)">${rule(0, guideY, total, accent, 0.6)}${Array.from({ length: doc.linked ? doc.pages.length : 1 }, (_, i) => `<circle cx="${i * w + margin}" cy="${guideY}" r="6" fill="${accent}"/>`).join("")}</g>
      ${kicker(margin, h * 0.2, width)}${heading(margin, h * 0.275, width, h * 0.22)}${body(margin, h * 0.525, image ? 370 : 760, h * 0.23)}${photo(500, h * 0.54, 504, Math.max(120, guideY - h * 0.54 - 46))}`;
    footer = "";
  } else if (template.layout === "continuum") {
    const total = doc.linked ? doc.pages.length * w : w;
    const shift = doc.linked ? index * w : 0;
    const curve = `M 0 ${h * 0.79} C ${total * 0.3} ${h * 0.46}, ${total * 0.7} ${h * 0.97}, ${total} ${h * 0.73}`;
    composition = `<g transform="translate(${-shift},0)"><path d="${curve} L ${total} ${h} H 0 Z" fill="${accent}" opacity="0.09"/><path d="${curve}" fill="none" stroke="${accent}" stroke-width="2" opacity="0.45"/></g>
      ${kicker(margin, h * 0.22, width)}${heading(margin, h * 0.3, width, h * 0.24)}${body(margin, h * 0.59, image ? 390 : 760, h * 0.2)}${photo(530, h * 0.59, 474, h * 0.23)}`;
    footer = "";
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape(page.title)}"><rect width="${w}" height="${h}" fill="${bg}"/><g font-family="${font}">
    ${logo ? `<image href="${logo}" x="76" y="68" width="180" height="64" preserveAspectRatio="xMinYMid meet"/>` : text(media.appName ?? "KINETIK", margin, 76, 700, 60, 24, fg, { weight: 600 })}
    ${composition}${footer}${text(page.cta, margin, h - 113, 760, 48, 25, fg, { weight: 600 })}
    <text x="1004" y="${h - 88}" fill="${fg}" font-size="22" text-anchor="end">${number} / ${String(doc.pages.length).padStart(2, "0")}</text>
    ${media.watermark ? `<text x="540" y="${h - 40}" fill="${fg}" font-size="18" text-anchor="middle">Made with Kinetik</text>` : ""}
    </g></svg>`;
}

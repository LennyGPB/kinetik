import { POST_FORMATS, getPostTemplate, isPhotoTemplate } from "@/config/post-templates";
import type { PostDocument } from "./document";
import type { PostRenderMedia } from "./professional-svg";
import { outlineText, escapeSvg as esc } from "./outline-text";
import demoRatios from "./demo-ratios.json";
import { CAMPAIGN_DEMO_PHOTOS } from "@/config/post-campaigns";
import { campaignPostArt } from "./campaign-svg";

export const PHOTO_DEMOS: Record<string, string> = { ...CAMPAIGN_DEMO_PHOTOS, "post-portrait": "/post-demos/team.jpg", "post-nomad": "/post-demos/lake.jpg", "post-district": "/post-demos/city.jpg", "post-manifest": "/post-demos/city.jpg" };
const safe = (url: string | null | undefined, demo: boolean) => url && (/^\/api\/uploads\/[A-Za-z0-9_/.\-]+(?:\?share=[A-Za-z0-9_-]{16,64})?$/.test(url) || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url) || demo && /^\/post-demos\/(workspace|interior|desert|flowers|detail|team|lake|city|portrait-[1-6])\.jpg$/.test(url)) ? esc(url) : "";
const label = (value: string, x: number, y: number, size: number, fill: string, center = false, width = 900, height = size * 2.6) => {
  const wrap = (size: number) => { const max = Math.max(1, Math.floor(width / (size * 0.6))); const rows: string[] = []; let row = "";
    for (const word of value.trim().split(/\s+/)) for (const chunk of word.match(new RegExp(`.{1,${max}}`, "gu")) ?? []) { if (row && row.length + chunk.length + 1 > max) { rows.push(row); row = ""; } row += (row ? " " : "") + chunk; }
    if (row) rows.push(row); return rows;
  };
  let rows = wrap(size);
  while (rows.length * size * 1.3 > height && size > 12) { size--; rows = wrap(size); }
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial,sans-serif" font-size="${size}" text-anchor="${center ? "middle" : "start"}">${rows.map((line, i) => `<tspan x="${x}" dy="${i ? size * 1.3 : 0}">${esc(line)}</tspan>`).join("")}</text>`;
};

export function photoPostSvg(doc: PostDocument, index: number, media: PostRenderMedia): string | null {
  if (!isPhotoTemplate(doc.templateId)) return null;
  const page = doc.pages[index]; const template = getPostTemplate(doc.templateId)!;
  const { width: w, height: h } = POST_FORMATS[doc.format];
  const [bg, fg, accent] = doc.colors; const demo = Boolean(media.demo);
  let hash = 2166136261;
  for (const char of `${doc.templateId}${page.id}${doc.colors.join("")}${index}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const id = `ph${(hash >>> 0).toString(16)}`;
  const image = page.layout !== "text" ? safe(page.imageIndex === null ? demo ? PHOTO_DEMOS[doc.templateId] : null : media.screenUrls?.[page.imageIndex], demo) : "";
  const imageRatio = page.imageIndex === null ? (demoRatios as Record<string, number>)[PHOTO_DEMOS[doc.templateId]] ?? 1.5 : media.screenRatios?.[page.imageIndex] ?? 1.5;
  const photo = (url: string, ratio: number, x: number, y: number, pw: number, ph: number, mono = page.imageEffect === "grayscale") => {
    if (!url) return `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${accent}" opacity="0.14"/>${label("PHOTO", x + pw / 2, y + ph / 2, 26, fg, true, pw - 40)}`;
    const boxRatio = pw / ph; const cover = (page.imageFit ?? "cover") === "cover";
    let iw = cover === (ratio > boxRatio) ? ph * ratio : pw; let ih = iw / ratio;
    iw *= page.imageZoom ?? 1; ih *= page.imageZoom ?? 1;
    const ix = (pw - iw) * (page.imageX ?? 50) / 100; const iy = (ph - ih) * (page.imageY ?? 50) / 100;
    return `<svg x="${x}" y="${y}" width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}" overflow="hidden"><image href="${url}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="none"${mono ? ` filter="url(#${id}mono)"` : ""}/></svg>`;
  };
  const title = (x: number, y: number, tw: number, th: number, face: "condensed" | "serif" | "italic", size = page.titleSize, color = fg, center = page.align === "center") => outlineText(page.title, face, x + page.offsetX, y + page.offsetY, tw, th, size, color, center);
  let art = campaignPostArt(doc, index, { id, image, imageRatio, photo, label });
  if (art !== null) {
    // Authored campaign composition; common logo, CTA and export watermark follow below.
  } else if (template.layout === "portrait") {
    art = `${photo(image, imageRatio, 0, 0, w, h)}<rect width="${w}" height="${h}" fill="url(#${id}shade)"/><rect x="48" y="0" width="984" height="${h}" fill="none" stroke="${fg}" opacity="0.65"/>
      ${label(page.kicker, 540, 128, 20, fg, true)}${title(90, 165, 900, h * 0.23, doc.font === "serif" ? "italic" : "condensed", page.titleSize * 1.25)}${label(page.body, 76, h - 225, 24, fg, false, 800)}`;
  } else if (template.layout === "team-board") {
    const members = page.members ?? [];
    const gap = 22; const cardW = (928 - gap * 2) / 3; const cardH = h * 0.25;
    art = `${label(page.kicker, 76, 152, 23, fg)}${title(76, 185, 928, h * 0.18, "condensed", page.titleSize * 1.08)}
      ${Array.from({ length: 6 }, (_, i) => {
        const member = members[i]; const x = 76 + i % 3 * (cardW + gap); const y = h * 0.385 + Math.floor(i / 3) * (cardH + gap);
        const url = safe(member?.imageIndex !== null && member?.imageIndex !== undefined ? media.screenUrls?.[member.imageIndex] : demo ? `/post-demos/portrait-${i + 1}.jpg` : null, demo);
        const ratio = member?.imageIndex !== null && member?.imageIndex !== undefined ? media.screenRatios?.[member.imageIndex] ?? 0.8 : (demoRatios as Record<string, number>)[`/post-demos/portrait-${i + 1}.jpg`] ?? 0.8;
        return `<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="6" fill="${fg}"/>${photo(url, ratio, x + 12, y + 12, cardW - 24, cardH * 0.68)}${label(member?.name ?? "", x + cardW / 2, y + cardH * 0.79, 18, bg, true, cardW - 30)}${label(member?.role ?? "", x + cardW / 2, y + cardH * 0.9, 14, bg, true, cardW - 30)}`;
      }).join("")}`;
  } else if (template.layout === "nomad") {
    const px = 200; const py = h * 0.16; const pw = 680; const ph = h * 0.68;
    art = `${photo(image, imageRatio, 0, 0, w, h)}<rect width="${w}" height="${h}" fill="#000000" opacity="${page.imageOverlay ?? 0.3}"/>
      <defs><clipPath id="${id}glass"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="18"/></clipPath><filter id="${id}blur"><feGaussianBlur stdDeviation="16"/></filter></defs><g clip-path="url(#${id}glass)"><g filter="url(#${id}blur)">${photo(image, imageRatio, 0, 0, w, h)}</g></g>
      <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="18" fill="${accent}" opacity="0.65"/><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="18" fill="none" stroke="${fg}" opacity="0.3"/>
      ${["#D45A4B", "#D8AE57", "#7B9B67"].map((color, i) => `<circle cx="${px + 52 + i * 28}" cy="${py + 48}" r="6" fill="${color}"/>`).join("")}
      ${label(page.kicker, px + 46, py + 100, 18, bg)}${title(px + 46, py + 120, pw - 92, ph * 0.2, "serif", page.titleSize, bg, false)}
      <path d="M ${px + 46} ${py + ph * 0.39} H ${px + pw - 46}" stroke="${bg}" opacity="0.3"/>
      ${page.body.split(/\n/).slice(0, 6).map((line, i) => `${label(line, px + 46, py + ph * 0.46 + i * 58, 25, bg, false, pw - 130)}<path d="M ${px + pw - 65} ${py + ph * 0.46 + i * 58 - 12} l 7 7 -7 7" fill="none" stroke="${bg}"/>`).join("")}`;
  } else if (template.layout === "district") {
    const pale = index % 3 === 1; const total = doc.linked ? doc.pages.length * w : w; const shift = doc.linked ? index * w : 0;
    const words = page.title.trim().split(/\s+/); const last = words.pop() ?? "";
    art = `${pale ? `<rect width="${w}" height="${h}" fill="${fg}"/>${image ? photo(image, imageRatio, 0, h * 0.72, w, h * 0.28) : ""}` : `${photo(image, imageRatio, 0, 0, w, h)}<rect width="${w}" height="${h}" fill="url(#${id}shade)"/>`}
      ${label(page.kicker, 76, 124, 27, accent)}${outlineText(words.join(" "), "condensed", 76 + page.offsetX, h * (pale ? 0.18 : 0.28) + page.offsetY, 928, h * (pale ? 0.22 : 0.27), page.titleSize * 1.6, pale ? bg : fg)}${outlineText(last, "condensed", 76 + page.offsetX, h * (pale ? 0.43 : 0.58) + page.offsetY, 928, h * 0.13, page.titleSize * 1.6, accent)}
      ${label(page.body, 76, h * (pale ? 0.62 : 0.77), 27, pale ? bg : fg, false, 740, h * 0.08)}
      ${doc.linked ? `<g transform="translate(${-shift},0)"><path d="M 0 ${h - 155} Q ${total / 2} ${h - 230}, ${total} ${h - 155}" stroke="${accent}" stroke-width="12" fill="none"/></g>` : ""}
      <rect x="0" y="${h - 20}" width="${w}" height="20" fill="${accent}"/>`;
  } else {
    const words = page.title.trim().split(/\s+/); const last = words.pop() ?? "";
    art = `${image ? photo(image, imageRatio, 0, h * 0.48, w, h * 0.52) : ""}<rect x="0" y="${h * 0.48}" width="${w}" height="${h * 0.52}" fill="${bg}" opacity="${page.imageOverlay ?? 0.2}"/>
      ${label(page.kicker, 76, 120, 26, fg)}${outlineText(words.join(" "), "condensed", 76 + page.offsetX, h * 0.17 + page.offsetY, 928, h * 0.32, page.titleSize * 1.65, fg)}${outlineText(last, "italic", 76 + page.offsetX, h * 0.51 + page.offsetY, 928, h * 0.15, page.titleSize * 1.5, accent)}
      <path d="M 76 ${h * 0.69} Q 370 ${h * 0.62}, 770 ${h * 0.65}" stroke="${accent}" stroke-width="9" fill="none"/>
      <rect x="60" y="${h * 0.77}" width="960" height="${h * 0.13}" fill="${bg}" opacity="0.92"/>${label(page.body, 76, h * 0.81, 26, fg, false, 880)}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(page.title)}"><defs><filter id="${id}mono" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter><linearGradient id="${id}shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="${page.imageOverlay ?? 0.4}"/><stop offset="0.45" stop-color="#000000" stop-opacity="0.05"/><stop offset="1" stop-color="#000000" stop-opacity="0.85"/></linearGradient></defs><rect width="${w}" height="${h}" fill="${bg}"/>${art}
    ${safe(media.logoUrl, false) ? `<image href="${safe(media.logoUrl, false)}" x="76" y="38" width="140" height="42" preserveAspectRatio="xMinYMid meet"/>` : ""}${label(page.cta, 76, h - 66, 24, template.layout === "district" && index % 3 === 1 ? bg : fg, false, 790)}${label(`${index + 1} / ${doc.pages.length}`, 1004, h - 66, 19, template.layout === "district" && index % 3 === 1 ? bg : fg, true, 90)}
    ${media.watermark ? label("Made with Kinetik", 540, h - 26, 16, fg, true) : ""}</svg>`;
}

import { POST_FORMATS } from "@/config/post-templates";
import type { PostDocument } from "./document";
import type { PostRenderMedia } from "./professional-svg";
import { escapeSvg as esc, outlineText } from "./outline-text";

/**
 * Orbit — carrousel lié : nuit profonde, une grande orbite lumineuse qui traverse toutes les pages, des planètes qui s'y posent
 * (une par page), un champ d'étoiles ; titre en grotesque large, puce d'étape, texte, image dans une carte en verre.
 * Le décor continu est dessiné une seule fois dans le repère du panorama (largeur = pages × 1080) puis décalé par page :
 * deux pages voisines se raccordent exactement (pas de flou SVG, pas d'élément propre à une page près des bords).
 */
const safeImage = (url: string | null | undefined) => url && (/^\/api\/uploads\/[A-Za-z0-9_/.\-]+(?:\?share=[A-Za-z0-9_-]{16,64})?$/.test(url) || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)) ? esc(url) : "";
const rnd = (seed: number) => { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

function label(value: string, x: number, y: number, size: number, fill: string, width: number, height = size * 2.6, weight = 400, anchor = "start") {
  const max = Math.max(4, Math.floor(width / (size * 0.56)));
  const rows: string[] = []; let row = "";
  for (const word of value.trim().split(/\s+/).filter(Boolean)) for (const chunk of word.match(new RegExp(`.{1,${max}}`, "gu")) ?? []) { if (row && row.length + chunk.length + 1 > max) { rows.push(row); row = ""; } row += (row ? " " : "") + chunk; }
  if (row) rows.push(row);
  let s = size; while (rows.length * s * 1.3 > height && s > 14) s--;
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${s}" font-weight="${weight}" text-anchor="${anchor}">${rows.map((line, i) => `<tspan x="${x}" dy="${i ? s * 1.3 : 0}">${esc(line)}</tspan>`).join("")}</text>`;
}

export function orbitPostSvg(doc: PostDocument, index: number, media: PostRenderMedia = {}) {
  const page = doc.pages[index];
  const { width: w, height: h } = POST_FORMATS[doc.format];
  const [bg, fg, accent] = doc.colors;
  const count = doc.linked ? doc.pages.length : 1;
  const total = w * count, shift = doc.linked ? index * w : 0;
  const id = `orb${index}`;
  // Orbite : ellipse centrée sous le panorama, dont l'arc supérieur traverse le bas de chaque page
  const cx = total / 2, cy = h * 1.18, rx = Math.max(total * 0.62, w * 0.9), ry = h * 0.5;
  const onRing = (x: number, scale = 1) => cy - ry * scale * Math.sqrt(Math.max(0, 1 - ((x - cx) / (rx * scale)) ** 2));
  const stars = Array.from({ length: 24 * count }, (_, k) => `<circle cx="${(rnd(k) * total).toFixed(1)}" cy="${(rnd(k + 500) * h * 0.95).toFixed(1)}" r="${(1 + rnd(k + 900) * 2.2).toFixed(1)}" fill="${fg}" opacity="${(0.15 + rnd(k + 1300) * 0.5).toFixed(2)}"/>`).join("");
  const planets = Array.from({ length: count }, (_, i) => {
    const x = i * w + w * (i % 2 ? 0.3 : 0.72), y = onRing(x), r = 26 + (i % 3) * 8;
    return `<circle cx="${x}" cy="${y}" r="${r * 3.2}" fill="url(#${id}halo)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${accent}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.32}" fill="#ffffff" opacity=".55"/>`;
  }).join("");
  const image = page.layout !== "text" && page.imageIndex !== null ? safeImage(media.screenUrls?.[page.imageIndex]) : "";
  const logo = safeImage(media.logoUrl);
  const step = `${String(index + 1).padStart(2, "0")} / ${String(doc.pages.length).padStart(2, "0")}`;
  const x = 76 + page.offsetX, y = page.offsetY;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(page.title)}"><rect width="${w}" height="${h}" fill="${bg}"/>
  <defs>
    <radialGradient id="${id}halo"><stop stop-color="${accent}" stop-opacity=".55"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}sky" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx * 1.05}"><stop offset=".55" stop-color="${accent}" stop-opacity=".22"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <clipPath id="${id}card"><rect x="${x}" y="${h * 0.555 + y}" width="560" height="${h * 0.2}" rx="26"/></clipPath>
  </defs>
  <g transform="translate(${-shift},0)">
    <rect width="${total}" height="${h}" fill="url(#${id}sky)"/>${stars}
    <ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.08}" ry="${ry * 1.08}" fill="none" stroke="${fg}" stroke-opacity=".12" stroke-width="2" stroke-dasharray="4 14"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${accent}" stroke-opacity=".22" stroke-width="26"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${accent}" stroke-width="4"/>
    ${planets}
  </g>
  <g font-family="Arial,sans-serif">
    ${logo ? `<image href="${logo}" x="76" y="64" width="180" height="64" preserveAspectRatio="xMinYMid meet"/>` : label(media.appName ?? "KINETIK", 76, 108, 26, fg, 600, 40, 700)}
    <rect x="${w - 76 - 150}" y="74" width="150" height="50" rx="25" fill="${accent}"/>${label(step, w - 76 - 75, 108, 22, bg, 140, 40, 700, "middle")}
    ${label(page.kicker.toUpperCase(), x, h * 0.2 + y, 22, accent, 900, 40, 700)}
    ${outlineText(page.title, "wide", x, h * 0.225 + y, 928, h * 0.21, page.titleSize, fg)}
    ${label(page.body, x, h * 0.47 + y, 28, fg, image ? 900 : 860, h * 0.08)}
    ${image ? `<rect x="${x - 6}" y="${h * 0.555 + y - 6}" width="572" height="${h * 0.2 + 12}" rx="30" fill="${fg}" opacity=".1"/><g clip-path="url(#${id}card)"><image href="${image}" x="${x}" y="${h * 0.555 + y}" width="560" height="${h * 0.2}" preserveAspectRatio="xMidYMid slice"/></g><rect x="${x}" y="${h * 0.555 + y}" width="560" height="${h * 0.2}" rx="26" fill="none" stroke="${accent}" stroke-opacity=".6" stroke-width="2"/>` : ""}
    ${label(page.cta, 76, h - 64, 26, fg, 760, 40, 700)}
    ${media.watermark ? `<text x="540" y="${h - 24}" font-size="18" text-anchor="middle" fill="${fg}">Made with Kinetik</text>` : ""}
  </g></svg>`;
}

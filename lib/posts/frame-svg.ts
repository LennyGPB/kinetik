import { POST_FORMATS } from "@/config/post-templates";
import type { PostDocument } from "./document";
import type { PostRenderMedia } from "./professional-svg";
import { escapeSvg as esc, outlineText } from "./outline-text";

/**
 * Frame — écrin moderne pour une capture d'écran : fond sombre traversé de halos colorés, titre en grotesque large,
 * fenêtre d'application en verre (barre à trois points, onglet au nom de l'app), capture entière (jamais recadrée),
 * pastille flottante ; sans capture, une interface esquissée occupe la fenêtre.
 */
const safeImage = (url: string | null | undefined) => url && (/^\/api\/uploads\/[A-Za-z0-9_/.\-]+(?:\?share=[A-Za-z0-9_-]{16,64})?$/.test(url) || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)) ? esc(url) : "";
const mix = (a: string, b: string, k: number) => /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b) ? "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("") : a;

function label(value: string, x: number, y: number, size: number, fill: string, width: number, height = size * 2.6, weight = 400, anchor = "start") {
  const max = Math.max(4, Math.floor(width / (size * 0.56)));
  const rows: string[] = []; let row = "";
  for (const word of value.trim().split(/\s+/).filter(Boolean)) for (const chunk of word.match(new RegExp(`.{1,${max}}`, "gu")) ?? []) { if (row && row.length + chunk.length + 1 > max) { rows.push(row); row = ""; } row += (row ? " " : "") + chunk; }
  if (row) rows.push(row);
  let s = size; while (rows.length * s * 1.3 > height && s > 12) s--;
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${s}" font-weight="${weight}" text-anchor="${anchor}">${rows.map((line, i) => `<tspan x="${x}" dy="${i ? s * 1.3 : 0}">${esc(line)}</tspan>`).join("")}</text>`;
}

export function framePostSvg(doc: PostDocument, index: number, media: PostRenderMedia = {}) {
  const page = doc.pages[index];
  const { width: w, height: h } = POST_FORMATS[doc.format];
  const [bg, fg, accent] = doc.colors;
  const id = `frm${index}`;
  const pink = mix(accent, "#FF5FD2", 0.6);
  const image = page.layout !== "text" && page.imageIndex !== null ? safeImage(media.screenUrls?.[page.imageIndex]) : "";
  const ratio = page.imageIndex !== null ? media.screenRatios?.[page.imageIndex] ?? null : null;
  const logo = safeImage(media.logoUrl);
  const x = 76 + page.offsetX, y = page.offsetY;
  // Fenêtre : sa hauteur suit le format ; une capture verticale (téléphone) donne une fenêtre plus étroite et centrée
  const winTop = h * 0.4, winH = h * 0.47;
  const portrait = ratio !== null && ratio < 0.8;
  const winW = portrait ? Math.min(928, (winH - 56) * ratio! + 40) : 928, winX = (w - winW) / 2;
  const sketch = Array.from({ length: 3 }, (_, k) => `<rect x="${winX + 32 + k * ((winW - 64) / 3)}" y="${winTop + 96}" width="${(winW - 64) / 3 - 18}" height="${winH * 0.3}" rx="16" fill="${fg}" opacity="${0.06 + k * 0.02}"/>`).join("")
    + `<rect x="${winX + 32}" y="${winTop + 120 + winH * 0.3}" width="${winW * 0.55}" height="18" rx="9" fill="${fg}" opacity=".12"/><rect x="${winX + 32}" y="${winTop + 152 + winH * 0.3}" width="${winW * 0.38}" height="18" rx="9" fill="${fg}" opacity=".08"/><rect x="${winX + winW - 220}" y="${winTop + 128 + winH * 0.3}" width="188" height="56" rx="28" fill="${accent}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(page.title)}"><rect width="${w}" height="${h}" fill="${bg}"/>
  <defs>
    <radialGradient id="${id}a"><stop stop-color="${accent}" stop-opacity=".55"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}b"><stop stop-color="${pink}" stop-opacity=".4"/><stop offset="1" stop-color="${pink}" stop-opacity="0"/></radialGradient>
    <clipPath id="${id}shot"><rect x="${winX + 14}" y="${winTop + 58}" width="${winW - 28}" height="${winH - 72}" rx="14"/></clipPath>
  </defs>
  <ellipse cx="${w * (index % 2 ? 0.15 : 0.85)}" cy="${h * 0.62}" rx="${w * 0.7}" ry="${h * 0.38}" fill="url(#${id}a)"/>
  <ellipse cx="${w * (index % 2 ? 0.85 : 0.18)}" cy="${h * 0.95}" rx="${w * 0.55}" ry="${h * 0.3}" fill="url(#${id}b)"/>
  ${Array.from({ length: 9 }, (_, k) => `<path d="M ${k * w / 8} 0 V ${h}" stroke="${fg}" stroke-opacity=".04"/>`).join("")}
  <g font-family="Arial,sans-serif">
    ${logo ? `<image href="${logo}" x="76" y="64" width="180" height="64" preserveAspectRatio="xMinYMid meet"/>` : label(media.appName ?? "KINETIK", 76, 108, 26, fg, 600, 40, 700)}
    <rect x="${x}" y="${h * 0.115 + y}" width="${Math.min(560, page.kicker.length * 15 + 60)}" height="46" rx="23" fill="${fg}" fill-opacity=".08" stroke="${fg}" stroke-opacity=".2"/>
    <circle cx="${x + 24}" cy="${h * 0.115 + y + 23}" r="6" fill="${accent}"/>${label(page.kicker.toUpperCase(), x + 42, h * 0.115 + y + 30, 19, fg, 500, 30, 700)}
    ${outlineText(page.title, "wide", x, h * 0.165 + y, 928, h * 0.14, page.titleSize * 0.85, fg)}
    ${label(page.body, x, h * 0.33 + y, 26, mix(fg, bg, 0.25), 900, h * 0.055)}
    <rect x="${winX}" y="${winTop}" width="${winW}" height="${winH}" rx="26" fill="${mix(bg, fg, 0.07)}" stroke="${fg}" stroke-opacity=".18" stroke-width="2"/>
    ${[0, 1, 2].map((k) => `<circle cx="${winX + 30 + k * 22}" cy="${winTop + 29}" r="7" fill="${["#FF5F57", "#FEBC2E", "#28C840"][k]}"/>`).join("")}
    <rect x="${winX + winW / 2 - 130}" y="${winTop + 13}" width="260" height="32" rx="16" fill="${fg}" fill-opacity=".07"/>${label((media.appName ?? "Kinetik").slice(0, 24), winX + winW / 2, winTop + 35, 17, mix(fg, bg, 0.35), 240, 26, 400, "middle")}
    ${image ? `<g clip-path="url(#${id}shot)"><rect x="${winX + 14}" y="${winTop + 58}" width="${winW - 28}" height="${winH - 72}" fill="${mix(bg, fg, 0.03)}"/><image href="${image}" x="${winX + 14}" y="${winTop + 58}" width="${winW - 28}" height="${winH - 72}" preserveAspectRatio="xMidYMid meet"/></g>` : sketch}
    <rect x="${w - 76 - 150}" y="${winTop - 30}" width="150" height="60" rx="30" fill="${accent}"/>${label(String(index + 1).padStart(2, "0"), w - 76 - 75, winTop + 9, 26, bg, 120, 40, 700, "middle")}
    ${label(page.cta, 76, h - 56, 26, fg, 760, 40, 700)}
    <text x="1004" y="${h - 56}" fill="${fg}" font-size="22" text-anchor="end">${String(index + 1).padStart(2, "0")} / ${String(doc.pages.length).padStart(2, "0")}</text>
    ${media.watermark ? `<text x="540" y="${h - 20}" font-size="17" text-anchor="middle" fill="${fg}">Made with Kinetik</text>` : ""}
  </g></svg>`;
}

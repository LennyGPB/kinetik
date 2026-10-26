import { POST_FORMATS, getPostTemplate } from "@/config/post-templates";
import { isCampaignPost } from "@/config/post-campaigns";
import type { PostDocument } from "./document";
import { outlineGlyphs, outlineText, type OutlineFace } from "./outline-text";

const NEON_GREEN = "#3DFF8F", HYPE_PINK = "#FF3D8B";
/** Hex mix that falls back to the first colour when either value is not a plain hex. */
const mixHex = (a: string, b: string, k: number) => /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b) ? "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("") : a;
/** Rendered size of outlined text, to fit a label box behind it. */
const measure = (value: string, face: OutlineFace, width: number, height: number, size: number) => {
  const { glyphs, size: fitted, rows } = outlineGlyphs(value, face, 0, 0, width, height, size);
  return { width: glyphs.length ? Math.max(...glyphs.map((g) => g.box.x1)) : 0, height: rows * fitted * 1.13 };
};

export type CampaignTools = {
  id: string; image: string; imageRatio: number;
  photo: (url: string, ratio: number, x: number, y: number, width: number, height: number, mono?: boolean) => string;
  label: (value: string, x: number, y: number, size: number, fill: string, center?: boolean, width?: number, height?: number) => string;
};

/** Authored compositions, sharing only safe media, typography and frame primitives. */
export function campaignPostArt(doc: PostDocument, index: number, tools: CampaignTools): string | null {
  if (!isCampaignPost(doc.templateId)) return null;
  const page = doc.pages[index]; const template = getPostTemplate(doc.templateId)!;
  const { width: w, height: h } = POST_FORMATS[doc.format];
  const [bg, fg, accent] = doc.colors;
  const { id, image, imageRatio, photo, label } = tools;
  const fullPhoto = () => photo(image, imageRatio, 0, 0, w, h);
  const shade = `<rect width="${w}" height="${h}" fill="url(#${id}shade)"/>`;
  const total = doc.linked ? w * doc.pages.length : w; const shift = doc.linked ? index * w : 0;
  const heading = (value: string, face: OutlineFace, x: number, y: number, width: number, height: number, size: number, color = fg, center = page.align === "center") => outlineText(value, face, x + page.offsetX, y + page.offsetY, width, height, size, color, center);
  const body = (x: number, y: number, width: number, height: number, center = false) => label(page.body, x, y, 25, fg, center, width, height);
  const words = page.title.trim().split(/\s+/); const ending = words.splice(Math.max(0, words.length - 2)).join(" "); const beginning = words.join(" ");
  /** Outlined (stroke-only) title; the stroke width is given in output pixels. */
  const stroked = (value: string, face: OutlineFace, x: number, y: number, width: number, height: number, size: number, color: string, strokeWidth: number, center = false) => {
    const scale = outlineGlyphs(value, face, x, y, width, height, size, center).glyphs[0]?.scale ?? 1;
    return `<g stroke="${color}" stroke-width="${(strokeWidth / scale).toFixed(2)}" stroke-linejoin="round">${outlineText(value, face, x + page.offsetX, y + page.offsetY, width, height, size, "none", center)}</g>`;
  };
  const footerNotes = `<path d="M 76 ${h - 190} H 1004" stroke="${fg}" opacity="0.4"/>${label(page.kicker, 76, h - 146, 17, fg, false, 400)}`;

  switch (template.layout) {
    case "kinetik-launch": {
      // Landing Kinetik : noir quadrillé, halo violet, badge, titre blanc + ligne violette fine, bouton violet,
      // et la maquette du hero qui change de format à chaque page (moniteur, téléphone, post carré).
      const glow = mixHex(accent, "#ffffff", 0.25);
      const grid = Array.from({ length: Math.ceil(w / 72) + 1 }, (_, k) => `<path d="M ${k * 72} 0 V ${h}" stroke="${fg}" stroke-opacity=".05"/>`).join("")
        + Array.from({ length: Math.ceil(h / 72) + 1 }, (_, k) => `<path d="M 0 ${k * 72} H ${w}" stroke="${fg}" stroke-opacity=".05"/>`).join("");
      const badgeW = Math.min(620, page.kicker.length * 13 + 90);
      // Le cadre commun affiche déjà le CTA en bas : le bouton porte seulement la flèche
      const button = "→", buttonW = 200;
      const top = h * 0.53, area = h * 0.36, kind = index % 3;
      const device = kind === 0
        ? `<rect x="150" y="${top}" width="780" height="${area * 0.82}" rx="22" fill="#0c0c11" stroke="${fg}" stroke-opacity=".18" stroke-width="2"/>
           <clipPath id="${id}scr"><rect x="166" y="${top + 16}" width="748" height="${area * 0.82 - 32}" rx="12"/></clipPath><g clip-path="url(#${id}scr)">${photo(image, imageRatio, 166, top + 16, 748, area * 0.82 - 32)}</g>
           <rect x="500" y="${top + area * 0.82}" width="80" height="${area * 0.08}" fill="#1d1d24"/><rect x="400" y="${top + area * 0.9}" width="280" height="12" rx="6" fill="#1d1d24"/>`
        : kind === 1
        ? `<rect x="${w / 2 - area * 0.29}" y="${top}" width="${area * 0.58}" height="${area}" rx="44" fill="#0c0c11" stroke="${fg}" stroke-opacity=".18" stroke-width="2"/>
           <clipPath id="${id}scr"><rect x="${w / 2 - area * 0.29 + 12}" y="${top + 12}" width="${area * 0.58 - 24}" height="${area - 24}" rx="34"/></clipPath><g clip-path="url(#${id}scr)">${photo(image, imageRatio, w / 2 - area * 0.29 + 12, top + 12, area * 0.58 - 24, area - 24)}</g>
           <rect x="${w / 2 - 50}" y="${top + 22}" width="100" height="22" rx="11" fill="#000"/>`
        : `<rect x="${w / 2 - area * 0.5}" y="${top}" width="${area}" height="${area}" rx="26" fill="#14141c" stroke="${fg}" stroke-opacity=".18" stroke-width="2"/>
           <circle cx="${w / 2 - area * 0.5 + 34}" cy="${top + 32}" r="14" fill="${accent}"/>${label("kinetik", w / 2 - area * 0.5 + 58, top + 40, 20, fg, false, 200)}
           <clipPath id="${id}scr"><rect x="${w / 2 - area * 0.5 + 14}" y="${top + 62}" width="${area - 28}" height="${area - 120}" rx="14"/></clipPath><g clip-path="url(#${id}scr)">${photo(image, imageRatio, w / 2 - area * 0.5 + 14, top + 62, area - 28, area - 120)}</g>
           <path d="M ${w / 2 - area * 0.5 + 30} ${top + area - 34} c -10 -8 -10 -18 -2 -18 c 4 0 6 3 6 5 c 0 -2 2 -5 6 -5 c 8 0 8 10 -2 18 z" fill="#ff4d6d"/>`;
      return `<defs>
          <radialGradient id="${id}violet" cx=".5" cy="0" r=".9"><stop stop-color="${accent}" stop-opacity=".55"/><stop offset=".6" stop-color="${accent}" stop-opacity=".1"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
          <radialGradient id="${id}under" cx=".5" cy=".5" r=".5"><stop stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
          <linearGradient id="${id}btn" x1="0" x2="1"><stop stop-color="${glow}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
        </defs>
        ${grid}<rect width="${w}" height="${h * 0.7}" fill="url(#${id}violet)"/><ellipse cx="${w / 2}" cy="${top + area * 0.55}" rx="${w * 0.48}" ry="${area * 0.5}" fill="url(#${id}under)"/>
        <rect x="${w / 2 - badgeW / 2}" y="${h * 0.075}" width="${badgeW}" height="48" rx="24" fill="${fg}" fill-opacity=".06" stroke="${fg}" stroke-opacity=".18"/>
        <circle cx="${w / 2 - badgeW / 2 + 28}" cy="${h * 0.075 + 24}" r="6" fill="#ef4444"/>${label(page.kicker, w / 2 + 12, h * 0.075 + 32, 19, fg, true, badgeW - 70)}
        ${heading(beginning || page.title, "wide", 70, h * 0.135, 940, h * 0.15, page.titleSize * 1.05, fg, true)}
        ${beginning ? heading(ending, "rounded", 70, h * 0.135 + h * 0.14, 940, h * 0.08, page.titleSize * 0.85, glow, true) : ""}
        ${label(page.body, w / 2, h * 0.39, 24, mixHex(fg, bg, 0.35), true, 820, h * 0.05)}
        <rect x="${w / 2 - buttonW / 2}" y="${h * 0.44}" width="${buttonW}" height="64" rx="32" fill="url(#${id}btn)"/>${label(button, w / 2, h * 0.44 + 42, 24, "#ffffff", true, buttonW - 30)}
        ${device}`;
    }
    case "kinetik-guide":
      return `<defs><linearGradient id="${id}purple" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="${bg}"/></linearGradient></defs>
        <rect x="70" y="90" width="120" height="66" rx="33" fill="${accent}"/>${label(String(index + 1).padStart(2, "0"), 130, 134, 24, bg, true, 90)}${label(page.kicker, 230, 130, 17, fg, false, 770)}
        ${heading(page.title, "wide", 70, h * 0.25, 940, h * 0.3, page.titleSize * 1.12)}${body(70, h * 0.64, 650, h * 0.13)}${photo(image, imageRatio, 790, h * 0.6, 220, h * 0.15)}
        <g transform="translate(${-shift},0)"><path d="M 0 ${h * 0.84} H ${total}" stroke="${accent}" stroke-width="3"/></g><circle cx="${w * 0.84}" cy="${h * 0.84}" r="34" fill="url(#${id}purple)" stroke="${accent}"/>
        <path d="M 891 ${h * 0.84} h 30 m -12 -12 12 12 -12 12" stroke="${fg}" stroke-width="3" fill="none"/>`;
    case "margin":
      return `${photo(image, imageRatio, 400, h * 0.08, 610, h * 0.59)}${label(page.kicker, 70, 100, 17, accent, false, 290)}
        <path d="M 340 ${h * 0.08} V ${h * 0.92}" stroke="${accent}" opacity="0.4"/>${heading(page.title, "serif", 70, h * 0.7, 940, h * 0.15, page.titleSize * 1.15)}${body(400, h * 0.9, 610, h * 0.065)}`;
    case "placard":
      return `${heading(page.title.toUpperCase(), "condensed", 65, h * 0.12, 950, h * 0.35, page.titleSize * 1.65)}${label(page.kicker, 65, 85, 17, accent)}
        ${photo(image, imageRatio, 590, h * 0.59, 425, h * 0.28)}<path d="M 65 ${h * 0.55} H 1015" stroke="${accent}"/>${body(65, h * 0.66, 465, h * 0.18)}`;
    case "cutline":
      return `${label(page.kicker, 65, 92, 17, accent)}${photo(image, imageRatio, 0, h * 0.18, 760, h * 0.38, true)}
        <g transform="translate(${-shift},0)"><path d="M 0 ${h * 0.61} H ${total}" stroke="${accent}" stroke-width="5"/></g><rect x="815" y="${h * 0.18}" width="200" height="${h * 0.38}" fill="${accent}"/>
        ${heading(page.title, "serif", 65, h * 0.66, 950, h * 0.16, page.titleSize * 1.12)}${body(65, h * 0.89, 900, h * 0.07)}`;
    case "afterhours":
      return `${fullPhoto()}${shade}<rect width="${w}" height="${h}" fill="${bg}" opacity="0.24"/>
        ${label(page.kicker, 540, 118, 19, fg, true)}${heading(page.title.toUpperCase(), "wide", 80, h * 0.31, 920, h * 0.3, page.titleSize * 1.1, fg, true)}
        ${body(540, h * 0.67, 780, h * 0.13, true)}${footerNotes}`;
    case "daybook":
      return `${fullPhoto()}${shade}<rect width="${w}" height="${h}" fill="${bg}" opacity="0.25"/>
        ${label(page.kicker, 76, 118, 23, fg)}${heading(beginning, "wide", 76, h * 0.19, 928, h * 0.23, page.titleSize * 1.1)}
        ${heading(ending, "italic", 76, h * 0.44, 928, h * 0.17, page.titleSize * 1.5, fg)}${body(76, h * 0.71, 740, h * 0.11)}${footerNotes}`;
    case "muse":
      return `${fullPhoto()}${shade}${label(page.kicker, 76, 110, 20, fg)}
        ${heading(beginning.toUpperCase(), "wide", 76, h * 0.54, 928, h * 0.16, page.titleSize, fg, true)}${heading(ending, "italic", 76, h * 0.73, 928, h * 0.12, page.titleSize * 1.3, fg, true)}${body(540, h * 0.875, 800, h * 0.055, true)}`;
    case "ritual":
      return `${fullPhoto()}${shade}<rect width="${w}" height="${h}" fill="${bg}" opacity="0.5"/>${label(page.kicker, 540, 112, 17, fg, true)}
        ${heading(page.title.toUpperCase(), "serif", 230, h * 0.38, 620, h * 0.23, page.titleSize * 0.8, accent, true)}${body(76, h * 0.8, 680, h * 0.08)}
        <g transform="translate(${-shift},0)"><path d="M 0 ${h - 160} H ${total}" stroke="${accent}" opacity="0.6"/></g>`;
    case "dune":
      return `${fullPhoto()}${shade}${label(page.kicker, 540, 112, 18, fg, true)}
        ${heading(page.title, "serif", 150, h * 0.25, 780, h * 0.27, page.titleSize * 1.1, fg, true)}${body(540, h * 0.69, 720, h * 0.12, true)}
        <g transform="translate(${-shift},0)"><path d="M 0 ${h - 170} Q ${total * 0.5} ${h - 220}, ${total} ${h - 170}" stroke="${accent}" stroke-width="2" fill="none"/>${Array.from({ length: doc.linked ? doc.pages.length : 1 }, (_, i) => { const t = (i * w + 540) / total; return `<circle cx="${i * w + 540}" cy="${h - 170 - 100 * t * (1 - t)}" r="4" fill="${accent}"/>`; }).join("")}</g>`;
    case "still":
      return `${label(page.kicker, 76, 85, 18, fg)}${heading(page.title.toUpperCase(), "wide", 76, h * 0.12, 928, h * 0.18, page.titleSize * 1.15)}
        <path d="M 76 ${h * 0.37} H 1004 M 76 ${h * 0.76} H 1004 M 305 ${h * 0.31} V ${h * 0.8} M 775 ${h * 0.31} V ${h * 0.8}" stroke="${accent}" stroke-width="1" opacity="0.3"/>
        ${photo(image, imageRatio, 310, h * 0.37, 460, h * 0.39)}<circle cx="300" cy="${h * 0.36}" r="4" fill="${fg}"/><circle cx="780" cy="${h * 0.77}" r="4" fill="${fg}"/>
        ${body(540, h * 0.84, 720, h * 0.07, true)}`;
    case "diptych":
      return `${photo(image, imageRatio, 52, h * 0.07, 976, h * 0.78)}<rect x="0" y="${h * 0.35}" width="${w}" height="${h * 0.22}" fill="${bg}"/>
        ${label(page.kicker, 76, h * 0.39, 17, fg)}${heading(page.title.toUpperCase(), "wide", 76, h * 0.405, 928, h * 0.1, page.titleSize * 0.9)}${body(76, h * 0.53, 900, h * 0.04)}`;
    case "ember":
      return `<defs><filter id="${id}soft"><feGaussianBlur stdDeviation="46"/></filter><radialGradient id="${id}fire"><stop stop-color="${accent}"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient></defs>
        <g filter="url(#${id}soft)">${fullPhoto()}</g><rect width="${w}" height="${h}" fill="${bg}" opacity="0.38"/><ellipse cx="840" cy="${h * 0.31}" rx="700" ry="${h * 0.48}" fill="url(#${id}fire)"/>
        ${label(page.kicker, 76, 100, 19, fg)}${heading(page.title.toUpperCase(), "wide", 76, h * 0.4, 928, h * 0.19, page.titleSize * 1.3, fg, true)}
        ${body(76, h * 0.77, 610, h * 0.11)}${label("CREATIVE / EDITION", 76, h - 145, 16, fg)}`;
    case "chromatic":
      return `<defs><filter id="${id}diffuse"><feGaussianBlur stdDeviation="28"/></filter><radialGradient id="${id}wave" gradientUnits="userSpaceOnUse" cx="${doc.linked ? total * 0.3 : 760}" cy="${h * 0.56}" r="${w * 0.95}"><stop stop-color="${accent}"/><stop offset="0.45" stop-color="${accent}" stop-opacity="0.85"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs>
        <g opacity="0.14" filter="url(#${id}diffuse)">${fullPhoto()}</g><g transform="translate(${-shift},0)"><rect width="${total}" height="${h}" fill="url(#${id}wave)"/></g>
        ${label(page.kicker, 76, 110, 17, fg)}${heading(beginning, "serif", 76, h * 0.49, 928, h * 0.17, page.titleSize * 1.15)}${heading(ending, "wide", 76, h * 0.65, 928, h * 0.11, page.titleSize * 0.8)}${body(76, h * 0.85, 850, h * 0.065)}`;
    case "atelier":
      return `${label(page.kicker, 76, 96, 18, fg)}${heading(page.title, "serif", 76, h * 0.12, 928, h * 0.16, page.titleSize * 1.15)}
        ${photo(image, imageRatio, 76, h * 0.33, 928, h * 0.43)}<rect x="76" y="${h * 0.33}" width="928" height="${h * 0.43}" fill="none" stroke="${fg}" opacity="0.3"/>
        <path d="M 76 ${h * 0.81} H 1004" stroke="${accent}" opacity="0.5"/>${body(76, h * 0.85, 840, h * 0.065)}`;
    case "folio":
      return `${photo(image, imageRatio, 60, h * 0.14, 420, h * 0.66)}${label(page.kicker, 60, 92, 16, fg)}${heading(page.title, "serif", 530, h * 0.22, 490, h * 0.36, page.titleSize * 1.15)}${body(530, h * 0.65, 440, h * 0.16)}`;
    case "aperture":
      return `${photo(image, imageRatio, 145, h * 0.12, 790, h * 0.6)}<rect x="125" y="${h * 0.1}" width="830" height="${h * 0.64}" fill="none" stroke="${accent}"/>${label(page.kicker, 540, h * 0.065, 17, fg, true)}${heading(page.title, "italic", 70, h * 0.68, 940, h * 0.16, page.titleSize * 1.25, fg, true)}${body(540, h * 0.88, 780, h * 0.06, true)}`;
    case "index":
      return `${label(page.kicker, 70, 92, 18, fg)}${photo(image, imageRatio, 70, h * 0.12, 940, h * 0.36)}${heading(String(index + 1).padStart(2, "0"), "serif", 70, h * 0.52, 260, h * 0.2, 180, accent)}${heading(page.title.toUpperCase(), "condensed", 375, h * 0.53, 635, h * 0.25, page.titleSize * 1.3)}${body(375, h * 0.87, 635, h * 0.07)}`;
    case "traverse":
      return `${fullPhoto()}${shade}${label(page.kicker, 76, 100, 18, fg)}${heading(page.title, "serif", 76, h * 0.2, 850, h * 0.27, page.titleSize * 1.25)}<rect y="${h * 0.73}" width="${w}" height="${h * 0.2}" fill="${bg}" opacity="0.93"/><g transform="translate(${-shift},0)"><path d="M 0 ${h * 0.73} H ${total}" stroke="${accent}" stroke-width="3"/></g>${body(76, h * 0.8, 850, h * 0.09)}`;
    case "nocturne":
      return `${photo(image, imageRatio, 545, h * 0.12, 535, h * 0.71)}${label(page.kicker, 65, 95, 17, fg)}${heading(page.title, "serif", 65, h * 0.23, 435, h * 0.37, page.titleSize * 1.05)}${body(65, h * 0.67, 410, h * 0.13)}<g transform="translate(${-shift},0)"><path d="M 0 ${h * 0.87} H ${total}" stroke="${accent}"/></g>`;
    case "verve":
      return `${photo(image, imageRatio, 0, 0, w, h * 0.65, true)}<rect y="${h * 0.57}" width="${w}" height="${h * 0.43}" fill="${bg}"/>
        ${label(page.kicker, 65, h * 0.62, 18, fg)}${heading(page.title.toUpperCase(), "condensed", 65, h * 0.66, 950, h * 0.2, page.titleSize * 1.8)}${body(65, h * 0.9, 900, h * 0.045)}`;
    case "aura":
      return `${fullPhoto()}<rect x="50" y="50" width="980" height="${h - 100}" fill="none" stroke="${fg}" opacity="0.6"/>
        <rect x="85" y="${h * 0.62}" width="910" height="${h * 0.28}" fill="${bg}"/>
        ${heading(page.title, "serif", 125, h * 0.65, 830, h * 0.13, page.titleSize * 1.25, fg, true)}${body(540, h * 0.83, 760, h * 0.05, true)}${label(page.kicker, 125, h * 0.93, 16, fg)}`;
    case "contact":
      return `${label(page.kicker, 70, 95, 18, fg)}${heading(page.title, "serif", 70, h * 0.13, 940, h * 0.16, page.titleSize * 1.2)}
        ${photo(image, imageRatio, 70, h * 0.35, 550, h * 0.48)}${photo(image, imageRatio, 650, h * 0.35, 360, h * 0.3, true)}
        <path d="M 650 ${h * 0.68} H 1010" stroke="${accent}"/>${body(650, h * 0.72, 360, h * 0.12)}${label(String(index + 1).padStart(2, "0") + " / CONTACT", 70, h * 0.9, 18, fg)}`;
    case "sienna":
      return `${fullPhoto()}${shade}<rect width="${w}" height="${h}" fill="${bg}" opacity="0.48"/>
        <g transform="translate(${-shift},0)"><rect x="0" y="${h * 0.3}" width="${total}" height="${h * 0.37}" fill="${bg}" opacity="0.42"/><path d="M 0 ${h * 0.67} H ${total}" stroke="${accent}"/></g>
        ${label(page.kicker, 540, 110, 17, fg, true)}${heading(page.title.toUpperCase(), "serif", 190, h * 0.37, 700, h * 0.22, page.titleSize, accent, true)}${body(540, h * 0.81, 780, h * 0.08, true)}`;
    case "tidal":
      return `${label(page.kicker, 70, 100, 17, fg)}${heading(page.title, "italic", 70, h * 0.13, 940, h * 0.18, page.titleSize * 1.2)}
        ${photo(image, imageRatio, 0, h * 0.38, w, h * 0.38)}
        <g transform="translate(${-shift},0)"><path d="M 0 ${h * 0.81} Q ${total * 0.5} ${h * 0.71} ${total} ${h * 0.81}" fill="none" stroke="${accent}" stroke-width="3"/></g>${body(70, h * 0.87, 900, h * 0.07)}`;
    case "ligne":
      return `${label(page.kicker, 65, 90, 17, fg)}${heading(page.title, "serif", 65, h * 0.13, 950, h * 0.19, page.titleSize * 1.2)}
        ${photo(image, imageRatio, 0, h * 0.4, w, h * 0.31)}<g transform="translate(${-shift},0)"><path d="M 0 ${h * 0.76} H ${total}" stroke="${accent}" stroke-width="2"/></g>${body(65, h * 0.83, 890, h * 0.08)}`;
    case "vellum":
      return `${photo(image, imageRatio, 80, h * 0.07, 920, h * 0.64)}<rect x="125" y="${h * 0.57}" width="830" height="${h * 0.29}" fill="${bg}"/>
        ${heading(page.title, "serif", 165, h * 0.61, 750, h * 0.13, page.titleSize * 1.1, fg, true)}${body(540, h * 0.79, 680, h * 0.05, true)}${label(page.kicker, 540, h * 0.92, 17, fg, true)}`;
    case "edition":
      return `${photo(image, imageRatio, 0, h * 0.42, w, h * 0.58, true)}<rect width="${w}" height="${h * 0.44}" fill="${bg}"/>
        ${label(page.kicker, 60, 85, 17, fg)}${heading(page.title.toUpperCase(), "condensed", 60, h * 0.12, 960, h * 0.24, page.titleSize * 1.8)}<rect x="60" y="${h * 0.78}" width="780" height="${h * 0.13}" fill="${bg}"/>${body(90, h * 0.82, 720, h * 0.07)}`;
    case "ascend":
      return `${photo(image, imageRatio, 520, 0, 560, h)}<rect width="520" height="${h}" fill="${bg}"/>${label(page.kicker, 60, 100, 16, fg, false, 400)}
        ${heading(page.title, "serif", 60, h * 0.25, 425, h * 0.34, page.titleSize * 1.15)}${body(60, h * 0.73, 400, h * 0.14)}<path d="M 60 ${h * 0.64} H 470" stroke="${accent}"/>`;
    case "persona":
      return `${fullPhoto()}${shade}${heading(page.title, "italic", 65, h * 0.53, 950, h * 0.23, page.titleSize * 1.35, fg, true)}
        ${label(page.kicker, 540, 100, 18, fg, true)}${body(540, h * 0.85, 800, h * 0.07, true)}<rect x="35" y="35" width="1010" height="${h - 70}" fill="none" stroke="${accent}" opacity="0.6"/>`;
    case "chroma":
      return `<defs><filter id="${id}chroma"><feGaussianBlur stdDeviation="35"/></filter><linearGradient id="${id}chroma-wave" gradientUnits="userSpaceOnUse" x1="0" x2="${total}" y1="0" y2="${h}"><stop stop-color="${accent}" stop-opacity="0.8"/><stop offset="0.5" stop-color="${bg}"/><stop offset="1" stop-color="${accent}" stop-opacity="0.3"/></linearGradient></defs><g filter="url(#${id}chroma)" opacity="0.3">${fullPhoto()}</g><g transform="translate(${-shift},0)"><rect width="${total}" height="${h}" fill="url(#${id}chroma-wave)"/></g>
        ${label(page.kicker, 65, 100, 17, fg)}${heading(page.title, "serif", 65, h * 0.35, 950, h * 0.27, page.titleSize * 1.3)}${body(65, h * 0.81, 800, h * 0.09)}`;
    case "canopy":
      return `${photo(image, imageRatio, 170, h * 0.08, 740, h * 0.55)}<rect x="170" y="${h * 0.08}" width="740" height="${h * 0.55}" fill="${bg}" opacity="0.15"/>
        ${heading(page.title, "serif", 70, h * 0.65, 940, h * 0.17, page.titleSize * 1.1, fg, true)}${body(540, h * 0.88, 800, h * 0.06, true)}<path d="M 100 ${h * 0.1} V ${h * 0.6} M 980 ${h * 0.1} V ${h * 0.6}" stroke="${accent}"/>`;
    case "sculpt":
      return `${label(page.kicker, 60, 85, 17, fg)}${heading(page.title.toUpperCase(), "condensed", 60, h * 0.12, 960, h * 0.16, page.titleSize * 1.3)}
        ${photo(image, imageRatio, 60, h * 0.34, 960, h * 0.45)}<rect x="85" y="${h * 0.36}" width="910" height="${h * 0.41}" fill="none" stroke="${fg}" opacity="0.45"/>${body(60, h * 0.85, 900, h * 0.08)}`;
    case "tempo":
      return `<defs><clipPath id="${id}diagonal"><path d="M 0 0 H ${w} V ${h * 0.56} L 0 ${h * 0.42} Z"/></clipPath></defs><g clip-path="url(#${id}diagonal)">${photo(image, imageRatio, 0, 0, w, h * 0.56)}</g>
        ${label(page.kicker, 60, h * 0.6, 17, fg)}${heading(page.title.toUpperCase(), "condensed", 60, h * 0.65, 960, h * 0.17, page.titleSize * 1.7)}${body(60, h * 0.88, 900, h * 0.07)}`;
    case "verso":
      return `${photo(image, imageRatio, 0, h * 0.08, 450, h * 0.32)}${photo(image, imageRatio, 630, h * 0.6, 450, h * 0.32)}
        <g transform="translate(${-shift},0)"><path d="M 0 ${h * 0.5} H ${total}" stroke="${accent}" opacity="0.5"/></g><rect x="55" y="${h * 0.37}" width="970" height="${h * 0.27}" fill="${bg}"/>
        ${heading(page.title, "serif", 80, h * 0.39, 920, h * 0.16, page.titleSize * 1.15, fg, true)}${body(540, h * 0.59, 780, h * 0.04, true)}${label(page.kicker, 60, h * 0.87, 16, fg, false, 500)}`;
    case "neon-night": {
      // Club flyer: neon-tinted photo, outlined + solid title, a giant outlined word running down the right edge, neon bars.
      const [first, ...rest] = page.title.toUpperCase().trim().split(/\s+/);
      const giant = (rest.at(-1) ?? first ?? "").slice(0, 12);
      const date = `${String(index + 1).padStart(2, "0")}.${String(doc.pages.length).padStart(2, "0")}`;
      return `<defs><linearGradient id="${id}neon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${accent}" stop-opacity=".62"/><stop offset=".5" stop-color="#6B2BFF" stop-opacity=".42"/><stop offset="1" stop-color="${NEON_GREEN}" stop-opacity=".5"/></linearGradient></defs>
        ${photo(image, imageRatio, 0, 0, w, h, true)}<rect width="${w}" height="${h}" fill="url(#${id}neon)"/>${shade}
        <g transform="translate(${w - 34} ${h * 0.05}) rotate(90)">${stroked(giant, "condensed", 0, 0, h * 0.86, 250, 280, fg, 3)}</g>
        ${stroked(first ?? "", "condensed", 70, h * 0.05, 680, h * 0.1, page.titleSize * 1.7, fg, 3, false)}
        ${heading(rest.join(" "), "condensed", 70, h * 0.15, 680, h * 0.2, page.titleSize * 1.7, fg, false)}
        ${label(page.kicker.toUpperCase(), 72, h * 0.39, 22, fg, false, 420)}${body(72, h * 0.44, 420, h * 0.1)}
        ${[[NEON_GREEN, 230], [accent, 180], ["#6B2BFF", 140], [NEON_GREEN, 90]].map(([color, width], i) => `<rect x="70" y="${h * 0.76 + i * 30}" width="${width}" height="14" fill="${color}"/>`).join("")}
        ${heading(date, "condensed", 360, h * 0.75, 420, h * 0.12, 150, NEON_GREEN, true)}`;
    }
    case "warp": {
      // Warped type: the title smears downward in red/cyan/accent copies through a displacement filter, over a blurred photo.
      const y0 = h * 0.34, title = page.title.toUpperCase();
      const copy = (fill: string, dx: number, dy: number, filter = "") => `<g transform="translate(${dx} ${dy})"${filter ? ` filter="url(#${id}${filter})"` : ""}>${heading(title, "wide", 50, y0, 980, h * 0.24, page.titleSize * 1.5, fill, true)}</g>`;
      return `<defs>
          <filter id="${id}warp" x="-10%" y="-30%" width="120%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.0025 0.045" numOctaves="2" seed="${index + 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="G"/></filter>
          <filter id="${id}ripple" x="-10%" y="-30%" width="120%" height="200%"><feTurbulence type="fractalNoise" baseFrequency="0.002 0.03" numOctaves="1" seed="${index + 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G"/></filter>
          <filter id="${id}melt" x="-10%" y="-20%" width="120%" height="220%"><feGaussianBlur stdDeviation="3 30"/></filter>
          <filter id="${id}soft"><feGaussianBlur stdDeviation="46"/></filter>
          <linearGradient id="${id}fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".3" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <mask id="${id}drip"><rect x="0" y="${y0}" width="${w}" height="${h - y0}" fill="url(#${id}fade)"/></mask>
        </defs>
        <g filter="url(#${id}soft)" opacity=".38">${photo(image, imageRatio, -80, -80, w + 160, h + 160)}</g><rect width="${w}" height="${h}" fill="#000000" opacity=".45"/>
        <g mask="url(#${id}drip)"><g transform="translate(0 ${y0}) scale(1 2.3) translate(0 ${-y0})" filter="url(#${id}melt)" opacity=".9">${copy("#FF2D55", -14, 0)}${copy(accent, 0, 0)}${copy("#00E5FF", 14, 0)}</g></g>
        ${copy("#FF2D55", -10, 0, "warp")}${copy("#00E5FF", 10, 0, "warp")}${copy(fg, 0, 0, "ripple")}
        <path d="M 0 ${h * 0.62} H ${w}" stroke="#FF2D55" stroke-width="2" opacity=".7"/>
        ${label(page.kicker.toUpperCase(), 60, 90, 18, fg, false, 520)}${label(`VOL. ${String(index + 1).padStart(2, "0")}`, 900, 90, 18, fg, false, 140)}
        <path d="M 60 112 H 1020" stroke="${fg}" opacity=".2"/>${body(60, h * 0.8, 620, h * 0.08)}`;
    }
    case "spray": {
      // Purple grunge: faded giant words, pink spray clouds and speckle, a tilted B&W photo card with tape, two-tone condensed title.
      const lighter = mixHex(bg, "#ffffff", 0.32), title = page.title.toUpperCase();
      const speckle = Array.from({ length: 70 }, (_, k) => { const a = (k * 137.5) % 360 * Math.PI / 180, d = 60 + ((k * 53) % 100) * 2.4; return `<circle cx="${(830 + Math.cos(a) * d).toFixed(1)}" cy="${(h * 0.24 + Math.sin(a) * d * 0.6).toFixed(1)}" r="${(1.5 + (k % 5)).toFixed(1)}" fill="${accent}" opacity="${(0.3 + (k % 4) * 0.15).toFixed(2)}"/>`; }).join("");
      const cx = 640, cy = h * 0.7;
      return `<defs><radialGradient id="${id}spray"><stop stop-color="${accent}" stop-opacity=".8"/><stop offset=".55" stop-color="${accent}" stop-opacity=".25"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><clipPath id="${id}card"><rect x="${cx - 330}" y="${cy - h * 0.16}" width="660" height="${h * 0.32}"/></clipPath></defs>
        <g opacity=".16">${heading(title, "condensed", -30, h * 0.0, w + 60, h * 0.55, 320, lighter, true)}</g>
        <ellipse cx="830" cy="${h * 0.24}" rx="330" ry="${h * 0.12}" fill="url(#${id}spray)"/>${speckle}
        <rect x="0" y="${h * 0.035}" width="${w}" height="34" fill="#000000" opacity=".55"/>${label(`${page.kicker} · `.repeat(6).toUpperCase(), 16, h * 0.035 + 23, 15, fg, false, w * 2, 30)}
        ${heading(beginning.toUpperCase(), "condensed", 60, h * 0.1, 960, h * 0.2, page.titleSize * 1.7, fg, false)}
        ${heading(ending.toUpperCase(), "condensed", 60, h * 0.31, 960, h * 0.14, page.titleSize * 1.7, accent, false)}
        <g transform="rotate(-4 ${cx} ${cy})"><rect x="${cx - 345}" y="${cy - h * 0.16 - 15}" width="690" height="${h * 0.32 + 30}" fill="#0E0B14"/><g clip-path="url(#${id}card)">${photo(image, imageRatio, cx - 330, cy - h * 0.16, 660, h * 0.32, true)}</g></g>
        ${[[cx - 360, cy - h * 0.18, -18], [cx + 250, cy + h * 0.13, 14]].map(([x, y, r]) => `<rect x="${x}" y="${y}" width="150" height="44" fill="#E9E1D2" opacity=".75" transform="rotate(${r} ${x + 75} ${y + 22})"/>`).join("")}
        <path d="M 120 ${h * 0.86} l 60 -28 m -60 28 l 26 -60" stroke="${accent}" stroke-width="10" stroke-linecap="round" fill="none"/>
        <path d="M 980 ${h * 0.5} l 0 70 m -35 -35 h 70 m -50 -50 l 30 30 m 0 -30 l -30 30" stroke="${fg}" stroke-width="6" stroke-linecap="round"/>
        ${body(60, h * 0.5, 300, h * 0.08)}`;
    }
    case "hype": {
      // Agency post: black, condensed capitals, the punchline on a tilted lime label, a pink sticky note, marker squiggle, polaroid photo.
      const top = page.title.toUpperCase().trim().split(/\s+/), punch = top.splice(Math.max(1, top.length - 2)).join(" "), lead = top.join(" ");
      const size = page.titleSize * 1.6;
      const leadBox = measure(lead, "condensed", 920, h * 0.3, size), punchBox = measure(punch, "condensed", 900, h * 0.15, size);
      const py = h * 0.07 + leadBox.height + 26;
      return `<rect width="${w}" height="${h}" fill="${bg}"/>
        ${heading(lead, "condensed", 60, h * 0.07, 920, h * 0.3, size, fg, false)}
        <g transform="rotate(-2.5 ${60 + punchBox.width / 2} ${py + punchBox.height / 2})"><rect x="44" y="${py - 14}" width="${punchBox.width + 34}" height="${punchBox.height + 26}" fill="${accent}"/>${heading(punch, "condensed", 60, py, 900, h * 0.15, size, bg, false)}</g>
        <path d="M 640 ${h * 0.52} c 60 -50 120 40 180 -10 s 110 -40 160 10" stroke="${accent}" stroke-width="14" fill="none" stroke-linecap="round"/>
        <g transform="rotate(2.5 300 ${h * 0.68})"><rect x="60" y="${h * 0.6}" width="470" height="${h * 0.15}" fill="${HYPE_PINK}"/>${label(page.body, 84, h * 0.6 + 44, 26, "#111111", false, 420, h * 0.12)}</g>
        <g transform="rotate(5 800 ${h * 0.72})"><rect x="600" y="${h * 0.56}" width="400" height="${h * 0.32}" fill="#F4F1EA"/>${photo(image, imageRatio, 620, h * 0.56 + 20, 360, h * 0.32 - 80, true)}<rect x="740" y="${h * 0.54}" width="120" height="38" fill="${accent}" opacity=".85"/></g>
        ${label(page.kicker.toUpperCase(), 60, h * 0.53, 17, fg, false, 540)}`;
    }
    case "chrome": {
      // SMM agency: lavender light, clean geometric title in two tones, a chrome 3D star, duotone photo panel, glass chip and arrow button.
      const petals = index % 2 ? 5 : 4, R = 220, sx = 300, sy = h * 0.68, rot = index * 0.6;
      const star = Array.from({ length: 96 }, (_, k) => { const a = (k / 96) * Math.PI * 2, r = R * (0.62 + 0.38 * Math.cos(petals * a + rot) ** 2); return `${(sx + Math.cos(a) * r).toFixed(1)},${(sy + Math.sin(a) * r).toFixed(1)}`; }).join(" ");
      const dark = mixHex(accent, "#000000", 0.55), pale = mixHex(accent, "#ffffff", 0.55);
      return `<defs>
          <radialGradient id="${id}room" cx=".7" cy=".3" r=".9"><stop stop-color="#ffffff"/><stop offset=".55" stop-color="${bg}"/><stop offset="1" stop-color="${mixHex(bg, accent, 0.25)}"/></radialGradient>
          <radialGradient id="${id}chrome" cx=".38" cy=".32" r=".75"><stop stop-color="#ffffff"/><stop offset=".22" stop-color="${pale}"/><stop offset=".52" stop-color="${accent}"/><stop offset=".82" stop-color="${dark}"/><stop offset="1" stop-color="${pale}"/></radialGradient>
          <filter id="${id}glow"><feGaussianBlur stdDeviation="14"/></filter>
          <clipPath id="${id}panel"><rect x="560" y="${h * 0.36}" width="460" height="${h * 0.44}" rx="36"/></clipPath>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#${id}room)"/>
        ${label(page.kicker.toUpperCase(), 60, 92, 17, fg, false, 600)}<path d="M 60 112 H 1020" stroke="${fg}" opacity=".15"/>
        ${heading(beginning, "rounded", 60, h * 0.1, 960, h * 0.14, page.titleSize * 1.12, fg, false)}${heading(ending, "rounded", 60, h * 0.1 + h * 0.13, 960, h * 0.1, page.titleSize * 1.12, accent, false)}
        <g clip-path="url(#${id}panel)">${photo(image, imageRatio, 560, h * 0.36, 460, h * 0.44, true)}<rect x="560" y="${h * 0.36}" width="460" height="${h * 0.44}" fill="${accent}" opacity=".38"/></g>
        <rect x="560" y="${h * 0.36}" width="460" height="${h * 0.44}" rx="36" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="2"/>
        <polygon points="${star}" fill="${dark}" opacity=".35" filter="url(#${id}glow)" transform="translate(16 26)"/>
        <polygon points="${star}" fill="url(#${id}chrome)" stroke="${pale}" stroke-width="3"/>
        <ellipse cx="${sx - 70}" cy="${sy - 80}" rx="60" ry="26" fill="#ffffff" opacity=".7" filter="url(#${id}glow)" transform="rotate(-30 ${sx - 70} ${sy - 80})"/>
        <rect x="500" y="${h * 0.68}" width="120" height="120" rx="30" fill="${accent}"/><path d="M 560 ${h * 0.68 + 88} c -40 -26 -40 -60 -14 -60 c 10 0 14 8 14 14 c 0 -6 4 -14 14 -14 c 26 0 26 34 -14 60z" fill="#ffffff"/>
        ${body(60, h * 0.37, 440, h * 0.12)}
        <circle cx="955" cy="${h * 0.87}" r="52" fill="${accent}"/><path d="M 930 ${h * 0.87} h 48 m -18 -18 18 18 -18 18" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    case "riptide": {
      // Fashion drop: B&W photo, torn lime panel with the title running vertically, outlined word repeated on the photo, barcode.
      const title = page.title.toUpperCase(), first = title.split(/\s+/)[0] ?? "";
      const edge = Array.from({ length: Math.ceil(h / 28) + 1 }, (_, k) => `${(w * 0.6 + (rnd(k + index * 31) - 0.5) * 36).toFixed(1)},${Math.min(h, k * 28)}`);
      const bars = Array.from({ length: 30 }, (_, k) => { const x = 60 + k * 9; return rnd(k * 7 + 3) > 0.35 ? `<rect x="${x}" y="${h * 0.8}" width="${rnd(k + 11) > 0.6 ? 5 : 2.5}" height="64" fill="${fg}"/>` : ""; }).join("");
      return `${photo(image, imageRatio, 0, 0, w * 0.68, h, true)}${shade}
        <g opacity=".35">${[0, 1, 2, 3, 4].map((k) => stroked(first, "wide", 40, h * 0.12 + k * h * 0.085, 560, h * 0.08, 90, accent, 2)).join("")}</g>
        <polygon points="${edge.map((p) => p.replace(/^([\d.]+)/, (x) => String(Number(x) - 10))).join(" ")} ${w},${h} ${w},0" fill="#F2F2EC"/>
        <polygon points="${edge.join(" ")} ${w},${h} ${w},0" fill="${accent}"/>
        <g transform="translate(${w - 40} ${h * 0.07}) rotate(90)">${heading(title, "condensed", 0, 0, h * 0.84, 330, 260, bg, false)}</g>
        <rect x="60" y="70" width="400" height="56" fill="${accent}"/>${label(page.kicker.toUpperCase(), 78, 107, 20, bg, false, 370)}
        ${body(60, h * 0.62, 520, h * 0.12)}${bars}${label(String(index + 1).padStart(2, "0"), 360, h * 0.8 + 52, 44, accent, false, 120)}`;
    }
    case "acid": {
      // Acid-green tech poster: black central card with the title, green-tinted photo below, dot columns, vertical side texts, corner signs.
      const cx = w * 0.22, cw = w * 0.56, cy = h * 0.1, ch = h * 0.42;
      const dots = [0.08, 0.13, 0.87, 0.92].flatMap((fx) => Array.from({ length: 16 }, (_, k) => `<circle cx="${w * fx}" cy="${h * 0.1 + k * h * 0.045}" r="${3 + rnd(k + fx * 100) * 5}" fill="${fg}" opacity="${0.35 + rnd(k * 3 + fx * 50) * 0.6}"/>`)).join("");
      const sign = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="24" fill="none" stroke="${fg}" stroke-width="3"/><path d="M ${x} ${y - 12} L ${x + 11} ${y + 9} H ${x - 11} Z" fill="${fg}"/>`;
      return `<rect width="${w}" height="${h}" fill="${bg}"/>${dots}${sign(70, 70)}${sign(w - 70, 70)}
        ${photo(image, imageRatio, w * 0.2, h * 0.5, w * 0.6, h * 0.42, true)}<rect x="${w * 0.2}" y="${h * 0.5}" width="${w * 0.6}" height="${h * 0.42}" fill="${bg}" opacity=".5"/>
        <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="${fg}"/>
        ${heading(page.title.toUpperCase(), "wide", cx + 40, cy + 50, cw - 80, ch * 0.5, Math.min(page.titleSize * 0.72, (cw - 80) / (Math.max(...page.title.split(/\s+/).map((word) => word.length), 4) * 0.98)), bg, false)}
        <path d="M ${cx + 40} ${cy + ch * 0.68} H ${cx + cw - 40}" stroke="${bg}" stroke-width="2"/>${label(page.body, cx + 40, cy + ch * 0.78, 20, accent, false, cw - 80, ch * 0.2)}
        <g transform="translate(64 ${h * 0.7}) rotate(-90)">${label(page.kicker.toUpperCase(), 0, 0, 24, fg, false, h * 0.5)}</g>
        <g transform="translate(${w - 64} ${h * 0.25}) rotate(90)">${label(`N° ${String(index + 1).padStart(2, "0")} / ${String(doc.pages.length).padStart(2, "0")}`, 0, 0, 24, fg, false, h * 0.4)}</g>
        <path d="M 40 ${h * 0.86} l 22 14 -22 14 z M 62 ${h * 0.86} l 22 14 -22 14 z M ${w - 40} ${h * 0.86} l -22 14 22 14 z M ${w - 62} ${h * 0.86} l -22 14 22 14 z" fill="${fg}"/>`;
    }
    case "brush": {
      // Purple brush: darkened photo, a textured violet brush stroke, hand-drawn circle around the accent word,
      // a taped paper note with the kicker, checkerboard strip, circular text, condensed two-tone title, arrow button, grain.
      // Seul le dernier mot passe en accent
      const parts = page.title.trim().split(/\s+/), lastWord = parts.length > 1 ? parts.pop()! : "", lead = parts.join(" ");
      const ring = `${page.kicker.toUpperCase()} · `.repeat(2).slice(0, 34);
      const ringText = [...ring].map((ch, k) => `<g transform="rotate(${(k / ring.length) * 360} 170 170)">${label(ch, 170, 90, 18, fg, true, 30)}</g>`).join("");
      const checker = Array.from({ length: 30 }, (_, k) => { const col = k % 3, row = Math.floor(k / 3); return (col + row) % 2 ? "" : `<rect x="${w - 92 + col * 22}" y="${36 + row * 22}" width="22" height="22" fill="${fg}"/>`; }).join("");
      const size = page.titleSize * 1.5;
      const leadBox = measure(lead.toUpperCase(), "condensed", 900, h * 0.16, size), wordBox = measure(lastWord.toUpperCase(), "condensed", 900, h * 0.13, size);
      const wordY = h * 0.5 + leadBox.height + 8;
      const noteX = w - 420, noteY = h * 0.2;
      return `<defs>
          <filter id="${id}bristle" x="-10%" y="-30%" width="120%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves="2" seed="${index + 5}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="34" xChannelSelector="R" yChannelSelector="G"/></filter>
          <filter id="${id}grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .12"/></feComponentTransfer></filter>
          <pattern id="${id}dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#000" opacity=".18"/></pattern>
        </defs>
        ${fullPhoto()}${shade}<rect width="${w}" height="${h}" fill="${bg}" opacity=".35"/>
        <g filter="url(#${id}bristle)">
          <path d="M -40 ${h * 1.02} C 140 ${h * 0.96}, 300 ${h * 0.9}, 470 ${h * 0.78}" stroke="${accent}" stroke-width="120" stroke-linecap="round" fill="none" opacity=".92"/>
          <path d="M -20 ${h * 0.93} C 160 ${h * 0.88}, 320 ${h * 0.82}, 500 ${h * 0.74}" stroke="${accent}" stroke-width="26" stroke-linecap="round" fill="none" opacity=".7"/>
        </g>
        ${checker}<g opacity=".8">${ringText}</g>
        <g transform="rotate(4 ${noteX + 170} ${noteY + 90})">
          <rect x="${noteX}" y="${noteY}" width="340" height="180" fill="#F4F2EE"/><rect x="${noteX}" y="${noteY}" width="340" height="180" fill="url(#${id}dots)"/>
          ${label(page.kicker, noteX + 28, noteY + 62, 26, "#1a1a1a", false, 290, 110)}
          <rect x="${noteX + 120}" y="${noteY - 18}" width="110" height="34" fill="${accent}" opacity=".75" transform="rotate(-6 ${noteX + 175} ${noteY})"/>
        </g>
        ${heading(lead.toUpperCase(), "condensed", 76, h * 0.5, 900, h * 0.16, size, fg, false)}
        ${heading(lastWord.toUpperCase(), "condensed", 76, wordY, 900, h * 0.13, size, accent, false)}
        ${lastWord ? `<ellipse cx="${76 + wordBox.width / 2}" cy="${wordY + wordBox.height / 2}" rx="${wordBox.width / 2 + 40}" ry="${wordBox.height / 2 + 22}" fill="none" stroke="${fg}" stroke-width="4" transform="rotate(-4 ${76 + wordBox.width / 2} ${wordY + wordBox.height / 2})"/><ellipse cx="${76 + wordBox.width / 2 + 6}" cy="${wordY + wordBox.height / 2 - 4}" rx="${wordBox.width / 2 + 48}" ry="${wordBox.height / 2 + 16}" fill="none" stroke="${fg}" stroke-width="2.5" opacity=".7" transform="rotate(-1 ${76 + wordBox.width / 2} ${wordY + wordBox.height / 2})"/>` : ""}
        ${body(76, wordY + wordBox.height + 50, 640, h * 0.06)}
        <circle cx="${w - 110}" cy="${h - 150}" r="34" fill="${accent}"/><path d="M ${w - 126} ${h - 150} h 32 m -12 -12 12 12 -12 12" stroke="${fg}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <rect width="${w}" height="${h}" filter="url(#${id}grain)"/>`;
    }
    case "focal": {
      // Red campaign poster: the photo blurred into a dark silhouette on red, a sharp framed strip (the gaze),
      // a giant lowercase word (first letters heavy, the rest light) and the body set as a justified poem.
      const word = page.title.trim().toLowerCase(), cut = Math.min(2, Math.max(1, Math.floor(word.length / 2)));
      const heavy = word.slice(0, cut), light = word.slice(cut);
      let size = page.titleSize * 2.3;
      let a = measure(heavy, "wide", w * 2, h, size).width, b = measure(light, "rounded", w * 2, h, size).width;
      if (a + b > 950) { size *= 950 / (a + b); a = measure(heavy, "wide", w * 2, h, size).width; b = measure(light, "rounded", w * 2, h, size).width; }
      const x0 = (w - a - b) / 2, ty = h * 0.43;
      const words = page.body.trim().split(/\s+/).filter(Boolean), perLine = Math.max(4, Math.ceil(words.length / 3));
      const poem = Array.from({ length: Math.ceil(words.length / perLine) }, (_, r) => words.slice(r * perLine, r * perLine + perLine)).map((line, r) =>
        // Justifié : mots répartis de 90 à 990 px, le dernier calé à droite (largeur estimée à 0,55 em par lettre)
        line.map((item, k) => label(item, line.length > 1 ? 90 + ((900 - (k === line.length - 1 ? item.length * 21 * 0.55 : 0)) * k) / (line.length - 1) : 90, ty + size * 1.02 + 40 + r * 30, 21, fg, false, 220)).join("")).join("");
      const strip = { x: w * 0.28, y: h * 0.29, w: w * 0.44, h: h * 0.085 };
      return `<defs>
          <filter id="${id}silhouette" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="34" result="b"/><feColorMatrix in="b" type="saturate" values="0" result="g"/><feFlood flood-color="${bg}" result="f"/><feBlend in="g" in2="f" mode="multiply"/></filter>
          <filter id="${id}grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .16"/></feComponentTransfer></filter>
          <clipPath id="${id}strip"><rect x="${strip.x}" y="${strip.y}" width="${strip.w}" height="${strip.h}"/></clipPath>
        </defs>
        <rect width="${w}" height="${h}" fill="${bg}"/>
        <g filter="url(#${id}silhouette)">${photo(image, imageRatio, 0, 0, w, h, true)}</g>
        <g clip-path="url(#${id}strip)">${photo(image, imageRatio, 0, 0, w, h, true)}</g>
        <rect x="${strip.x}" y="${strip.y}" width="${strip.w}" height="${strip.h}" fill="none" stroke="${fg}" stroke-width="2"/>
        ${label(page.kicker.toUpperCase(), w / 2, 96, 18, fg, true, 700)}
        ${outlineText(heavy, "wide", x0 + page.offsetX, ty + page.offsetY, w * 2, h, size, fg)}${outlineText(light, "rounded", x0 + a + page.offsetX, ty + page.offsetY, w * 2, h, size, fg)}
        ${poem}
        <rect width="${w}" height="${h}" filter="url(#${id}grain)"/>`;
    }
    case "moderno": {
      // Modern orange feed: B&W photo with serif title, an italic orange word and a drawn arrow; every second page is a solid orange card.
      const ink = mixHex(bg, "#000000", 0.2);
      // Le dernier mot passe en italique orange, le reste en serif
      const words2 = page.title.trim().split(/\s+/), italicWord = words2.length > 1 ? words2.pop()! : "", plain = words2.join(" ");
      if (index % 2 === 1) {
        return `<rect width="${w}" height="${h}" fill="${accent}"/>
          ${label(page.kicker, 76, 96, 18, ink)}${label(String(index + 1).padStart(2, "0"), w - 76, 96, 18, ink, true, 80)}
          ${heading(plain.toUpperCase(), "serif", 76, h * 0.3, 928, h * 0.2, page.titleSize * 1.3, ink, false)}
          ${heading(italicWord, "italic", 76, h * 0.5, 928, h * 0.12, page.titleSize * 1.1, fg, false)}
          ${label(page.body, 76, h * 0.7, 26, ink, false, 700, h * 0.1)}<path d="M 76 ${h - 150} H ${w - 200}" stroke="${ink}" stroke-width="2"/><path d="M ${w - 180} ${h - 162} h 70 v 24 h -70 z" fill="none" stroke="${ink}" stroke-width="2"/>`;
      }
      const ring = `${page.kicker.toUpperCase()} · `.repeat(2).slice(0, 30);
      const ringText = [...ring].map((ch, k) => `<g transform="rotate(${(k / ring.length) * 360} ${w * 0.8} ${h * 0.5})">${label(ch, w * 0.8, h * 0.5 - 110, 15, fg, true, 26)}</g>`).join("");
      return `${photo(image, imageRatio, 0, 0, w, h, true)}${shade}<rect width="${w}" height="${h}" fill="${bg}" opacity=".3"/>
        ${label(page.kicker, 76, 96, 18, fg)}${label(String(index + 1).padStart(2, "0"), w - 76, 96, 18, fg, true, 80)}<g opacity=".45">${ringText}</g>
        ${heading(plain.toUpperCase(), "serif", 76, h * 0.5, 928, h * 0.22, page.titleSize * 1.35, fg, false)}
        <g transform="rotate(-6 640 ${h * 0.44})">${heading(italicWord, "italic", 520, h * 0.38, 520, h * 0.1, page.titleSize * 0.9, accent, false)}</g>
        <path d="M 600 ${h * 0.49} c -30 20 -40 40 -36 70 m 0 0 l -14 -18 m 14 18 l 18 -12" stroke="${accent}" stroke-width="4" fill="none" stroke-linecap="round"/>
        ${body(76, h * 0.78, 700, h * 0.06)}<path d="M 76 ${h - 150} H ${w - 200}" stroke="${fg}" stroke-width="2" opacity=".7"/><path d="M ${w - 180} ${h - 162} h 70 v 24 h -70 z" fill="none" stroke="${fg}" stroke-width="2" opacity=".7"/>`;
    }
    case "bleed": {
      // Flat-colour banner: a giant lowercase word bleeding off the frame (bottom, or vertical on the right every third page), small bold headline.
      const giant = (ending.split(/\s+/).at(-1) ?? page.title).toLowerCase().replace(/[.,!?]+$/, "");
      const lead = page.title.trim().slice(0, page.title.trim().length - giant.length).trim().replace(/[,–-]+$/, "") || page.kicker;
      const vertical = index % 3 === 1;
      const giantArt = vertical
        ? `<g transform="translate(${w * 0.6} ${h + 30}) rotate(-90)">${heading(giant, "wide", 0, 0, h * 1.15, w * 0.55, 520, accent, false)}</g>`
        : heading(giant, "wide", -20, h * 0.6, w * 1.2, h * 0.5, 560, accent, false);
      // Petite carte photo arrondie (la photo de l'utilisateur reste présente, le mot géant reste le sujet)
      const card = vertical ? { x: 76, y: h * 0.52, s: Math.min(260, h * 0.22) } : { x: w - 76 - 300, y: h * 0.3, s: 300 };
      return `<rect width="${w}" height="${h}" fill="${bg}"/>${giantArt}
        <defs><clipPath id="${id}card"><rect x="${card.x}" y="${card.y}" width="${card.s}" height="${card.s}" rx="28"/></clipPath></defs>
        <g clip-path="url(#${id}card)">${photo(image, imageRatio, card.x, card.y, card.s, card.s)}</g>
        ${heading(lead, "rounded", 76, 90, vertical ? 560 : 640, h * 0.17, 84, fg, false)}
        ${label(page.kicker, vertical ? 76 : 760, vertical ? h * 0.33 : 140, 22, fg, false, 280)}
        ${label(page.body, 76, vertical ? h * 0.42 : h * 0.3, 22, fg, false, vertical ? 480 : 520, h * 0.12)}
        ${heading(`${(lead.split(/\s+/)[0] ?? "").replace(/[,.]+$/, "")}-`, "rounded", vertical ? 76 : 90, vertical ? h * 0.78 : h * 0.6, 520, h * 0.09, 76, fg, false)}`;
    }
    case "nexus": {
      // Tech néon (lancement, bêta) : noir profond, vert néon, photo monochrome teintée de vert et fondue dans le noir,
      // lignes topographiques, repères « + », badge en pastille, titre large entaillé (pochoir), seconde partie en contour vert.
      // Trois compositions qui alternent : photo à droite, photo dans une planète verte, carte photo sur une éclipse.
      const kind = index % 3, deep = mixHex(accent, "#000000", 0.82), soft = mixHex(accent, bg, 0.55);
      const topo = Array.from({ length: 9 }, (_, k) => {
        const cx = kind === 1 ? w * 0.7 : w * 0.35, cy = h * (kind === 2 ? 0.75 : 0.4), r = 120 + k * 70;
        const pts = Array.from({ length: 97 }, (_, j) => { const a = (j / 96) * Math.PI * 2; const rr = r * (1 + 0.08 * Math.sin(a * 3 + k * 0.7 + index) + 0.05 * Math.sin(a * 5 - k)); return `${(cx + Math.cos(a) * rr * 1.25).toFixed(1)},${(cy + Math.sin(a) * rr * 0.8).toFixed(1)}`; });
        return `<polyline points="${pts.join(" ")}" fill="none" stroke="${fg}" stroke-opacity="${k % 3 === 0 ? 0.08 : 0.05}" stroke-width="1.5"/>`;
      }).join("");
      const crosses = [[0.08, 0.3], [0.92, 0.22], [0.18, 0.62], [0.86, 0.66], [0.5, 0.12]].map(([fx, fy]) => `<path d="M ${w * fx - 12} ${h * fy} h 24 M ${w * fx} ${h * fy - 12} v 24" stroke="${fg}" stroke-opacity=".3" stroke-width="2"/>`).join("");
      const pillText = page.kicker.toUpperCase(), pillW = Math.min(460, pillText.length * 15 + 60);
      const pill = `<rect x="${w - 60 - pillW}" y="70" width="${pillW}" height="50" rx="25" fill="none" stroke="${accent}" stroke-width="2.5"/>${label(pillText, w - 60 - pillW / 2, 103, 19, accent, true, pillW - 40)}`;
      // Titre : début plein (blanc) entaillé façon pochoir, fin en contour vert
      const size = page.titleSize * 1.05, tx = 64, ty = kind === 2 ? h * 0.62 : h * 0.6;
      const leadText = (beginning || page.title).toUpperCase(), tailText = beginning ? ending.toUpperCase() : "";
      const hh = Math.min(h, 1350), leadBox = measure(leadText, "wide", 952, hh * 0.17, size);
      const rowsCount = Math.max(1, Math.round(leadBox.height / (size * 1.13))), rowH = leadBox.height / rowsCount;
      const cuts = Array.from({ length: rowsCount }, (_, r) => [0.42, 0.7].map((f, k) => {
        const x0 = tx + page.offsetX + leadBox.width * (0.06 + rnd(r * 7 + k + index * 3) * 0.6);
        return `<rect x="${x0.toFixed(1)}" y="${(ty + page.offsetY + r * rowH + rowH * f * 0.85).toFixed(1)}" width="${(leadBox.width * (0.1 + rnd(r + k * 5) * 0.16)).toFixed(1)}" height="${(rowH * 0.06).toFixed(1)}" fill="${bg}"/>`;
      }).join("")).join("");
      const title = `${heading(leadText, "wide", tx, ty, 952, hh * 0.17, size, fg, false)}${cuts}${tailText ? stroked(tailText, "wide", tx, ty + leadBox.height + 6, 952, hh * 0.1, size * 0.62, accent, 2.5, false) : ""}`;
      const bodyY = ty + leadBox.height + (tailText ? size * 0.75 : 0) + 44;
      const squares = [[0.14, 0.12, 70], [0.27, 0.2, 52], [0.1, 0.26, 40]].map(([fx, fy, s]) => `<rect x="${w * fx - s / 2}" y="${h * fy - s / 2}" width="${s}" height="${s}" rx="${s * 0.22}" fill="none" stroke="${accent}" stroke-width="6" filter="url(#${id}neon)"/><rect x="${w * fx - s / 2}" y="${h * fy - s / 2}" width="${s}" height="${s}" rx="${s * 0.22}" fill="none" stroke="${mixHex(accent, "#ffffff", 0.5)}" stroke-width="2.5"/>`).join("");
      const subject = kind === 0
        ? `<g clip-path="url(#${id}right)">${photo(image, imageRatio, w * 0.38, 0, w * 0.62, h * 0.72, true)}<rect x="${w * 0.38}" y="0" width="${w * 0.62}" height="${h * 0.72}" fill="${bg}" opacity=".3"/><rect x="${w * 0.38}" y="0" width="${w * 0.62}" height="${h * 0.72}" fill="${accent}" opacity=".2"/></g>
           <rect x="${w * 0.38}" y="0" width="${w * 0.62}" height="${h * 0.72}" fill="url(#${id}fadeL)"/><rect x="${w * 0.38}" y="0" width="${w * 0.62}" height="${h * 0.72}" fill="url(#${id}fadeB)"/><rect x="${w * 0.38}" y="0" width="${w * 0.62}" height="${h * 0.72}" fill="url(#${id}fadeT)"/>${squares}`
        : kind === 1
        ? `<circle cx="${w * 0.66}" cy="${h * 0.3}" r="${w * 0.33}" fill="${accent}" opacity=".35" filter="url(#${id}halo)"/>
           <g clip-path="url(#${id}planet)">${photo(image, imageRatio, w * 0.36, h * 0.3 - w * 0.3, w * 0.6, w * 0.6, true)}<circle cx="${w * 0.66}" cy="${h * 0.3}" r="${w * 0.3}" fill="url(#${id}sphere)"/></g>
           <circle cx="${w * 0.2}" cy="${h * 0.16}" r="${w * 0.045}" fill="url(#${id}moon)"/>`
        : `<ellipse cx="${w / 2}" cy="${h * 0.98}" rx="${w * 0.62}" ry="${h * 0.42}" fill="${accent}" opacity=".5" filter="url(#${id}halo)"/>
           <ellipse cx="${w / 2}" cy="${h * 0.99}" rx="${w * 0.56}" ry="${h * 0.4}" fill="${deep}"/><ellipse cx="${w / 2}" cy="${h * 0.99}" rx="${w * 0.56}" ry="${h * 0.4}" fill="none" stroke="${accent}" stroke-width="3" stroke-opacity=".8"/>
           <g clip-path="url(#${id}card)">${photo(image, imageRatio, w * 0.27, h * 0.12, w * 0.46, h * 0.42, true)}<rect x="${w * 0.27}" y="${h * 0.12}" width="${w * 0.46}" height="${h * 0.42}" fill="${accent}" opacity=".18"/><rect x="${w * 0.27}" y="${h * 0.12}" width="${w * 0.46}" height="${h * 0.42}" fill="url(#${id}fadeB)"/></g>
           <rect x="${w * 0.27}" y="${h * 0.12}" width="${w * 0.46}" height="${h * 0.42}" rx="28" fill="none" stroke="${accent}" stroke-opacity=".5" stroke-width="2"/>`;
      return `<defs>
          <filter id="${id}neon" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
          <filter id="${id}halo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="60"/></filter>
          <filter id="${id}grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="11"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .1"/></feComponentTransfer></filter>
          <linearGradient id="${id}fadeL" x1="0" x2="1"><stop stop-color="${bg}"/><stop offset=".12" stop-color="${bg}" stop-opacity=".85"/><stop offset=".55" stop-color="${bg}" stop-opacity="0"/></linearGradient>
          <linearGradient id="${id}fadeT" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${bg}" stop-opacity=".75"/><stop offset=".3" stop-color="${bg}" stop-opacity="0"/></linearGradient>
          <linearGradient id="${id}fadeB" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="${bg}" stop-opacity="0"/><stop offset="1" stop-color="${bg}"/></linearGradient>
          <radialGradient id="${id}sphere" cx=".38" cy=".35" r=".75"><stop stop-color="${mixHex(accent, "#ffffff", 0.35)}" stop-opacity=".55"/><stop offset=".55" stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${deep}" stop-opacity=".95"/></radialGradient>
          <radialGradient id="${id}moon" cx=".35" cy=".35" r=".8"><stop stop-color="${mixHex(accent, "#ffffff", 0.4)}"/><stop offset="1" stop-color="${deep}"/></radialGradient>
          <radialGradient id="${id}glow" cx="${kind === 1 ? 0.66 : 0.6}" cy="${kind === 2 ? 0.9 : 0.35}" r=".7"><stop stop-color="${accent}" stop-opacity=".28"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
          <clipPath id="${id}right"><rect x="${w * 0.38}" y="0" width="${w * 0.62}" height="${h * 0.72}"/></clipPath>
          <clipPath id="${id}planet"><circle cx="${w * 0.66}" cy="${h * 0.3}" r="${w * 0.3}"/></clipPath>
          <clipPath id="${id}card"><rect x="${w * 0.27}" y="${h * 0.12}" width="${w * 0.46}" height="${h * 0.42}" rx="28"/></clipPath>
        </defs>
        <rect width="${w}" height="${h}" fill="${bg}"/>
        ${subject}<rect width="${w}" height="${h}" fill="url(#${id}glow)"/>${topo}${crosses}${pill}${title}
        ${label(page.body.toUpperCase(), 64, bodyY, 21, kind === 2 ? mixHex(fg, accent, 0.25) : soft, false, 700, h * 0.08)}
        <rect width="${w}" height="${h}" filter="url(#${id}grain)"/>`;
    }
    case "amplify": {
      // Agence marketing jaune et noir : une page sur deux en aplat jaune. Titre condensé énorme et centré, petite accroche
      // au-dessus, mot clé en jaune (page noire) ou sur étiquette noire (page jaune), photo en duotone jaune, sol en grille
      // perspective, traînées de lumière jaunes et bouton en pastille.
      const yellow = index % 2 === 1, paper = yellow ? accent : bg, ink = yellow ? bg : fg, hot = yellow ? bg : accent;
      const size = page.titleSize * 1.45;
      const leadText = (beginning || page.title).toUpperCase(), keyText = beginning ? ending.toUpperCase() : "";
      const hh = Math.min(h, 1350), leadBox = measure(leadText, "condensed", 900, hh * 0.2, size);
      const keyBox = keyText ? measure(keyText, "condensed", 900, hh * 0.14, size * 1.08) : { width: 0, height: 0 };
      const ty = h * 0.15, keyY = ty + leadBox.height + 4;
      const horizon = h * 0.74;
      const rays = Array.from({ length: 15 }, (_, k) => `<path d="M ${w / 2} ${horizon} L ${(-w * 0.6 + (k / 14) * w * 2.2).toFixed(1)} ${h}" stroke="${accent}" stroke-opacity=".55" stroke-width="2"/>`).join("");
      const rows = Array.from({ length: 7 }, (_, k) => { const y = horizon + (h - horizon) * ((k + 1) / 7) ** 1.8; return `<path d="M 0 ${y.toFixed(1)} H ${w}" stroke="${accent}" stroke-opacity="${(0.25 + k * 0.08).toFixed(2)}" stroke-width="2"/>`; }).join("");
      const curve = (dy: number, rise: number) => `M -60 ${h * (0.5 + dy)} C ${w * 0.3} ${h * (0.5 + dy - rise)}, ${w * 0.7} ${h * (0.5 + dy + rise)}, ${w + 60} ${h * (0.44 + dy)}`;
      const swoosh = (dy: number, rise: number) => `<path d="${curve(dy, rise)}" stroke="${yellow ? "#ffffff" : accent}" stroke-width="34" fill="none" opacity=".55" filter="url(#${id}soft)"/><path d="${curve(dy, rise)}" stroke="#ffffff" stroke-width="3" fill="none" opacity=".85"/>`;
      // Page jaune : la photo encadrée se place sous le texte (jamais par-dessus) et au-dessus de la pastille
      const pillW = 260, pillY = h * 0.87, bodyY = keyY + keyBox.height + 50;
      const fy = Math.max(h * 0.47, bodyY + 60), fh = Math.max(h * 0.18, pillY - 50 - fy), fw = Math.min(w * 0.64, fh * 1.5), fx = (w - fw) / 2;
      const photoArt = yellow
        ? `<g transform="rotate(-3 ${w / 2} ${fy + fh / 2})"><rect x="${fx - 14}" y="${fy - 14}" width="${fw + 28}" height="${fh + 28}" rx="34" fill="${bg}"/>
             <g clip-path="url(#${id}frame)">${photo(image, imageRatio, fx, fy, fw, fh, true)}<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="${accent}" opacity=".3"/></g></g>`
        // Photo verticale : boîte à sa hauteur naturelle, calée en haut de la bande (le haut de l'image, souvent le visage, reste visible)
        : `<g clip-path="url(#${id}upper)">${photo(image, imageRatio, 0, h * 0.36, w, Math.max(h * 0.5, w / imageRatio), true)}<rect x="0" y="${h * 0.36}" width="${w}" height="${h * 0.5}" fill="${bg}" opacity=".28"/><rect x="0" y="${h * 0.36}" width="${w}" height="${h * 0.5}" fill="${accent}" opacity=".2"/></g>
           <rect x="0" y="${h * 0.36}" width="${w}" height="${h * 0.5}" fill="url(#${id}fade)"/><g clip-path="url(#${id}floor)">${rays}${rows}</g>`;
      const key = !keyText ? "" : yellow
        ? `<rect x="${w / 2 - keyBox.width / 2 - 24}" y="${keyY - 6}" width="${keyBox.width + 48}" height="${keyBox.height + 4}" fill="${bg}" transform="rotate(-1.5 ${w / 2} ${keyY + keyBox.height / 2})"/>${heading(keyText, "condensed", 90, keyY, 900, hh * 0.14, size * 1.08, fg, true)}`
        : heading(keyText, "condensed", 90, keyY, 900, hh * 0.14, size * 1.08, accent, true);
      // Pastille : flèche et points de progression (la page courante en jaune, allongée)
      const dots = doc.pages.map((_, k) => `<rect x="${w / 2 - 30 + (k - (doc.pages.length - 1) / 2) * 26 + (k > index ? 14 : 0)}" y="${pillY + 22}" width="${k === index ? 26 : 12}" height="12" rx="6" fill="${k === index ? accent : "#ffffff"}" opacity="${k === index ? 1 : 0.45}"/>`).join("");
      return `<defs>
          <filter id="${id}soft" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
          <filter id="${id}grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .12"/></feComponentTransfer></filter>
          <radialGradient id="${id}light" cx=".5" cy=".18" r=".8"><stop stop-color="${yellow ? "#ffffff" : accent}" stop-opacity="${yellow ? 0.45 : 0.3}"/><stop offset="1" stop-color="${paper}" stop-opacity="0"/></radialGradient>
          <linearGradient id="${id}fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${bg}"/><stop offset=".12" stop-color="${bg}" stop-opacity=".85"/><stop offset=".4" stop-color="${bg}" stop-opacity="0"/><stop offset=".8" stop-color="${bg}" stop-opacity="0"/><stop offset="1" stop-color="${bg}"/></linearGradient>
          <clipPath id="${id}upper"><rect x="0" y="${h * 0.36}" width="${w}" height="${h * 0.5}"/></clipPath>
          <clipPath id="${id}floor"><rect x="0" y="${horizon}" width="${w}" height="${h - horizon}"/></clipPath>
          <clipPath id="${id}frame"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="24"/></clipPath>
        </defs>
        <rect width="${w}" height="${h}" fill="${paper}"/><rect width="${w}" height="${h}" fill="url(#${id}light)"/>
        ${swoosh(yellow ? 0.1 : -0.02, 0.12)}${photoArt}${swoosh(yellow ? 0.2 : 0.18, -0.1)}
        <circle cx="${w / 2}" cy="74" r="22" fill="none" stroke="${hot}" stroke-width="5"/><circle cx="${w / 2}" cy="74" r="8" fill="${hot}"/>
        ${label(page.kicker, w / 2, ty - 22, 26, ink, true, 760)}
        ${heading(leadText, "condensed", 90, ty, 900, hh * 0.2, size, ink, true)}${key}
        ${label(page.body, w / 2, bodyY, 22, ink, true, 720, h * 0.07)}
        <rect x="${w / 2 - pillW / 2}" y="${pillY}" width="${pillW}" height="56" rx="28" fill="${yellow ? bg : "#151515"}" stroke="${accent}" stroke-opacity="${yellow ? 0 : 0.6}" stroke-width="2"/>
        <circle cx="${w / 2 + pillW / 2 - 34}" cy="${pillY + 28}" r="14" fill="${accent}"/><path d="M ${w / 2 + pillW / 2 - 41} ${pillY + 28} h 14 m -6 -6 6 6 -6 6" stroke="${bg}" stroke-width="3" fill="none" stroke-linecap="round"/>
        ${dots}
        <rect width="${w}" height="${h}" filter="url(#${id}grain)"/>`;
    }
    default: return null;
  }
}

/** Deterministic pseudo-random value in [0, 1) for decorative jitter. */
function rnd(seed: number) { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

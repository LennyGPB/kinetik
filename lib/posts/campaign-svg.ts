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
      const headlineSize = page.titleSize * 1.14;
      const estimatedRows = beginning ? Math.ceil(beginning.length / Math.max(1, Math.floor(940 / (headlineSize * .66)))) : 0;
      const emphasisTop = h * .18 + Math.min(h * .18, estimatedRows * headlineSize * 1.13) + 16;
      return `<defs><radialGradient id="${id}violet"><stop stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><clipPath id="${id}product"><rect x="90" y="${h * .61 + 34}" width="900" height="${h * .27 - 54}" rx="8"/></clipPath></defs>
        <ellipse cx="${index % 2 ? 220 : 900}" cy="${h * .76}" rx="780" ry="${h * .41}" fill="url(#${id}violet)"/>
        ${label(page.kicker, 70, 116, 19, accent, false, 790)}<path d="M 70 150 H 1010" stroke="${fg}" opacity=".18"/>
        ${heading(beginning, "wide", 70, h * .18, 940, h * .18, page.titleSize * 1.14)}
        ${heading(ending, "wide", 70, emphasisTop, 940, h * .12, headlineSize, accent)}
        ${body(70, h * .535, 860, h * .05)}
        <rect x="70" y="${h * .61}" width="940" height="${h * .27}" rx="20" fill="${bg}" stroke="${accent}" stroke-width="2"/>
        <path d="M 90 ${h * .61 + 27} H 990" stroke="${fg}" opacity=".15"/>
        ${[0, 1, 2].map((i) => `<circle cx="${98 + i * 15}" cy="${h * .61 + 14}" r="3" fill="${i === 0 ? accent : fg}" opacity="${i === 0 ? 1 : .3}"/>`).join("")}
        <g clip-path="url(#${id}product)">${photo(image, imageRatio, 90, h * .61 + 34, 900, h * .27 - 54)}</g>
        <path d="M 360 ${h * .90} H 720" stroke="${accent}" stroke-width="3"/>
        <path d="M 940 ${h - 122} h 55 m -20 -20 20 20 -20 20" stroke="${fg}" stroke-width="2" fill="none"/>`;
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
    default: return null;
  }
}

import { POST_FORMATS, getPostTemplate } from "@/config/post-templates";
import { isCampaignPost } from "@/config/post-campaigns";
import type { PostDocument } from "./document";
import { outlineText, type OutlineFace } from "./outline-text";

type CampaignTools = {
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
  const footerNotes = `<path d="M 76 ${h - 190} H 1004" stroke="${fg}" opacity="0.4"/>${label(page.kicker, 76, h - 146, 17, fg, false, 400)}`;

  switch (template.layout) {
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
    default: return null;
  }
}

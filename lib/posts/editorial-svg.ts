import { POST_FORMATS, getPostTemplate } from "@/config/post-templates";
import { isEditorialPost } from "@/config/post-editorial-collection";
import { outlineText, type OutlineFace } from "./outline-text";
import type { PostDocument } from "./document";
import type { CampaignTools } from "./campaign-svg";

/** Independent compositions; the shared photo tools enforce upload safety and editable focal points. */
export function editorialPostArt(doc: PostDocument, index: number, tools: CampaignTools): string | null {
  if (!isEditorialPost(doc.templateId)) return null;
  const page = doc.pages[index];
  const { height: h } = POST_FORMATS[doc.format];
  const [bg, fg, accent] = doc.colors;
  const { id, image, imageRatio, photo, label } = tools;
  const layout = getPostTemplate(doc.templateId)!.layout;
  const title = (x: number, y: number, w: number, height: number, size = page.titleSize, color = fg, face: OutlineFace = "wide", value = page.title, center = page.align === "center") => outlineText(value, face, x + page.offsetX, y + page.offsetY, w, height, size, color, center);
  const pic = (x: number, y: number, w: number, height: number, mono?: boolean) => image ? photo(image, imageRatio, x, y, w, height, mono) : `<rect x="${x}" y="${y}" width="${w}" height="${height}" fill="${accent}" opacity="0.14"/>`;
  const body = (x: number, y: number, w: number, height: number, color = fg, center = false) => label(page.body, x, y, 25, color, center, w, height);
  const header = label(page.kicker, 64, 116, 18, fg, false, 820);
  const star = (x: number, y: number, r: number, color = accent) => `<g transform="translate(${x},${y})" fill="${color}">${[0, 60, 120].map((angle) => `<rect x="${-r}" y="${-r * .17}" width="${r * 2}" height="${r * .34}" transform="rotate(${angle})"/>`).join("")}</g>`;
  const arrow = (x: number, y: number, color = fg) => `<g fill="none" stroke="${color}" stroke-width="2"><circle cx="${x}" cy="${y}" r="30"/><path d="M ${x - 10} ${y + 10} l 20 -20 m -20 0 h 20 v 20"/></g>`;
  const words = page.title.trim().split(/\s+/);
  const last = words.slice(-1).join(" "), first = words.slice(0, -1).join(" ");
  const stripTitle = (x: number, y: number, width: number, height: number, fill = fg, ink = bg) => {
    const rows: string[] = []; let row = "";
    for (const word of words) {
      if (row && (row + " " + word).length > 17) { rows.push(row); row = ""; }
      row += (row ? " " : "") + word;
    }
    if (row) rows.push(row);
    const step = Math.min(page.titleSize * 1.12, height / Math.max(1, rows.length));
    return rows.map((line, i) => `<rect x="${x + page.offsetX}" y="${y + page.offsetY + i * step}" width="${width}" height="${step - 5}" fill="${fill}"/>${title(x + 16, y + i * step - 5, width - 32, step - 2, step * .86, ink, "condensed", line, false)}`).join("");
  };
  switch (layout) {
    case "brandmark":
      return `${header}${pic(index % 2 ? 75 : 510, h * .21, index % 2 ? 630 : 505, h * .60)}
        <g transform="rotate(-7 850 ${h * .74})"><rect x="780" y="${h * .65}" width="220" height="${h * .18}" fill="${bg}"/>${pic(792, h * .65 + 12, 196, h * .18 - 48)}</g>
        <rect x="48" y="${h * .18}" width="470" height="${h * .49}" fill="${bg}" opacity=".96"/>
        ${title(64, h * .18, 480, h * .34, page.titleSize * 1.15, fg, "wide", first)}${title(64, h * .53, 490, h * .12, page.titleSize * 1.13, fg, "wide", last)}
        <ellipse cx="295" cy="${h * .53 + 88}" rx="250" ry="50" transform="rotate(-6 295 ${h * .53 + 88})" fill="none" stroke="${accent}" stroke-width="8"/>
        ${body(64, h * .83, 760, h * .08)}${star(956, 150, 32)}`;
    case "bolder":
      return `${header}${pic(420, h * .46, 600, h * .43)}
        ${title(64, h * .16, 900, h * .30, page.titleSize * 1.85, fg, "condensed")}
        <g transform="rotate(-9 160 ${h * .51})"><rect x="64" y="${h * .48}" width="230" height="70" fill="${accent}"/>${label(page.kicker.split("/")[0], 82, h * .48 + 46, 26, fg, false, 190, 48)}</g>
        ${body(64, h * .75, 310, h * .16)}${star(960, h * .81, 43, fg)}`;
    case "curator":
      return `${header}${pic(64, h * .17, 660, h * .49, false)}<g transform="rotate(8 850 ${h * .35})">${pic(740, h * .21, 270, h * .37, true)}</g>
        ${stripTitle(index % 2 ? 95 : 220, h * .48, 690, h * .33)}${body(64, h * .89, 840, h * .045)}
        <path d="M 982 ${h * .66} q 60 80 -20 130 l 0 -25 m 0 25 28 -3" fill="none" stroke="${accent}" stroke-width="3"/>`;
    case "cobalt-case":
      return `<defs><radialGradient id="${id}cobalt"><stop stop-color="${accent}"/><stop offset=".5" stop-color="${accent}" stop-opacity=".9"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><clipPath id="${id}case"><rect x="64" y="${h * .46}" width="952" height="${h * .33}"/></clipPath></defs>
        <ellipse cx="${index % 2 ? 50 : 1060}" cy="${h * .28}" rx="720" ry="${h * .43}" fill="url(#${id}cobalt)"/>
        ${header}<path d="M 64 148 H 1016" stroke="${fg}" opacity=".35"/>
        ${title(64, h * .19, 920, h * .23, page.titleSize * 1.05)}
        <g clip-path="url(#${id}case)">${pic(64, h * .46, index % 2 ? 690 : 952, h * .33, true)}<rect x="${index % 2 ? 754 : 850}" y="${h * .46}" width="${index % 2 ? 262 : 166}" height="${h * .33}" fill="${accent}"/>
          ${outlineText(String(index + 1).padStart(2, "0"), "wide", index % 2 ? 777 : 864, h * .47, index % 2 ? 214 : 138, h * .18, index % 2 ? 125 : 75, fg)}
          <path d="M 900 ${h * .72} h 70 m -28 -28 28 28 -28 28" fill="none" stroke="${fg}" stroke-width="3"/>
        </g><path d="M 64 ${h * .815} H 1016" stroke="${fg}" opacity=".3"/>
        ${body(64, h * .855, 880, h * .075)}`;
    case "redshift":
      return `${header}<circle cx="${index % 2 ? 350 : 735}" cy="${h * .47}" r="390" fill="${accent}"/>
        <defs><clipPath id="${id}disc"><circle cx="${index % 2 ? 350 : 735}" cy="${h * .47}" r="340"/></clipPath></defs>
        <g clip-path="url(#${id}disc)">${pic(index % 2 ? 10 : 390, h * .19, 690, h * .56, true)}</g>
        <rect x="48" y="${h * .59}" width="960" height="${h * .22}" fill="${bg}" opacity=".8"/>
        ${title(64, h * .59, 950, h * .23, page.titleSize * 1.25)}${body(64, h * .88, 810, h * .055)}${arrow(970, h * .91, accent)}`;
    case "encore":
      return `${header}${title(64, h * .16, 925, h * .24, page.titleSize * 1.32)}
        <g transform="rotate(${index % 2 ? -7 : 6} 700 ${h * .59})"><rect x="${index % 2 ? 95 : 445}" y="${h * .44}" width="530" height="${h * .40}" fill="${fg}"/>${pic(index % 2 ? 113 : 463, h * .44 + 18, 494, h * .40 - 95, false)}${label(page.kicker, index % 2 ? 118 : 468, h * .81, 17, bg, false, 470)}</g>
        <g transform="rotate(-5 440 ${h * .70})"><rect x="64" y="${h * .69}" width="640" height="100" fill="${accent}"/>${title(84, h * .69 + 5, 600, 85, 65, fg, "wide", last)}</g>
        ${body(64, h * .89, 860, h * .05)}${star(955, 152, 28, fg)}`;
    case "marker":
      return `${header}${index % 2 === 0 ? `${pic(64, h * .18, 952, h * .30, true)}<rect x="64" y="${h * .435}" width="952" height="60" fill="${accent}"/>${label(page.kicker, 82, h * .435 + 39, 20, bg, false, 790)}${star(970, h * .435 + 30, 22, bg)}` : `${star(950, h * .24, 65)}<path d="M 64 ${h * .40} H 1016" stroke="${accent}"/>`}
        ${title(64, h * .53, 952, h * .21, page.titleSize * 1.05)}<rect x="64" y="${h * .76}" width="720" height="7" fill="${accent}"/>
        ${body(64, h * .82, 850, h * .09)}${arrow(974, h * .9, accent)}`;
    case "northstar":
      return `${header}${index % 2 === 0 ? `${pic(64, h * .18, 290, h * .29, true)}${pic(366, h * .15, 348, h * .35, true)}${pic(726, h * .18, 290, h * .29, true)}` : star(540, h * .33, h * .13, fg)}
        ${title(95, h * .57, 890, h * .17, page.titleSize * .87, fg, "wide", first, true)}${title(95, h * .74, 890, h * .10, page.titleSize * 1.18, fg, "italic", last, true)}
        ${body(540, h * .86, 800, h * .06, fg, true)}`;
    case "pasteup": {
      const repeated = page.title.toUpperCase();
      return `<g opacity=".25">${Array.from({ length: 7 }, (_, i) => title(-25, 60 + i * (h - 100) / 7, 1130, (h - 100) / 7, page.titleSize * .95, fg, "wide", repeated)).join("")}</g>
        <path d="M 35 35 H 1045 V ${h - 35} H 35 Z" stroke="${accent}" stroke-width="3" fill="none"/>
        <g transform="rotate(${index % 2 ? 4 : -4} 540 ${h * .47})"><rect x="156" y="${h * .16}" width="768" height="${h * .65}" fill="${fg}"/>${pic(177, h * .16 + 21, 726, h * .65 - 42, true)}</g>
        <rect x="64" y="${h * .62}" width="950" height="${h * .23}" fill="${accent}"/>${title(84, h * .63, 910, h * .20, page.titleSize * 1.2)}
        ${label(page.kicker, 64, 104, 18, fg)}${body(64, h * .88, 850, h * .055)}`;
    }
    case "openform":
      return `${header}<text x="1016" y="${h * .8}" font-family="Arial,sans-serif" font-size="${h * .43}" font-weight="400" text-anchor="end" fill="${accent}" opacity=".21">${String(index + 1).padStart(2, "0")}</text>
        ${label(page.title, (page.align === "center" ? 540 : 64) + page.offsetX, h * .23 + page.offsetY, page.titleSize * .95, fg, page.align === "center", 880, h * .27)}
        ${pic(index % 2 ? 570 : 64, h * .59, 445, h * .23, true)}${body(index % 2 ? 64 : 550, h * .63, 440, h * .13)}
        <path d="M 64 ${h * .88} H 1016" stroke="${fg}" opacity=".25"/>${arrow(974, h * .92)}`;
  }
  return null;
}

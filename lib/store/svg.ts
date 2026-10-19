import { STORE_SIZES, getStoreTemplate, type DevicePlacement, type StorePlatform, type StoreTemplate } from "../../config/store-templates";
import { escapeSvg as esc, outlineGlyphs, outlineText, type OutlineFace } from "../posts/outline-text";
import { pageScreens, type StoreDocument } from "./document";

export type StoreMedia = { appName?: string; logoUrl?: string | null; screenUrls?: string[]; watermark?: boolean; /** Unique per inline SVG on a page, so clip/gradient ids never collide. */ uid?: string };

const safeImage = (url: string | null | undefined) => url && (/^\/api\/uploads\/[A-Za-z0-9_/.\-]+(?:\?share=[A-Za-z0-9_-]{16,64})?$/.test(url) || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)) ? esc(url) : "";
const mix = (a: string, b: string, k: number) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");
const n = (value: number) => Number(value.toFixed(2));

type Ctx = { uid: string; W: number; H: number; doc: StoreDocument; template: StoreTemplate; bg: string; fg: string; accent: string; ink: string; defs: string[]; next: () => number };

/** Measured block of outlined text: same font files in the browser and in the Sharp export. */
function words(value: string, face: OutlineFace, x: number, y: number, width: number, maxHeight: number, size: number, fill: string, center: boolean, opacity = 1) {
  if (!value.trim()) return { svg: "", bottom: y };
  const { size: fitted, rows } = outlineGlyphs(value, face, x, y, width, maxHeight, size, center);
  const svg = outlineText(value, face, x, y, width, maxHeight, size, fill, center);
  return { svg: opacity < 1 ? `<g opacity="${opacity}">${svg}</g>` : svg, bottom: y + rows * fitted * 1.13 };
}

/** Plausible app screens for templates and empty slots, tinted with the accent colour. */
function demoScreen(variant: number, x: number, y: number, w: number, h: number, accent: string) {
  const u = w / 100, soft = mix(accent, "#ffffff", .82), mid = mix(accent, "#ffffff", .45), ink = "#1B1D24", line = "#E4E6EE";
  const bar = (bx: number, by: number, bw: number, bh: number, fill: string, r = bh / 2) => `<rect x="${n(x + bx * u)}" y="${n(y + by * u)}" width="${n(bw * u)}" height="${n(bh * u)}" rx="${n(r * u)}" fill="${fill}"/>`;
  let body = bar(0, 0, 100, h / u, "#F6F7FB", 0) + bar(8, 14, 34, 4.5, ink) + bar(76, 13, 16, 7, soft, 3.5);
  if (variant % 4 === 0) {
    body += bar(6, 26, 88, 44, accent, 7) + bar(12, 34, 40, 4, "#ffffff") + bar(12, 42, 26, 3, mid) + bar(12, 58, 30, 6, "#ffffff", 3);
    for (let i = 0; i < 6; i++) body += bar(6, 78 + i * 18, 88, 14, "#ffffff", 4) + `<circle cx="${n(x + 14 * u)}" cy="${n(y + (85 + i * 18) * u)}" r="${n(3.6 * u)}" fill="${i % 2 ? soft : mid}"/>` + bar(21, 81 + i * 18, 40 - i * 3, 3, ink) + bar(21, 87 + i * 18, 26, 2.4, line);
  } else if (variant % 4 === 1) {
    body += bar(6, 26, 88, 70, "#ffffff", 7) + bar(12, 33, 30, 3.4, ink) + bar(12, 40, 20, 6, accent, 2);
    [34, 52, 41, 70, 58, 86, 64].forEach((value, i) => { body += bar(13 + i * 11, 88 - value * .38, 7, value * .38, i === 5 ? accent : mid, 2); });
    body += bar(6, 102, 42, 34, "#ffffff", 6) + bar(52, 102, 42, 34, accent, 6) + bar(11, 109, 18, 3, ink) + bar(11, 117, 26, 7, soft, 2) + bar(57, 109, 18, 3, "#ffffff") + bar(57, 117, 24, 7, "#ffffff", 2);
  } else if (variant % 4 === 2) {
    body += `<circle cx="${n(x + 50 * u)}" cy="${n(y + 42 * u)}" r="${n(13 * u)}" fill="${mid}"/>` + bar(32, 60, 36, 4, ink) + bar(38, 68, 24, 3, line);
    for (let i = 0; i < 6; i++) body += bar(6 + (i % 3) * 30, 80 + Math.floor(i / 3) * 31, 28, 28, [accent, soft, mid][i % 3], 5);
    body += bar(6, 146, 88, 12, accent, 6) + bar(36, 150, 28, 3.4, "#ffffff");
  } else {
    body += bar(6, 26, 88, 58, "#ffffff", 7) + bar(12, 32, 34, 3.4, ink);
    for (let i = 0; i < 35; i++) body += `<circle cx="${n(x + (15 + (i % 7) * 11.7) * u)}" cy="${n(y + (44 + Math.floor(i / 7) * 8) * u)}" r="${n(2.1 * u)}" fill="${i === 17 ? accent : line}"/>`;
    for (let i = 0; i < 4; i++) body += bar(6, 92 + i * 20, 88, 16, "#ffffff", 4) + bar(6, 92 + i * 20, 2.6, 16, i ? mid : accent, 1.3) + bar(13, 96 + i * 20, 44, 3, ink) + bar(13, 102 + i * 20, 28, 2.4, line);
  }
  return body + bar(6, h / u - 16, 88, 12, "#ffffff", 6) + [0, 1, 2, 3].map((i) => `<circle cx="${n(x + (22 + i * 19) * u)}" cy="${n(y + h - 10 * u)}" r="${n(2.4 * u)}" fill="${i ? line : accent}"/>`).join("");
}

/** Code-drawn hardware: titanium iPhone with Dynamic Island, or a slim Galaxy with a punch-hole camera. */
function phone(c: Ctx, o: { android: boolean; x: number; y: number; w: number; rotate?: number; image: string; variant: number; shadow?: boolean }) {
  const id = `${c.uid}-p${c.next()}`, w = o.w, h = w / (o.android ? .48 : .49), { x, y } = o;
  const r = w * (o.android ? .1 : .155), bezel = w * (o.android ? .009 : .013), inset = w * (o.android ? .028 : .036);
  const sx = x + inset, sy = y + inset, sw = w - inset * 2, sh = h - inset * 2, sr = r - inset * .9;
  c.defs.push(`<linearGradient id="${id}-frame" x1="0" y1="0" x2="1" y2="1">${o.android ? `<stop stop-color="#5a5d63"/><stop offset=".5" stop-color="#2c2e33"/><stop offset="1" stop-color="#4a4c52"/>` : `<stop stop-color="#8d8a85"/><stop offset=".25" stop-color="#4b4945"/><stop offset=".55" stop-color="#2a2927"/><stop offset=".8" stop-color="#6c6964"/><stop offset="1" stop-color="#3a3936"/>`}</linearGradient>`,
    `<clipPath id="${id}-screen"><rect x="${n(sx)}" y="${n(sy)}" width="${n(sw)}" height="${n(sh)}" rx="${n(sr)}"/></clipPath>`,
    `<linearGradient id="${id}-glare" x1="0" y1="0" x2="1" y2=".55"><stop stop-color="#ffffff" stop-opacity=".16"/><stop offset=".42" stop-color="#ffffff" stop-opacity=".04"/><stop offset=".43" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`);
  const button = (side: number, top: number, len: number) => `<rect x="${n(side < 0 ? x - w * .014 : x + w - w * .004)}" y="${n(y + h * top)}" width="${n(w * .018)}" height="${n(h * len)}" rx="${n(w * .008)}" fill="url(#${id}-frame)"/>`;
  const buttons = o.android ? button(1, .2, .11) + button(1, .36, .06) : button(-1, .17, .045) + button(-1, .25, .085) + button(-1, .355, .085) + button(1, .29, .13);
  const content = o.image ? `<rect x="${n(sx)}" y="${n(sy)}" width="${n(sw)}" height="${n(sh)}" fill="#ffffff"/><image href="${o.image}" x="${n(sx)}" y="${n(sy)}" width="${n(sw)}" height="${n(sh)}" preserveAspectRatio="xMidYMid slice"/>` : demoScreen(o.variant, sx, sy, sw, sh, c.accent);
  const camera = o.android ? `<circle cx="${n(x + w / 2)}" cy="${n(sy + w * .045)}" r="${n(w * .021)}" fill="#050505"/>` : `<rect x="${n(x + w * .35)}" y="${n(sy + w * .028)}" width="${n(w * .3)}" height="${n(w * .086)}" rx="${n(w * .043)}" fill="#050505"/>`;
  const shadow = o.shadow === false ? "" : `<rect x="${n(x + w * .03)}" y="${n(y + w * .07)}" width="${n(w * .94)}" height="${n(h)}" rx="${n(r)}" fill="#000000" opacity=".3" filter="url(#${c.uid}-shadow)"/>`;
  return `<g transform="rotate(${n(o.rotate ?? 0)} ${n(x + w / 2)} ${n(y + h / 2)})">${shadow}${buttons}<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="url(#${id}-frame)"/><rect x="${n(x + w * .004)}" y="${n(y + w * .004)}" width="${n(w * .992)}" height="${n(h - w * .008)}" rx="${n(r)}" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="${n(w * .004)}"/><rect x="${n(x + bezel)}" y="${n(y + bezel)}" width="${n(w - bezel * 2)}" height="${n(h - bezel * 2)}" rx="${n(r - bezel)}" fill="#050505"/><g clip-path="url(#${id}-screen)">${content}<rect x="${n(sx)}" y="${n(sy)}" width="${n(sw)}" height="${n(sh)}" fill="url(#${id}-glare)"/></g>${camera}</g>`;
}

function background(c: Ctx, index: number, count: number, banner = false, word = "") {
  const { W, H, bg, fg, accent, uid } = c;
  const rect = (fill: string) => `<rect width="${W}" height="${H}" fill="${fill}"/>`;
  switch (c.template.background) {
    case "bold":
      c.defs.push(`<linearGradient id="${uid}-bold" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="${mix(bg, "#ffffff", .08)}"/><stop offset="1" stop-color="${mix(bg, accent, .45)}"/></linearGradient>`);
      return rect(`url(#${uid}-bold)`) + `<circle cx="${n(W * .92)}" cy="${n(H * .14)}" r="${n(W * .42)}" fill="${fg}" opacity=".07"/><circle cx="${n(W * .05)}" cy="${n(H * .78)}" r="${n(W * .3)}" fill="${accent}" opacity=".12"/>`;
    case "midnight":
      c.defs.push(`<radialGradient id="${uid}-glow" cx=".5" cy=".64" r=".55"><stop stop-color="${accent}" stop-opacity=".7"/><stop offset=".55" stop-color="${accent}" stop-opacity=".16"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><radialGradient id="${uid}-glow2" cx=".1" cy=".05" r=".6"><stop stop-color="${mix(accent, fg, .4)}" stop-opacity=".25"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>`);
      return rect(bg) + rect(`url(#${uid}-glow2)`) + `<ellipse cx="${n(W / 2)}" cy="${n(H * .66)}" rx="${n(W * .8)}" ry="${n(H * .42)}" fill="url(#${uid}-glow)"/>`;
    case "panorama": {
      // The wave is computed in panorama coordinates, so neighbouring screenshots join edge to edge in the store.
      const band = (centre: number, amp: number, phase: number, thick: number) => {
        const top: string[] = [], bottom: string[] = [];
        for (let s = 0; s <= 40; s++) { const lx = s / 40 * W, gx = index * W + lx, cy = H * (centre + amp * Math.sin(gx / W * 2.2 + phase)); top.push(`${n(lx)},${n(cy - thick * H / 2)}`); bottom.unshift(`${n(lx)},${n(cy + thick * H / 2)}`); }
        return `M${top.join("L")}L${bottom.join("L")}Z`;
      };
      return rect(bg) + `<path d="${band(.63, .1, 0, .2)}" fill="${accent}"/><path d="${band(.4, .07, 2.1, .045)}" fill="${fg}" opacity=".07"/><path d="${band(.86, .05, 4, .03)}" fill="${accent}" opacity=".35"/>`; 
    }
    case "editorial": {
      const pad = W * .08;
      const total = `/ ${String(count).padStart(2, "0")}`, right = outlineGlyphs(total, "serif", 0, 0, W, W * .1, W * .055).glyphs.reduce((max, g) => Math.max(max, g.box.x1), 0);
      return rect(bg) + `<path d="M${n(pad)} ${n(H * .045)}H${n(W - pad)}" stroke="${fg}" stroke-opacity=".3" stroke-width="${n(W * .002)}"/>` + (banner ? "" : outlineText(String(index + 1).padStart(2, "0"), "serif", pad, H * .052, W * .3, W * .1, W * .055, accent) + `<g opacity=".35">${outlineText(total, "serif", W - pad - right, H * .052, W, W * .1, W * .055, fg)}</g>`);
    }
    case "pop":
      return rect(bg) + `<rect width="${n(banner ? W * .62 : W)}" height="${n(banner ? H : H * .5)}" fill="${accent}"/>` + (banner ? "" : `<circle cx="${n(W * .93)}" cy="${n(H * .028)}" r="${n(W * .04)}" fill="${bg}" opacity=".9"/><circle cx="${n(W * .06)}" cy="${n(H * .47)}" r="${n(W * .03)}" fill="${fg}"/><circle cx="${n(W * .88)}" cy="${n(H * .92)}" r="${n(W * .09)}" fill="${accent}" opacity=".25"/><circle cx="${n(W * .12)}" cy="${n(H * .96)}" r="${n(W * .05)}" fill="${fg}" opacity=".08"/>`);
    case "stage": {
      c.defs.push(`<linearGradient id="${uid}-beam" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff" stop-opacity=".2"/><stop offset=".85" stop-color="#ffffff" stop-opacity="0"/></linearGradient><radialGradient id="${uid}-floor" cx=".5" cy=".5" r=".5"><stop stop-color="${accent}" stop-opacity=".55"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>`);
      const specks = Array.from({ length: 14 }, (_, k) => { const t = ((k * 37) % 100) / 100, y = H * (.08 + .8 * (((k * 53) % 100) / 100)), spread = W * (.12 + .45 * y / H); return `<circle cx="${n(W / 2 + (t - .5) * 2 * spread)}" cy="${n(y)}" r="${n(W * (.002 + .003 * (k % 3)))}" fill="#ffffff" opacity="${.15 + .1 * (k % 3)}"/>`; }).join("");
      return rect(bg) + `<path d="M${n(W * (banner ? .52 : .38))} 0H${n(W * (banner ? .72 : .62))}L${n(W * 1.08)} ${H}H${n(banner ? W * .3 : -W * .08)}Z" fill="url(#${uid}-beam)"/><ellipse cx="${n(banner ? W * .8 : W / 2)}" cy="${n(H * .93)}" rx="${n(W * .6)}" ry="${n(H * .12)}" fill="url(#${uid}-floor)"/>` + specks;
    }
    case "blueprint": {
      const minor = W / 24, major = W / 6, lines = (step: number) => { let d = ""; for (let x = step; x < W; x += step) d += `M${n(x)} 0V${H}`; for (let y = step; y < H; y += step) d += `M0 ${n(y)}H${W}`; return d; };
      const m = W * .035, mark = (x: number, y: number, sx: number, sy: number) => `<path d="M${n(x)} ${n(y + sy * W * .05)}V${n(y)}H${n(x + sx * W * .05)}" fill="none" stroke="${accent}" stroke-width="${n(W * .004)}"/>`;
      return rect(bg) + `<path d="${lines(minor)}" stroke="${fg}" stroke-opacity=".06" stroke-width="${n(W * .0015)}"/><path d="${lines(major)}" stroke="${fg}" stroke-opacity=".13" stroke-width="${n(W * .002)}"/>` + mark(m, m, 1, 1) + mark(W - m, m, -1, 1) + mark(m, H - m, 1, -1) + mark(W - m, H - m, -1, -1);
    }
    case "aurora": {
      const tints = [accent, mix(accent, "#FF6FB5", .6), mix(accent, "#3FD0FF", .6)];
      c.defs.push(tints.map((tint, k) => `<radialGradient id="${uid}-a${k}" cx=".5" cy=".5" r=".5"><stop stop-color="${tint}" stop-opacity=".6"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient>`).join(""));
      const spots = [[.2 + .1 * Math.sin(index * 1.7), .22], [.85, .52 + .08 * Math.cos(index)], [.3, .86]];
      return rect(bg) + spots.map(([x, y], k) => `<ellipse cx="${n(W * x)}" cy="${n(H * y)}" rx="${n(W * (banner ? .45 : .8))}" ry="${n(W * (banner ? .45 : .8))}" fill="url(#${uid}-a${k})"/>`).join("");
    }
    case "poster": {
      // A giant outlined word behind the phone, on three rows; the middle one is a faint solid.
      const big = (word || "APP").toLocaleUpperCase(), size = banner ? H * .62 : W * .34;
      const scale = outlineGlyphs(big, "condensed", 0, 0, W * 1.1, size * 1.15, size, true).glyphs[0]?.scale ?? 1;
      // Four stacked rows fill the frame below the copy, around the phone; every other one is a faint solid.
      const rows = banner ? [H * .08] : Array.from({ length: Math.ceil(H * .64 / (size * 1.05)) }, (_, k) => H * .36 + k * size * 1.05);
      return rect(bg) + rows.map((y, k) => k % 2 === 1 ? `<g opacity=".22">${outlineText(big, "condensed", -W * .05, y, W * 1.1, size * 1.15, size, accent, true)}</g>` : `<g stroke="${accent}" stroke-width="${n(W * .0045 / scale)}" opacity="${banner ? .35 : .85}">${outlineText(big, "condensed", -W * .05, y, W * 1.1, size * 1.15, size, "none", true)}</g>`).join("");
    }
    default:
      c.defs.push(`<radialGradient id="${uid}-top" cx=".5" cy="0" r=".9"><stop stop-color="${accent}" stop-opacity=".14"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>`);
      return rect(bg) + rect(`url(#${uid}-top)`);
  }
}

function context(doc: StoreDocument, W: number, H: number, uid: string): Ctx {
  const template = getStoreTemplate(doc.templateId)!;
  const [bg, fg, accent] = doc.colors;
  let counter = 0;
  return { uid, W, H, doc, template, bg, fg, accent, ink: template.background === "pop" ? bg : fg, defs: [`<filter id="${uid}-shadow" x="-30%" y="-20%" width="160%" height="140%"><feGaussianBlur stdDeviation="${n(W * .03)}"/></filter>`], next: () => counter++ };
}

function wrap(c: Ctx, body: string, label: string, watermark?: boolean) {
  const mark = watermark ? outlineText("Made with Kinetik", "rounded", 0, c.H - c.W * .07, c.W, c.W * .05, c.W * .024, c.ink, true).replace("<g ", `<g opacity=".7" `) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.W}" height="${c.H}" viewBox="0 0 ${c.W} ${c.H}" role="img" aria-label="${esc(label)}"><defs>${c.defs.join("")}</defs>${body}${mark}</svg>`;
}

/** Blueprint only: dimension lines along an upright phone and two leader callouts pointing into the screen. */
function callouts(c: Ctx, x: number, y: number, w: number, h: number) {
  if (c.template.background !== "blueprint") return "";
  const { W, H, accent, fg } = c, sw = n(W * .003), bottom = Math.min(y + h, H - W * .05), lx = x - W * .045, ty = y - W * .035;
  const tick = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" stroke="${accent}" stroke-width="${sw}"/>`;
  let svg = `<path d="M${n(lx)} ${n(y)}V${n(bottom)}M${n(x)} ${n(ty)}H${n(x + w)}" stroke="${accent}" stroke-width="${sw}" stroke-dasharray="${n(W * .012)} ${n(W * .008)}"/>` + tick(lx - W * .015, y, lx + W * .015, y) + tick(lx - W * .015, bottom, lx + W * .015, bottom) + tick(x, ty - W * .015, x, ty + W * .015) + tick(x + w, ty - W * .015, x + w, ty + W * .015);
  for (const [px, py, label] of [[.72, .24, .16], [.3, .56, .11]]) {
    const ax = x + w * px, ay = y + h * py, ex = Math.min(W - W * .2, x + w + W * .02);
    if (ay > H - W * .1) continue;
    svg += `<circle cx="${n(ax)}" cy="${n(ay)}" r="${n(W * .014)}" fill="none" stroke="${accent}" stroke-width="${sw}"/><circle cx="${n(ax)}" cy="${n(ay)}" r="${n(W * .005)}" fill="${accent}"/><path d="M${n(ax + W * .014)} ${n(ay)}L${n(ex)} ${n(ay - W * .06)}H${n(ex + W * .04)}" fill="none" stroke="${accent}" stroke-width="${sw}"/><rect x="${n(ex + W * .055)}" y="${n(ay - W * .072)}" width="${n(W * label)}" height="${n(W * .022)}" rx="${n(W * .011)}" fill="${fg}" opacity=".55"/><rect x="${n(ex + W * .055)}" y="${n(ay - W * .04)}" width="${n(W * label * .6)}" height="${n(W * .016)}" rx="${n(W * .008)}" fill="${fg}" opacity=".25"/>`;
  }
  return svg;
}

const titleFace = (doc: StoreDocument): OutlineFace => doc.font;
const bodyFace = (doc: StoreDocument): OutlineFace => doc.font === "serif" ? "serif" : "rounded";
const caps = (doc: StoreDocument, value: string) => doc.uppercase ? value.toLocaleUpperCase() : value;

/** One store screenshot (a page) rendered for iPhone or Android. Deterministic; no user markup is interpolated. */
export function storeSvg(doc: StoreDocument, index: number, platform: Exclude<StorePlatform, "banner">, media: StoreMedia = {}) {
  const page = doc.pages[index];
  if (!page) throw new Error("invalid_page");
  const { width: W, height: H } = STORE_SIZES[platform];
  const c = context(doc, W, H, media.uid ?? "s");
  const android = platform === "android", pad = W * .08, center = c.template.align === "center" || page.layout === "hero" || page.layout === "features";
  const screens = pageScreens(page, platform).map((screen) => screen === null ? "" : safeImage(media.screenUrls?.[screen]));
  const variant = (slot: number) => (pageScreens(page, platform)[slot] ?? index) + slot;
  let body = background(c, index, doc.pages.length, false, page.layout === "hero" ? media.appName || page.title : page.title.trim().split(/\s+/)[0] ?? "");
  const top = c.template.background === "editorial" ? H * .1 : H * (android ? .065 : .07);

  if (page.layout === "hero") {
    const icon = W * .2, ix = (W - icon) / 2, logo = safeImage(media.logoUrl), id = `${c.uid}-icon`;
    c.defs.push(`<clipPath id="${id}"><rect x="${n(ix)}" y="${n(top)}" width="${n(icon)}" height="${n(icon)}" rx="${n(icon * .23)}"/></clipPath>`);
    body += `<rect x="${n(ix)}" y="${n(top + icon * .06)}" width="${n(icon)}" height="${n(icon)}" rx="${n(icon * .23)}" fill="#000000" opacity=".22" filter="url(#${c.uid}-shadow)"/>` + (logo ? `<g clip-path="url(#${id})"><rect x="${n(ix)}" y="${n(top)}" width="${n(icon)}" height="${n(icon)}" fill="#ffffff"/><image href="${logo}" x="${n(ix)}" y="${n(top)}" width="${n(icon)}" height="${n(icon)}" preserveAspectRatio="xMidYMid slice"/></g>` : `<rect x="${n(ix)}" y="${n(top)}" width="${n(icon)}" height="${n(icon)}" rx="${n(icon * .23)}" fill="${c.template.background === "pop" ? c.fg : c.accent}"/>` + outlineText((media.appName || page.title || "A").trim().charAt(0).toLocaleUpperCase() || "A", titleFace(doc), ix, top + icon * .12, icon, icon * .76, icon * .62, c.template.background === "pop" ? c.accent : c.bg, true));
    const title = words(caps(doc, page.title), titleFace(doc), pad, top + icon + W * .06, W - pad * 2, W * .34, W * .115, c.ink, true);
    const sub = words(page.subtitle, bodyFace(doc), pad, title.bottom + W * .035, W - pad * 2, W * .2, W * .055, c.ink, true, .72);
    const deviceTop = Math.max(sub.bottom + W * .08, H * (android ? .42 : .4)), dw = W * .8;
    return wrap(c, body + title.svg + sub.svg + phone(c, { android, x: (W - dw) / 2, y: deviceTop, w: dw, image: screens[0], variant: variant(0) }), page.title, media.watermark);
  }

  const title = words(caps(doc, page.title), titleFace(doc), pad, top, W - pad * 2, W * .3, W * .09, c.ink, center);
  const sub = words(page.subtitle, bodyFace(doc), pad, title.bottom + W * .03, W - pad * 2, W * .19, W * .052, c.ink, center, .72);
  // Aurora sets the copy on a frosted panel so it stays legible over the halos.
  if (c.template.background === "aurora" && (page.title.trim() || page.subtitle.trim())) body += `<rect x="${n(pad - W * .045)}" y="${n(top - W * .045)}" width="${n(W - pad * 2 + W * .09)}" height="${n(sub.bottom - top + W * .09)}" rx="${n(W * .06)}" fill="#ffffff" fill-opacity=".42" stroke="#ffffff" stroke-opacity=".8" stroke-width="${n(W * .003)}"/>`;
  body += title.svg + sub.svg;
  const areaTop = Math.max(sub.bottom + W * .08, H * .27), area = H - areaTop, ratio = android ? .48 : .49;

  if (page.layout === "features") {
    const items = page.items.filter((item) => item.trim()), pop = c.template.background === "pop";
    if (pop) c.defs.push(`<filter id="${c.uid}-card" x="-10%" y="-30%" width="120%" height="180%"><feDropShadow dx="0" dy="${n(W * .01)}" stdDeviation="${n(W * .02)}" flood-opacity=".12"/></filter>`);
    const cardH = W * .19, gap = W * .04, listH = items.length * cardH + Math.max(0, items.length - 1) * gap;
    let y = areaTop + Math.max(0, (area - listH) / 2 - W * .05);
    for (const item of items) {
      body += `<rect x="${n(pad)}" y="${n(y)}" width="${n(W - pad * 2)}" height="${n(cardH)}" rx="${n(W * .05)}" fill="${pop ? c.bg : mix(c.bg, c.ink, .08)}"${pop ? ` filter="url(#${c.uid}-card)"` : ""}/><circle cx="${n(pad + W * .1)}" cy="${n(y + cardH / 2)}" r="${n(W * .045)}" fill="${c.accent}"/><path d="M${n(pad + W * .08)} ${n(y + cardH / 2)}l${n(W * .015)} ${n(W * .015)}l${n(W * .028)} -${n(W * .03)}" fill="none" stroke="${c.bg}" stroke-width="${n(W * .011)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      body += words(item, bodyFace(doc), pad + W * .19, y + cardH / 2 - W * .036, W - pad * 2 - W * .23, W * .1, W * .05, pop ? c.fg : c.ink, false).svg;
      y += cardH + gap;
    }
    return wrap(c, body, page.title, media.watermark);
  }

  if (page.layout === "duo") {
    const front = Math.min(W * .6, area * 1.02 * ratio), back = front * .92;
    body += phone(c, { android, x: W * .05, y: areaTop + W * .1, w: back, rotate: -7, image: screens[1], variant: variant(1) });
    body += phone(c, { android, x: W * .95 - front, y: areaTop, w: front, rotate: 5, image: screens[0], variant: variant(0) });
    return wrap(c, body, page.title, media.watermark);
  }

  const devicePages = doc.pages.slice(0, index).filter((item) => item.layout === "device").length;
  const placement: DevicePlacement = c.template.placements[devicePages % c.template.placements.length];
  if (placement === "float") {
    const dw = Math.min(W * .64, area * .9 * ratio), x = (W - dw) / 2, y = areaTop + (area - dw / ratio) / 2 - W * .02;
    body += phone(c, { android, x, y, w: dw, image: screens[0], variant: variant(0) }) + callouts(c, x, y, dw, dw / ratio);
  } else if (placement === "zoom") {
    const dw = W * 1.18;
    body += phone(c, { android, x: (W - dw) / 2 + W * .12, y: areaTop - W * .02, w: dw, rotate: -11, image: screens[0], variant: variant(0) });
  } else {
    const dw = Math.min(W * .8, area * 1.08 * ratio);
    const x = placement === "right" ? W - dw * .9 : (W - dw) / 2 + (placement === "tilt" ? W * .03 : 0);
    body += phone(c, { android, x, y: areaTop, w: dw, rotate: placement === "tilt" ? -7 : placement === "right" ? 4 : 0, image: screens[0], variant: variant(0) });
    if (placement === "center") body += callouts(c, x, areaTop, dw, dw / ratio);
  }
  return wrap(c, body, page.title, media.watermark);
}

/** Google Play feature graphic: icon, name and tagline on the left, an Android phone on the right. */
export function storeBannerSvg(doc: StoreDocument, media: StoreMedia = {}) {
  const { width: W, height: H } = STORE_SIZES.banner;
  const c = context(doc, W, H, media.uid ?? "b");
  const first = doc.pages.find((page) => page.layout !== "features") ?? doc.pages[0];
  const screen = pageScreens(first, "android")[0];
  const image = screen === null ? "" : safeImage(media.screenUrls?.[screen]);
  const logo = safeImage(media.logoUrl), icon = 104, id = `${c.uid}-icon`;
  c.defs.push(`<clipPath id="${id}"><rect x="64" y="72" width="${icon}" height="${icon}" rx="${icon * .23}"/></clipPath>`);
  const ink = c.template.background === "pop" ? c.fg : c.ink;
  let body = background(c, 0, 1, true, doc.banner.title);
  body += logo ? `<g clip-path="url(#${id})"><rect x="64" y="72" width="${icon}" height="${icon}" fill="#ffffff"/><image href="${logo}" x="64" y="72" width="${icon}" height="${icon}" preserveAspectRatio="xMidYMid slice"/></g>` : `<rect x="64" y="72" width="${icon}" height="${icon}" rx="${icon * .23}" fill="${c.template.background === "pop" ? c.bg : c.accent}"/>` + outlineText((media.appName || doc.banner.title || "A").trim().charAt(0).toLocaleUpperCase() || "A", titleFace(doc), 64, 84, icon, icon * .76, icon * .62, c.template.background === "pop" ? c.accent : c.bg, true);
  const title = words(caps(doc, doc.banner.title), titleFace(doc), 64, 204, 560, 130, 70, c.template.background === "pop" ? c.bg : ink, false);
  body += title.svg + words(doc.banner.subtitle, bodyFace(doc), 64, title.bottom + 16, 540, 90, 30, c.template.background === "pop" ? c.bg : ink, false, .78).svg;
  body += phone(c, { android: true, x: 700, y: 64, w: 250, rotate: -8, image, variant: 0 });
  return wrap(c, body, doc.banner.title, media.watermark);
}

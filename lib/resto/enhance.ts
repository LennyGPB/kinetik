import "server-only";
import sharp, { type Sharp } from "sharp";

/**
 * Amélioration des photos de plats, sans service externe (option A) :
 * lumière jaune corrigée, couleurs et netteté relevées, fond flouté autour du plat (approximatif : une ellipse adoucie),
 * et disque de l'assiette redressé pour Table 3D. Le plat lui-même n'est jamais retouché au-delà de la lumière.
 */

export type Box = { x: number; y: number; w: number; h: number };
export type Ellipse = { cx: number; cy: number; rx: number; ry: number; angle: number };

const MAX = 1800;

/** Correction partielle « monde gris » : enlève l'essentiel d'une dominante jaune ou bleue sans tout neutraliser. */
async function balanceGains(image: Sharp) {
  const { channels } = await image.clone().stats();
  const [r, g, b] = channels.map((c) => Math.max(1, c.mean));
  const gray = (r + g + b) / 3;
  const soften = (gain: number) => Math.min(1.25, Math.max(0.8, 1 + (gain - 1) * 0.6));
  return [soften(gray / r), soften(gray / g), soften(gray / b)] as const;
}

/** Ellipse adoucie (alpha) qui garde le plat net : blanche dans la boîte, fondu vers l'extérieur. */
function maskSvg(width: number, height: number, box: Box) {
  const cx = (box.x + box.w / 2) * width, cy = (box.y + box.h / 2) * height;
  const rx = (box.w / 2) * width * 1.18, ry = (box.h / 2) * height * 1.18;
  const feather = Math.max(12, Math.min(width, height) * 0.06);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${feather}"/></filter></defs><rect width="100%" height="100%" fill="black"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white" filter="url(#f)"/></svg>`);
}

export async function enhanceDishPhoto(input: Buffer, box: Box | null) {
  const base = sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true });
  const gains = await balanceGains(base);
  const corrected = await base.clone().linear([...gains], [0, 0, 0]).modulate({ saturation: 1.07, brightness: 1.02 }).sharpen({ sigma: 0.6 }).removeAlpha().toBuffer({ resolveWithObject: true });
  const { width, height } = corrected.info;
  let out = sharp(corrected.data);
  // Fond flouté seulement si le plat a été repéré et n'occupe pas déjà toute la photo
  if (box && box.w * box.h < 0.75) {
    const blurred = await sharp(corrected.data).blur(Math.max(6, Math.min(width, height) * 0.012)).modulate({ brightness: 0.96 }).toBuffer();
    const alpha = await sharp(maskSvg(width, height, box)).extractChannel(0).toBuffer();
    const sharpDish = await sharp(corrected.data).joinChannel(alpha).png().toBuffer();
    out = sharp(blurred).composite([{ input: sharpDish }]);
  }
  const data = await out.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return { data, width, height, gains };
}

/**
 * Assiette redressée en disque (Table 3D) : l'ellipse vue en perspective devient un cercle vu de dessus.
 * Renvoie null si l'assiette sort trop du cadre (le disque serait tronqué).
 */
export async function plateDisc(input: Buffer, e: Ellipse, size = 1400) {
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const cx = e.cx * W, cy = e.cy * H, rx = e.rx * W, ry = e.ry * H, ca = Math.cos(e.angle), sa = Math.sin(e.angle);
  // Part du contour hors image : au-delà de 6 %, on renonce
  let outside = 0;
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2, x = cx + rx * Math.cos(t) * ca - ry * Math.sin(t) * sa, y = cy + rx * Math.cos(t) * sa + ry * Math.sin(t) * ca;
    if (x < -2 || y < -2 || x > W + 2 || y > H + 2) outside++;
  }
  if (outside / 64 > 0.06 || rx < 20 || ry < 20) return null;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1, r = Math.hypot(u, v);
    const px = cx + u * rx * ca - v * ry * sa, py = cy + u * rx * sa + v * ry * ca;
    const ix = Math.min(W - 1, Math.max(0, Math.round(px))), iy = Math.min(H - 1, Math.max(0, Math.round(py)));
    const o = (y * size + x) * 4, i = (iy * W + ix) * 3;
    out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2];
    out[o + 3] = Math.round(255 * Math.max(0, Math.min(1, (1 - r) / 0.008)));
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}

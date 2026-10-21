import { CanvasTexture, SRGBColorSpace } from "three";
import type { ScreenContent } from "../../config/stage-motion";
import type { VideoProps } from "../props";
import { luminance } from "./theme";

/**
 * Contenu des écrans du plateau 3D (Stage), peint dans un canvas 2D puis posé en texture sur l'appareil.
 * Une capture est toujours affichée en entier (contain), jamais recadrée ni déformée : les bandes prennent la couleur de son bord.
 * Aucun chiffre ni texte inventé : la maquette de repli n'est faite que de formes.
 */

type Palette = VideoProps["palette"];
export type ScreenCamera = "island" | "notch" | "hole" | undefined;

export function contentKey(content: ScreenContent) {
  return content.kind === "image" ? `image:${content.src}` : content.kind === "mock" ? `mock:${content.variant % 3}` : "splash";
}

/** Charge une image pour la peindre ; null si elle échoue (la maquette prend le relais). */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    if (!src.startsWith("data:") && !src.startsWith("/")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

type PaintInput = {
  content: ScreenContent;
  /** Proportions de l'écran (largeur / hauteur) */
  aspect: number;
  camera: ScreenCamera;
  palette: Palette;
  appName: string;
  font: string;
  images: Map<string, HTMLImageElement | null>;
  logo: HTMLImageElement | null;
};

export function paintScreen({ content, aspect, camera, palette, appName, font, images, logo }: PaintInput) {
  // 2048 px : net en gros plan ; les zones mises en avant ont en plus leur capture en pleine résolution (stage3d.tsx)
  const long = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(aspect >= 1 ? long : long * aspect);
  canvas.height = Math.round(aspect >= 1 ? long / aspect : long);
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const image = content.kind === "image" ? images.get(content.src) : null;
  if (image) paintImage(ctx, image, w, h);
  else if (content.kind === "splash") paintSplash(ctx, w, h, palette, appName, font, logo);
  else paintMock(ctx, w, h, palette, content.kind === "mock" ? content.variant : 0);
  if (aspect < 1) paintCamera(ctx, w, h, camera);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function paintImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, w: number, h: number) {
  const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
  const dw = Math.min(w, h * ratio), dh = dw / ratio;
  ctx.fillStyle = edgeColor(image) ?? "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Couleur du coin haut gauche de la capture, pour prolonger son fond dans les bandes ; null si l'image est protégée. */
function edgeColor(image: HTMLImageElement) {
  try {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const ctx = probe.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r} ${g} ${b})`;
  } catch {
    return null;
  }
}

/** Écran d'accueil : fond aux couleurs de la marque, logo (ou initiale) et nom de l'app. */
function paintSplash(ctx: CanvasRenderingContext2D, w: number, h: number, [bg, main, accent]: Palette, appName: string, font: string, logo: HTMLImageElement | null) {
  const base = luminance(bg) > 0.6 ? "#101014" : bg;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.75);
  glow.addColorStop(0, withAlpha(accent, 0.55));
  glow.addColorStop(0.45, withAlpha(main, 0.16));
  glow.addColorStop(1, withAlpha(base, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const s = Math.min(w, h);
  const tile = s * 0.4;
  const cx = w / 2, cy = h * (w < h ? 0.42 : 0.4);
  if (logo) {
    const ratio = logo.naturalWidth / Math.max(1, logo.naturalHeight);
    const lw = Math.min(tile, tile * ratio), lh = lw / ratio;
    ctx.drawImage(logo, cx - lw / 2, cy - lh / 2, lw, lh);
  } else {
    roundRect(ctx, cx - tile / 2, cy - tile / 2, tile, tile, tile * 0.24);
    const fill = ctx.createLinearGradient(cx - tile / 2, cy - tile / 2, cx + tile / 2, cy + tile / 2);
    fill.addColorStop(0, main);
    fill.addColorStop(1, accent);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = luminance(main) > 0.6 ? "#111111" : "#ffffff";
    ctx.font = `700 ${tile * 0.52}px ${font}, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(appName.slice(0, 1).toUpperCase(), cx, cy + tile * 0.03);
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = s * 0.11;
  ctx.font = `700 ${size}px ${font}, sans-serif`;
  while (ctx.measureText(appName).width > w * 0.8 && size > 8) {
    size *= 0.92;
    ctx.font = `700 ${size}px ${font}, sans-serif`;
  }
  ctx.fillText(appName, cx, cy + tile * 0.5 + size * 1.3);
}

/** Maquette d'interface sans texte (si aucune capture n'est fournie). */
function paintMock(ctx: CanvasRenderingContext2D, w: number, h: number, [, rawMain, rawAccent]: Palette, variant: number) {
  const main = luminance(rawMain) > 0.8 ? "#24242c" : rawMain;
  const accent = luminance(rawAccent) > 0.8 ? main : rawAccent;
  const s = w / 100;
  ctx.fillStyle = "#f4f4f8";
  ctx.fillRect(0, 0, w, h);
  const line = (x: number, y: number, lw: number, lh = 2.2, color = "#e2e2ea") => { roundRect(ctx, x, y, lw, lh * s, lh * s / 2); ctx.fillStyle = color; ctx.fill(); };
  const card = (x: number, y: number, cw: number, ch: number) => { roundRect(ctx, x, y, cw, ch, 4 * s); ctx.fillStyle = "#ffffff"; ctx.fill(); };
  const pad = 6 * s;
  let y = Math.max(14 * s, h * 0.07);
  line(pad, y, 34 * s, 5, "#15151c");
  ctx.beginPath(); ctx.arc(w - pad - 4.5 * s, y + 2.5 * s, 4.5 * s, 0, Math.PI * 2);
  const avatar = ctx.createLinearGradient(w - pad - 9 * s, y, w - pad, y + 9 * s); avatar.addColorStop(0, main); avatar.addColorStop(1, accent);
  ctx.fillStyle = avatar; ctx.fill();
  y += 12 * s;
  const inner = w - pad * 2;
  switch (variant % 3) {
    case 0:
      for (let i = 0; y + 20 * s < h - pad; i++) {
        card(pad, y, inner, 18 * s);
        roundRect(ctx, pad + 4 * s, y + 4 * s, 10 * s, 10 * s, 3 * s); ctx.fillStyle = i % 2 ? accent : main; ctx.fill();
        line(pad + 18 * s, y + 5 * s, (60 - (i % 4) * 7) * s, 2.4, "#2a2a35");
        line(pad + 18 * s, y + 10 * s, (40 + (i % 3) * 8) * s);
        y += 22 * s;
      }
      break;
    case 1: {
      const half = (inner - 3 * s) / 2;
      [main, accent].forEach((color, i) => { card(pad + i * (half + 3 * s), y, half, 20 * s); line(pad + i * (half + 3 * s) + 4 * s, y + 5 * s, half * 0.5); roundRect(ctx, pad + i * (half + 3 * s) + 4 * s, y + 11 * s, half * 0.6, 5 * s, 2.5 * s); ctx.fillStyle = color; ctx.fill(); });
      y += 24 * s;
      const chartH = Math.min(70 * s, h * 0.35);
      card(pad, y, inner, chartH);
      const bars = [40, 65, 50, 85, 60, 95, 75];
      const bw = (inner - 8 * s) / bars.length;
      bars.forEach((v, i) => { const bh = (chartH - 10 * s) * v / 100; roundRect(ctx, pad + 4 * s + i * bw + bw * 0.15, y + chartH - 5 * s - bh, bw * 0.7, bh, 1.5 * s); ctx.fillStyle = i === 5 ? accent : withAlpha(main, 0.75); ctx.fill(); });
      y += chartH + 4 * s;
      while (y + 16 * s < h - pad) { card(pad, y, inner, 14 * s); line(pad + 4 * s, y + 4 * s, inner * 0.7, 2.4, "#2a2a35"); line(pad + 4 * s, y + 8.5 * s, inner * 0.45); y += 18 * s; }
      break;
    }
    default: {
      const heroH = Math.min(70 * s, h * 0.38);
      roundRect(ctx, pad, y, inner, heroH, 5 * s);
      const hero = ctx.createLinearGradient(pad, y, pad + inner, y + heroH); hero.addColorStop(0, main); hero.addColorStop(1, accent);
      ctx.fillStyle = hero; ctx.fill();
      y += heroH + 6 * s;
      line(pad, y, inner * 0.75, 3.2, "#2a2a35"); y += 7 * s;
      line(pad, y, inner * 0.9); y += 5 * s;
      line(pad, y, inner * 0.6); y += 9 * s;
      roundRect(ctx, pad, y, inner, 12 * s, 6 * s); ctx.fillStyle = main; ctx.fill();
      line(pad + inner * 0.33, y + 4.9 * s, inner * 0.34, 2.2, "rgba(255,255,255,0.85)");
    }
  }
}

/** Îlot, encoche ou poinçon de la caméra frontale, peints sur l'écran. */
function paintCamera(ctx: CanvasRenderingContext2D, w: number, h: number, camera: ScreenCamera) {
  ctx.fillStyle = "#000000";
  if (camera === "island") roundRect(ctx, w * 0.35, h * 0.014, w * 0.3, w * 0.085, w * 0.0425);
  else if (camera === "notch") roundRect(ctx, w * 0.27, -w * 0.05, w * 0.46, w * 0.115, w * 0.05);
  else if (camera === "hole") { ctx.beginPath(); ctx.arc(w / 2, h * 0.018 + w * 0.022, w * 0.022, 0, Math.PI * 2); }
  else return;
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function withAlpha(hex: string, alpha: number) {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return `rgba(255,255,255,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

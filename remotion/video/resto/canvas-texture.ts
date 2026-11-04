// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import { use } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * Texture dessinée sur canvas (faces de carte, chevalet…) une fois polices et images chargées.
 * Elle « suspend » comme useLoader : ThreeCanvas attend qu'elle soit prête AVANT de dessiner l'image.
 * Indispensable : sans ça, la première image d'un rendu qui ne commence pas à 0 (image fixe, tronçon Lambda)
 * sortirait sans texture, la scène n'étant redessinée qu'au changement d'image.
 * La clé doit couvrir tout ce qui change le dessin.
 */
const cache = new Map<string, Promise<CanvasTexture>>();

function loadImage(url: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  return img.decode().then(() => img);
}

export function useCanvasTexture(
  key: string,
  width: number,
  height: number,
  fonts: string[],
  urls: string[],
  draw: (ctx: CanvasRenderingContext2D, images: (HTMLImageElement | null)[]) => void,
  color = true,
): CanvasTexture {
  let promise = cache.get(key);
  if (!promise) {
    promise = Promise.all([
      Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => []))),
      Promise.all(urls.map((u) => loadImage(u).catch(() => null))),
    ]).then(([, images]) => {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext("2d")!, images);
      const texture = new CanvasTexture(canvas);
      if (color) texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 8;
      return texture;
    });
    cache.set(key, promise);
  }
  return use(promise);
}

import type { ReactNode } from "react";
import { AbsoluteFill, random } from "remotion";

/**
 * Glitch numérique appliqué à tout le contenu d'une scène (textes, mockups, logo) — utilisé par la caméra « glitch »
 * et par la transition « glitch ». Déterministe : tout dépend de la frame et d'une graine.
 *
 * - Séparation RGB : deux ombres colorées (rouge / cyan) décalées, qui suivent la forme de chaque élément.
 * - Tranches : le contenu est redessiné dans quelques bandes horizontales décalées latéralement (déchirure d'image).
 * Les copies ne sont rendues que pendant un sursaut (quelques images), le coût reste faible.
 */
export function GlitchSlices({ intensity, frame, seed, unit, children }: { intensity: number; frame: number; seed: string; unit: number; children: ReactNode }) {
  const split = unit * (0.25 + intensity * 1.6);
  const chroma = `drop-shadow(${split}px 0 0 rgb(255 0 70 / 0.75)) drop-shadow(${-split}px 0 0 rgb(0 235 255 / 0.75))`;
  if (intensity < 0.05) return <AbsoluteFill style={{ filter: chroma }}>{children}</AbsoluteFill>;

  const r = (k: string) => random(`${seed}-${k}-${frame}`);
  const slices = Array.from({ length: 2 + Math.round(intensity * 3) }, (_, i) => {
    const top = r(`top-${i}`) * 92;
    const height = 2 + r(`h-${i}`) * 14 * intensity;
    return { top, bottom: Math.max(0, 100 - top - height), dx: (r(`dx-${i}`) - 0.5) * unit * 11 * intensity, hue: r(`hue-${i}`) > 0.6 };
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: chroma, transform: `translateX(${(r("base") - 0.5) * unit * 2 * intensity}px)` }}>{children}</AbsoluteFill>
      {slices.map((s, i) => (
        <AbsoluteFill
          key={i}
          aria-hidden
          style={{
            clipPath: `inset(${s.top}% 0 ${s.bottom}% 0)`,
            transform: `translateX(${s.dx}px)`,
            filter: s.hue ? `${chroma} hue-rotate(90deg) saturate(2)` : chroma,
          }}
        >
          {children}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
}

/**
 * Sursauts de glitch : dans chaque fenêtre de ~1,5 s, un sursaut de 3 à 6 images démarre à un instant tiré au sort.
 * Renvoie l'intensité (0 = calme, 1 = sursaut).
 */
export function glitchBurst(frame: number, seed: string) {
  const windowFrames = 45;
  const w = Math.floor(frame / windowFrames);
  const start = 8 + Math.floor(random(`gb-start-${seed}-${w}`) * 28);
  const length = 3 + Math.floor(random(`gb-len-${seed}-${w}`) * 4);
  const local = frame - w * windowFrames;
  if (local < start || local >= start + length) return 0;
  return 0.55 + random(`gb-int-${seed}-${frame}`) * 0.45;
}

import type { CSSProperties } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Cast (template `cast`) — affiche gris clair : un mot condensé très haut, gris anthracite, posé sur l'horizon, et sa
 * projection lumineuse couchée au sol en perspective (lettres renversées qui s'élargissent vers le spectateur).
 * La lumière tourne lentement : la projection pivote d'un côté à l'autre et s'allonge, sans jamais repartir d'un coup.
 */

/** Hauteur de l'horizon (fraction du cadre) selon le format. */
export const castHorizon = (aspectRatio: number) => (aspectRatio < 0.8 ? 0.56 : aspectRatio > 1.2 ? 0.6 : 0.58);

/** Orientation de la lumière au temps `t` (s) : inclinaison latérale (deg) et allongement (0 → 1), courbes continues. */
export function castLight(t: number) {
  return { skew: Math.sin(t * 0.5) * 16 + Math.sin(t * 0.17) * 6, stretch: 0.5 + 0.5 * Math.cos(t * 0.31) };
}

/**
 * Mot debout et sa projection. `rise` 0 → 1 : le mot sort du sol ; `time` pilote la lumière ; `side` : texte vertical
 * (petites capitales espacées) collé à gauche du mot, projeté avec lui. La taille vient de `font-size` (style ou classe).
 */
export function CastTitle({ text, time, rise = 1, palette: [, main], fontFamily, side, sideFont, className, style }: {
  text: string; time: number; rise?: number; palette: [string, string, string]; fontFamily?: string; side?: string; sideFont?: string; className?: string; style?: CSSProperties;
}) {
  const { skew, stretch } = castLight(time);
  const word = text.toUpperCase();
  const r = Math.max(0, Math.min(1, rise));
  const sideText = side && <span style={{ position: "absolute", right: "100%", bottom: "0.02em", marginRight: "0.06em", writingMode: "vertical-rl", transform: "rotate(180deg)", fontFamily: sideFont, fontSize: "0.075em", fontWeight: 600, letterSpacing: "0.32em", whiteSpace: "nowrap", lineHeight: 1 }}>{side}</span>;
  const glyphs = (color: string) => <span style={{ position: "relative", display: "block", fontFamily, lineHeight: 0.84, letterSpacing: "-0.005em", whiteSpace: "nowrap", color }}>{sideText && <span style={{ color }}>{sideText}</span>}{word}</span>;
  return <div className={className} style={{ position: "relative", display: "inline-block", ...style }}>
    {/* Le mot sort du sol : boîte coupée à l'horizon, contenu qui monte */}
    <div style={{ clipPath: "inset(-20% -60% 0 -60%)", paddingTop: "0.05em" }}>
      <div style={{ transform: `translateY(${((1 - r) * 105).toFixed(2)}%)`, filter: `drop-shadow(0 0.02em 0.015em rgba(0,0,0,${(0.35 * r).toFixed(2)}))` }}>{glyphs(main)}</div>
    </div>
    {/* Ombre de contact à la base */}
    <div style={{ position: "absolute", left: "-4%", right: "-4%", top: "100%", height: "0.06em", marginTop: "-0.03em", background: "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.38), transparent 75%)", opacity: r }} />
    {/* Projection : copie renversée, couchée au sol vers le spectateur, inclinée par la lumière */}
    <div style={{ position: "absolute", left: 0, right: 0, top: "100%", perspective: "1.6em", perspectiveOrigin: "50% 0%", pointerEvents: "none" }}>
      <div style={{ transformOrigin: "50% 0%", transform: `rotateX(${(58 + stretch * 10).toFixed(2)}deg) skewX(${skew.toFixed(2)}deg) scaleY(${(r * (0.9 + stretch * 0.25)).toFixed(3)})`, opacity: 0.92 * r }}>
        <div style={{ transform: "scaleY(-1)", filter: "blur(0.012em)", WebkitMaskImage: "linear-gradient(0deg, #000 10%, rgba(0,0,0,0.15) 100%)", maskImage: "linear-gradient(0deg, #000 10%, rgba(0,0,0,0.15) 100%)" }}>
          {glyphs("rgba(255,255,255,0.95)")}
        </div>
      </div>
    </div>
  </div>;
}

/** Fond : studio gris clair, horizon doux, sol légèrement plus sombre qui s'éclaircit vers le spectateur, halo qui suit la lumière. */
export function CastBackdrop({ palette: [bg, main], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const horizon = castHorizon(aspectRatio) * 100;
  const { skew } = castLight(Math.max(0, time));
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 55% at ${50 - skew * 0.8}% ${horizon - 22}%, #FFFFFF, transparent 70%)` }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: `${horizon}%`, bottom: 0, background: `linear-gradient(180deg, color-mix(in srgb, ${main} 16%, ${bg}), color-mix(in srgb, ${main} 6%, ${bg}) 45%, ${bg})` }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: `${horizon}%`, height: 1, background: `color-mix(in srgb, ${main} 22%, transparent)` }} />
    <NoiseGrain seed={14} opacity={0.08} />
  </div>;
}

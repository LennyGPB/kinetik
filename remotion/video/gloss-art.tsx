import React, { type CSSProperties } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Gloss (template `gloss`) — affiche noire : en bas, un liquide chromé rose et blanc qui ondule et monte en colonne jusqu'au mot ;
 * le mot, très condensé, en contour rose lumineux rempli de noir, comme posé à la surface du liquide.
 * Mouvement continu (sommes de sinus), jamais de saut. Fond aux proportions du cadre ; titre en em.
 */

/** Surface du liquide : hauteur (0 = haut du cadre, 1 = bas) en x ∈ [0, 1], au temps `t`. `rise` ∈ [0, 1] : la colonne centrale monte. */
function surface(x: number, t: number, rise: number, top: number) {
  const center = Math.exp(-(((x - 0.5) / 0.13) ** 2));
  const shoulders = Math.exp(-(((x - 0.5) / 0.32) ** 2));
  const waves = Math.sin(x * 7 + t * 0.9) * 0.025 + Math.sin(x * 13 - t * 1.3) * 0.012;
  // Bords relevés (comme sur l'affiche), creux de part et d'autre de la colonne, colonne qui rejoint le mot
  const edge = (Math.abs(x - 0.5) * 2) ** 3 * 0.22;
  // Au centre, la colonne atteint exactement `top` (bas du mot) quand rise = 1
  return 0.78 - edge + 0.08 * shoulders - (0.86 - top) * center * rise + waves * (1 - center * 0.8);
}

/** Fond : noir, liquide chromé en bas (dégradé rose → blanc, reflets en bandes), grain. `top` : hauteur atteinte par la colonne. */
export function GlossBackdrop({ palette: [bg, main, accent], time, aspectRatio, top = 0.56 }: { palette: [string, string, string]; time: number; aspectRatio: number; top?: number }) {
  const id = `gloss-${React.useId().replace(/[^\w-]/g, "")}`;
  const W = 1000, H = W / aspectRatio;
  const t = Math.max(0, time);
  const rise = 0.97 + Math.sin(t * 0.8) * 0.03;
  const path = (offset: number, scale = 1) => {
    const pts = Array.from({ length: 121 }, (_, i) => { const x = i / 120; return `${(x * W).toFixed(1)} ${((surface(x, t + offset, rise * scale, top) + offset * 0.05) * H).toFixed(1)}`; });
    return `M0 ${H}L${pts.join("L")}L${W} ${H}Z`;
  };
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={accent} /><stop offset="0.35" stopColor={`color-mix(in srgb, ${accent}, white 55%)`} /><stop offset="0.6" stopColor={accent} /><stop offset="1" stopColor={`color-mix(in srgb, ${accent}, ${bg} 45%)`} />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={bg} stopOpacity="0.55" /><stop offset="0.3" stopColor={bg} stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.35" /><stop offset="0.7" stopColor={bg} stopOpacity="0" /><stop offset="1" stopColor={bg} stopOpacity="0.55" />
        </linearGradient>
        <filter id={`${id}-soft`}><feGaussianBlur stdDeviation={W * 0.006} /></filter>
      </defs>
      {/* Couches successives du liquide : chacune un peu plus basse et plus claire, effet chromé */}
      <g filter={`url(#${id}-soft)`}>
        <path d={path(0)} fill={`url(#${id}-body)`} />
        <path d={path(0.6, 0.85)} fill={`color-mix(in srgb, ${accent}, ${bg} 40%)`} opacity="0.8" />
        <path d={path(1.2, 0.7)} fill={`color-mix(in srgb, ${main}, ${accent} 30%)`} opacity="0.85" />
        <path d={path(1.9, 0.55)} fill={`url(#${id}-body)`} opacity="0.9" />
        <path d={path(2.6, 0.4)} fill={`color-mix(in srgb, ${main}, ${accent} 15%)`} opacity="0.75" />
        {/* Reflets chromés : liserés blancs le long de la surface */}
        <path d={path(0)} fill="none" stroke={main} strokeWidth={W * 0.006} opacity="0.8" />
        <path d={path(1.2, 0.7)} fill="none" stroke={main} strokeWidth={W * 0.004} opacity="0.6" />
      </g>
      <rect width={W} height={H} fill={`url(#${id}-shade)`} style={{ mixBlendMode: "soft-light" }} />
    </svg>
    <NoiseGrain seed={21} opacity={0.14} />
  </div>;
}

/** Mot en contour rose lumineux, rempli de la couleur du fond. `enter` de 0 (absent, flou) à 1. */
export function GlossTitle({ text, enter = 1, palette: [bg, main, accent], fontFamily, className, style }: { text: string; enter?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties }) {
  return <div className={className} style={{ display: "flex", justifyContent: "center", fontFamily, fontWeight: 400, lineHeight: 0.9, letterSpacing: "-0.01em", textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>
    <span style={{ color: bg, WebkitTextStroke: `0.035em color-mix(in srgb, ${accent}, ${main} 25%)`, transform: `scaleY(${1.15 + (1 - enter) * 0.2})`, transformOrigin: "50% 100%", opacity: Math.min(1, enter * 1.4), filter: `blur(${(1 - enter) * 0.05}em) drop-shadow(0 0 0.06em ${accent}) drop-shadow(0 0 0.18em color-mix(in srgb, ${accent}, transparent 40%))` }}>{text}</span>
  </div>;
}

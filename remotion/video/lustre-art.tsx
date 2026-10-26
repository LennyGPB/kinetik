import React, { type CSSProperties } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Lustre (template `lustre`) — affiche noire granuleuse : un mot en chrome liquide (rose vif et bleu glacé, reflets blancs),
 * aux lettres gonflées et déformées comme du métal fondu, entouré d'étincelles à quatre branches qui scintillent.
 * Le métal ondule en continu (champ de bruit déplacé sur une courbe sinusoïdale) et un reflet le balaie sur le tempo.
 * Le titre est un SVG de largeur fixe (1000 unités) : le filtre garde le même rendu dans tous les formats et la miniature.
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Bleu glacé du chrome, tiré vers la couleur principale (lavande) pour rester dans la palette. */
export const lustreIce = (main: string) => `color-mix(in srgb, #8FE9FF 72%, ${main})`;

/** Étincelle à quatre branches (rayon 1), branches fines et cœur pincé. */
export const SPARKLE_PATH = "M0 -1C0.09 -0.24 0.24 -0.09 1 0C0.24 0.09 0.09 0.24 0 1C-0.09 0.24 -0.24 0.09 -1 0C-0.24 -0.09 -0.09 -0.24 0 -1Z";

/** Scintillement continu (cloche, jamais de dent de scie) d'une étincelle `i` au temps `t`. */
export function twinkle(i: number, t: number) {
  return (0.5 + 0.5 * Math.cos(t * (1.6 + hash(i, 3) * 1.4) + hash(i, 4) * 6.28)) ** 2;
}

/**
 * Mot en chrome liquide. `time` en secondes ; `beat` = position sur le tempo (le reflet passe une fois par mesure) ;
 * `enter` 0 → 1 : le métal se gonfle depuis une flaque déformée ; `melt` 0 → 1 : il se liquéfie (sorties, transition).
 */
export function LustreTitle({ text, time, beat = time * 2, enter = 1, melt = 0, palette: [, main, accent], fontFamily, className, style }: {
  text: string; time: number; beat?: number; enter?: number; melt?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties;
}) {
  const id = `lustre-${React.useId().replace(/[^\w-]/g, "")}`;
  // Lignes : retour à la ligne entre les mots (3 lignes au plus), taille réglée sur la ligne la plus longue
  const lines = lustreLines(text);
  const longest = Math.max(1.5, ...lines.map((line) => [...line].length));
  const size = Math.min(300, 930 / (longest * 0.9), 480 / (lines.length * 1.14)), lead = size * 1.14;
  const H = size * 0.55 + lines.length * lead, base = size * 0.3 + lead * 0.82, mid = (base + base + (lines.length - 1) * lead) / 2;
  const ice = lustreIce(main);
  // Ondulation continue : le champ de bruit glisse sur un huit, l'amplitude respire légèrement
  const flowX = Math.sin(time * 0.55) * 60 + Math.sin(time * 0.23) * 30, flowY = Math.cos(time * 0.41) * 40;
  const swell = 1 - enter;
  const warp = size * (0.12 + 0.02 * Math.sin(time * 0.9) + swell * 0.35 + melt * 0.5);
  // Reflet : la lumière tourne autour du mot, une fois par mesure de quatre temps
  const azimuth = ((beat / 4) % 1) * 360;
  const inflate = 0.25 + 0.75 * Math.min(1, Math.max(0, enter));
  return <div className={className} style={{ width: "100%", ...style }}>
    <svg viewBox={`0 0 1000 ${H.toFixed(1)}`} width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
      <defs>
        {/* Mêmes bandes sur chaque ligne (dégradé répété toutes les hauteurs de ligne) */}
        <linearGradient id={`${id}-chrome`} gradientUnits="userSpaceOnUse" spreadMethod="repeat" x1="0" y1={base - size * 0.8} x2={lead * 0.18} y2={base - size * 0.8 + lead}>
          <stop offset="0" stopColor={ice} /><stop offset="0.22" stopColor="#FFFFFF" /><stop offset="0.36" stopColor={ice} />
          <stop offset="0.5" stopColor={accent} /><stop offset="0.6" stopColor={`color-mix(in srgb, ${accent}, #FFFFFF 35%)`} />
          <stop offset="0.72" stopColor={ice} /><stop offset="0.86" stopColor={accent} /><stop offset="1" stopColor={`color-mix(in srgb, ${accent}, #000 35%)`} />
        </linearGradient>
        <filter id={`${id}-liquid`} x="-15%" y="-40%" width="130%" height="180%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0032 0.0055" numOctaves="2" seed="9" result="noise" />
          <feOffset in="noise" dx={flowX} dy={flowY} result="flow" />
          <feDisplacementMap in="SourceGraphic" in2="flow" scale={warp} xChannelSelector="R" yChannelSelector="G" result="warped" />
          {/* Lettres gonflées : flou puis seuil (métal fondu aux bords arrondis) */}
          <feGaussianBlur in="warped" stdDeviation={size * 0.026} result="soft" />
          <feColorMatrix in="soft" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
          {/* Relief : la carte de hauteur adoucie éclaire le métal (reflet spéculaire qui tourne avec le tempo) */}
          <feGaussianBlur in="goo" stdDeviation={size * 0.05} result="height" />
          <feSpecularLighting in="height" surfaceScale={size * 0.06} specularConstant="1.25" specularExponent="22" lightingColor="#FFFFFF" result="spec">
            <feDistantLight azimuth={azimuth} elevation="48" />
          </feSpecularLighting>
          <feComposite in="spec" in2="goo" operator="in" result="shine" />
          {/* Liseré sombre dans le creux des bords, comme sur un chrome rose */}
          <feMorphology in="goo" operator="erode" radius={size * 0.014} result="inner" />
          <feComposite in="goo" in2="inner" operator="out" result="rimMask" />
          <feFlood floodColor={`color-mix(in srgb, ${accent}, #000 45%)`} floodOpacity="0.85" />
          <feComposite in2="rimMask" operator="in" result="rim" />
          {/* Lueur rose autour du métal */}
          <feGaussianBlur in="goo" stdDeviation={size * 0.09} result="haloSoft" />
          <feFlood floodColor={accent} floodOpacity="0.55" />
          <feComposite in2="haloSoft" operator="in" result="halo" />
          <feMerge><feMergeNode in="halo" /><feMergeNode in="goo" /><feMergeNode in="rim" /><feMergeNode in="shine" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${id}-liquid)`}>
        <g transform={`translate(500 ${mid}) scale(${1 + melt * 0.04} ${inflate * (1 + melt * 0.28)}) translate(-500 ${-mid})`}>
          <text x="500" y={base} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={size} letterSpacing={size * 0.02} fill={`url(#${id}-chrome)`} stroke={`url(#${id}-chrome)`} strokeWidth={size * 0.035} strokeLinejoin="round">{lines.map((line, i) => <tspan key={i} x="500" y={base + i * lead}>{line}</tspan>)}</text>
        </g>
      </g>
      {/* Étincelles autour du mot */}
      {[[50, 0.18, 0.16], [945, 0.1, 0.12], [900, 0.95, 0.17], [120, 1.02, 0.1], [520, -0.06, 0.08]].map(([x, y, r], i) => {
        const k = twinkle(i, time) * Math.min(1, enter * 1.5);
        return <g key={i} transform={`translate(${x} ${y * H}) rotate(${Math.sin(time * 0.4 + i) * 12}) scale(${size * r * (0.45 + 0.55 * k)})`} opacity={0.35 + 0.65 * k}>
          <path d={SPARKLE_PATH} fill={accent} style={{ filter: `drop-shadow(0 0 0.25px ${accent})` }} />
          <path d={SPARKLE_PATH} fill="#FFFFFF" transform="scale(0.45)" />
        </g>;
      })}
    </svg>
  </div>;
}

/** Fond : noir chaud, brume rose diffuse, poussières et rayures de pellicule qui dérivent lentement, grain. */
export function LustreBackdrop({ palette: [bg, , accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const W = 1000, H = W / aspectRatio, t = Math.max(0, time);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 45% at ${50 + Math.sin(t * 0.2) * 6}% 46%, color-mix(in srgb, ${accent} 16%, transparent), transparent 72%), radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.65))` }} />
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      {/* Poussières roses (dérive lente, aucune boucle visible) */}
      {Array.from({ length: 40 }, (_, i) => {
        const x = (hash(i, 1) * W + Math.sin(t * 0.07 + i) * 18), y = (hash(i, 2) * H + Math.cos(t * 0.05 + i) * 14);
        return <circle key={i} cx={x} cy={y} r={0.6 + hash(i, 3) * 1.6} fill={accent} opacity={0.12 + 0.3 * twinkle(i + 20, t)} />;
      })}
      {/* Rayures de pellicule */}
      {Array.from({ length: 5 }, (_, i) => {
        const x = hash(i, 7) * W + Math.sin(t * 0.3 + i * 2) * 8;
        return <line key={i} x1={x} y1={hash(i, 8) * H * 0.5} x2={x + (hash(i, 9) - 0.5) * 30} y2={hash(i, 8) * H * 0.5 + H * (0.15 + hash(i, 10) * 0.3)} stroke={accent} strokeWidth={0.8} opacity={0.08 + 0.1 * twinkle(i + 50, t)} />;
      })}
      {/* Étincelles lointaines */}
      {Array.from({ length: 6 }, (_, i) => {
        const k = twinkle(i + 80, t);
        return <path key={i} d={SPARKLE_PATH} fill={accent} opacity={0.25 + 0.5 * k} transform={`translate(${(0.08 + hash(i, 11) * 0.84) * W} ${(0.08 + hash(i, 12) * 0.84) * H}) scale(${6 + 10 * k})`} />;
      })}
    </svg>
    <NoiseGrain seed={33} opacity={0.22} />
  </div>;
}

/**
 * Découpe le titre en 1 à 3 lignes : parmi tous les découpages entre les mots, celui qui donne les plus grandes lettres
 * (limitées par la ligne la plus longue en largeur et par le nombre de lignes en hauteur).
 */
export function lustreLines(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text.trim()];
  const len = (parts: string[]) => Math.max(...parts.map((p) => [...p].length));
  const sizeOf = (parts: string[]) => Math.min(300, 930 / (Math.max(1.5, len(parts)) * 0.9), 480 / (parts.length * 1.14));
  // Pas de mot de deux lettres isolé sur sa ligne (« DE », « LE »)
  const lonely = (parts: string[]) => parts.length > 1 && parts.some((p) => [...p].length <= 2);
  let best = [words.join(" ")];
  const tryParts = (parts: string[]) => { if (!lonely(parts) && sizeOf(parts) > sizeOf(best) + 0.5) best = parts; };
  for (let i = 1; i < words.length; i++) {
    tryParts([words.slice(0, i).join(" "), words.slice(i).join(" ")]);
    for (let j = i + 1; j < words.length; j++) tryParts([words.slice(0, i).join(" "), words.slice(i, j).join(" "), words.slice(j).join(" ")]);
  }
  return best;
}

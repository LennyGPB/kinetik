import React, { type CSSProperties } from "react";
import { lustreLines } from "./lustre-art";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Thermal (template `thermal`) — affiche noire : un mot en perspective dont la face est noire cerclée de blanc, et dont
 * l'extrusion coule tout droit vers le bas du cadre en colonnes « caméra thermique » (bleu nuit, bleu, cyan, blanc, rouge).
 * Les bandes de chaleur descendent en continu le long des colonnes. Le titre est un SVG de largeur fixe (1000 unités).
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Échelle thermique tirée de la palette : bleu nuit, couleur principale, cyan, blanc, accent (point chaud). */
export function thermalScale([bg, main, accent]: [string, string, string]) {
  return {
    deep: `color-mix(in srgb, ${main} 45%, ${bg})`,
    main,
    cyan: `color-mix(in srgb, #6FF6FF 65%, ${main})`,
    hot: accent,
  };
}

/** Longueur de l'extrusion (unités du SVG, largeur 1000) : elle descend jusqu'au bas du cadre dans tous les formats. */
export const THERMAL_EXTRUDE = 1500;
/** Période des bandes de chaleur (unités) et vitesse de descente (unités / s). */
const PERIOD = 560, SPEED = 140;

/**
 * Mot thermique. `time` en secondes ; `pour` 0 → 1 : l'extrusion coule depuis la face ; `sink` 0 → 1 : le mot s'enfonce
 * dans sa propre coulée (sortie).
 */
export function ThermalTitle({ text, time, pour = 1, sink = 0, palette, fontFamily, className, style }: {
  text: string; time: number; pour?: number; sink?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties;
}) {
  const id = `thermal-${React.useId().replace(/[^\w-]/g, "")}`;
  const [bg] = palette;
  const { deep, main, cyan, hot } = thermalScale(palette);
  const lines = lustreLines(text.toUpperCase());
  const longest = Math.max(2, ...lines.map((line) => [...line].length));
  const size = Math.min(250, 860 / (longest * 0.74), 400 / lines.length), lead = size * 0.98;
  const faceY = 200 + (lines.length * lead) / 2, base = faceY - ((lines.length - 1) * lead) / 2 + size * 0.36;
  const V = faceY + (lines.length * lead) / 2 + THERMAL_EXTRUDE;
  // Extrusion : 10 décalages qui doublent (1, 2, 4… 512 pas), fusionnés en une coulée continue
  const step = (Math.max(0, Math.min(1, pour)) * THERMAL_EXTRUDE) / 1023;
  const region = { filterUnits: "userSpaceOnUse" as const, x: -300, y: -300, width: 1600, height: V + 600 };
  const chain = Array.from({ length: 10 }, (_, k) => <React.Fragment key={k}>
    <feOffset in={k ? `m${k - 1}` : "SourceGraphic"} dy={step * 2 ** k} result={`o${k}`} />
    <feMerge result={`m${k}`}><feMergeNode in={`o${k}`} /><feMergeNode in={k ? `m${k - 1}` : "SourceGraphic"} /></feMerge>
  </React.Fragment>);
  // Face posée sur un plan incliné (montée vers la droite)
  const face = (props: React.SVGProps<SVGTextElement>) => <g transform={`translate(500 ${faceY}) rotate(-15) skewX(-16) translate(-500 ${-faceY})`}>
    <text x="500" y={base} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={size} letterSpacing={size * 0.01} strokeLinejoin="round" {...props}>
      {lines.map((line, i) => <tspan key={i} x="500" y={base + i * lead}>{line}</tspan>)}
    </text>
  </g>;
  const flow = (time * SPEED) % PERIOD;
  const drop = sink * sink * V * 0.35;
  return <div className={className} style={{ width: "100%", ...style }}>
    <svg viewBox={`0 0 1000 ${V.toFixed(1)}`} width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
      <defs>
        <filter id={`${id}-x`} {...region} colorInterpolationFilters="sRGB">{chain}</filter>
        <filter id={`${id}-glow`} x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation={size * 0.035} /></filter>
        {/* Bandes de chaleur répétées, qui descendent le long des colonnes */}
        <linearGradient id={`${id}-bands`} gradientUnits="userSpaceOnUse" spreadMethod="repeat" x1="0" y1={flow} x2="0" y2={flow + PERIOD}>
          <stop offset="0" stopColor={deep} /><stop offset="0.2" stopColor={main} /><stop offset="0.34" stopColor={cyan} />
          <stop offset="0.43" stopColor="#FFFFFF" /><stop offset="0.5" stopColor={hot} /><stop offset="0.58" stopColor={cyan} />
          <stop offset="0.76" stopColor={main} /><stop offset="1" stopColor={deep} />
        </linearGradient>
        {/* Refroidissement vers le bas : la coulée s'assombrit loin de la face */}
        <linearGradient id={`${id}-cool`} gradientUnits="userSpaceOnUse" x1="0" y1={faceY} x2="0" y2={V}>
          <stop offset="0" stopColor={bg} stopOpacity="0" /><stop offset="0.55" stopColor={bg} stopOpacity="0.25" /><stop offset="1" stopColor={bg} stopOpacity="0.8" />
        </linearGradient>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={-300} y={-300} width={1600} height={V + 600}>
          <g filter={`url(#${id}-x)`}>{face({ fill: "#FFFFFF", stroke: "#FFFFFF", strokeWidth: size * 0.07 })}</g>
        </mask>
      </defs>
      <g transform={`translate(0 ${drop.toFixed(1)})`} opacity={1 - sink * 0.85}>
        <g mask={`url(#${id}-m)`}>
          <rect x={-300} y={-300} width={1600} height={V + 600} fill={`url(#${id}-bands)`} />
          {/* Intérieur des lettres plus sombre : seuls les bords brûlent */}
          <g filter={`url(#${id}-x)`} opacity={0.62}>{face({ fill: bg })}</g>
          <rect x={-300} y={-300} width={1600} height={V + 600} fill={`url(#${id}-cool)`} />
        </g>
        {/* Face : noire, cerclée de blanc, halo cyan */}
        <g filter={`url(#${id}-glow)`} opacity={0.8}>{face({ fill: "none", stroke: cyan, strokeWidth: size * 0.05 })}</g>
        {face({ fill: bg, stroke: "#FFFFFF", strokeWidth: size * 0.022 })}
      </g>
    </svg>
  </div>;
}

/** Fond : noir profond, lueur froide au sol, réticules dans les coins et grain. */
export function ThermalBackdrop({ palette, time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const [bg] = palette;
  const { main, hot } = thermalScale(palette);
  const W = 1000, H = W / aspectRatio, t = Math.max(0, time);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 40% at 50% 100%, color-mix(in srgb, ${main} 22%, transparent), transparent 70%), radial-gradient(40% 25% at ${50 + Math.sin(t * 0.3) * 8}% 30%, color-mix(in srgb, ${hot} 7%, transparent), transparent 70%)` }} />
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      {/* Poussières froides qui scintillent en cloche */}
      {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={hash(i, 1) * W} cy={hash(i, 2) * H} r={0.6 + hash(i, 3) * 1.2} fill="#FFFFFF" opacity={0.06 + 0.18 * (0.5 + 0.5 * Math.cos(t * (0.8 + hash(i, 4)) + i)) ** 2} />)}
    </svg>
    <NoiseGrain seed={21} opacity={0.18} />
  </div>;
}

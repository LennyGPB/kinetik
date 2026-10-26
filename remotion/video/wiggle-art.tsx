import React, { type CSSProperties } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Wiggle (template `wiggle`) — affiche anthracite : titre en grosses lettres dessinées à la main, première ligne orange
 * hachurée de jaune, lignes suivantes blanches, contour sombre épais décalé et trait de craie. Les bords bouillonnent en
 * continu (champ de bruit qui glisse) et chaque lettre se dandine avec sa propre phase. SVG de largeur fixe (1000 unités).
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Découpe : un mot par ligne si possible (2 ou 3 lignes), sinon tout sur une ligne. */
export function wiggleLines(text: string) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words.length ? words : [""];
  if (words.length <= 3) return words;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/**
 * Titre dessiné. `time` (s) fait bouillonner le trait et dandiner les lettres ; `enter` 0 → 1 : les lettres sautent en
 * place une à une (le ressort est appliqué par lettre ici) ; `leave` 0 → 1 : elles s'écrasent et disparaissent.
 */
export function WiggleTitle({ text, time, enter = 1, leave = 0, palette: [, main, accent], fontFamily, className, style }: {
  text: string; time: number; enter?: number; leave?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties;
}) {
  const id = `wiggle-${React.useId().replace(/[^\w-]/g, "")}`;
  const lines = wiggleLines(text);
  const sizes = lines.map((line) => Math.min(230, 900 / (Math.max(3, [...line].length) * 0.7)));
  const gap = 18;
  const tops = sizes.reduce<number[]>((acc, s, i) => [...acc, i ? acc[i - 1] + sizes[i - 1] * 0.92 + gap : 40], []);
  const H = tops[tops.length - 1] + sizes[sizes.length - 1] * 0.92 + 60;
  const ink = "#0E0D0C";
  const sun = `color-mix(in srgb, ${accent} 45%, #FFE45C)`;
  // Bouillonnement continu : le bruit glisse sur une courbe fermée, sans saut
  const bx = Math.sin(time * 2.1) * 30, by = Math.cos(time * 1.7) * 30;
  let count = 0;
  const total = lines.reduce((s, l) => s + [...l].length, 0);
  const glyphs = (line: string, li: number) => {
    const chars = [...line];
    let prev = 0;
    return chars.map((ch, ci) => {
      const k = count + ci, p = total > 1 ? k / (total - 1) : 0;
      // Saut à l'entrée : chaque lettre a sa fenêtre, ressort amorti (pas de courbe externe)
      const local = Math.max(0, Math.min(1, enter * 1.6 - p * 0.6));
      const spring = local >= 1 ? 1 : 1 - Math.exp(-6 * local) * Math.cos(local * 9);
      const out = Math.max(0, Math.min(1, leave * 1.5 - (1 - p) * 0.5));
      const wob = Math.sin(time * (3 + hash(k, 1) * 2) + hash(k, 2) * 6.28);
      const rot = wob * 5 + (hash(k, 3) - 0.5) * 6;
      const dy = (1 - spring) * sizes[li] * 0.9 + Math.cos(time * 2.6 + k) * 3 + out * out * sizes[li] * 0.6;
      const op = Math.min(1, local * 4) * (1 - out);
      // dy est cumulatif : on passe l'écart avec la lettre précédente
      const shift = dy - prev;
      prev = dy;
      return <tspan key={ci} rotate={rot.toFixed(1)} dy={shift.toFixed(1)} style={{ fillOpacity: op, strokeOpacity: op }}>{ch}</tspan>;
    });
  };
  const line = (l: string, li: number) => {
    const s = sizes[li], y = tops[li] + s * 0.82, fill = li === 0 && lines.length > 1 ? accent : main;
    const rows = (_layer: "ink" | "fill" | "chalk") => glyphs(l, li);
    const common = { x: 500, y, textAnchor: "middle" as const, fontFamily, fontWeight: 800, fontSize: s, letterSpacing: s * 0.03, strokeLinejoin: "round" as const };
    const out = <g key={li}>
      <text {...common} transform="translate(9 11)" fill={ink} stroke={ink} strokeWidth={s * 0.16}>{rows("ink")}</text>
      <text {...common} fill={fill} stroke={ink} strokeWidth={s * 0.05}>{rows("fill")}</text>
      {/* Hachures claires sur le haut des lettres */}
      <text {...common} fill={`url(#${id}-hatch${li === 0 && lines.length > 1 ? "a" : "m"})`} opacity={0.35}>{rows("fill")}</text>
      <text {...common} transform="translate(-6 -5)" fill="none" stroke={li === 0 && lines.length > 1 ? sun : "#FFFFFF"} strokeWidth={2.4} opacity={0.75}>{rows("chalk")}</text>
    </g>;
    count += [...l].length;
    return out;
  };
  return <div className={className} style={{ width: "100%", ...style }}>
    <svg viewBox={`0 0 1000 ${H.toFixed(1)}`} width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
      <defs>
        <filter id={`${id}-boil`} x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="n" />
          <feOffset in="n" dx={bx} dy={by} result="moving" />
          <feDisplacementMap in="SourceGraphic" in2="moving" scale="9" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {(["a", "m"] as const).map((key) => <pattern key={key} id={`${id}-hatch${key}`} patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(-35)">
          <rect width="16" height="16" fill="none" />
          <rect x="0" y="0" width="5" height="16" fill={key === "a" ? sun : "#B9B4AE"} />
        </pattern>)}
      </defs>
      <g filter={`url(#${id}-boil)`}>{lines.map(line)}</g>
    </svg>
  </div>;
}

/** Fond : anthracite tacheté (encre et poussière), vignette, grain. Les taches dérivent très lentement. */
export function WiggleBackdrop({ palette: [bg, , accent], time }: { palette: [string, string, string]; time: number }) {
  const t = Math.max(0, time);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }} aria-hidden>
      <filter id="wiggle-blotch"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="3" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 -0.42" /></filter>
      <rect width="100%" height="100%" filter="url(#wiggle-blotch)" opacity={0.08} transform={`translate(${Math.sin(t * 0.1) * 6} ${Math.cos(t * 0.08) * 6})`} />
    </svg>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 40% at 50% 45%, color-mix(in srgb, ${accent} 6%, transparent), transparent 70%), radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55))` }} />
    {Array.from({ length: 24 }, (_, i) => <div key={i} style={{ position: "absolute", left: `${hash(i, 1) * 100}%`, top: `${hash(i, 2) * 100}%`, width: 2 + hash(i, 3) * 3, height: 2 + hash(i, 3) * 3, borderRadius: "50%", background: "#FFFFFF", opacity: 0.05 + 0.12 * (0.5 + 0.5 * Math.cos(t * (0.7 + hash(i, 4)) + i)) ** 2 }} />)}
    <NoiseGrain seed={44} opacity={0.2} />
  </div>;
}

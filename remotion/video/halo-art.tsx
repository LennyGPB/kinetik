import type { CSSProperties } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Halo (template `lens`) — affiche noire : un mot en casse normale, crème et granuleux, dont les copies tournent autour du centre
 * comme un flou de rotation : les lettres extérieures tracent des arcs orange de part et d'autre, le centre reste sombre.
 * Tailles en cqw / cqh : relatives au conteneur de la miniature, ou au cadre de la vidéo.
 */

const ECHOES = [1, 2, 3, 4, 5];
const ARC_MASK = "radial-gradient(ellipse 58% 70% at 50% 50%, transparent 30%, black 62%)";

/** Mot à arcs de rotation. `time` en secondes ; `enter` de 0 (arcs très ouverts, mot absent) à 1 (posé). */
export function HaloTitle({ text, time, enter = 1, palette: [, main, accent], fontFamily, className, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const n = Math.max(3, [...text].length);
  const beat = Math.max(0, time) * 2, pulse = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  // Ouverture des arcs : respire lentement, s'ouvre sur le temps, très ouverte à l'entrée
  const sweep = (5.5 + Math.sin(time * 0.9) * 1.2 + pulse * 1.5) * (1 + (1 - enter) * 2.5);
  const echo = (k: number, side: 1 | -1): CSSProperties => ({
    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    color: `color-mix(in srgb, ${accent}, #ffb36b ${Math.max(0, 40 - k * 9)}%)`,
    transform: `rotate(${side * k * sweep}deg) scale(${1 + k * 0.045})`,
    filter: `blur(${0.025 + k * 0.022}em)`, opacity: (0.75 - k * 0.11) * Math.min(1, enter * 1.4),
    maskImage: ARC_MASK, WebkitMaskImage: ARC_MASK,
  });
  return <div className={className} style={{ position: "relative", fontFamily, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", whiteSpace: "nowrap", fontSize: `min(${(150 / n).toFixed(2)}cqw, 24cqh)`, ...style }}>
    {ECHOES.flatMap((k) => ([1, -1] as const).map((side) => <span key={`${k}${side}`} aria-hidden style={echo(k, side)}>{text}</span>))}
    <span style={{ position: "relative", display: "flex", justifyContent: "center", color: main, opacity: Math.min(1, enter * 1.3), textShadow: `0 0 0.12em color-mix(in srgb, ${accent}, transparent 35%)` }}>{text}</span>
  </div>;
}

/** Fond : noir, halo orange très diffus qui respire sur le temps, grain fin. */
export function HaloBackdrop({ palette: [bg, , accent], time }: { palette: [string, string, string]; time: number }) {
  const beat = Math.max(0, time) * 2, pulse = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 46% 26% at 50% 50%, color-mix(in srgb, ${accent}, transparent ${88 - pulse * 5}%), transparent 80%)` }} />
    <NoiseGrain seed={9} opacity={0.25} />
  </div>;
}

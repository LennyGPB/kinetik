import type { CSSProperties } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Halo (template `lens`) — affiche noire : un mot en casse normale, crème et granuleux, dont les copies tournent autour du centre
 * comme un flou de rotation : les lettres extérieures tracent des arcs orange de part et d'autre, le centre reste sombre.
 * Tailles en cqw / cqh : relatives au conteneur de la miniature, ou au cadre de la vidéo.
 */

/** Nombre de copies en vol de chaque côté ; une nouvelle naît au centre quand la plus ancienne s'éteint. */
const ECHOES = [0, 1, 2, 3, 4, 5, 6];
const ARC_MASK = "radial-gradient(ellipse 58% 70% at 50% 50%, transparent 30%, black 62%)";
/** Copies émises par seconde, et angle parcouru par une copie entre sa naissance et son extinction. */
const EMIT_RATE = 1.1, MAX_ANGLE = 38;

/**
 * Mot à ondes de rotation. Le mot émet en continu des copies qui partent en tournant vers l'extérieur (sens horaire à droite,
 * antihoraire à gauche), grossissent, se floutent et s'éteignent ; chaque copie naît et meurt à opacité nulle : la boucle est
 * invisible et le mouvement ne revient jamais en arrière. `time` en secondes ; `enter` de 0 (ondes très ouvertes, mot absent) à 1.
 */
export function HaloTitle({ text, time, enter = 1, palette: [, main, accent], fontFamily, className, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const n = Math.max(3, [...text].length);
  const phase = Math.max(0, time) * EMIT_RATE;
  const spread = 1 + (1 - enter) * 1.5;
  const echo = (k: number, side: 1 | -1): CSSProperties => {
    // Âge de la copie dans [0, 1[ : elle avance sans cesse, puis renaît au centre (invisible à ce moment-là)
    const age = ((k + phase) % ECHOES.length) / ECHOES.length;
    const life = Math.sin(Math.PI * age) ** 1.4;
    return {
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      color: `color-mix(in srgb, ${accent}, #ffb36b ${Math.round(45 * (1 - age))}%)`,
      transform: `rotate(${side * age * MAX_ANGLE * spread}deg) scale(${1 + age * 0.28})`,
      filter: `blur(${0.02 + age * 0.13}em)`, opacity: 0.8 * life * Math.min(1, enter * 1.4),
      maskImage: ARC_MASK, WebkitMaskImage: ARC_MASK,
    };
  };
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

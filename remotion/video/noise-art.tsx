import React, { type CSSProperties } from "react";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Noise (template `optic`) — affiche typographique noire : mots empilés en grotesque très large, une ligne par mot calée sur
 * toute la largeur, lettres blanches qui projettent de longs faisceaux de lumière vers le haut et vers le bas, gros grain argentique.
 * Les tailles utilisent cqw / cqh : relatives au conteneur de la miniature, ou au cadre de la vidéo quand il n'y a pas de conteneur.
 */

/** Répartit le titre en 1 à 4 lignes (un mot par ligne si possible, mots courts regroupés au-delà). */
export function noiseLines(text: string, max = 4) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words;
  const lines: string[] = [];
  const per = Math.ceil(words.length / max);
  for (let i = 0; i < words.length; i += per) lines.push(words.slice(i, i + per).join(" "));
  return lines;
}

/** Titre empilé à faisceaux. `time` en secondes ; `enter` de 0 (faisceaux très longs, lettres absentes) à 1 (posé). */
export function NoiseTitle({ text, time, enter = 1, color = "#ffffff", fontFamily, className, style }: { text: string; time: number; enter?: number; color?: string; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const lines = noiseLines(text);
  return <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily, fontWeight: 800, color, lineHeight: 0.9, letterSpacing: "-0.02em", whiteSpace: "nowrap", ...style }}>
    {lines.map((line, i) => {
      const n = Math.max(3.4, [...line].length);
      const local = Math.max(0, Math.min(1, enter * 1.7 - i * 0.22));
      const breathe = Math.sin(time * 1.4 + i * 1.7) * 0.35 + Math.sin(time * 4.2 + i) * 0.08;
      const reach = (2.3 + breathe) * (1 + (1 - local) * 2.5);
      // Largeur : la ligne remplit ~90 % du cadre ; hauteur : le bloc tient dans ~58 % du cadre
      const size = `min(${(106 / n).toFixed(2)}cqw, ${(58 / (lines.length * 0.92)).toFixed(2)}cqh)`;
      const beam = (up: boolean): CSSProperties => ({
        // Faisceau : copie étirée depuis la base (vers le haut) ou le sommet (vers le bas) des lettres, qui s'estompe en s'éloignant
        position: "absolute", left: 0, right: 0, top: 0, transformOrigin: up ? "50% 100%" : "50% 0%",
        transform: `scaleY(${reach})`, filter: "blur(0.05em)", opacity: 0.8 * local,
        maskImage: `linear-gradient(${up ? "0deg" : "180deg"}, black 20%, transparent 92%)`,
        WebkitMaskImage: `linear-gradient(${up ? "0deg" : "180deg"}, black 20%, transparent 92%)`,
      });
      return <div key={i} style={{ position: "relative", fontSize: size, transform: `translateY(${(1 - local) * 0.25}em)` }}>
        <span aria-hidden style={beam(true)}>{line}</span>
        <span aria-hidden style={beam(false)}>{line}</span>
        <span style={{ position: "relative", opacity: local, textShadow: `0 0 0.08em color-mix(in srgb, ${color}, transparent 40%)` }}>{line}</span>
      </div>;
    })}
  </div>;
}

/** Grain argentique : taches sombres semi-transparentes ; `seed` entier, à changer d'image en image pour un grain vivant. */
export function NoiseGrain({ seed = 1, opacity = 0.55, style }: { seed?: number; opacity?: number; style?: CSSProperties }) {
  const id = `noise-${React.useId().replace(/[^\w-]/g, "")}`;
  return <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity, ...style }} aria-hidden>
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={seed} />
      {/* Bruit → noir, opacité forte là où le bruit est sombre : un grain qui « mange » la lumière */}
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 1.55" />
    </filter>
    <rect width="100%" height="100%" filter={`url(#${id})`} />
  </svg>;
}

/** Fond : noir profond, halo blanc très doux au centre qui respire sur le temps, grain léger. */
export function NoiseBackdrop({ palette: [bg, main], time }: { palette: [string, string, string]; time: number }) {
  const beat = Math.max(0, time) * 2, pulse = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 42% at 50% 46%, color-mix(in srgb, ${main}, transparent ${86 - pulse * 5}%), transparent 75%)` }} />
    <NoiseGrain seed={3} opacity={0.35} />
  </div>;
}

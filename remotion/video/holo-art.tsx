import type { CSSProperties } from "react";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Holo (template `patina`) — une capsule monolithe aux coins très arrondis, remplie d'un liquide holographique en mouvement
 * (cyan, violet, magenta), dans laquelle le titre est découpé en noir (vertical en portrait, horizontal sinon) et que des
 * entailles diagonales traversent en glissant. La capsule remplit son parent ; tailles internes en unités de conteneur.
 */

/** Couleurs du liquide : principale (violet), accent (cyan), magenta et bleu dérivés de la palette. */
export function holoColors([, main, accent]: [string, string, string]) {
  return { violet: main, cyan: accent, magenta: `color-mix(in srgb, ${main}, #ff4fd8 60%)`, blue: `color-mix(in srgb, ${accent}, #3d5bff 70%)` };
}

/** Liquide holographique : taches floues qui dérivent, reflet en conique qui tourne. `time` en secondes. */
function HoloFill({ time, palette }: { time: number; palette: [string, string, string] }) {
  const c = holoColors(palette);
  const blob = (x: number, y: number, size: number, color: string) => `radial-gradient(circle ${size}cqmax at ${x}% ${y}%, ${color}, transparent 70%)`;
  const t = time * 0.45;
  return <div style={{ position: "absolute", inset: 0, background: [
    blob(30 + Math.sin(t) * 25, 20 + Math.cos(t * 0.8) * 15, 40, c.cyan),
    blob(70 + Math.cos(t * 1.1) * 25, 45 + Math.sin(t * 0.9) * 20, 45, c.magenta),
    blob(40 + Math.sin(t * 0.7 + 2) * 30, 75 + Math.cos(t * 1.2) * 15, 50, c.blue),
    blob(60 + Math.cos(t * 0.6 + 1) * 20, 15 + Math.sin(t * 1.3) * 10, 35, c.violet),
    `linear-gradient(160deg, ${c.violet}, ${c.blue})`,
  ].join(", ") }}>
    <div style={{ position: "absolute", inset: "-30%", background: `conic-gradient(from ${time * 30}deg at 50% 50%, transparent, rgb(255 255 255 / 0.22), transparent 25%, rgb(255 255 255 / 0.12), transparent 60%)`, mixBlendMode: "soft-light" }} />
  </div>;
}

/** Capsule holographique avec titre découpé. `vertical` : titre tourné à -90° (portrait). `enter` de 0 (capsule écrasée) à 1. */
export function HoloCapsule({ text, time, enter = 1, palette, vertical, fontFamily, className, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; vertical: boolean; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const [bg] = palette;
  const word = text.toUpperCase();
  const n = Math.max(3, [...word].length);
  // Taille du titre : la longueur suit l'axe long de la capsule, l'épaisseur son axe court
  const size = vertical ? `min(62cqw, ${(88 / (n * 0.74)).toFixed(2)}cqh)` : `min(62cqh, ${(88 / (n * 0.74)).toFixed(2)}cqw)`;
  const beat = Math.max(0, time) * 2, kick = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  // Défilement continu sur une boucle de 160 % : le retour se fait hors de la capsule (−30 % → 130 %), jamais à l'écran
  const slashes = [0, 53, 106].map((p, i) => ((p + time * (i % 2 ? 5 : 7)) % 160) - 30);
  return <div className={className} style={{ position: "absolute", inset: 0, containerType: "size", ...style }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: vertical ? "26cqw" : "26cqh", overflow: "hidden", transform: vertical ? `scaleY(${0.3 + 0.7 * enter})` : `scaleX(${0.3 + 0.7 * enter})`, opacity: Math.min(1, enter * 1.6), boxShadow: `inset 0 0 0 0.4cqmin rgb(255 255 255 / 0.25), 0 0 8cqmin color-mix(in srgb, ${holoColors(palette).violet}, transparent ${70 - kick * 15}%)` }}>
      <HoloFill time={time} palette={palette} />
      {/* Entailles diagonales qui glissent le long de la capsule */}
      {slashes.map((p, i) => <div key={i} style={{ position: "absolute", left: "-20%", right: "-20%", top: `${p}%`, height: vertical ? "2.4cqh" : "5cqh", background: bg, transform: `rotate(${vertical ? -28 : -12}deg)` }} />)}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: size, lineHeight: 0.85, letterSpacing: "-0.02em", whiteSpace: "nowrap", color: bg, transform: `${vertical ? "rotate(-90deg)" : ""} skewX(-8deg)`, opacity: Math.min(1, enter * 1.3) }}>{word}</span>
      </div>
    </div>
  </div>;
}

/** Fond : noir, lueur violette diffuse derrière la capsule qui respire sur le temps. */
export function HoloBackdrop({ palette, time }: { palette: [string, string, string]; time: number }) {
  const beat = Math.max(0, time) * 2, pulse = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: palette[0] }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 40% 50% at 50% 46%, color-mix(in srgb, ${holoColors(palette).violet}, transparent ${84 - pulse * 6}%), transparent 80%)` }} />
  </div>;
}

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

/** Même silhouette dans la galerie et dans les compositions Remotion. */
export function holoPlacement(vertical: boolean): CSSProperties {
  return vertical
    ? { left: "28%", width: "44%", top: "50%", height: "64%", transform: "translateY(-50%)" }
    : { left: "13%", width: "74%", top: "50%", height: "44%", transform: "translateY(-50%)" };
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
    <div style={{ position: "absolute", inset: "-35%", transform: `translateX(${Math.sin(time * 0.65) * 12}%) rotate(${18 + Math.sin(time * 0.3) * 12}deg)`, background: `linear-gradient(115deg, transparent 14%, ${c.cyan} 24%, #e8ffff 29%, ${c.violet} 34%, ${c.magenta} 43%, #fff1fc 49%, ${c.blue} 55%, ${c.cyan} 62%, transparent 76%)`, opacity: 0.72 }} />
    <div style={{ position: "absolute", inset: "-30%", background: `conic-gradient(from ${time * 30}deg at 50% 50%, transparent, rgb(255 255 255 / 0.22), transparent 25%, rgb(255 255 255 / 0.12), transparent 60%)`, mixBlendMode: "soft-light" }} />
  </div>;
}

/** Capsule holographique avec titre découpé. `vertical` : titre tourné à -90° (portrait). `enter` de 0 (capsule écrasée) à 1. */
export function HoloCapsule({ text, time, enter = 1, palette, vertical, fontFamily, className, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; vertical: boolean; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const [bg] = palette;
  const word = text.toUpperCase();
  const n = Math.max(3, [...word].reduce((sum, char) => sum + (/\s/.test(char) ? 0.4 : /[MW@%]/.test(char) ? 1.3 : 1), 0));
  // Taille du titre : la longueur suit l'axe long de la capsule, l'épaisseur son axe court
  const size = vertical ? `min(58cqw, ${(80 / n).toFixed(2)}cqh)` : `min(58cqh, ${(80 / n).toFixed(2)}cqw)`;
  const beat = Math.max(0, time) * 2, kick = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  // Les entailles restent aux extrémités : aucun passage noir ne coupe le titre.
  const slashes = [8 + Math.sin(time * 0.7) * 2, 92 + Math.sin(time * 0.7 + 1) * 2];
  const reveal = Math.max(0, Math.min(1, enter));
  return <div className={className} style={{ position: "absolute", inset: 0, containerType: "size", ...style }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: vertical ? "50cqw" : "50cqh", overflow: "hidden", transform: vertical ? `scaleY(${0.3 + 0.7 * reveal})` : `scaleX(${0.3 + 0.7 * reveal})`, opacity: Math.min(1, reveal * 3), boxShadow: `0 1.2cqmin 4cqmin rgb(0 0 0 / 0.28), 0 0 ${5 + kick * 1.5}cqmin color-mix(in srgb, ${holoColors(palette).violet}, transparent 78%)` }}>
      <HoloFill time={time} palette={palette} />
      {/* Entailles diagonales qui glissent le long de la capsule */}
      {slashes.map((p, i) => <div key={i} style={{ position: "absolute", ...(vertical ? { left: "-30%", right: "-30%", top: `${p}%`, height: "1.5cqh" } : { top: "-60%", bottom: "-60%", left: `${p}%`, width: "1.5cqw" }), background: bg, transform: "rotate(-28deg)", boxShadow: `0.35cqmin 0.35cqmin 0 rgb(255 255 255 / 0.65)` }} />)}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: size, lineHeight: 0.95, letterSpacing: "-0.03em", whiteSpace: "nowrap", color: "#090612", transform: `${vertical ? "rotate(-90deg)" : ""} skewX(-5deg)`, opacity: Math.min(1, reveal * 1.3) }}>{word}</span>
      </div>
      <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", boxShadow: "inset 0.5cqmin 0.6cqmin 0.6cqmin rgb(255 255 255 / 0.65), inset -0.6cqmin -0.8cqmin 1.6cqmin rgb(18 5 48 / 0.6)", pointerEvents: "none" }} />
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

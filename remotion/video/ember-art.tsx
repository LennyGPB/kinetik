import type { CSSProperties } from "react";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Ember (template `flux`) — affiche noire usée : un mot au cœur blanc incandescent dont les lettres se répètent vers l'extérieur
 * en flou de zoom radial rouge-orangé, sur une carte aux coins arrondis, pliée en deux, poussiéreuse.
 * Tailles en cqw / cqh : relatives au conteneur de la miniature, ou au cadre de la vidéo.
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Mot incandescent à échos radiaux. `time` en secondes ; `enter` de 0 (échos très écartés, flou) à 1 (net). */
export function EmberTitle({ text, time, enter = 1, palette: [, main, accent], fontFamily, className, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const word = text.toUpperCase();
  const n = Math.max(3, [...word].length);
  const beat = Math.max(0, time) * 2, pulse = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  const spread = (1 + pulse * 0.35 + Math.sin(time * 1.3) * 0.08) * (1 + (1 - enter) * 2.2);
  const echoes = [6, 5, 4, 3, 2, 1];
  return <div className={className} style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", fontFamily, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.01em", whiteSpace: "nowrap", fontSize: `min(${(118 / n).toFixed(2)}cqw, 21cqh)`, ...style }}>
    {echoes.map((k) => <span key={k} aria-hidden style={{ position: "absolute", color: k > 3 ? accent : `color-mix(in srgb, ${accent}, #ffb347 ${30 + (3 - k) * 20}%)`, transform: `scale(${1 + k * 0.13 * spread}, ${1 + k * 0.07 * spread})`, filter: `blur(${0.02 + k * 0.025}em)`, opacity: (0.62 - k * 0.07) * Math.min(1, enter * 1.5) }}>{word}</span>)}
    <span style={{ position: "relative", color: main, filter: `blur(${(1 - enter) * 0.08}em)`, opacity: Math.min(1, enter * 1.3), textShadow: `0 0 0.06em #fff3d6, 0 0 0.18em color-mix(in srgb, ${accent}, #ffb347 60%), 0 0 0.45em ${accent}` }}>{word}</span>
  </div>;
}

/** Fond : carte d'affiche noire aux coins arrondis, pli horizontal, poussière et rayures, halo chaud au centre. */
export function EmberBackdrop({ palette: [bg, , accent], time }: { palette: [string, string, string]; time: number }) {
  const beat = Math.max(0, time) * 2, pulse = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  const dust = Array.from({ length: 46 }, (_, i) => ({ x: 6 + hash(i, 1) * 88, y: 7 + hash(i, 2) * 86, s: 0.12 + hash(i, 3) * 0.35, o: 0.15 + hash(i, 4) * 0.45 }));
  const scratches = Array.from({ length: 7 }, (_, i) => ({ x: 8 + hash(i, 5) * 84, y: 10 + hash(i, 6) * 80, w: 2 + hash(i, 7) * 9, r: -30 + hash(i, 8) * 60 }));
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#000", containerType: "size" }}>
    <div style={{ position: "absolute", inset: "7% 6% 6.5%", borderRadius: "5cqmin", background: `radial-gradient(ellipse 55% 40% at 50% 50%, color-mix(in srgb, ${accent}, transparent ${84 - pulse * 6}%), transparent 70%), ${bg === "#000" || bg === "#000000" ? "#0b0b0d" : bg}`, boxShadow: "inset 0 0 6cqmin rgb(0 0 0 / 0.85), inset 0 0 0.4cqmin rgb(255 255 255 / 0.08), 0 0 4cqmin rgb(0 0 0 / 0.9)", overflow: "hidden" }}>
      {dust.map((d, i) => <span key={i} style={{ position: "absolute", left: `${d.x}%`, top: `${d.y}%`, width: `${d.s}cqmin`, height: `${d.s}cqmin`, borderRadius: "50%", background: "#fff", opacity: d.o }} />)}
      {scratches.map((s, i) => <span key={i} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}cqmin`, height: 1, background: "rgb(255 255 255 / 0.12)", transform: `rotate(${s.r}deg)` }} />)}
      {/* Bords usés */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "5cqmin", background: "radial-gradient(ellipse at 0% 30%, rgb(255 255 255 / 0.05), transparent 30%), radial-gradient(ellipse at 100% 75%, rgb(255 255 255 / 0.04), transparent 28%)" }} />
    </div>
    {/* Pli horizontal, qui déborde un peu de la carte */}
    <div style={{ position: "absolute", left: "4%", right: "4%", top: "50%", height: 1, background: "rgb(255 255 255 / 0.22)" }} />
    <div style={{ position: "absolute", left: "4%", right: "4%", top: "calc(50% + 1px)", height: 2, background: "rgb(0 0 0 / 0.7)" }} />
  </div>;
}

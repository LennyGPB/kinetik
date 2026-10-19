import type { CSSProperties } from "react";
import { NoiseGrain, noiseLines } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Void (template `carousel`) — mots empilés en lettres ambrées défocalisées, sur noir brun granuleux, et une couronne d'épines
 * lumineuse et nette qui tourne en 3D autour du titre : sa moitié arrière passe derrière les lettres, sa moitié avant devant.
 * La couronne est dessinée aux proportions du cadre (viewBox 1000 × 1000 / ratio) ; le titre en cqw / cqh.
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Titre défocalisé. `time` en secondes ; `enter` de 0 (très flou, éteint) à 1 (posé). */
export function VoidTitle({ text, time, enter = 1, palette: [, main, accent], fontFamily, className, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const lines = noiseLines(text, 4);
  // La mise au point « respire » : jamais tout à fait nette, plus floue à l'entrée
  const blur = 0.045 + (Math.sin(time * 1.1) * 0.5 + 0.5) * 0.035 + (1 - enter) * 0.25;
  const glow = `0 0 0.08em ${main}, 0 0 0.25em color-mix(in srgb, ${accent}, transparent 20%), 0 0 0.6em color-mix(in srgb, ${accent}, transparent 55%)`;
  return <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily, fontWeight: 800, lineHeight: 0.92, letterSpacing: "-0.01em", textTransform: "uppercase", whiteSpace: "nowrap", color: `color-mix(in srgb, ${main}, ${accent} 25%)`, textShadow: glow, filter: `blur(${blur}em)`, opacity: Math.min(1, enter * 1.4), ...style }}>
    {lines.map((line, i) => <div key={i} style={{ fontSize: `min(${(95 / Math.max(3.2, [...line].length)).toFixed(2)}cqw, ${(62 / lines.length).toFixed(2)}cqh)` }}>{line}</div>)}
  </div>;
}

type Point = { x: number; y: number; z: number };

/**
 * Couronne d'épines : 4 brins entrelacés autour d'une ellipse inclinée et des épines rigides, qui tournent avec la couronne.
 * `layer` : "back" (moitié arrière, plus sombre, à placer sous le titre) ou "front" (moitié avant, au-dessus).
 */
export function ThornCrown({ time, enter = 1, layer, aspectRatio, palette: [, main, accent], style }: { time: number; enter?: number; layer: "back" | "front"; aspectRatio: number; palette: [string, string, string]; style?: CSSProperties }) {
  const W = 1000, H = W / aspectRatio, u = Math.min(W, H);
  const cx = W / 2, cy = H * 0.5;
  const rx = Math.min(W * 0.47, u * 0.6) * (0.85 + 0.15 * enter), ry = rx * 0.42;
  const tilt = (-22 * Math.PI) / 180;
  const spin = time * 0.55 + (1 - enter) * 1.4;
  const place = (theta: number, off: number, lift: number): Point => {
    const a = theta + spin;
    const x0 = Math.cos(a) * (rx + off), y0 = Math.sin(a) * (ry + off * 0.35) + lift;
    return { x: cx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt), y: cy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt), z: Math.sin(a) };
  };
  const front = layer === "front";
  const keep = (z: number) => (front ? z >= -0.05 : z <= 0.05);
  const strands = [0, 1, 2, 3].map((s) => {
    const pts = Array.from({ length: 181 }, (_, i) => {
      const t = (i / 180) * Math.PI * 2;
      return place(t, Math.sin(t * (5 + s) + s * 1.7) * u * 0.018, Math.cos(t * (4 + s) + s) * u * 0.012);
    });
    // Segments contigus du côté demandé
    const runs: Point[][] = [];
    let run: Point[] = [];
    for (const p of pts) { if (keep(p.z)) run.push(p); else if (run.length) { runs.push(run); run = []; } }
    if (run.length) runs.push(run);
    return runs.filter((r) => r.length > 1).map((r) => `M${r.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L")}`).join(" ");
  });
  const spikes = Array.from({ length: 30 }, (_, i) => {
    const base = place((i / 30) * Math.PI * 2 + hash(i) * 0.15, 0, 0);
    if (!keep(base.z)) return null;
    const angle = hash(i, 2) * Math.PI * 2, len = u * (0.03 + hash(i, 3) * 0.07);
    return `M${base.x.toFixed(1)} ${base.y.toFixed(1)}l${(Math.cos(angle) * len).toFixed(1)} ${(Math.sin(angle) * len * 0.8 - (hash(i, 4) > 0.5 ? len * 0.4 : 0)).toFixed(1)}`;
  }).filter(Boolean).join(" ");
  const opacity = (front ? 1 : 0.55) * Math.min(1, enter * 1.3);
  const hot = `color-mix(in srgb, ${main}, white 30%)`;
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", opacity, pointerEvents: "none", ...style }} aria-hidden>
    {/* Halo : mêmes tracés, épais et flous */}
    <g stroke={accent} strokeLinecap="round" fill="none" style={{ filter: `blur(${u * 0.008}px)` }} opacity={0.75}>
      {strands.map((d, i) => <path key={i} d={d} strokeWidth={u * 0.012} />)}
      <path d={spikes} strokeWidth={u * 0.008} />
    </g>
    <g stroke={hot} strokeLinecap="round" fill="none">
      {strands.map((d, i) => <path key={i} d={d} strokeWidth={u * (i % 2 ? 0.0035 : 0.005)} />)}
      <path d={spikes} strokeWidth={u * 0.003} />
    </g>
  </svg>;
}

/** Fond : noir brun, lueur ambrée diffuse au centre qui respire sur le temps, grain. */
export function VoidBackdrop({ palette: [bg, , accent], time }: { palette: [string, string, string]; time: number }) {
  const beat = Math.max(0, time) * 2, pulse = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 50% 34% at 50% 50%, color-mix(in srgb, ${accent}, transparent ${86 - pulse * 5}%), transparent 80%)` }} />
    <NoiseGrain seed={11} opacity={0.3} />
  </div>;
}

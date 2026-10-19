import type { CSSProperties } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Lumen (template `interlock`) — un mot en minuscules aux lettres dessinées en contour orange pêche, lueur violette à l'intérieur,
 * prolongées vers le haut et le bas par de hautes colonnes de lumière violette et de fins traits lumineux ; fond noir poussiéreux.
 * Tailles en cqw / cqh : relatives au conteneur de la miniature, ou au cadre de la vidéo.
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/** Mot à colonnes de lumière. `time` en secondes ; `enter` de 0 (colonnes rentrées, mot absent) à 1. */
export function LumenTitle({ text, time, enter = 1, palette: [, main, accent], fontFamily, className, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const word = text.toLowerCase();
  const chars = [...word];
  const n = Math.max(3, chars.length);
  const fade = (top: number) => `linear-gradient(180deg, transparent 0%, black ${top}%, black ${100 - top}%, transparent 100%)`;
  return <div className={className} style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", fontFamily, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em", whiteSpace: "nowrap", fontSize: `min(${(128 / n).toFixed(2)}cqw, 30cqh)`, ...style }}>
    {chars.map((ch, i) => {
      if (ch === " ") return <span key={i} style={{ display: "inline-block", width: "0.28em" }} />;
      const reach = (6 + hash(i, 1) * 5 + Math.sin(time * 0.8 + i * 1.9) * 0.6) * enter;
      const shimmer = 0.55 + 0.45 * Math.sin(time * 3.1 + i * 2.3) ** 2;
      const lines = [0.12 + hash(i, 2) * 0.1, 0.55 + hash(i, 3) * 0.3];
      return <span key={i} style={{ position: "relative", display: "inline-block" }}>
        {/* Colonne de lumière violette, étirée et estompée aux extrémités */}
        <span aria-hidden style={{ position: "absolute", left: 0, top: 0, color: accent, transform: `scaleY(${Math.max(0.01, reach)})`, filter: "blur(0.09em)", opacity: 0.7, maskImage: fade(18), WebkitMaskImage: fade(18) }}>{ch}</span>
        {/* Fins traits lumineux verticaux */}
        {lines.map((x, j) => <span key={j} aria-hidden style={{ position: "absolute", left: `${x * 100}%`, top: `${-reach * 45}%`, height: `${reach * 100}%`, width: "0.012em", minWidth: 1, background: `linear-gradient(180deg, transparent, ${main} 30%, ${main} 70%, transparent)`, opacity: shimmer * 0.8, boxShadow: `0 0 0.05em ${main}` }} />)}
        {/* Lettre en contour */}
        <span style={{ position: "relative", color: `color-mix(in srgb, ${accent}, transparent 88%)`, WebkitTextStroke: `0.03em ${main}`, opacity: Math.min(1, enter * 1.4), textShadow: `0 0 0.12em ${accent}, 0 0 0.04em ${main}` }}>{ch}</span>
      </span>;
    })}
  </div>;
}

/** Fond : noir chaud poussiéreux, rayures verticales de pellicule, poussières, grain léger. */
export function LumenBackdrop({ palette: [bg, main], time }: { palette: [string, string, string]; time: number }) {
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    {Array.from({ length: 5 }, (_, i) => <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${(hash(i, 7) * 96 + 2 + Math.sin(time * 0.3 + i * 1.9) * 3).toFixed(2)}%`, width: 1, background: "rgb(255 255 255 / 0.07)" }} />)}
    {Array.from({ length: 40 }, (_, i) => <div key={i} style={{ position: "absolute", left: `${hash(i, 30) * 100}%`, top: `${hash(i, 31) * 100}%`, width: `${0.15 + hash(i, 32) * 0.3}cqmin`, height: `${0.15 + hash(i, 32) * 0.3}cqmin`, borderRadius: "50%", background: i % 6 ? "#fff" : main, opacity: 0.12 + hash(i, 33) * 0.35 }} />)}
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgb(0 0 0 / 0.55) 100%)" }} />
    <NoiseGrain seed={13} opacity={0.22} />
  </div>;
}

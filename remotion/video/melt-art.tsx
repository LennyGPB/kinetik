import React, { type CSSProperties } from "react";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Melt (template `offprint`) — texte qui fond : un mot blanc lumineux en grotesque large, légèrement cintré en arc, liseré rose
 * et bleu, d'où pendent de longues coulures (blanc → rose → bleu) qui s'allongent et ondulent ; fond d'espace sombre avec un
 * tourbillon de traînées rouges et bleues en flou de rotation et une poussière d'étoiles.
 * Titre en em (taille donnée par le parent) ; fond aux proportions du cadre.
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
/** Bleu des coulures, teinté par l'accent (rose) pour rester dans la palette. */
export const meltBlue = (accent: string) => `color-mix(in srgb, #3b5bff 80%, ${accent})`;

/** Coulure : forme effilée qui descend en ondulant, terminée par une goutte. Coordonnées en em (largeur w, longueur len). */
function drip(len: number, w: number, sway: number) {
  const n = 14, left: string[] = [], right: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.sin(t * Math.PI * 1.2) * sway * t;
    const half = (w / 2) * (1 - t) ** 0.7 + w * 0.05;
    left.push(`${(x - half).toFixed(3)} ${(t * len).toFixed(3)}`);
    right.unshift(`${(x + half).toFixed(3)} ${(t * len).toFixed(3)}`);
  }
  const end = Math.sin(Math.PI * 1.2) * sway;
  return { d: `M${left.join("L")}L${right.join("L")}Z`, tipX: end, tipY: len };
}

/** Mot qui fond. `time` en secondes ; `enter` de 0 (coulures rentrées, mot absent) à 1. */
export function MeltTitle({ text, time, enter = 1, palette: [, main, accent], fontFamily, className, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties }) {
  const id = `melt-${React.useId().replace(/[^\w-]/g, "")}`;
  const chars = [...text.toUpperCase()];
  const n = chars.length;
  const blue = meltBlue(accent);
  return <div className={className} style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-start", fontFamily, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", whiteSpace: "nowrap", ...style }}>
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs><linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={main} /><stop offset="0.25" stopColor={main} /><stop offset="0.55" stopColor={accent} /><stop offset="1" stopColor={blue} /></linearGradient></defs>
    </svg>
    {chars.map((ch, i) => {
      if (ch === " ") return <span key={i} style={{ display: "inline-block", width: "0.3em" }} />;
      const k = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
      // Arc : lettres des bords plus basses et tournées vers l'extérieur
      const arcY = k * k * 0.18, rot = k * 9;
      const drips = [0, 1].filter((j) => j === 0 || hash(i, 9) > 0.45).map((j) => {
        const grow = Math.min(1, Math.max(0, (time - hash(i, j) * 0.8) / 2.2)) * enter;
        const len = (0.9 + hash(i, j + 3) * 2.6) * (0.25 + 0.75 * grow) + Math.sin(time * 0.9 + i * 1.7 + j) * 0.08;
        const w = 0.12 + hash(i, j + 5) * 0.14;
        return { x: 0.2 + hash(i, j + 7) * 0.45, len, w, sway: (hash(i, j + 11) - 0.5) * 0.5 + Math.sin(time * 0.7 + i) * 0.06 };
      });
      return <span key={i} style={{ position: "relative", display: "inline-block", transform: `translateY(${arcY}em) rotate(${rot}deg)`, transformOrigin: "50% 100%" }}>
        <svg aria-hidden viewBox="0 0 1 4" width="1em" height="4em" style={{ position: "absolute", left: 0, top: "0.78em", overflow: "visible", opacity: Math.min(1, enter * 1.4), filter: `drop-shadow(0 0 0.04em ${accent})` }}>
          {drips.map((dp, j) => { const s = drip(dp.len, dp.w, dp.sway); return <g key={j} transform={`translate(${dp.x} 0)`}>
            <path d={s.d} fill={`url(#${id}-g)`} />
            <circle cx={s.tipX} cy={s.tipY} r={dp.w * 0.32} fill={blue} />
          </g>; })}
        </svg>
        <span style={{ position: "relative", color: main, opacity: Math.min(1, enter * 1.5), textShadow: `-0.035em 0 0.02em color-mix(in srgb, ${accent}, transparent 15%), 0.035em 0 0.02em color-mix(in srgb, ${blue}, transparent 15%), 0 0 0.25em color-mix(in srgb, ${accent}, transparent 50%)` }}>{ch}</span>
      </span>;
    })}
  </div>;
}

/** Fond : espace sombre, tourbillon de traînées rouges et bleues en flou de rotation, poussière d'étoiles, vignette. */
export function MeltBackdrop({ palette: [bg, , accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const W = 1000, H = W / aspectRatio, u = Math.min(W, H);
  const cx = W / 2, cy = H * 0.52;
  const blue = meltBlue(accent);
  const spin = time * 9;
  const arcs = Array.from({ length: 26 }, (_, i) => ({ r: u * (0.12 + i * 0.035 + hash(i) * 0.02), start: hash(i, 1) * 360, len: 25 + hash(i, 2) * 70, w: u * (0.01 + hash(i, 3) * 0.03), color: hash(i, 4) > 0.5 ? accent : blue, o: 0.18 + hash(i, 5) * 0.4, speed: 0.6 + hash(i, 6) * 0.8 }));
  const arc = (r: number, a0: number, len: number) => {
    const p = (a: number) => `${(cx + Math.cos((a * Math.PI) / 180) * r).toFixed(1)} ${(cy + Math.sin((a * Math.PI) / 180) * r * 0.82).toFixed(1)}`;
    return `M${p(a0)}A${r} ${r * 0.82} 0 ${len > 180 ? 1 : 0} 1 ${p(a0 + len)}`;
  };
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      <g style={{ filter: `blur(${u * 0.012}px)` }}>
        {arcs.map((a, i) => <path key={i} d={arc(a.r, a.start + spin * a.speed, a.len)} fill="none" stroke={a.color} strokeWidth={a.w} strokeLinecap="round" opacity={a.o} />)}
      </g>
      {Array.from({ length: 70 }, (_, i) => <circle key={i} cx={hash(i, 20) * W} cy={hash(i, 21) * H} r={u * (0.0008 + hash(i, 22) * 0.0022)} fill="#fff" opacity={0.25 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2 + i))} />)}
    </svg>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgb(0 0 0 / 0.65) 100%)" }} />
  </div>;
}

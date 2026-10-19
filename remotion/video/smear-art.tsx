import React, { type CSSProperties } from "react";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Smear (template `sticker`) — affiche « traînée lumineuse » : un mot géant condensé dont chaque lettre s'étire en colonne
 * de lumière verticale (cœur jaune, bords magenta puis violet), doublée au-dessus et en dessous, sur un tissu noir texturé
 * aux coutures discrètes ; petit titre flou au centre, signature et méta-texte en pied.
 * Toutes les mesures du titre sont en em : la même composante sert au rendu vidéo et à la miniature de la galerie.
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
// Marge de 0,3 em : le dégradé couvre aussi les accents des capitales (É, À…) qui dépassent de la ligne
const clip = (background: string): CSSProperties => ({ padding: "0.3em 0", backgroundImage: background, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });

/** Titre étiré en colonnes lumineuses. `time` en secondes ; `enter` de 0 (traînées très longues, invisible) à 1 (posé). */
export function SmearTitle({ text, time, enter = 1, palette: [, main, accent], fontFamily, style }: { text: string; time: number; enter?: number; palette: [string, string, string]; fontFamily?: string; style?: CSSProperties }) {
  const hot = main, cold = accent, mid = `color-mix(in srgb, ${accent}, #ff2bd6 55%)`;
  const streak = `linear-gradient(180deg, ${cold} 0%, ${mid} 24%, ${hot} 44%, ${hot} 56%, ${mid} 76%, ${cold} 100%)`;
  const chars = [...text.toUpperCase()];
  return <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", lineHeight: 1, whiteSpace: "nowrap", fontFamily, filter: `drop-shadow(0 0 0.12em color-mix(in srgb, ${mid}, transparent 45%))`, ...style }}>
    {chars.map((ch, i) => {
      if (ch === " ") return <span key={i} style={{ display: "inline-block", width: "0.28em" }} />;
      const stretch = (2.1 + hash(i, 3) * 1.5 + Math.sin(time * 1.7 + i * 0.9) * 0.35) * (1 + (1 - enter) * 3);
      const shift = Math.sin(time * 2.1 + i * 1.3) * 0.035 + Math.sin(time * 0.9 + i * 2.7) * 0.025;
      const crisp = Math.min(1, enter * 1.4);
      return <span key={i} style={{ position: "relative", display: "inline-block", marginRight: "0.045em", transform: `translateY(${shift}em)` }}>
        <span style={{ visibility: "hidden" }}>{ch}</span>
        <span aria-hidden style={{ position: "absolute", left: 0, top: "-0.3em", transform: `scaleY(${stretch})`, filter: "blur(0.07em)", opacity: 0.9 * Math.min(1, enter * 1.6), ...clip(streak) }}>{ch}</span>
        <span aria-hidden style={{ position: "absolute", left: 0, top: "-0.3em", transform: `scaleY(${stretch * 0.62})`, filter: "blur(0.025em)", opacity: 0.75 * Math.min(1, enter * 1.6), ...clip(streak) }}>{ch}</span>
        <span aria-hidden style={{ position: "absolute", left: 0, top: "-0.3em", transform: "translateY(-0.95em)", opacity: crisp, ...clip(`linear-gradient(180deg, #ffffff 30%, ${hot} 100%)`) }}>{ch}</span>
        <span aria-hidden style={{ position: "absolute", left: 0, top: "-0.3em", transform: "translateY(0.95em)", opacity: crisp, ...clip(`linear-gradient(180deg, ${hot} 0%, #ffffff 70%)`) }}>{ch}</span>
      </span>;
    })}
    <span aria-hidden style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%) scaleX(1.5)", fontSize: "0.075em", letterSpacing: "0.12em", color: "#fff", filter: "blur(0.02em)", opacity: 0.6 * enter }}>{text.toUpperCase()}</span>
  </div>;
}

/** Fond : tissu noir (grain fin), coutures en croix, halo coloré derrière le titre qui respire sur le temps. */
export function SmearBackdrop({ palette: [bg, main, accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const id = `smear-${React.useId().replace(/[^\w-]/g, "")}`;
  const W = 1000, H = W / aspectRatio;
  const beat = Math.max(0, time) * 2, pulse = (0.5 + 0.5 * Math.cos(beat * Math.PI * 2)) ** 2;
  const seams = aspectRatio < 0.8 ? { x: [W / 2], y: [H * 0.25, H * 0.5, H * 0.75] } : { x: [W / 3, (2 * W) / 3], y: [H / 2] };
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 55% 38% at 50% 50%, color-mix(in srgb, ${accent}, transparent ${78 - pulse * 10}%), transparent 75%), radial-gradient(ellipse 30% 18% at 50% 50%, color-mix(in srgb, ${main}, transparent ${88 - pulse * 6}%), transparent 80%)` }} />
    <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      <defs><filter id={`${id}-fabric`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
        <feColorMatrix type="saturate" values="0" />
      </filter></defs>
      <rect width={W} height={H} filter={`url(#${id}-fabric)`} opacity="0.13" />
      {seams.x.map((x) => <g key={x}><path d={`M ${x} 0 V ${H}`} stroke="#000" strokeWidth="5" opacity="0.55" /><path d={`M ${x + 3} 0 V ${H}`} stroke="#fff" strokeWidth="1" opacity="0.07" /></g>)}
      {seams.y.map((y) => <g key={y}><path d={`M 0 ${y} H ${W}`} stroke="#000" strokeWidth="5" opacity="0.55" /><path d={`M 0 ${y + 3} H ${W}`} stroke="#fff" strokeWidth="1" opacity="0.07" /></g>)}
    </svg>
  </div>;
}

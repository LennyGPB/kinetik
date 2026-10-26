import React, { type CSSProperties } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Shard (template `shard`) — affiche noire : un titre condensé blanc, serré sur deux ou trois lignes, fendu par des
 * cassures droites (surtout presque verticales). Le long de chaque cassure, une moitié du titre glisse ; des éclats fins
 * restent accrochés aux fissures. Le titre est un SVG de largeur fixe (1000 unités) : même rendu partout.
 */

const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
const seedOf = (text: string) => [...text].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);

/** Découpe en 1 à 3 lignes la plus grande possible (lettres condensées ≈ 0,45 em, interligne serré). */
export function shardLines(text: string) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const sizeOf = (parts: string[]) => Math.min(330, 940 / (Math.max(2, ...parts.map((p) => [...p].length)) * 0.45), 620 / (parts.length * 0.88));
  let best = [words.join(" ")];
  for (let i = 1; i < words.length; i++) {
    for (const parts of [[words.slice(0, i).join(" "), words.slice(i).join(" ")], ...Array.from({ length: words.length - i - 1 }, (_, k) => [words.slice(0, i).join(" "), words.slice(i, i + k + 1).join(" "), words.slice(i + k + 1).join(" ")])]) {
      if (sizeOf(parts) > sizeOf(best) + 0.5) best = parts;
    }
  }
  return { lines: best, size: sizeOf(best) };
}

type Crack = { x: number; y: number; dx: number; dy: number; slip: number };

/**
 * Titre fissuré. `crack` 0 → 1 : les fissures se propagent depuis leur point d'impact ; `slip` 0 → 1 : les morceaux glissent
 * le long des fissures ; `fall` 0 → 1 : les morceaux tombent (sortie) ; `time` : dérive lente des morceaux.
 */
export function ShardTitle({ text, time = 0, crack = 1, slip = 1, fall = 0, palette: [bg, main, accent], fontFamily, className, style }: {
  text: string; time?: number; crack?: number; slip?: number; fall?: number; palette: [string, string, string]; fontFamily?: string; className?: string; style?: CSSProperties;
}) {
  const id = `shard-${React.useId().replace(/[^\w-]/g, "")}`;
  const { lines, size } = shardLines(text);
  const lead = size * 0.88, top = 40, H = top * 2 + lines.length * lead + size * 0.1;
  const seed = seedOf(text);
  // Cinq fissures : quatre presque verticales, une plus couchée ; chacune fait glisser son côté « positif »
  const cracks: Crack[] = Array.from({ length: 5 }, (_, i) => {
    const steep = i !== 2;
    const a = (steep ? 58 + hash(seed, i) * 26 : 18 + hash(seed, i) * 16) * (hash(seed, i + 10) > 0.5 ? 1 : -1) * Math.PI / 180;
    return { x: 120 + ((i + 0.5) / 5) * 760 + (hash(seed, i + 20) - 0.5) * 120, y: top + (0.25 + hash(seed, i + 30) * 0.5) * lines.length * lead, dx: Math.cos(a), dy: Math.sin(a), slip: (12 + hash(seed, i + 40) * 22) * (hash(seed, i + 50) > 0.5 ? 1 : -1) };
  });
  const L = 2600;
  const half = (c: Crack, side: 1 | -1) => {
    const nx = -c.dy * side, ny = c.dx * side;
    const p = [[c.x - c.dx * L, c.y - c.dy * L], [c.x + c.dx * L, c.y + c.dy * L], [c.x + c.dx * L + nx * L, c.y + c.dy * L + ny * L], [c.x - c.dx * L + nx * L, c.y - c.dy * L + ny * L]];
    return p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  };
  const k = Math.max(0, Math.min(1, slip));
  const glyphs = <text textAnchor="middle" fontFamily={fontFamily} fontSize={size} fill={main} letterSpacing={size * 0.005}>
    {lines.map((line, i) => <tspan key={i} x="500" y={top + size * 0.86 + i * lead}>{line}</tspan>)}
  </text>;
  const cx = 500, cy = H / 2;
  const cells = crack <= 0.001 && fall <= 0 ? glyphs : Array.from({ length: 2 ** cracks.length }, (_, mask) => {
    let tx = 0, ty = 0;
    cracks.forEach((c, i) => { if (mask & (1 << i)) { tx += c.dx * c.slip * k; ty += c.dy * c.slip * k; } });
    // Chute : chaque morceau part avec sa vitesse, sa dérive et sa rotation
    const f = Math.max(0, fall), drift = Math.sin(time * 0.7 + mask) * 1.5 * k;
    const fx = (hash(mask, 3) - 0.5) * 260 * f, fy = (220 + hash(mask, 4) * 520) * f * f, rot = (hash(mask, 5) - 0.5) * 70 * f;
    let node: React.ReactNode = <g transform={`translate(${(tx + fx + drift).toFixed(2)} ${(ty + fy).toFixed(2)}) rotate(${rot.toFixed(2)} ${cx} ${cy})`}>{glyphs}</g>;
    cracks.forEach((_, i) => { node = <g clipPath={`url(#${id}-h${i}${mask & (1 << i) ? "p" : "n"})`}>{node}</g>; });
    return <React.Fragment key={mask}>{node}</React.Fragment>;
  });
  const shown = Math.max(0, Math.min(1, crack));
  return <div className={className} style={{ width: "100%", ...style }}>
    <svg viewBox={`0 0 1000 ${H.toFixed(1)}`} width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
      <defs>
        {cracks.map((c, i) => <React.Fragment key={i}>
          <clipPath id={`${id}-h${i}p`}><polygon points={half(c, 1)} /></clipPath>
          <clipPath id={`${id}-h${i}n`}><polygon points={half(c, -1)} /></clipPath>
        </React.Fragment>)}
      </defs>
      <g opacity={1 - Math.max(0, fall - 0.6) / 0.4}>{cells}</g>
      {/* Fissures : traits du fond qui se propagent depuis l'impact, et éclats fins accrochés */}
      {shown > 0 && fall < 0.3 && cracks.map((c, i) => {
        const r = shown * 900;
        return <g key={i} opacity={1 - fall / 0.3}>
          <line x1={c.x - c.dx * r} y1={c.y - c.dy * r} x2={c.x + c.dx * r} y2={c.y + c.dy * r} stroke={bg} strokeWidth={4 + 3 * k} strokeLinecap="round" />
          {[0.3, -0.45].map((t, j) => {
            const along = t * lines.length * lead * 0.55, px = c.x + c.dx * along, py = c.y + c.dy * along, len = 50 + hash(seed + i, j) * 60, w = 6 + hash(seed + i, j + 5) * 6;
            const off = (j ? -1 : 1) * (8 + 6 * k);
            const pts = [[px - c.dy * off, py + c.dx * off], [px + c.dx * len - c.dy * (off + w), py + c.dy * len + c.dx * (off + w)], [px + c.dx * len * 0.4 - c.dy * (off + w * 1.6), py + c.dy * len * 0.4 + c.dx * (off + w * 1.6)]];
            return Math.abs(t) * 2 <= shown * 2 ? <polygon key={j} points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} fill={j && i % 2 ? accent : main} opacity={0.95 * k} /> : null;
          })}
        </g>;
      })}
    </svg>
  </div>;
}

/** Fond : noir, voile très léger et fines rayures de verre qui scintillent en cloche, grain. */
export function ShardBackdrop({ palette: [bg, main], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const W = 1000, H = W / aspectRatio, t = Math.max(0, time);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(80% 50% at 50% 45%, color-mix(in srgb, ${main} 5%, transparent), transparent 70%)` }} />
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      {Array.from({ length: 7 }, (_, i) => {
        const x = hash(i, 1) * W, y = hash(i, 2) * H, a = (hash(i, 3) - 0.5) * 2.4, l = 60 + hash(i, 4) * 160;
        return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke={main} strokeWidth={0.8} opacity={0.04 + 0.1 * (0.5 + 0.5 * Math.cos(t * (0.6 + hash(i, 5)) + i)) ** 2} />;
      })}
    </svg>
    <NoiseGrain seed={27} opacity={0.12} />
  </div>;
}

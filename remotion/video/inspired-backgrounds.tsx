import type { CSSProperties, ReactNode } from "react";

/**
 * Fonds « inspirés » (anneau de tuiles, tunnel néon, grunge, halftone, rayons, mosaïque, grain, néon liquide, cosmos,
 * ruban de soie, globe en points, panneau LED, papier marbré, circuit imprimé).
 * Partagés par le rendu vidéo (backgrounds.tsx) et les miniatures de la galerie (video-placeholder.tsx).
 * Tout dépend du temps (s) et de la pulsation du beat : aucun état, rendu déterministe.
 * Dessinés dans un viewBox de 1000 de large à la proportion du cadre, pour que les cercles restent ronds.
 */
export const INSPIRED_BACKGROUNDS = ["tile-ring", "neon-tunnel", "grunge", "optic", "burst-panels", "gradient-mosaic", "grain-wave", "neon-flow", "cosmic", "silk-ribbon", "wire-globe", "led-matrix", "marble", "circuit"] as const;
export type InspiredBackgroundKind = (typeof INSPIRED_BACKGROUNDS)[number];
export const isInspiredBackground = (kind: string): kind is InspiredBackgroundKind => (INSPIRED_BACKGROUNDS as readonly string[]).includes(kind);

type Ctx = { W: number; H: number; min: number; t: number; pulse: number; bg: string; main: string; accent: string; uid: string };

const n = (v: number) => Math.round(v * 10) / 10;
/** Deterministic hash in [0, 1). */
const hash = (a: number, b = 0, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const hex = (color: string) => /^#[0-9a-f]{6}$/i.test(color) ? color : "#888888";
const mix = (a: string, b: string, k: number) => { a = hex(a); b = hex(b); return "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join(""); };
const luminance = (color: string) => { const c = hex(color); return (parseInt(c.slice(1, 3), 16) * 0.299 + parseInt(c.slice(3, 5), 16) * 0.587 + parseInt(c.slice(5, 7), 16) * 0.114) / 255; };
const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
const fill: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" };

export function InspiredBackground({ kind, palette, time = 0, pulse = 0, aspect = 9 / 16, uid = "ib" }: { kind: InspiredBackgroundKind; palette: [string, string, string]; time?: number; pulse?: number; aspect?: number; uid?: string }) {
  const W = 1000, H = W / aspect;
  const c: Ctx = { W, H, min: Math.min(W, H), t: time, pulse, bg: hex(palette[0]), main: hex(palette[1]), accent: hex(palette[2]), uid: uid.replace(/[^\w-]/g, "") };
  const svg = (children: ReactNode, defs?: ReactNode) => <svg viewBox={`0 0 ${W} ${n(H)}`} preserveAspectRatio="xMidYMid slice" style={{ ...fill, width: "100%", height: "100%" }} aria-hidden>{defs && <defs>{defs}</defs>}{children}</svg>;
  return <div style={{ ...fill, background: c.bg }}>{RENDER[kind](c, svg)}</div>;
}

type Svg = (children: ReactNode, defs?: ReactNode) => ReactNode;

const RENDER: Record<InspiredBackgroundKind, (c: Ctx, svg: Svg) => ReactNode> = {
  /** A thin studio grid and a ring of rounded tiles orbiting in 3D around the copy; front tiles are bigger and brighter. */
  "tile-ring": ({ W, H, min, t, pulse, bg, main, accent, uid }, svg) => {
    const light = luminance(bg) > 0.6, line = light ? "#000000" : "#ffffff";
    const step = W / 5.2, cx = W / 2, cy = H / 2, rx = Math.min(W * 0.4, H * 0.62) * (1 + 0.025 * pulse), ry = Math.max(rx * 0.42, H * 0.25), N = 10;
    const tiles = Array.from({ length: N }, (_, i) => {
      const a = t * 0.32 + (i / N) * Math.PI * 2, depth = (Math.sin(a) + 1) / 2;
      const y = cy + ry * Math.sin(a);
      // Tiles crossing the reading band (where titles sit) fade out so the copy stays legible.
      const band = Math.min(1, Math.abs(y - cy) / (H * 0.17));
      return { i, x: cx + rx * Math.cos(a), y, depth, band, s: min * 0.16 * (0.66 + 0.5 * depth) };
    }).sort((a, b) => a.depth - b.depth);
    const paper = light ? "#ffffff" : "#f4f4f1";
    const tile = ({ i, x, y, s, band }: (typeof tiles)[number]) => {
      const r = s * 0.2, x0 = x - s / 2, y0 = y - s / 2, v = i % 5;
      return <g key={i} opacity={n((0.12 + 0.88 * band ** 2) * 100) / 100}>
        <rect x={n(x0 + s * 0.04)} y={n(y0 + s * 0.08)} width={n(s)} height={n(s)} rx={n(r)} fill="#000000" opacity={light ? 0.12 : 0.4} />
        <rect x={n(x0)} y={n(y0)} width={n(s)} height={n(s)} rx={n(r)} fill={v === 1 ? accent : v === 2 ? `url(#${uid}-tg)` : v === 4 ? `url(#${uid}-tp)` : paper} />
        {v === 0 && <><circle cx={n(x)} cy={n(y)} r={n(s * 0.34)} fill="none" stroke={accent} strokeWidth={n(s * 0.025)} /><rect x={n(x - s * 0.26)} y={n(y - s * 0.04)} width={n(s * 0.52)} height={n(s * 0.08)} rx={n(s * 0.04)} fill={accent} /></>}
        {v === 1 && <><rect x={n(x - s * 0.22)} y={n(y - s * 0.13)} width={n(s * 0.44)} height={n(s * 0.08)} fill={paper} /><rect x={n(x - s * 0.22)} y={n(y + s * 0.05)} width={n(s * 0.44)} height={n(s * 0.08)} fill={paper} /></>}
        {v === 3 && <><circle cx={n(x)} cy={n(y + s * 0.04)} r={n(s * 0.22)} fill="#111111" /><circle cx={n(x - s * 0.08)} cy={n(y)} r={n(s * 0.035)} fill={paper} /><circle cx={n(x + s * 0.08)} cy={n(y)} r={n(s * 0.035)} fill={paper} /><rect x={n(x - s * 0.24)} y={n(y - s * 0.28)} width={n(s * 0.48)} height={n(s * 0.09)} rx={n(s * 0.04)} fill="#111111" /></>}
        {v === 4 && Array.from({ length: 4 }, (_, k) => <rect key={k} x={n(x0 + s * 0.12)} y={n(y0 + s * (0.5 + k * 0.1))} width={n(s * 0.76)} height={n(s * 0.025)} fill="#ffffff" opacity={0.35} />)}
      </g>;
    };
    let grid = "";
    for (let x = (W / 2) % step; x < W; x += step) grid += `M${n(x)} 0V${n(H)}`;
    for (let y = (H / 2) % step; y < H; y += step) grid += `M0 ${n(y)}H${W}`;
    return svg(<>
      <path d={grid} stroke={line} strokeOpacity={light ? 0.1 : 0.16} strokeWidth="2" />
      {tiles.map(tile)}
    </>, <>
      <linearGradient id={`${uid}-tg`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={main} /><stop offset="1" stopColor={accent} /></linearGradient>
      <linearGradient id={`${uid}-tp`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9aa3ad" /><stop offset=".55" stopColor="#5d646b" /><stop offset="1" stopColor="#2f3438" /></linearGradient>
    </>);
  },

  /** Neon box tunnel: frames rush toward the camera, edge rails run to the vanishing point, wall tiles light up. */
  "neon-tunnel": ({ W, H, t, pulse, main, accent, uid }, svg) => {
    const cx = W / 2, cy = H / 2, count = 12, glow = 0.8 + 0.4 * pulse;
    const frames = Array.from({ length: count }, (_, k) => {
      const u = ((k + t * 1.6) % count) / count, s = 0.04 + u ** 2.4 * 1.5;
      return { k, u, s, alpha: Math.min(1, u * 4) * (u > 0.92 ? (1 - u) / 0.08 : 1) };
    }).sort((a, b) => a.u - b.u);
    return svg(<>
      <rect width={W} height={n(H)} fill={`url(#${uid}-depth)`} />
      <path d={`M${cx} ${n(cy)}L0 0M${cx} ${n(cy)}L${W} 0M${cx} ${n(cy)}L0 ${n(H)}M${cx} ${n(cy)}L${W} ${n(H)}`} stroke={main} strokeOpacity=".35" strokeWidth="3" />
      {frames.map(({ k, u, s, alpha }) => {
        const w = W * s, h = H * s, x = cx - w / 2, y = cy - h / 2;
        const tiles = Array.from({ length: 10 }, (_, j) => {
          const side = Math.floor(hash(k, j) * 4), p = 0.1 + hash(j, k, 3) * 0.8, len = 0.08 + hash(k, j, 7) * 0.18;
          if (side === 0) return `M${n(x + w * p)} ${n(y)}h${n(w * len)}`;
          if (side === 1) return `M${n(x + w * p)} ${n(y + h)}h${n(w * len)}`;
          if (side === 2) return `M${n(x)} ${n(y + h * p)}v${n(h * len)}`;
          return `M${n(x + w)} ${n(y + h * p)}v${n(h * len)}`;
        }).join("");
        return <g key={k} opacity={n(alpha * glow * 100) / 100}>
          <rect x={n(x)} y={n(y)} width={n(w)} height={n(h)} fill="none" stroke={accent} strokeOpacity=".35" strokeWidth={n(4 + u * 26)} />
          <rect x={n(x)} y={n(y)} width={n(w)} height={n(h)} fill="none" stroke={main} strokeWidth={n(1.5 + u * 6)} />
          <path d={tiles} stroke={main} strokeWidth={n(2 + u * 9)} strokeLinecap="square" />
        </g>;
      })}
      <rect x={n(cx - W * 0.07)} y={n(cy - H * 0.07)} width={n(W * 0.14)} height={n(H * 0.14)} fill="#000000" opacity=".85" />
    </>, <radialGradient id={`${uid}-depth`} cx=".5" cy=".5" r=".7"><stop stopColor="#000000" /><stop offset=".55" stopColor={mix(accent, "#000000", 0.75)} /><stop offset="1" stopColor={mix(accent, "#000000", 0.45)} /></radialGradient>);
  },

  /** Street-poster grunge: spray clouds, paint drips, torn tape, a marker scribble that redraws, stop-motion boil. */
  grunge: ({ W, H, t, pulse, bg, main, accent }, svg) => {
    const light = luminance(bg) > 0.6, ink = light ? "#151515" : "#f5f1ea";
    const boil = Math.floor(t * 8);
    const j = (k: number, amp = 3) => (hash(boil, k) - 0.5) * 2 * amp;
    const spray = (cx: number, cy: number, rx: number, ry: number, color: string, seed: number) => <g key={seed}>
      <ellipse cx={n(cx)} cy={n(cy)} rx={n(rx)} ry={n(ry)} fill={color} opacity=".55" />
      {Array.from({ length: 90 }, (_, k) => { const a = hash(seed, k) * Math.PI * 2, d = 0.85 + hash(k, seed, 2) * 0.55; return <circle key={k} cx={n(cx + Math.cos(a) * rx * d + j(k, 2))} cy={n(cy + Math.sin(a) * ry * d + j(k + 50, 2))} r={n(1.5 + hash(seed, k, 4) * 5)} fill={color} opacity={0.35 + hash(k, seed) * 0.5} />; })}
    </g>;
    const drips = (x0: number, y0: number, width: number, color: string, seed: number) => Array.from({ length: 6 }, (_, k) => {
      const x = x0 + (k / 5) * width + j(k + seed, 1.5), grow = ((t * 0.35 + hash(seed, k)) % 1), len = H * (0.05 + hash(k, seed, 3) * 0.14) * Math.min(1, grow * 1.6);
      return <g key={`${seed}-${k}`}><path d={`M${n(x)} ${n(y0)}v${n(len)}`} stroke={color} strokeWidth={n(6 + hash(k, seed) * 8)} strokeLinecap="round" /><circle cx={n(x)} cy={n(y0 + len)} r={n(5 + hash(seed, k, 9) * 6)} fill={color} /></g>;
    });
    const tape = (x: number, y: number, w: number, rot: number, seed: number) => {
      const teeth = Array.from({ length: 7 }, (_, k) => `${n(w + (k % 2 ? 8 : 0))},${n((k / 6) * 70)}`).join(" ");
      return <polygon key={seed} points={`0,0 ${teeth} ${Array.from({ length: 7 }, (_, k) => `${k % 2 ? -8 : 0},${n(70 - (k / 6) * 70)}`).join(" ")}`} fill={light ? "#d8d2c4" : "#ece6d8"} opacity=".72" transform={`translate(${n(x + j(seed, 2))} ${n(y + j(seed + 1, 2))}) rotate(${rot})`} />;
    };
    const draw = (t * 0.45) % 1;
    return <>
      {svg(<>
        {spray(W * 0.18, H * 0.16, W * 0.32, H * 0.06, main, 1)}
        {drips(W * 0.02, H * 0.19, W * 0.34, main, 1)}
        {spray(W * 0.86, H * 0.84, W * 0.3, H * 0.07, accent, 2)}
        {drips(W * 0.66, H * 0.88, W * 0.3, accent, 2)}
        {/* Halftone patch, like a photocopied corner */}
        {Array.from({ length: 10 * 8 }, (_, k) => { const q = k % 10, r = Math.floor(k / 10), size = Math.max(0, 1 - (q + r) / 14) * 9; return size > 0.8 && <circle key={`h${k}`} cx={n(W * 0.04 + q * 22)} cy={n(H * 0.55 + r * 22)} r={n(size)} fill={main} opacity=".55" />; })}
        {tape(-30, H * 0.06, W * 0.34, -14, 3)}
        {tape(W * 0.72, H * 0.02, W * 0.3, 11, 4)}
        {tape(W * 0.05, H * 0.9, W * 0.28, 8, 5)}
        <path d={`M${n(W * 0.6)} ${n(H * 0.12)}c80 -40 190 -10 150 40s-210 40 -170 -10 220 -50 260 0`} fill="none" stroke={accent} strokeWidth="12" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={n((1 - Math.min(1, draw * 1.5)) * 100) / 100} />
        <path d={`M${n(W * 0.08)} ${n(H * 0.72)}l70 -18m-70 18l18 -60`} stroke={ink} strokeWidth="9" strokeLinecap="round" opacity=".85" transform={`rotate(${n(j(9, 2))} ${n(W * 0.1)} ${n(H * 0.7)})`} />
        {[[0.84, 0.32], [0.12, 0.42], [0.9, 0.62]].map(([x, y], k) => <path key={k} d={`M${n(W * x - 18)} ${n(H * y - 18)}l36 36m0 -36l-36 36`} stroke={k === 1 ? accent : ink} strokeWidth="8" strokeLinecap="round" opacity={0.6 + 0.4 * pulse} />)}
      </>)}
      <div style={{ ...fill, backgroundImage: NOISE, backgroundSize: "220px 220px", opacity: light ? 0.32 : 0.22, mixBlendMode: light ? "multiply" : "screen" }} />
    </>;
  },

  /** Halftone portrait field in blue, a white focus frame that hops between targets with a warm glow inside, micro type. */
  optic: ({ W, H, t, bg, main, accent, uid }, svg) => {
    const step = W / 46, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1;
    const dark = mix(bg, "#000000", 0.7);
    // Head-and-shoulders silhouette: a head ellipse that breathes slightly and broad shoulders at the bottom.
    const blobs = [[0.5 + 0.02 * Math.sin(t * 0.3), 0.38, 0.27, 0.95], [0.5, 1.02, 0.62, 0.55]];
    let dots = "";
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const x = q * step + (r % 2 ? step / 2 : 0), y = r * step;
      const d = Math.max(...blobs.map(([bx, by, br, squash]) => 1 - Math.hypot((x / W - bx) / br, (y - by * H) / (br * W * 1.25 * squash))));
      const rad = Math.max(0, Math.min(1, d * 1.6)) * step * 0.5;
      if (rad > 0.6) dots += `M${n(x - rad)} ${n(y)}a${n(rad)} ${n(rad)} 0 1 0 ${n(rad * 2)} 0a${n(rad)} ${n(rad)} 0 1 0 ${n(-rad * 2)} 0`;
    }
    const targets = [[0.62, 0.42], [0.4, 0.5], [0.56, 0.6]], seg = t / 1.9, from = targets[Math.floor(seg) % 3], to = targets[(Math.floor(seg) + 1) % 3];
    const k = Math.min(1, (seg % 1) / 0.35), e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
    const fw = W * 0.26, fh = fw * 2.2, fx = W * (from[0] + (to[0] - from[0]) * e) - fw / 2, fy = H * (from[1] + (to[1] - from[1]) * e) - fh / 2;
    const corner = W * 0.028, mono = "ui-monospace, SFMono-Regular, Menlo, monospace", tc = `00:${String(Math.floor(t) % 60).padStart(2, "0")}:${String(Math.floor((t % 1) * 30)).padStart(2, "0")}`;
    return <>
      {svg(<>
        <rect width={W} height={n(H)} fill={`url(#${uid}-tone)`} />
        <path d={dots} fill={dark} />
        <rect x={n(fx)} y={n(fy)} width={n(fw)} height={n(fh)} fill={`url(#${uid}-warm)`} />
        <rect x={n(fx)} y={n(fy)} width={n(fw)} height={n(fh)} fill="none" stroke={main} strokeWidth="3" />
        {[[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]].map(([x, y], i) => <rect key={i} x={n(x - corner / 2)} y={n(y - corner / 2)} width={n(corner)} height={n(corner)} fill="none" stroke={main} strokeWidth="3" />)}
        <path d={`M${n(fx + fw / 2 - 22)} ${n(fy + fh / 2)}h44M${n(fx + fw / 2)} ${n(fy + fh / 2 - 22)}v44`} stroke={main} strokeWidth="3" />
        <g fill={main} fontFamily={mono} fontSize={n(W * 0.022)} opacity=".85">
          <text x={n(W * 0.04)} y={n(H * 0.04)}>light</text><text x={n(W / 2)} y={n(H * 0.04)} textAnchor="middle">focus</text><text x={n(W * 0.96)} y={n(H * 0.04)} textAnchor="end">shine</text>
          <text x={n(W * 0.04)} y={n(H * 0.97)} fontSize={n(W * 0.03)}>{tc}</text>
        </g>
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x={n(W * 0.16 + i * W * 0.0045 + (i % 3) * 2)} y={n(H * 0.84)} width={n(i % 4 ? 2 : 4)} height={n(W * 0.045)} fill={main} opacity=".8" />)}
      </>, <>
        <radialGradient id={`${uid}-tone`} cx=".45" cy=".3" r=".9"><stop stopColor={mix(bg, "#ffffff", 0.18)} /><stop offset="1" stopColor={mix(bg, "#000000", 0.25)} /></radialGradient>
        <radialGradient id={`${uid}-warm`} cx=".35" cy=".45" r=".7"><stop stopColor={accent} stopOpacity=".95" /><stop offset=".6" stopColor={accent} stopOpacity=".55" /><stop offset="1" stopColor={accent} stopOpacity=".1" /></radialGradient>
      </>)}
      <div style={{ ...fill, backgroundImage: NOISE, backgroundSize: "220px 220px", opacity: 0.18, mixBlendMode: "overlay" }} />
    </>;
  },

  /** Sport-brand system: rotating sunburst wedges in a corner, an outlined panel with chevrons, a dot row lit on the beat. */
  "burst-panels": ({ W, H, t, pulse, main, accent }, svg) => {
    const R = Math.max(W, H) * 0.52, sway = Math.sin(t * 0.5) * 7;
    const wedges = Array.from({ length: 11 }, (_, i) => {
      const a0 = (180 + i * 9 + sway) * Math.PI / 180, a1 = a0 + 4 * Math.PI / 180;
      return `M${W} ${n(H)}L${n(W + Math.cos(a0) * R)} ${n(H + Math.sin(a0) * R)}L${n(W + Math.cos(a1) * R)} ${n(H + Math.sin(a1) * R)}Z`;
    }).join("");
    const beat = Math.floor(t * 2.1) % 5, chev = Math.floor(t * 4) % 4;
    return svg(<>
      <path d={wedges} fill={main} opacity=".9" />
      <circle cx={W} cy={n(H)} r={n(R * 0.28)} fill={main} />
      <rect x={n(-W * 0.12)} y={n(H * 0.05)} width={n(W * 0.42)} height={n(H * 0.12)} rx={n(W * 0.06)} fill={main} />
      <rect x={n(W * 0.46)} y={n(H * 0.07)} width={n(W * 0.46)} height={n(W * 0.075)} rx={n(W * 0.038)} fill="none" stroke={accent} strokeOpacity=".7" strokeWidth="3" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${n(W * 0.06 + i * W * 0.045)} ${n(H * 0.3)}l${n(W * 0.03)} ${n(W * 0.03)}l${n(-W * 0.03)} ${n(W * 0.03)}`} fill="none" stroke={main} strokeWidth="6" opacity={i === chev ? 1 : 0.3} />)}
      <g fill={accent} opacity=".65">{[0, 1, 2, 3].map((i) => <path key={i} d={`M${n(W * 0.8 + i * W * 0.04)} ${n(H * 0.36)}l14 14m0 -14l-14 14`} stroke={accent} strokeWidth="3" />)}</g>
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${n(W * 0.06 + i * W * 0.06)} ${n(H * 0.88)}h${n(W * 0.022)}a${n(W * 0.022)} ${n(W * 0.022)} 0 0 1 0 ${n(W * 0.044)}h${n(-W * 0.022)}z`} fill={i <= beat - 1 ? main : "none"} stroke={main} strokeWidth="3" transform={i === beat - 1 ? `translate(0 ${n(-pulse * 6)})` : undefined} />)}
      <path d={`M${n(W * 0.06)} ${n(H * 0.82)}H${n(W * 0.6)}`} stroke={accent} strokeOpacity=".35" strokeWidth="2" />
    </>);
  },

  /** Black grid of tiles: gradient cells and "=" marks switch on the beat, with a round badge; the centre stays calm for the copy. */
  "gradient-mosaic": ({ W, H, t, main, accent, uid }, svg) => {
    const cols = W > H ? 6 : 4, cell = W / cols, rows = Math.ceil(H / cell), phase = Math.floor(t * 2.1), frac = (t * 2.1) % 1;
    const cells: ReactNode[] = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const x = q * cell, y = r * cell, h1 = hash(q, r, phase), h0 = hash(q, r, phase - 1);
      const central = Math.abs(y + cell / 2 - H / 2) < H * 0.2 && Math.abs(x + cell / 2 - W / 2) < W * 0.42;
      const state = (h: number) => h < 0.3 ? "grad" : h < 0.38 ? "equal" : h < 0.42 ? "badge" : "none";
      const now = state(h1), before = state(h0), alpha = now === before ? 1 : Math.min(1, frac * 4);
      const dim = central ? 0.35 : 1, pad = cell * 0.04;
      cells.push(<g key={`${q}-${r}`} opacity={n(alpha * dim * 100) / 100}>
        {now === "grad" && <rect x={n(x + pad)} y={n(y + pad)} width={n(cell - pad * 2)} height={n(cell - pad * 2)} fill={`url(#${uid}-${(q + r) % 2 ? "ga" : "gb"})`} />}
        {now === "equal" && <><rect x={n(x + cell * 0.25)} y={n(y + cell * 0.36)} width={n(cell * 0.5)} height={n(cell * 0.1)} fill={`url(#${uid}-ga)`} /><rect x={n(x + cell * 0.25)} y={n(y + cell * 0.54)} width={n(cell * 0.5)} height={n(cell * 0.1)} fill={`url(#${uid}-ga)`} /></>}
        {now === "badge" && <><circle cx={n(x + cell / 2)} cy={n(y + cell / 2)} r={n(cell * 0.32)} fill="none" stroke={main} strokeWidth="3" />{Array.from({ length: 16 }, (_, k) => <circle key={k} cx={n(x + cell / 2 + Math.cos(k / 16 * Math.PI * 2 + t) * cell * 0.4)} cy={n(y + cell / 2 + Math.sin(k / 16 * Math.PI * 2 + t) * cell * 0.4)} r="3" fill={accent} />)}</>}
      </g>);
    }
    return svg(<>
      <path d={Array.from({ length: cols + 1 }, (_, q) => `M${n(q * cell)} 0V${n(H)}`).join("") + Array.from({ length: rows + 1 }, (_, r) => `M0 ${n(r * cell)}H${W}`).join("")} stroke="#ffffff" strokeOpacity=".06" strokeWidth="2" />
      {cells}
    </>, <>
      <linearGradient id={`${uid}-ga`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={main} /><stop offset="1" stopColor={accent} /></linearGradient>
      <linearGradient id={`${uid}-gb`} x1="1" y1="0" x2="0" y2="1"><stop stopColor={accent} /><stop offset="1" stopColor={mix(main, "#000000", 0.35)} /></linearGradient>
    </>);
  },

  /** Grainy gradient waves: blurred bands of colour flow across the frame under a heavy film grain. */
  "grain-wave": ({ W, H, t, main, accent, uid }, svg) => {
    const band = (y: number, amp: number, phase: number, thick: number, dir: 1 | -1) => {
      const top: string[] = [], bottom: string[] = [];
      for (let s = 0; s <= 24; s++) {
        const x = -W * 0.2 + (s / 24) * W * 1.4, wave = Math.sin(s / 24 * Math.PI * 2.2 + t * 0.45 * dir + phase) * amp * H;
        top.push(`${n(x)},${n(H * y + wave - thick * H / 2)}`); bottom.unshift(`${n(x)},${n(H * y + wave * 0.6 + thick * H / 2)}`);
      }
      return `M${top.join("L")}L${bottom.join("L")}Z`;
    };
    return <>
      {svg(<g filter={`url(#${uid}-soft)`}>
        <path d={band(0.08, 0.05, 0, 0.26, 1)} fill={`url(#${uid}-wa)`} />
        <path d={band(0.9, 0.06, 2.4, 0.3, -1)} fill={`url(#${uid}-wa)`} />
        <path d={band(0.5, 0.03, 4.1, 0.08, 1)} fill={main} opacity=".35" />
      </g>, <>
        <filter id={`${uid}-soft`} x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="40" /></filter>
        <linearGradient id={`${uid}-wa`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={accent} /><stop offset=".5" stopColor={main} /><stop offset="1" stopColor={accent} /></linearGradient>
      </>)}
      <div style={{ ...fill, backgroundImage: NOISE, backgroundSize: "180px 180px", opacity: 0.45, mixBlendMode: "overlay" }} />
      <div style={{ ...fill, backgroundImage: NOISE, backgroundSize: "260px 260px", opacity: 0.12, mixBlendMode: "screen" }} />
    </>;
  },

  /** Liquid neon tubes: glowing blue-to-pink strokes hug the edges and wobble, with a white-hot core. */
  "neon-flow": ({ W, H, t, pulse, main, accent, uid }, svg) => {
    const w = (k: number, a = 1) => Math.sin(t * 0.9 + k) * a;
    const left = `M${n(W * 0.05)} -40 C${n(W * (0.04 + 0.02 * w(0)))} ${n(H * 0.3)}, ${n(W * (0.12 + 0.05 * w(1)))} ${n(H * 0.55)}, ${n(W * 0.06)} ${n(H * 0.7)} S${n(W * (0.02 + 0.03 * w(2)))} ${n(H * 0.95)}, ${n(W * 0.04)} ${n(H + 40)}`;
    const loop = `M${n(W * 0.06)} ${n(H * 0.18)} C${n(W * 0.4)} ${n(H * (0.17 + 0.01 * w(3)))}, ${n(W * 0.85)} ${n(H * 0.16)}, ${n(W * (0.92 + 0.02 * w(4)))} ${n(H * 0.2)} S${n(W * 0.55)} ${n(H * (0.25 + 0.01 * w(5)))}, ${n(W * 0.06)} ${n(H * 0.23)}`;
    const right = `M${n(W * 0.97)} -40 C${n(W * (0.95 + 0.02 * w(6)))} ${n(H * 0.35)}, ${n(W * (0.9 + 0.04 * w(7)))} ${n(H * 0.6)}, ${n(W * 0.98)} ${n(H * 0.8)} S${n(W * 0.95)} ${n(H)}, ${n(W * 0.96)} ${n(H + 40)}`;
    const tube = (d: string, key: string) => <g key={key} fill="none" strokeLinecap="round">
      <path d={d} stroke={`url(#${uid}-ng)`} strokeWidth="90" opacity={n((0.14 + 0.08 * pulse) * 100) / 100} />
      <path d={d} stroke={`url(#${uid}-ng)`} strokeWidth="34" opacity=".5" />
      <path d={d} stroke={`url(#${uid}-ng)`} strokeWidth="12" />
      <path d={d} stroke="#ffffff" strokeWidth="3" opacity=".85" />
    </g>;
    return svg(<>
      <rect width={W} height={n(H)} fill={`url(#${uid}-room)`} />
      {tube(left, "l")}{tube(loop, "o")}{tube(right, "r")}
    </>, <>
      <linearGradient id={`${uid}-ng`} x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse"><stop stopColor={main} /><stop offset=".45" stopColor={accent} /><stop offset="1" stopColor={mix(accent, "#ffb347", 0.25)} /></linearGradient>
      <radialGradient id={`${uid}-room`} cx=".5" cy=".55" r=".75"><stop stopColor={mix(accent, "#000000", 0.85)} /><stop offset="1" stopColor="#000000" stopOpacity="0" /></radialGradient>
    </>);
  },

  /**
   * Cosmic: a lit planet (surface bands, night side, atmospheric rim) on the left, a ring with orbiting particles,
   * twinkling stars, nebula clouds, a shooting star now and then, and glowing contour-line blobs drifting in neon colours.
   */
  cosmic: ({ W, H, t, pulse, main, accent, uid }, svg) => {
    const R = Math.max(W, H) * 0.42, px = -R * 0.35, py = H * 0.48;
    const colors = [accent, main, mix(accent, "#ff4fd8", 0.5), mix(main, "#ffffff", 0.3)];
    const blob = (cx: number, cy: number, base: number, seed: number) => Array.from({ length: 3 }, (_, ring) => {
      const scale = 1 - ring * 0.28, pts: string[] = [];
      for (let s = 0; s <= 36; s++) {
        const a = (s / 36) * Math.PI * 2, r = base * scale * (1 + 0.2 * Math.sin(3 * a + t * 0.6 + seed) + 0.1 * Math.sin(5 * a - t * 0.4 + seed * 2));
        pts.push(`${n(cx + Math.cos(a) * r)},${n(cy + Math.sin(a) * r)}`);
      }
      const color = colors[(seed + ring) % colors.length];
      return <g key={`${seed}-${ring}`} strokeLinejoin="round" fill="none">
        <polygon points={pts.join(" ")} stroke={color} strokeWidth="14" opacity=".12" />
        <polygon points={pts.join(" ")} stroke={color} strokeWidth={ring === 2 ? 5 : 3} opacity={0.9 - ring * 0.15} />
      </g>;
    });
    const drift = (k: number) => Math.sin(t * 0.25 + k) * 30;
    const stars = Array.from({ length: 90 }, (_, k) => ({ x: hash(k, 1) * W, y: hash(k, 2) * H, r: 0.8 + hash(k, 3) * 2.4, o: 0.25 + 0.75 * Math.abs(Math.sin(t * (0.8 + hash(k, 4) * 2) + k)) }));
    const ringAngle = -58 + Math.sin(t * 0.2) * 4, rcx = W * 0.45, rcy = H * 0.5, rrx = W * 1.1, rry = W * 0.16;
    const particles = Array.from({ length: 46 }, (_, k) => {
      const a = (k / 46) * Math.PI * 2 + t * 0.25, rad = ringAngle * Math.PI / 180;
      const ex = Math.cos(a) * rrx * (0.96 + hash(k, 9) * 0.08), ey = Math.sin(a) * rry * (0.9 + hash(k, 8) * 0.2);
      return { x: rcx + ex * Math.cos(rad) - ey * Math.sin(rad), y: rcy + ex * Math.sin(rad) + ey * Math.cos(rad), front: Math.sin(a) > 0, r: 2 + hash(k, 7) * 3 };
    });
    const shot = (t % 4.6) / 0.9, sx = W * (0.95 - shot * 0.6), sy = H * (0.06 + shot * 0.18);
    return svg(<>
      <rect width={W} height={n(H)} fill={`url(#${uid}-sky)`} />
      <ellipse cx={n(W * 0.8)} cy={n(H * 0.22)} rx={n(W * 0.6)} ry={n(H * 0.18)} fill={`url(#${uid}-neb1)`} />
      <ellipse cx={n(W * 0.55)} cy={n(H * 0.86)} rx={n(W * 0.7)} ry={n(H * 0.16)} fill={`url(#${uid}-neb2)`} />
      {stars.map((s, k) => <circle key={k} cx={n(s.x)} cy={n(s.y)} r={n(s.r)} fill="#ffffff" opacity={n(s.o * 100) / 100} />)}
      {shot < 1 && <path d={`M${n(sx)} ${n(sy)}l${n(W * 0.16)} ${n(-H * 0.05)}`} stroke={`url(#${uid}-shot)`} strokeWidth="4" strokeLinecap="round" opacity={n((1 - shot) * 100) / 100} />}
      {particles.filter((p) => !p.front).map((p, k) => <circle key={`b${k}`} cx={n(p.x)} cy={n(p.y)} r={n(p.r * 0.7)} fill={mix(main, "#ffffff", 0.4)} opacity=".35" />)}
      <circle cx={n(px)} cy={n(py)} r={n(R * 1.25)} fill={`url(#${uid}-halo)`} opacity={n((0.75 + 0.25 * pulse) * 100) / 100} />
      <circle cx={n(px)} cy={n(py)} r={n(R)} fill={`url(#${uid}-body)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        {Array.from({ length: 7 }, (_, k) => <ellipse key={k} cx={n(px + Math.sin(t * 0.15 + k) * 20)} cy={n(py - R * 0.8 + k * R * 0.27)} rx={n(R * 1.3)} ry={n(R * (0.05 + hash(k, 5) * 0.06))} fill={k % 2 ? mix(main, "#ffffff", 0.35) : mix(accent, main, 0.5)} opacity=".16" transform={`rotate(-8 ${n(px)} ${n(py)})`} />)}
        <circle cx={n(px)} cy={n(py)} r={n(R)} fill={`url(#${uid}-night)`} />
      </g>
      <circle cx={n(px)} cy={n(py)} r={n(R)} fill="none" stroke="#ffffff" strokeWidth="14" opacity=".9" />
      <circle cx={n(px)} cy={n(py)} r={n(R)} fill="none" stroke={main} strokeWidth="70" opacity=".3" />
      <ellipse cx={n(rcx)} cy={n(rcy)} rx={n(rrx)} ry={n(rry)} fill="none" stroke={main} strokeWidth="18" opacity=".12" transform={`rotate(${n(ringAngle)} ${n(rcx)} ${n(rcy)})`} />
      <ellipse cx={n(rcx)} cy={n(rcy)} rx={n(rrx)} ry={n(rry)} fill="none" stroke={main} strokeWidth="4" opacity=".7" transform={`rotate(${n(ringAngle)} ${n(rcx)} ${n(rcy)})`} />
      {particles.filter((p) => p.front).map((p, k) => <circle key={`f${k}`} cx={n(p.x)} cy={n(p.y)} r={n(p.r)} fill="#ffffff" opacity=".9" />)}
      {blob(W * 0.72 + drift(1), H * 0.18, W * 0.14, 1)}
      {blob(W * 0.82 + drift(2), H * 0.5, W * 0.11, 2)}
      {blob(W * 0.62 + drift(3), H * 0.82, W * 0.16, 3)}
      {blob(W * 0.25 + drift(4), H * 0.88, W * 0.08, 4)}
      {blob(W * 0.4 + drift(5), H * 0.08, W * 0.07, 5)}
    </>, <>
      <radialGradient id={`${uid}-sky`} cx=".7" cy=".4" r=".9"><stop stopColor={mix(main, "#000000", 0.55)} /><stop offset="1" stopColor={mix(main, "#000000", 0.88)} /></radialGradient>
      <radialGradient id={`${uid}-neb1`} cx=".5" cy=".5" r=".5"><stop stopColor={accent} stopOpacity=".28" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
      <radialGradient id={`${uid}-neb2`} cx=".5" cy=".5" r=".5"><stop stopColor={mix(main, "#ff4fd8", 0.4)} stopOpacity=".3" /><stop offset="1" stopColor={main} stopOpacity="0" /></radialGradient>
      <linearGradient id={`${uid}-shot`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#ffffff" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${uid}-halo`} cx=".5" cy=".5" r=".5"><stop offset=".62" stopColor={main} stopOpacity="0" /><stop offset=".78" stopColor={mix(main, "#ffffff", 0.6)} stopOpacity=".9" /><stop offset=".86" stopColor={main} stopOpacity=".4" /><stop offset="1" stopColor={main} stopOpacity="0" /></radialGradient>
      <radialGradient id={`${uid}-body`} cx=".78" cy=".42" r=".75"><stop stopColor={mix(main, "#ffffff", 0.55)} /><stop offset=".45" stopColor={main} /><stop offset="1" stopColor={mix(main, "#000000", 0.7)} /></radialGradient>
      <linearGradient id={`${uid}-night`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#000000" stopOpacity=".85" /><stop offset=".55" stopColor="#000000" stopOpacity=".35" /><stop offset=".8" stopColor="#000000" stopOpacity="0" /></linearGradient>
      <clipPath id={`${uid}-clip`}><circle cx={n(px)} cy={n(py)} r={n(R)} /></clipPath>
    </>);
  },

  /** Silk: two wide ribbons flow across the top and bottom, twisting in 3D so their lighter front and darker back alternate. */
  "silk-ribbon": ({ W, H, t, bg, main, accent, uid }, svg) => {
    const light = luminance(bg) > 0.6;
    const ribbon = (seed: number, y0: number, amp: number, width: number, speed: number, tiltDir: number) => {
      const N = 80, pt = (s: number) => {
        const u = s / N;
        return { x: -W * 0.15 + u * W * 1.3, y: H * y0 + Math.sin(u * Math.PI * 1.6 + t * speed + seed) * H * amp + (u - 0.5) * H * 0.12 * tiltDir, twist: Math.cos(u * Math.PI * 2.4 - t * speed * 1.3 + seed * 2) };
      };
      return Array.from({ length: N }, (_, s) => {
        const a = pt(s), b = pt(s + 1), wa = (width * a.twist) / 2, wb = (width * b.twist) / 2, face = (a.twist + b.twist) / 2;
        const shade = Math.abs(face), color = face >= 0 ? mix(mix(main, accent, 0.5 - 0.5 * shade), "#ffffff", shade * 0.28) : mix(main, "#000000", 0.25 + (1 - shade) * 0.3);
        const d = `M${n(a.x)} ${n(a.y - wa)}L${n(b.x)} ${n(b.y - wb)}L${n(b.x)} ${n(b.y + wb)}L${n(a.x)} ${n(a.y + wa)}Z`;
        return <path key={`${seed}-${s}`} d={d} fill={color} stroke={color} strokeWidth="1.2" />;
      });
    };
    return <>
      {svg(<>
        <g filter={`url(#${uid}-shade)`} opacity={light ? 0.18 : 0.35} transform={`translate(0 ${n(H * 0.02)})`}><g fill="#000">{ribbon(1, 0.16, 0.05, H * 0.1, 0.5, 1)}{ribbon(4, 0.84, 0.05, H * 0.12, 0.42, -1)}</g></g>
        {ribbon(1, 0.16, 0.05, H * 0.1, 0.5, 1)}
        {ribbon(4, 0.84, 0.05, H * 0.12, 0.42, -1)}
      </>, <filter id={`${uid}-shade`} x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="22" /></filter>)}
      <div style={{ ...fill, backgroundImage: NOISE, backgroundSize: "220px 220px", opacity: light ? 0.18 : 0.12, mixBlendMode: light ? "multiply" : "screen" }} />
    </>;
  },

  /** Atlas: a dotted wireframe globe rising from the bottom, turning slowly, with flight arcs racing between cities. */
  "wire-globe": ({ W, H, t, pulse, main, accent, uid }, svg) => {
    // The globe rises from the bottom like a horizon: its top stays below the reading band.
    const R = W > H ? H * 0.7 : W * 0.74, cx = W / 2, cy = W > H ? H * 1.12 : H * 0.6 + W * 0.74, tilt = 0.38, spin = t * 0.22;
    const project = (lat: number, lon: number, lift = 1) => {
      const la = lat * Math.PI / 180, lo = lon * Math.PI / 180 + spin;
      const x0 = Math.cos(la) * Math.sin(lo), y0 = Math.sin(la), z0 = Math.cos(la) * Math.cos(lo);
      const y1 = y0 * Math.cos(tilt) - z0 * Math.sin(tilt), z1 = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
      return { x: cx + R * lift * x0, y: cy - R * lift * y1, z: z1 };
    };
    let back = "", front = "";
    for (let lat = -80; lat <= 80; lat += 8) for (let lon = 0; lon < 360; lon += 6) {
      const p = project(lat, lon), r = 1.6 + 2.2 * Math.max(0, p.z);
      const dot = `M${n(p.x - r)} ${n(p.y)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`;
      if (p.z > 0.05) front += dot; else if (p.z > -0.35) back += dot;
    }
    const CITIES: [number, number][][] = [[[48, 2], [40, -74]], [[35, 139], [37, -122]], [[51, 0], [1, 103]], [[-33, 151], [25, 55]], [[55, 37], [19, 72]], [[-23, -46], [6, 3]]];
    const toVec = ([lat, lon]: number[]) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]; };
    const arcs = CITIES.map(([a, b], k) => {
      const p = (t * 0.32 + k * 0.23) % 1.5, head = Math.min(1, p), tail = Math.max(0, p - 0.45);
      if (head <= tail) return null;
      const va = toVec(a), vb = toVec(b), pts: string[] = [];
      let tip = { x: 0, y: 0, z: -1 };
      for (let s = 0; s <= 30; s++) {
        const u = tail + (head - tail) * (s / 30), v = va.map((c, i) => c * (1 - u) + vb[i] * u), len = Math.hypot(...v);
        const lat = Math.asin(v[1] / len) * 180 / Math.PI, lon = Math.atan2(v[0], v[2]) * 180 / Math.PI;
        const q = project(lat, lon, 1 + 0.22 * Math.sin(Math.PI * u));
        if (q.z > -0.05) pts.push(`${n(q.x)},${n(q.y)}`);
        tip = q;
      }
      return <g key={k}>
        {pts.length > 1 && <><polyline points={pts.join(" ")} fill="none" stroke={accent} strokeWidth="9" opacity=".2" strokeLinecap="round" /><polyline points={pts.join(" ")} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" /></>}
        {head < 1 && tip.z > -0.05 && <circle cx={n(tip.x)} cy={n(tip.y)} r="6" fill="#ffffff" />}
      </g>;
    });
    const cities = CITIES.flat().map(([lat, lon], k) => { const p = project(lat, lon); return p.z > 0.05 && <circle key={k} cx={n(p.x)} cy={n(p.y)} r={n(5 + pulse * 6)} fill="none" stroke={accent} strokeWidth="2" opacity={n((1 - pulse * 0.6) * 100) / 100} />; });
    return svg(<>
      <rect width={W} height={n(H)} fill={`url(#${uid}-space)`} />
      {Array.from({ length: 40 }, (_, k) => <circle key={k} cx={n(hash(k, 1) * W)} cy={n(hash(k, 2) * H * 0.6)} r={n(0.8 + hash(k, 3) * 1.6)} fill="#ffffff" opacity={n((0.2 + 0.4 * hash(k, 4)) * 100) / 100} />)}
      <circle cx={n(cx)} cy={n(cy)} r={n(R * 1.12)} fill={`url(#${uid}-atmo)`} />
      <circle cx={n(cx)} cy={n(cy)} r={n(R)} fill={`url(#${uid}-ball)`} />
      <path d={back} fill={main} opacity=".18" />
      <path d={front} fill={main} opacity=".85" />
      <circle cx={n(cx)} cy={n(cy)} r={n(R)} fill="none" stroke={main} strokeWidth="2.5" opacity=".55" />
      {cities}
      {arcs}
    </>, <>
      <radialGradient id={`${uid}-space`} cx=".5" cy=".9" r=".9"><stop stopColor={mix(accent, "#000000", 0.7)} /><stop offset="1" stopColor="#000000" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${uid}-atmo`} cx=".5" cy=".5" r=".5"><stop offset=".86" stopColor={main} stopOpacity="0" /><stop offset=".9" stopColor={main} stopOpacity=".35" /><stop offset="1" stopColor={main} stopOpacity="0" /></radialGradient>
      <radialGradient id={`${uid}-ball`} cx=".5" cy=".25" r=".8"><stop stopColor={mix(main, "#000000", 0.65)} /><stop offset="1" stopColor="#000000" /></radialGradient>
    </>);
  },

  /** Marquee: an LED dot-matrix board; chevrons scroll across the top, an equaliser bounces on the beat at the bottom. */
  "led-matrix": ({ W, H, t, pulse, main, accent }, svg) => {
    const step = W / 34, cols = Math.floor(W / step), rows = Math.floor(H / step), ox = (W - (cols - 1) * step) / 2, oy = (H - (rows - 1) * step) / 2, r = step * 0.34;
    const top = Math.round(rows * 0.07), bottom = rows - Math.round(rows * 0.07) - 9, shift = Math.floor(t * 9), mid = Math.round(rows / 2);
    const circle = (q: number, row: number) => { const x = ox + q * step, y = oy + row * step; return `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0`; };
    let off = "", lit = "", hot = "";
    for (let row = 0; row < rows; row++) for (let q = 0; q < cols; q++) {
      let on = false, peak = false;
      const tr = row - top, br = row - bottom;
      if (tr >= 0 && tr < 7) { const k = (q + shift) % 10, edge = 3 - Math.abs(tr - 3); on = k - edge >= 0 && k - edge <= 1; }
      else if (br >= 0 && br < 9) {
        const level = Math.floor((0.25 + 0.75 * Math.abs(Math.sin(q * 0.55 + t * 3.1)) * (0.55 + 0.45 * pulse)) * 9);
        on = 8 - br < level; peak = on && 8 - br === level - 1;
      } else if (row === mid + 7 || row === mid - 7) on = (q + shift) % 6 === 0;
      if (peak) hot += circle(q, row); else if (on) lit += circle(q, row); else off += circle(q, row);
    }
    return svg(<>
      <path d={off} fill={main} opacity=".07" />
      <path d={lit} fill={main} opacity=".3" style={{ filter: `blur(${n(step * 0.25)}px)` }} />
      <path d={lit} fill={main} />
      <path d={hot} fill={accent} />
    </>);
  },
  /** Marble: paper marbling — swirling ink veins drift slowly at the top and bottom; the centre stays clean paper for the copy. */
  marble: ({ W, H, t, bg, main, accent, uid }, svg) => {
    const inks = [main, mix(main, bg, 0.55), accent, mix(accent, bg, 0.5), mix(main, accent, 0.5)];
    const vein = (k: number, y0: number) => {
      const pts: string[] = [];
      for (let s = 0; s <= 40; s++) {
        const x = -60 + (s / 40) * (W + 120);
        const y = y0 + Math.sin(x / 140 + k * 0.7 + t * 0.25) * 26 + Math.sin(x / 61 - t * 0.18 + k * 1.9) * 12 + Math.sin((x + k * 37) / 23 + t * 0.4) * 4 * Math.sin(k + t * 0.2);
        pts.push(`${n(x)},${n(y)}`);
      }
      return `M${pts.join("L")}`;
    };
    const band = (from: number, to: number, seed: number) => Array.from({ length: Math.round((to - from) / 26) }, (_, k) => {
      const color = inks[(k + seed) % inks.length], width = 10 + hash(k, seed) * 26;
      return <g key={`${seed}-${k}`} fill="none" strokeLinecap="round">
        <path d={vein(k + seed * 13, from + k * 26)} stroke={color} strokeWidth={n(width)} opacity=".85" />
        {k % 3 === 0 && <path d={vein(k + seed * 13 + 0.4, from + k * 26 + width / 2)} stroke={mix(main, "#000000", 0.4)} strokeWidth="1.6" opacity=".55" />}
      </g>;
    });
    return <>
      {svg(<>
        {band(-40, H * 0.34, 1)}
        {band(H * 0.66, H + 40, 2)}
        <rect width={W} height={n(H)} fill={`url(#${uid}-paper)`} />
      </>, <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2="0" y2="1">
        <stop offset=".18" stopColor={bg} stopOpacity="0" /><stop offset=".34" stopColor={bg} /><stop offset=".66" stopColor={bg} /><stop offset=".82" stopColor={bg} stopOpacity="0" />
      </linearGradient>)}
      <div style={{ ...fill, backgroundImage: NOISE, backgroundSize: "220px 220px", opacity: 0.16, mixBlendMode: "multiply" }} />
    </>;
  },

  /** Circuit: a neon PCB — traces route in from the edges with 45° bends, chips and pads, light pulses racing along the copper. */
  circuit: ({ W, H, t, pulse, main, accent, uid }, svg) => {
    const pitch = W / 26;
    const traces = Array.from({ length: 22 }, (_, k) => {
      const fromLeft = k % 2 === 0, topZone = k % 4 < 2;
      const y = topZone ? H * (0.04 + hash(k, 1) * 0.26) : H * (0.7 + hash(k, 1) * 0.26);
      const x0 = fromLeft ? -10 : W + 10, dir = fromLeft ? 1 : -1;
      const run1 = W * (0.12 + hash(k, 2) * 0.22), drop = pitch * (1 + Math.floor(hash(k, 3) * 3)) * (topZone ? 1 : -1), run2 = W * (0.05 + hash(k, 4) * 0.18);
      const p1 = [x0 + dir * run1, y], p2 = [p1[0] + dir * Math.abs(drop), y + drop], p3 = [p2[0] + dir * run2, y + drop];
      return { d: `M${n(x0)} ${n(y)}L${n(p1[0])} ${n(p1[1])}L${n(p2[0])} ${n(p2[1])}L${n(p3[0])} ${n(p3[1])}`, end: p3, k };
    });
    const verticals = Array.from({ length: 8 }, (_, k) => {
      const x = W * (0.08 + (k / 7) * 0.84), fromTop = k % 2 === 0, len = H * (0.08 + hash(k, 6) * 0.14);
      const y0 = fromTop ? -10 : H + 10, y1 = fromTop ? len : H - len;
      return { d: `M${n(x)} ${n(y0)}L${n(x)} ${n(y1)}`, end: [x, y1], k: k + 40 };
    });
    const all = [...traces, ...verticals];
    const chip = (cx: number, cy: number, w: number, h: number) => <g>
      <rect x={n(cx - w / 2)} y={n(cy - h / 2)} width={n(w)} height={n(h)} rx="6" fill={mix(main, "#000000", 0.82)} stroke={main} strokeOpacity=".7" strokeWidth="2" />
      {Array.from({ length: 6 }, (_, i) => <g key={i} stroke={main} strokeOpacity=".7" strokeWidth="3"><path d={`M${n(cx - w / 2 + (i + 0.5) * w / 6)} ${n(cy - h / 2)}v-12M${n(cx - w / 2 + (i + 0.5) * w / 6)} ${n(cy + h / 2)}v12`} /></g>)}
      <circle cx={n(cx - w / 2 + 12)} cy={n(cy - h / 2 + 12)} r="4" fill={main} opacity=".6" />
    </g>;
    let grid = "";
    for (let x = pitch / 2; x < W; x += pitch) for (let y = pitch / 2; y < H; y += pitch) grid += `M${n(x)} ${n(y)}h1`;
    return svg(<>
      <path d={grid} stroke={main} strokeOpacity=".12" strokeWidth="2.5" strokeLinecap="round" />
      {all.map(({ d, k }) => <g key={k} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d={d} stroke={main} strokeOpacity=".28" strokeWidth="5" />
        <path d={d} stroke={k % 3 ? main : accent} strokeWidth="14" pathLength={1} strokeDasharray="0.06 1" strokeDashoffset={n(-((t * 0.35 + hash(k, 5)) % 1.06) * 1000) / 1000} opacity=".22" />
        <path d={d} stroke="#ffffff" strokeWidth="4" pathLength={1} strokeDasharray="0.06 1" strokeDashoffset={n(-((t * 0.35 + hash(k, 5)) % 1.06) * 1000) / 1000} />
      </g>)}
      {all.map(({ end: [x, y], k }) => <g key={`p${k}`}><circle cx={n(x)} cy={n(y)} r="9" fill="none" stroke={main} strokeWidth="3" /><circle cx={n(x)} cy={n(y)} r="3.5" fill={main} opacity={n((0.5 + 0.5 * pulse) * 100) / 100} /></g>)}
      {chip(W * 0.78, H * 0.16, W * 0.2, W * 0.13)}
      {chip(W * 0.22, H * 0.85, W * 0.24, W * 0.14)}
      <rect width={W} height={n(H)} fill={`url(#${uid}-calm)`} />
    </>, <linearGradient id={`${uid}-calm`} x1="0" y1="0" x2="0" y2="1">
      <stop offset=".3" stopColor="#000000" stopOpacity="0" /><stop offset=".42" stopColor="#000000" stopOpacity=".5" /><stop offset=".58" stopColor="#000000" stopOpacity=".5" /><stop offset=".7" stopColor="#000000" stopOpacity="0" />
    </linearGradient>);
  },
};

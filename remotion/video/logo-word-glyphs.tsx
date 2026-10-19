import React from "react";
import type { LogoMotionId } from "../../config/logo-motion";
import { glyphOutline, outlineGlyphs, type OutlineFace, type OutlineGlyph } from "../../lib/posts/outline-text";

/**
 * Per-letter logo motions. Every value is a pure function of time (seconds), so the picker thumbnail,
 * the Player and the Lambda export draw the same frame. Intros finish before 1.5 s (thumbnail time),
 * a second "beat" lands at 55 % of the duration and the word then holds.
 */
export const GLYPH_MOTIONS = { "logo-rise": "condensed", "logo-trace": "serif", "logo-wipe": "rounded", "logo-focus": "italic", "logo-flip": "wide", "logo-echo": "condensed", "logo-decode": "wide", "logo-drop": "rounded", "logo-mosaic": "serif", "logo-coil": "wide", "logo-impact": "condensed", "logo-neon": "rounded" } as const satisfies Partial<Record<LogoMotionId, OutlineFace>>;
export type GlyphMotionId = keyof typeof GLYPH_MOTIONS;
export const isGlyphMotion = (id: string): id is GlyphMotionId => id in GLYPH_MOTIONS;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const expo = (v: number) => (v = clamp(v)) === 1 ? 1 : 1 - 2 ** (-10 * v);
const quart = (v: number) => 1 - (1 - clamp(v)) ** 4;
const inOut = (v: number) => (v = clamp(v)) < .5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2;
const back = (v: number, s = 1.2) => { v = clamp(v); return 1 + (s + 1) * (v - 1) ** 3 + s * (v - 1) ** 2; };
/** Damped settle with one visible overshoot, exactly 1 at the end. */
const settle = (v: number) => v <= 0 ? 0 : v >= 1 ? 1 : 1 - Math.exp(-7 * v) * Math.cos(3 * Math.PI * v);
/** Classic ease-out bounce: lands at 1 three times with shrinking hops. */
const bounce = (v: number) => { const k = 7.5625, d = 2.75; v = clamp(v); return v < 1 / d ? k * v * v : v < 2 / d ? k * (v -= 1.5 / d) * v + .75 : v < 2.5 / d ? k * (v -= 2.25 / d) * v + .9375 : k * (v -= 2.625 / d) * v + .984375; };
/** Deterministic noise: identical on every render, so preview and export flicker the same way. */
const noise = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
const bump = (v: number) => v <= 0 || v >= 1 ? 0 : Math.sin(v * Math.PI) ** 2;

type Ctx = { id: string; face: OutlineFace; duration: number; glyphs: OutlineGlyph[]; size: number; t: number; mid: number; bg: string; fg: string; accent: string; b: { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; w: number; h: number } };

const at = (g: OutlineGlyph) => `translate(${g.x} ${g.y}) scale(${g.scale})`;
const Glyph = ({ g, ...rest }: { g: OutlineGlyph } & React.SVGProps<SVGPathElement>) => <path d={g.d} transform={at(g)} {...rest} />;
/** Letters start one after another; long words keep the same overall intro length. */
const delay = (i: number, n: number, perLetter: number, max: number) => n > 1 ? i / (n - 1) * Math.min(max, perLetter * (n - 1)) : 0;

export function LogoGlyphArt({ template, text, colors, time = 0, duration = 6 }: { template: GlyphMotionId; text: string; colors: [string, string, string]; time?: number; duration?: number }) {
  const id = `glyph-${React.useId().replace(/[^\w-]/g, "")}`;
  const h = text.length > 18 ? 520 : 340;
  const { glyphs, size } = React.useMemo(() => outlineGlyphs(text, GLYPH_MOTIONS[template], 60, 8, 880, h - 40, 255, true), [text, template, h]);
  const x0 = Math.min(...glyphs.map((g) => g.box.x0), 500), x1 = Math.max(...glyphs.map((g) => g.box.x1), 500);
  const y0 = Math.min(...glyphs.map((g) => g.box.y0), h / 2), y1 = Math.max(...glyphs.map((g) => g.box.y1), h / 2);
  const [bg, fg, accent] = colors;
  const ctx: Ctx = { id, face: GLYPH_MOTIONS[template], duration, glyphs, size, t: Math.max(0, time), mid: duration * .55, bg, fg, accent, b: { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 } };
  const Scene = SCENES[template];
  return <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden", containerType: "size" }}>
    <div style={{ position: "absolute", left: "50%", top: "50%", width: "min(78cqw, 130cqh)", transform: "translate(-50%,-50%)" }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 ${ctx.b.cy - h / 2} 1000 ${h}`} width="1000" height={h} role="img" aria-label={text} style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
        <Scene {...ctx} />
      </svg>
    </div>
  </div>;
}

/** Rise — letters spring up out of a baseline mask with vertical motion blur, an accent rule draws out, then a wave runs through. */
function Rise({ id, glyphs, size, t, mid, fg, accent, b }: Ctx) {
  const n = glyphs.length, rows = [...new Set(glyphs.map((g) => g.y))];
  const offset = (i: number, time: number) => {
    const rise = (1 - back((time - .12 - delay(i, n, .055, .5)) / .75)) * size * 1.2;
    const wave = bump((time - mid - delay(i, n, .06, .4)) / .5) * size * .14;
    return rise - wave;
  };
  const landed = .12 + Math.min(.5, .055 * (n - 1)) + .45;
  const rule = expo((t - landed) / .8), kick = bump((t - mid - .1) / .8);
  return <>
    <defs>{rows.map((y, r) => <clipPath key={r} id={`${id}-row${r}`}><rect x="-500" y={y - size * 1.25} width="2000" height={size * 1.57} /></clipPath>)}
      {glyphs.map((g, i) => { const blur = Math.min(16, Math.abs(offset(i, t) - offset(i, t + 1 / 30)) / 6); return blur > .4 && <filter key={i} id={`${id}-mb${i}`} x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} /></filter>; })}
    </defs>
    {glyphs.map((g, i) => { const dy = offset(i, t), blur = Math.min(16, Math.abs(dy - offset(i, t + 1 / 30)) / 6); return <g key={i} clipPath={`url(#${id}-row${rows.indexOf(g.y)})`}><g transform={`translate(0 ${dy.toFixed(2)})`} filter={blur > .4 ? `url(#${id}-mb${i})` : undefined}><Glyph g={g} fill={fg} /></g></g>; })}
    <rect x={b.cx - b.w / 2 * rule} y={b.y1 + size * .16} width={Math.max(0, b.w * rule)} height={size * (.045 + kick * .05)} fill={accent} />
  </>;
}

/** Trace — a fine accent line draws each outline, the ink pours in, a light sheen crosses and the frame slowly pushes in. */
function Trace({ id, glyphs, size, t, mid, fg, accent, b, duration }: Ctx) {
  const n = glyphs.length, last = .1 + Math.min(1.1, .09 * (n - 1));
  const sheens = [(t - last - .9) / 1.1, (t - mid) / 1.2].filter((s) => s > 0 && s < 1);
  const push = 1 + .035 * inOut(t / duration);
  const sign = expo((t - last - .7) / .9);
  return <g transform={`translate(${b.cx} ${b.cy}) scale(${push}) translate(${-b.cx} ${-b.cy})`}>
    <defs>{sheens.map((s, k) => { const x = b.x0 - 260 + inOut(s) * (b.w + 520); return <linearGradient key={k} id={`${id}-sheen${k}`} gradientUnits="userSpaceOnUse" x1={x - 160} x2={x + 160} y1={b.y0} y2={b.y1}><stop stopColor="#ffffff" stopOpacity="0" /><stop offset=".5" stopColor="#ffffff" stopOpacity=".75" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>; })}</defs>
    {glyphs.map((g, i) => {
      const d = .1 + delay(i, n, .09, 1.1), draw = quart((t - d) / .9), ink = quart((t - d - .55) / .5), line = 1 - quart((t - d - 1.1) / .8);
      return <Glyph key={i} g={g} pathLength={1} fill={fg} fillOpacity={ink} stroke={accent} strokeOpacity={line} strokeWidth={2.4 / g.scale} strokeDasharray="1 1" strokeDashoffset={1 - draw} strokeLinejoin="round" />;
    })}
    {sheens.map((_, k) => <g key={k} fill={`url(#${id}-sheen${k})`}>{glyphs.map((g, i) => <Glyph key={i} g={g} />)}</g>)}
    <rect x={b.cx - b.w * .11 * sign} y={b.y1 + size * .2} width={b.w * .22 * sign} height={size * .014} fill={accent} />
  </g>;
}

/** Wipe — an accent block sweeps on and off to reveal the word, then a colour lens crosses it, inverting the letters underneath. */
function Wipe({ id, glyphs, size, t, mid, bg, fg, accent, b }: Ctx) {
  const pad = size * .14, L = b.x0 - pad, R = b.x1 + pad, T = b.y0 - pad, H = b.h + pad * 2, W = R - L;
  const grow = expo((t - .1) / .5), retract = expo((t - .62) / .6);
  const left = L + W * retract, right = L + W * grow;
  const slide = (1 - expo((t - .55) / 1)) * -size * .3;
  const lensW = Math.max(size * .9, W * .3), lens = (t - mid) / 1.1, lx = L - lensW + inOut(lens) * (W + lensW);
  const word = (fill: string) => <g transform={`translate(${slide.toFixed(2)} 0)`} fill={fill}>{glyphs.map((g, i) => <Glyph key={i} g={g} />)}</g>;
  const underline = expo((t - 1.05) / .7);
  return <>
    <defs><clipPath id={`${id}-shown`}><rect x={L} y={T - size} width={Math.max(0, left - L)} height={H + size * 2} /></clipPath><clipPath id={`${id}-lens`}><rect x={lx} y={T} width={lensW} height={H} /></clipPath></defs>
    <g clipPath={`url(#${id}-shown)`}>{word(fg)}</g>
    {right > left && <rect x={left} y={T} width={right - left} height={H} fill={accent} />}
    {lens > 0 && lens < 1 && <><rect x={lx} y={T} width={lensW} height={H} fill={accent} /><g clipPath={`url(#${id}-lens)`}>{word(bg)}</g></>}
    <rect x={L} y={T + H + size * .08} width={W * underline} height={size * .03} fill={accent} />
  </>;
}

/** Focus — wide-tracked, blurred letters pull into focus like a lens, then an anamorphic flare sweeps across. */
function Focus({ id, glyphs, size, t, mid, fg, accent, b, duration }: Ctx) {
  const f = expo((t - .05) / 1.35), blur = (1 - f) * 18;
  const breathe = .025 * inOut((t - 1.4) / Math.max(1, duration - 1.4));
  const pos = (g: OutlineGlyph) => { const c = (g.box.x0 + g.box.x1) / 2 - b.cx; const fi = expo((t - .05 - Math.abs(c) / Math.max(1, b.w) * .3) / 1.25); return c * ((1 - fi) * .6 + breathe); };
  const scale = 1.12 - .12 * f, flare = (t - mid) / 1.1, fx = b.x0 - 300 + inOut(flare) * (b.w + 600), glow = bump(flare);
  const word = (fill: string, dx = 0) => glyphs.map((g, i) => <g key={i} transform={`translate(${(pos(g) + dx).toFixed(2)} 0)`}><Glyph g={g} fill={fill} /></g>);
  return <g transform={`translate(${b.cx} ${b.cy}) scale(${scale}) translate(${-b.cx} ${-b.cy})`}>
    <defs>
      <filter id={`${id}-blur`} x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation={blur.toFixed(2)} /></filter>
      <filter id={`${id}-soft`} x="-50%" y="-500%" width="200%" height="1100%"><feGaussianBlur stdDeviation="7" /></filter>
      <linearGradient id={`${id}-glint`} gradientUnits="userSpaceOnUse" x1={fx - size * .7} x2={fx + size * .7} y1="0" y2="0"><stop stopColor={accent} stopOpacity="0" /><stop offset=".5" stopColor={accent} stopOpacity=".85" /><stop offset="1" stopColor={accent} stopOpacity="0" /></linearGradient>
    </defs>
    <g filter={blur > .3 ? `url(#${id}-blur)` : undefined}>
      <g opacity={(1 - f) * .8}>{word(accent, (1 - f) * size * .14)}</g>
      <g opacity={Math.min(1, f * 1.6)}>{word(fg)}</g>
    </g>
    {glow > 0 && <><g fill={`url(#${id}-glint)`} opacity={glow}>{glyphs.map((g, i) => <g key={i} transform={`translate(${pos(g).toFixed(2)} 0)`}><Glyph g={g} /></g>)}</g>
      <ellipse cx={fx} cy={b.cy} rx={size * 1.8} ry={size * .04} fill={accent} opacity={glow * .9} filter={`url(#${id}-soft)`} />
      <ellipse cx={fx} cy={b.cy} rx={size * .7} ry={size * .012} fill={fg} opacity={glow} /></>}
  </g>;
}

/** Flip — each letter turns over on its horizontal hinge like a split-flap board, showing an accent back face, and flips again mid-way. */
function Flip({ glyphs, size, t, mid, bg, fg, accent }: Ctx) {
  const n = glyphs.length;
  return <>{glyphs.map((g, i) => {
    const angle = (1 - settle((t - .1 - delay(i, n, .07, .7)) / .9)) * 270 + 360 * inOut((t - mid - delay(i, n, .05, .5)) / .75);
    const c = Math.cos(angle * Math.PI / 180), sy = Math.sign(c || 1) * Math.max(.002, Math.abs(c)), hinge = g.y - size * .36;
    const turning = Math.min(1, Math.abs(Math.sin(angle * Math.PI / 180)) * 3);
    return <g key={i}>
      <g transform={`translate(0 ${hinge}) scale(1 ${sy.toFixed(4)}) translate(0 ${-hinge})`}><Glyph g={g} fill={c < 0 ? accent : fg} fillOpacity={.55 + .45 * Math.abs(c)} /></g>
      {turning > .01 && <rect x={g.box.x0 - 4} y={hinge - size * .01} width={g.box.x1 - g.box.x0 + 8} height={size * .02} fill={bg} opacity={turning} />}
    </g>;
  })}</>;
}

/** Echo — outlined copies of the word slide out above and below, drift apart like a scissor, collapse into the word and open again. */
function Echo({ id, glyphs, size, t, mid, fg, accent, b, duration }: Ctx) {
  const gap = b.h + size * .22, scale = glyphs[0]?.scale ?? 1;
  const punch = 1 + .05 * bump((t - mid - .3) / .5), enter = expo((t - .05) / .7);
  const collapse = 1 - bump((t - mid) / 1.1) ** .7;
  return <>
    <defs><g id={`${id}-word`}>{glyphs.map((g, i) => <Glyph key={i} g={g} />)}</g></defs>
    {[1, 2, 3].flatMap((k) => [-1, 1].map((side) => {
      const spread = expo((t - .3 - k * .12) / .9) * collapse;
      const drift = side * k * size * .06 * inOut(t / duration);
      return <use key={`${k}${side}`} href={`#${id}-word`} transform={`translate(${drift.toFixed(2)} ${(side * k * gap * spread).toFixed(2)})`} fill="none" stroke={k % 2 ? accent : fg} strokeWidth={2.6 / scale} strokeLinejoin="round" opacity={[.9, .55, .28][k - 1] * Math.min(1, spread * 1.5) ** 2} />;
    }))}
    <use href={`#${id}-word`} fill={fg} opacity={Math.min(1, t / .35)} transform={`translate(${b.cx} ${b.cy}) scale(${(.9 + .1 * enter) * punch}) translate(${-b.cx} ${-b.cy})`} />
  </>;
}

const SCRAMBLE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*$@";

/** Decode — each slot cycles through random characters before locking in, left to right, behind a blinking cursor; a re-scramble wave passes mid-way. */
function Decode({ face, glyphs, size, t, mid, fg, accent }: Ctx) {
  const n = glyphs.length, last = glyphs.at(-1);
  const locks = glyphs.map((_, i) => .25 + delay(i, n, .09, 1));
  const cursorX = last ? (glyphs.find((_, i) => t < locks[i])?.box.x0 ?? last.x + last.advance) + size * .04 : 0;
  return <>
    {glyphs.map((g, i) => {
      const rescramble = t > mid + delay(i, n, .05, .5) && t < mid + delay(i, n, .05, .5) + .3;
      if (t < .05 + i * .02) return null;
      if (t < locks[i] || rescramble) {
        const other = glyphOutline(face, SCRAMBLE[Math.floor(noise(i, Math.floor(t * 18)) * SCRAMBLE.length)]);
        const fit = Math.min(1, g.advance * .92 / (other.advance * g.scale));
        return <path key={i} d={other.d} transform={`translate(${g.x + (g.advance - other.advance * g.scale * fit) / 2} ${g.y}) scale(${g.scale * fit} ${g.scale})`} fill={accent} opacity=".85" />;
      }
      const flash = 1 - clamp((t - locks[i]) / .25);
      return <g key={i}><Glyph g={g} fill={fg} />{flash > 0 && <Glyph g={g} fill={accent} opacity={flash} />}</g>;
    })}
    {last && Math.floor(t * 2.6) % 2 === 0 && <rect x={cursorX} y={last.y - size * .72} width={size * .09} height={size * .78} fill={accent} />}
  </>;
}

/** Drop — letters fall in one after another, bounce with squash and stretch over soft contact shadows, then hop once mid-way. */
function Drop({ glyphs, size, t, mid, fg }: Ctx) {
  const n = glyphs.length, fall = size * 2.6;
  const height = (i: number, time: number) => (1 - bounce((time - .08 - delay(i, n, .08, .7)) / .95)) * fall + bump((time - mid - delay(i, n, .06, .45)) / .55) * size * .45;
  return <>
    {glyphs.map((g, i) => {
      const d = .08 + delay(i, n, .08, .7);
      if (t < d) return null;
      const y = height(i, t), speed = Math.abs(y - height(i, t + 1 / 30)) * 30 / size;
      const contact = Math.exp(-((y / (size * .05)) ** 2)) * (speed > .2 || t - d < 1 ? 1 : 0) * (1 - clamp((t - d) / 1.1));
      const sy = 1 + Math.min(.22, speed * .04) - contact * .22, sx = 1 / Math.sqrt(sy);
      const cx = (g.box.x0 + g.box.x1) / 2, near = clamp(1 - y / (size * 1.6));
      return <g key={i}>
        <ellipse cx={cx} cy={g.y + size * .06} rx={(g.box.x1 - g.box.x0) / 2 * (.5 + .5 * near)} ry={size * .035} fill={fg} opacity={.18 * near} />
        <g transform={`translate(${cx} ${g.y - y}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-cx} ${-g.y})`}><Glyph g={g} fill={fg} /></g>
      </g>;
    })}
  </>;
}

/** Mosaic — the word assembles from a grid of pixels that flash in the accent colour, then partly dissolves and rebuilds. */
function Mosaic({ id, glyphs, size, t, mid, fg, accent, b }: Ctx) {
  const cell = size * .16, pad = size * .1, cols = Math.ceil((b.w + pad * 2) / cell), rows = Math.ceil((b.h + pad * 2) / cell);
  const L = b.cx - cols * cell / 2, T = b.cy - rows * cell / 2;
  const cells = Array.from({ length: cols * rows }, (_, k) => {
    const c = k % cols, r = Math.floor(k / cols), x = L + c * cell, y = T + r * cell;
    const inside = glyphs.some((g) => x + cell > g.box.x0 && x < g.box.x1 && y + cell > g.box.y0 && y < g.box.y1);
    const start = .1 + noise(c, r) * .65 + c / cols * .25;
    const glitch = noise(r, c + 40) < .3 ? bump((t - mid - noise(c + 9, r) * .5) / .45) : 0;
    return { x, y, inside, show: expo((t - start - .12) / .2) * (1 - glitch), flash: bump((t - start) / .4) + glitch };
  });
  return <>
    <defs><clipPath id={`${id}-cells`}>{cells.map((c, k) => c.show > 0 && <rect key={k} x={c.x + cell / 2 * (1 - c.show)} y={c.y + cell / 2 * (1 - c.show)} width={cell * c.show + .5} height={cell * c.show + .5} />)}</clipPath></defs>
    <g clipPath={`url(#${id}-cells)`} fill={fg}>{glyphs.map((g, i) => <Glyph key={i} g={g} />)}</g>
    {cells.map((c, k) => c.inside && c.flash > .02 && <rect key={k} x={c.x + cell * .08} y={c.y + cell * .08} width={cell * .84} height={cell * .84} fill={accent} opacity={Math.min(1, c.flash)} />)}
  </>;
}

/** Coil — the word spins in curled around a wheel, unrolls flat, then curls up into an arc and straightens again. */
function Coil({ glyphs, size, t, mid, fg, accent }: Ctx) {
  const R = size * 1.25, spin = -1.6 * Math.PI * (1 - expo((t - .05) / 1.15));
  const flat = inOut((t - .4) / .95) * (1 - .65 * bump((t - mid) / 1.4));
  const fade = clamp(t / .3);
  return <>{glyphs.map((g, i) => {
    // One wheel per line, so wrapped text never piles up on a single ring.
    const line = glyphs.filter((other) => other.row === g.row), lineX = (line[0].box.x0 + line.at(-1)!.box.x1) / 2, lineY = g.y - size * .36;
    const gx = (g.box.x0 + g.box.x1) / 2, angle = spin + (gx - lineX) / R * 1.15;
    const ringX = lineX + R * Math.sin(angle), ringY = lineY + R - R * Math.cos(angle);
    const x = ringX + (gx - ringX) * flat, y = ringY + (lineY - ringY) * flat, rot = angle * (1 - flat) * 180 / Math.PI, s = .72 + .28 * flat;
    const tint = clamp((1 - flat) * 1.4);
    return <g key={i} opacity={fade} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(3)}) translate(${-gx} ${-lineY})`}><Glyph g={g} fill={fg} />{tint > .01 && <Glyph g={g} fill={accent} opacity={tint * .9} />}</g>;
  })}</>;
}

/** Impact — the word slams down from huge scale, the frame shakes, a shock ring and speed lines burst out; a second hit lands mid-way. */
function Impact({ id, glyphs, size, t, mid, fg, accent, b }: Ctx) {
  const hit = .38, after = t - hit, after2 = t - mid;
  const fallIn = clamp(t / hit) ** 3, slam = t < hit ? 3.2 - 2.2 * fallIn : 1 + .07 * Math.exp(-after * 9) * Math.cos(after * 38) + .1 * bump(after2 / .35);
  const shake = (t > hit ? Math.exp(-after * 8) : 0) + (after2 > 0 ? .5 * Math.exp(-after2 * 9) : 0);
  const sx = size * .07 * shake * Math.sin(t * 83), sy = size * .05 * shake * Math.cos(t * 67);
  const blur = t < hit ? (slam - 1) * 6 : 0;
  const burst = (dt: number, strength: number) => {
    if (dt < 0 || dt > .7) return null;
    const v = expo(dt / .7), a = b.w * .5 + size * .25, c = b.h * .5 + size * .25;
    return <g opacity={(1 - dt / .7) * strength}>
      <ellipse cx={b.cx} cy={b.cy} rx={a * (.85 + .6 * v)} ry={c * (.85 + .9 * v)} fill="none" stroke={accent} strokeWidth={size * .05 * (1 - v) + 1} />
      {Array.from({ length: 16 }, (_, k) => { const ang = k / 16 * Math.PI * 2 + noise(k) * .2, r0 = 1 + .25 * v, r1 = r0 + .35 * (1 - v) + .05; return <line key={k} x1={b.cx + Math.cos(ang) * a * r0} y1={b.cy + Math.sin(ang) * c * r0} x2={b.cx + Math.cos(ang) * a * r1} y2={b.cy + Math.sin(ang) * c * r1} stroke={k % 3 ? fg : accent} strokeWidth={size * .025} strokeLinecap="round" />; })}
    </g>;
  };
  return <g transform={`translate(${sx.toFixed(2)} ${sy.toFixed(2)})`}>
    <defs><filter id={`${id}-zoom`} x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation={blur.toFixed(2)} /></filter></defs>
    {after > 0 && after < .2 && <rect x="-2000" y="-2000" width="5000" height="5000" fill={accent} opacity={.35 * (1 - after / .2)} />}
    {burst(after, 1)}{burst(after2, .8)}
    <g opacity={Math.min(1, t / .15)} filter={blur > .3 ? `url(#${id}-zoom)` : undefined} transform={`translate(${b.cx} ${b.cy}) scale(${slam.toFixed(4)}) translate(${-b.cx} ${-b.cy})`} fill={fg}>{glyphs.map((g, i) => <Glyph key={i} g={g} />)}</g>
  </g>;
}

/** Neon — unlit glass tubes stutter on letter by letter, settle into a humming glow, and one letter buzzes out mid-way. */
function Neon({ id, glyphs, t, mid, fg, accent }: Ctx) {
  const n = glyphs.length, scale = glyphs[0]?.scale ?? 1, buzzing = Math.floor(noise(n, 3) * n);
  const lit = glyphs.map((_, i) => {
    const on = .15 + noise(i, 1) * .75 + delay(i, n, .03, .2);
    if (t < on - .3) return 0;
    if (t < on) return noise(i, Math.floor(t * 28)) > .55 ? 1 : 0;
    if (i === buzzing && t > mid && t < mid + .7) return noise(i, Math.floor(t * 24)) > .45 ? 1 : .15;
    return 1;
  });
  const hum = .92 + .08 * Math.sin(t * 19) * Math.sin(t * 7.3);
  const tubes = (stroke: string, width: number, alpha: (i: number) => number) => glyphs.map((g, i) => <Glyph key={i} g={g} fill="none" stroke={stroke} strokeWidth={width / scale} strokeLinejoin="round" strokeLinecap="round" opacity={alpha(i)} />);
  return <>
    <defs>
      <filter id={`${id}-wide`} x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="16" /></filter>
      <filter id={`${id}-near`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
    </defs>
    {tubes(fg, 7, () => .1)}
    <g filter={`url(#${id}-wide)`}>{tubes(accent, 16, (i) => lit[i] * hum * .9)}</g>
    <g filter={`url(#${id}-near)`}>{tubes(accent, 9, (i) => lit[i] * hum)}</g>
    {tubes(fg, 4.5, (i) => lit[i] ? .25 + .75 * lit[i] : 0)}
  </>;
}

const SCENES: Record<GlyphMotionId, (props: Ctx) => React.ReactNode> = { "logo-rise": Rise, "logo-trace": Trace, "logo-wipe": Wipe, "logo-focus": Focus, "logo-flip": Flip, "logo-echo": Echo, "logo-decode": Decode, "logo-drop": Drop, "logo-mosaic": Mosaic, "logo-coil": Coil, "logo-impact": Impact, "logo-neon": Neon };

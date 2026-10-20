import React from "react";
import type { GraphicMotionKind } from "../../config/graphic-motion";
import { LumenBackdrop } from "./lumen-art";
import { SmearBackdrop } from "./smear-art";
import { EmberBackdrop } from "./ember-art";
import { NoiseBackdrop } from "./noise-art";
import { HaloBackdrop } from "./halo-art";
import { VoidBackdrop } from "./void-art";
import { MeltBackdrop } from "./melt-art";
import { HoloBackdrop } from "./holo-art";
import { VeilForeground } from "./veil-art";
import { GlossBackdrop } from "./gloss-art";
import { Typo5Backdrop } from "./typo5-art";

/** Authored graphics, shared by catalogue thumbnails and frame-driven renders. */
export function GraphicBackdrop({ kind, palette, time: elapsed = 0, beatPosition, aspectRatio = 9 / 16 }: { kind: GraphicMotionKind; palette: [string, string, string]; time?: number; beatPosition?: number; aspectRatio?: number }) {
  // Legacy artwork uses seconds at 120 BPM. Drive that clock from the actual beats.
  const time = beatPosition === undefined ? elapsed : beatPosition / 2;
  const [bg, fg, accent] = palette;
  if (kind === "veil") return <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden" }}><VeilForeground palette={palette} time={time} /></div>;
  if (["power", "spectra", "batch", "turn", "fanout", "blocktype", "positive", "helix", "spill", "veil"].includes(kind)) return <div style={{ position: "absolute", inset: 0, background: bg }} />;
  const phase = time * Math.PI;
  if (kind === "interlock") return <LumenBackdrop palette={palette} time={time} />;
  if (kind === "sticker") return <SmearBackdrop palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (kind === "vector-beat") return <VectorBeat palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (kind === "torque") return <TorqueBackdrop palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (kind === "flux") return <EmberBackdrop palette={palette} time={time} />;
  if (kind === "optic") return <NoiseBackdrop palette={palette} time={time} />;
  if (kind === "lens") return <HaloBackdrop palette={palette} time={time} />;
  if (kind === "carousel") return <VoidBackdrop palette={palette} time={time} />;
  if (kind === "offprint") return <MeltBackdrop palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (kind === "patina") return <HoloBackdrop palette={palette} time={time} />;
  if (kind === "hollow" || kind === "cursive" || kind === "overlap" || kind === "bloom" || kind === "reflect") return <Typo5Backdrop kind={kind} palette={palette} time={time} />;
  if (kind === "gloss") return <GlossBackdrop palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (kind === "cadence") return <CadenceBackdrop palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (kind === "tessera") return <TesseraBackdrop palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (["anvil", "cadence", "blackout", "tessera"].includes(kind)) return <RefinedGraphic kind={kind} palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (kind === "ratchet") return <PrecisionBackdrop kind={kind} palette={palette} time={time} aspectRatio={aspectRatio} />;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      {kind === "anvil" && <>
        <g transform={`translate(0 ${Math.max(0, Math.sin(phase * 1.3)) * 35})`}>
          <path d="M 90 0 H 910 V 210 H 760 V 265 H 240 V 210 H 90 Z" fill={fg} />
          <path d="M 240 290 H 760" stroke={accent} strokeWidth="13" />
          {[0, 1, 2].map((i) => <rect key={i} x={290 + i * 180} y="70" width="60" height="12" fill={bg} />)}
        </g>
        <g transform={`translate(0 ${-Math.max(0, Math.sin(phase * 1.3)) * 35})`}>
          <path d="M 90 1000 H 910 V 810 H 760 V 755 H 240 V 810 H 90 Z" fill={fg} />
          <path d="M 240 730 H 760" stroke={accent} strokeWidth="13" />
        </g>
      </>}
      {kind === "suture" && <>
        <path d="M -70 90 C 350 90 20 330 350 285 S 870 70 960 265" fill="none" stroke={accent} strokeWidth="5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, time / 1.1)} />
        <path d="M 1030 940 C 640 940 940 710 580 780 S 180 900 65 740" fill="none" stroke={accent} strokeWidth="5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, time / 1.4)} />
        {[[350, 285], [960, 265], [580, 780], [65, 740]].map(([x, y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="16" fill={bg} stroke={fg} strokeWidth="3" /><circle cx={x} cy={y} r="4" fill={accent} /></g>)}
      </>}
      {kind === "blackout" && <>
        <ellipse cx={500 + Math.sin(phase * 0.4) * 90} cy="250" rx="230" ry="105" fill="none" stroke={accent} strokeWidth="2" />
        <ellipse cx="500" cy="250" rx="170" ry="74" fill="none" stroke={fg} strokeWidth="1" opacity="0.45" />
        <rect x={290 + Math.sin(phase * 0.4) * 90} y="140" width="425" height="110" fill={bg} />
        {[0, 1].map((i) => <g key={i} transform={`translate(${i === 0 ? 85 : 915} 795)`}><path d="M -22 0 H 22 M 0 -22 V 22" stroke={fg} strokeWidth="2" /><circle r={38 + Math.sin(phase) * 8} fill="none" stroke={accent} /></g>)}
        <path d="M 85 875 H 915" stroke={fg} opacity="0.3" /><path d={`M 85 875 H ${150 + ((time * 160) % 760)}`} stroke={accent} strokeWidth="5" />
      </>}
      {kind === "voltage" && <>
        <path d={Array.from({ length: 81 }, (_, i) => `${i ? "L" : "M"} ${i * 12.5} ${175 + Math.sin(i * 0.52 + phase * 2) * Math.sin(i * 0.12) * 75}`).join(" ")} fill="none" stroke={accent} strokeWidth="5" />
        {Array.from({ length: 30 }, (_, i) => <rect key={i} x={60 + i * 30} y="770" width={i % 3 === 0 ? 10 : 3} height={65 + Math.sin(i * 0.8 + phase) * 38} fill={i % 4 === 0 ? accent : fg} opacity={i % 4 === 0 ? 1 : 0.35} />)}
        <path d="M 65 330 V 640 M 935 330 V 640" stroke={accent} strokeWidth="3" />
      </>}
    </svg>
  </div>;
}

/** Independent square viewports keep symbols crisp in portrait, square and landscape. */
function RefinedGraphic({ kind, palette: [bg, fg, accent], time, aspectRatio }: { kind: GraphicMotionKind; palette: [string, string, string]; time: number; aspectRatio: number }) {
  const wide = aspectRatio >= 1;
  const beat = time * 2;
  const pulse = Math.pow(1 - (beat - Math.floor(beat)), 4);
  return <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden", containerType: "size" }}>
    {kind === "blackout" && <>
      <div style={{ position: "absolute", top: wide ? "8%" : "10%", left: wide ? "calc(50% - 13cqmin)" : "calc(50% - 15cqmin)", width: wide ? "26cqmin" : "30cqmin", height: wide ? "26cqmin" : "30cqmin" }}>
        <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden><circle cx="100" cy="100" r="85" fill="none" stroke={accent} strokeWidth="1.5"/><circle cx="100" cy="100" r="64" fill="none" stroke={fg} opacity="0.3"/><path d="M 15 100 H 185" stroke={accent} opacity="0.4"/><circle cx={100 + Math.cos(time * 1.3) * 85} cy={100 + Math.sin(time * 1.3) * 85} r="4" fill={accent}/></svg>
      </div>
      {["8%", "80%"].map((left, i) => <div key={left} style={{ position: "absolute", left, bottom: "16%", width: "12cqmin", height: "12cqmin" }}><svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden><circle cx="50" cy="50" r={36 + pulse * 5} fill="none" stroke={accent} strokeWidth="1"/><g transform={`rotate(${i ? -45 : 0} 50 50)`}><path d="M 30 50 H 70 M 50 30 V 70" fill="none" stroke={fg} strokeWidth="2"/></g></svg></div>)}
      <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "11%", height: 1, background: `${fg}55` }}><div style={{ height: 2, width: `${15 + (time * 18) % 85}%`, background: accent }}/></div>
    </>}
    {kind === "anvil" && <AnvilPress palette={[bg, fg, accent]} time={time} aspectRatio={aspectRatio} />}
  </div>;
}

/** Square SVG viewports keep circles and tiles undistorted at every video ratio. */
function PrecisionBackdrop({ kind, palette: [bg, fg, accent], time, aspectRatio }: { kind: "tessera" | "ratchet"; palette: [string, string, string]; time: number; aspectRatio: number }) {
  const landscape = aspectRatio >= 1;
  const step = time * 2;
  const fraction = step - Math.floor(step);
  const settle = 1 - Math.pow(1 - Math.min(1, fraction / 0.45), 4);
  const rotation = (Math.floor(step) + settle) * 30;
  const cog = Array.from({ length: 64 }, (_, i) => {
    const angle = (i / 64) * Math.PI * 2;
    const radius = i % 4 === 0 || i % 4 === 3 ? 154 : 177;
    return `${i ? "L" : "M"} ${200 + Math.cos(angle) * radius} ${200 + Math.sin(angle) * radius}`;
  }).join(" ") + " Z";
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg, containerType: "size" }}>
    {kind === "tessera" ? <>
      <div style={{ position: "absolute", right: "7%", top: "9%", width: landscape ? "40cqmin" : "59cqmin", height: landscape ? "40cqmin" : "59cqmin" }}>
        <svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden>
          {[0, 1, 2, 3].map((i) => {
            const turn = Math.sin(time * 1.15 + i * 0.9) * 8;
            return <g key={i} transform={`translate(${i % 2 * 198 + 101} ${Math.floor(i / 2) * 198 + 101}) rotate(${turn})`}>
              <rect x="-83" y="-83" width="166" height="166" rx="9" fill={i % 3 === 0 ? fg : accent} />
              <path d="M -83 83 A 166 166 0 0 1 83 -83 V 83 Z" fill={bg} opacity={i % 2 ? 0.24 : 0.6} />
            </g>;
          })}
        </svg>
      </div>
      <div style={{ position: "absolute", bottom: "8%", left: "8%", display: "flex", gap: "2cqmin" }}>{[0, 1, 2].map((i) => <span key={i} style={{ display: "block", width: "9cqmin", height: "9cqmin", borderRadius: "12%", background: i === 1 ? fg : accent, transform: `translateY(${Math.sin(time * 1.8 + i) * 5}px)` }} />)}</div>
    </> : <>
      <div style={{ position: "absolute", width: landscape ? "46cqmin" : "70cqmin", height: landscape ? "46cqmin" : "70cqmin", top: landscape ? "calc(45% - 23cqmin)" : "6%", left: landscape ? "calc(76% - 23cqmin)" : "15%" }}>
        <svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden>
          <circle cx="200" cy="200" r="191" fill="none" stroke={accent} strokeWidth="1" opacity="0.4" />
          <g transform={`rotate(${rotation} 200 200)`}><path d={cog} fill={fg} /><circle cx="200" cy="200" r="113" fill={bg} />
            {[0, 1, 2].map((i) => <rect key={i} x="186" y="73" width="28" height="32" rx="4" fill={accent} transform={`rotate(${i * 120} 200 200)`} />)}
          </g>
          <circle cx="200" cy="200" r="67" fill={accent} /><circle cx="200" cy="200" r="13" fill={bg} />
          <path d="M 200 146 V 175" stroke={bg} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ position: "absolute", left: "9%", bottom: "9%", display: "flex", gap: "1.6cqmin" }}>{Array.from({ length: 8 }, (_, i) => <span key={i} style={{ display: "block", width: "3cqmin", height: "1cqmin", background: i === Math.floor(step) % 8 ? fg : accent, opacity: i === Math.floor(step) % 8 ? 1 : 0.3 }} />)}</div>
    </>}
  </div>;
}

const easeInOut = (v: number) => (v = Math.max(0, Math.min(1, v))) < .5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2;
const hash = (a: number, b = 0) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/**
 * Anvil — a hydraulic press: heavy jaws on piston rods slam toward the reading window (accelerating),
 * hit with a shake, sparks and a flash on the edge, then retract slowly. One press every two beats.
 */
function AnvilPress({ palette: [bg, fg, accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const id = `anvil-${React.useId().replace(/[^w-]/g, "")}`;
  const W = 1000, H = W / aspectRatio, wide = aspectRatio >= 1;
  const intro = 1 - (1 - Math.min(1, Math.max(0, time) / .7)) ** 4;
  const cycle = Math.max(0, time - .2), phase = cycle % 1, hitAt = .18;
  const slam = phase < hitAt ? (phase / hitAt) ** 3 : phase < .3 ? 1 : 1 - easeInOut((phase - .3) / .7);
  const since = phase - hitAt, impact = cycle >= hitAt && since >= 0 ? Math.exp(-since * 14) : 0;
  const jawH = H * (wide ? .2 : .17), top = H * (wide ? .05 : .09), nose = jawH * .24, bodyH = jawH - nose;
  const L = W * .07, R = W * .93, noseL = L + (R - L) * .12, noseR = R - (R - L) * .12;
  const travel = H * .045 * slam, enter = (1 - intro) * (top + jawH + 60), shake = impact * H * .007 * Math.sin(time * 95);
  const offset = top + travel - enter + shake, edge = offset + jawH;
  const stripe = nose * .42, stripeY = bodyH + nose * .2;
  const jaw = <>
    {[.2, .8].map((x) => <g key={x}><rect x={W * x - 15} y={-H} width="30" height={H + 2} fill={fg} /><rect x={W * x - 8} y={-H} width="4" height={H} fill={bg} opacity=".25" /></g>)}
    <path d={`M${L} 0H${R}V${bodyH}H${noseR}V${jawH}H${noseL}V${bodyH}H${L}Z`} fill={fg} />
    <rect x={L} y={bodyH - nose * .22} width={noseL - L} height={nose * .22} fill={bg} opacity=".14" /><rect x={noseR} y={bodyH - nose * .22} width={R - noseR} height={nose * .22} fill={bg} opacity=".14" />
    <rect x={noseL} y={jawH - nose * .26} width={noseR - noseL} height={nose * .26} fill={bg} opacity=".2" />
    <g clipPath={`url(#${id}-hazard)`}>{Array.from({ length: Math.ceil((noseR - noseL) / 36) + 2 }, (_, k) => <path key={k} d={`M${noseL + k * 36 - stripe} ${stripeY + stripe}L${noseL + k * 36} ${stripeY}h18L${noseL + k * 36 + 18 - stripe} ${stripeY + stripe}Z`} fill={accent} />)}</g>
    {Array.from({ length: 8 }, (_, k) => { const x = L + (R - L) * (k + .5) / 8; return <g key={k}><circle cx={x} cy={bodyH * .45} r={jawH * .055} fill={bg} opacity=".3" /><circle cx={x} cy={bodyH * .45} r={jawH * .022} fill={fg} /></g>; })}
    <rect x={noseL} y={jawH - 3} width={noseR - noseL} height="6" fill={accent} opacity={impact} />
  </>;
  const sparks = cycle >= hitAt && since < .4 ? [-1, 1].flatMap((side) => [-1, 1].flatMap((vertical) => Array.from({ length: 7 }, (_, k) => {
    const seed = Math.floor(cycle) * 31 + k + (side + 2) * 7 + (vertical + 2) * 3;
    const angle = (hash(seed) - .5) * 1.1 + vertical * .3, speed = 260 + hash(seed, 1) * 320;
    const ox = side < 0 ? noseL : noseR, oy = vertical < 0 ? edge : H - edge;
    const dx = side * Math.cos(angle), dy = Math.sin(angle);
    const x = ox + dx * speed * since, y = oy + dy * speed * since + 900 * since * since;
    return <line key={`${side}${vertical}${k}`} x1={x - dx * speed * .04} y1={y - dy * speed * .04} x2={x} y2={y} stroke={k % 3 ? accent : fg} strokeWidth="3" strokeLinecap="round" opacity={1 - since / .4} />;
  }))) : null;
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
    <defs><clipPath id={`${id}-hazard`}><rect x={noseL + nose * .5} y={stripeY} width={noseR - noseL - nose} height={stripe} /></clipPath></defs>
    <g transform={`translate(0 ${offset})`}>{jaw}</g>
    <g transform={`translate(0 ${H - offset}) scale(1 -1)`}>{jaw}</g>
    {sparks}
    {[W * .04, W * .96].map((x) => <g key={x}><line x1={x} x2={x} y1={H * .34} y2={H * .66} stroke={accent} strokeWidth="2" opacity=".6" /><rect x={x - 7} y={H * .34 + H * .32 * slam * intro - 2} width="14" height="4" fill={accent} /></g>)}
  </svg>;
}

/**
 * Vector Beat — a directional arrow poster driven by the beat, drawn at the frame's real proportions (no stretching):
 * a stream of chevrons steps forward on every beat (the current one lights up in amber), a faster row below,
 * dashed lane lines frame the open title lane, a circular arrow turns a quarter per beat in the free right column,
 * and a broad amber arrow shoots in each bar with speed lines and an outlined ghost, holds, then exits right.
 */
function VectorBeat({ palette: [bg, fg, accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  // Sizes follow the smaller side so landscape frames stay as airy as portrait ones.
  const W = 1000, H = W / aspectRatio, u = Math.min(W, H), beat = time * 2, whole = Math.floor(beat), frac = beat - whole;
  const stepped = whole + easeInOut(Math.min(1, frac / 0.45));
  const outExpo = (v: number) => (v = Math.max(0, Math.min(1, v))) === 1 ? 1 : 1 - 2 ** (-10 * v);
  const inCubic = (v: number) => Math.max(0, Math.min(1, v)) ** 3;
  const pulse = (1 - frac) ** 3;

  // Chevron stream: steps half a spacing per beat; the chevron matching the beat in the bar is amber.
  const s = u * 0.1, gap = u * 0.15, shift = (stepped * gap * 0.5) % gap, first = -2;
  const chevrons = Array.from({ length: Math.ceil(W / gap) + 4 }, (_, i) => {
    const k = first + i, x = k * gap + shift, absolute = k - Math.floor((stepped * 0.5)), lit = ((absolute % 4) + 4) % 4 === whole % 4;
    return <path key={i} d={`M ${x - s / 2} ${H * 0.16 - s / 2} L ${x} ${H * 0.16} L ${x - s / 2} ${H * 0.16 + s / 2}`} fill="none" stroke={lit ? accent : fg} strokeWidth={lit ? u * 0.034 : u * 0.016} strokeLinejoin="miter" strokeLinecap="square" opacity={lit ? 1 : 0.55} />;
  });
  const small = s * 0.45, smallGap = gap * 0.5, smallShift = (stepped * smallGap) % smallGap;
  const minis = Array.from({ length: Math.ceil(W / smallGap) + 3 }, (_, i) => {
    const x = (i - 1) * smallGap + smallShift;
    return <path key={i} d={`M ${x - small / 2} ${H * 0.265 - small / 2} L ${x} ${H * 0.265} L ${x - small / 2} ${H * 0.265 + small / 2}`} fill="none" stroke={fg} strokeWidth={u * 0.008} opacity="0.3" />;
  });

  // Big arrow: one pass per bar (4 beats) — shoots in, drifts, leaves.
  const bar = (beat % 4) / 4, len = W * 0.84, thick = u * 0.07, ay = H - thick * 1.25 - u * 0.05;
  const ax = bar < 0.18 ? -W * 1.05 + outExpo(bar / 0.18) * W * 1.13 : bar < 0.82 ? W * 0.08 + (bar - 0.18) * W * 0.06 : W * 0.118 + inCubic((bar - 0.82) / 0.18) * W * 1.1;
  const speed = bar < 0.18 ? 1 - bar / 0.18 : bar > 0.82 ? (bar - 0.82) / 0.18 : 0;
  const arrow = (x: number) => `M ${x} ${ay - thick / 2} H ${x + len - thick * 1.6} V ${ay - thick * 1.25} L ${x + len} ${ay} L ${x + len - thick * 1.6} ${ay + thick * 1.25} V ${ay + thick / 2} H ${x} Z`;

  // Lane framing the title (composition: left 9%, right 17%, top 46%).
  const squareish = aspectRatio > 0.85 && aspectRatio < 1.3;
  const laneTop = H * (squareish ? 0.3 : 0.4), laneBottom = H * (squareish ? 0.72 : W > H ? 0.76 : 0.7), cx = W * 0.915, cy = (laneTop + laneBottom) / 2, r = u * 0.045, turn = (whole + easeInOut(Math.min(1, frac / 0.35))) * 90;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M ${(i + 1) * W / 8} 0 V ${H}`} stroke={fg} strokeWidth="1.5" opacity="0.06" />)}
      {chevrons}
      {minis}
      {[laneTop, laneBottom].map((y) => <g key={y} stroke={fg} strokeWidth="2.5" fill="none" opacity="0.4">
        <path d={`M ${W * 0.06} ${y} H ${W * 0.8}`} strokeDasharray={`${u * 0.02} ${u * 0.014}`} strokeDashoffset={-stepped * u * 0.034} />
        <path d={`M ${W * 0.8 - 14} ${y - 12} L ${W * 0.8} ${y} L ${W * 0.8 - 14} ${y + 12}`} />
      </g>)}
      <g transform={`rotate(${turn} ${cx} ${cy})`} fill="none" stroke={accent} strokeWidth={u * 0.012} strokeLinecap="round">
        <path d={`M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`} />
        <path d={`M ${cx - r * 0.35} ${cy - r * 1.3} L ${cx} ${cy - r} L ${cx - r * 0.35} ${cy - r * 0.7}`} />
      </g>
      <circle cx={cx} cy={cy} r={r * (1.6 + pulse * 0.5)} fill="none" stroke={fg} strokeWidth="1.5" opacity={0.15 + pulse * 0.25} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={W * 0.09 + i * u * 0.045} y={laneBottom + u * 0.03} width={u * 0.028} height={u * 0.028} fill={i <= whole % 4 ? accent : "none"} stroke={i <= whole % 4 ? accent : fg} strokeWidth="2" opacity={i <= whole % 4 ? 1 : 0.4} />)}
      <path d={arrow(ax - W * 0.05)} fill="none" stroke={fg} strokeWidth="3" opacity={0.3 + speed * 0.3} transform={`translate(${-speed * W * 0.08} ${thick * 0.35})`} />
      {speed > 0.05 && [-0.32, 0, 0.32].map((k) => <path key={k} d={`M ${ax - W * (0.08 + speed * 0.5)} ${ay + thick * k} H ${ax - W * 0.02}`} stroke={accent} strokeWidth={k ? 3 : 6} opacity={speed * 0.8} strokeLinecap="round" />)}
      <path d={arrow(ax)} fill={accent} />
      <path d={`M ${ax + thick * 0.5} ${ay} H ${ax + len - thick * 2.4}`} stroke={bg} strokeWidth="3" opacity="0.35" />
    </svg>
  </div>;
}

/**
 * Cadence — a real metronome: trapezoid case with a lit window and graduated scale, a pendulum with a sliding weight
 * that reaches its stop exactly on each beat (ripple + tick), four beat dots, and a rounded equaliser along the bottom
 * whose peak caps fall back slowly like a VU meter. Drawn at the frame's real proportions; the centre stays free for the title.
 */
function CadenceBackdrop({ palette: [bg, fg, accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const W = 1000, H = W / aspectRatio, u = Math.min(W, H), beat = time * 2, whole = Math.floor(beat), frac = beat - whole;
  const wide = W > H, tick = (1 - frac) ** 4;
  // Metronome: pivot near the bottom of the case, rod points up; full swing every two beats, extremes on the beat.
  const mh = u * (wide ? 0.27 : 0.25), cx = W / 2, base = H * (wide ? 0.05 : 0.07) + mh, pivotY = base - mh * 0.16;
  const angle = 30 * Math.cos(Math.PI * beat), rod = mh * 0.92, rad = (angle * Math.PI) / 180;
  const tipX = cx + Math.sin(rad) * rod, tipY = pivotY - Math.cos(rad) * rod;
  const topW = u * 0.1, botW = u * 0.3, caseTop = base - mh;
  // A narrow slot in the solid case, where the rod and the scale show (reads as a metronome, not an empty frame).
  const window = `M ${cx - topW * 0.22} ${caseTop + mh * 0.14} L ${cx + topW * 0.22} ${caseTop + mh * 0.14} L ${cx + botW * 0.2} ${base - mh * 0.1} L ${cx - botW * 0.2} ${base - mh * 0.1} Z`;
  // Equaliser: level per column, with a peak cap computed from recent levels (deterministic "peak hold").
  const cols = wide ? 22 : 12, eqTop = H * (wide ? 0.78 : 0.74), eqBottom = H * 0.95, colW = (W * 0.84) / cols;
  const level = (i: number, b: number) => 0.18 + 0.82 * Math.abs(Math.sin(i * 1.27 + Math.floor(b) * 2.1)) * (1 - (b % 1)) ** 1.6 * (0.55 + 0.45 * Math.abs(Math.sin(i * 0.7 + b * 0.8)));
  const peak = (i: number) => Math.max(...Array.from({ length: 8 }, (_, k) => level(i, beat - k * 0.08) - k * 0.035));
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      {[1, 2, 3].map((k) => { const r = u * 0.03 + frac * u * 0.09 * k; return <circle key={k} cx={tipX} cy={tipY} r={r} fill="none" stroke={fg} strokeWidth="2" opacity={tick * 0.5 / k} />; })}
      <path d={`M ${cx - topW / 2} ${caseTop} L ${cx + topW / 2} ${caseTop} L ${cx + botW / 2} ${base} L ${cx - botW / 2} ${base} Z`} fill={fg} />
      <rect x={cx - botW * 0.62} y={base} width={botW * 1.24} height={u * 0.022} rx={u * 0.008} fill={fg} />
      <path d={window} fill={bg} opacity="0.92" />
      {Array.from({ length: 11 }, (_, i) => { const a = ((-20 + i * 4) * Math.PI) / 180, r0 = rod * 0.5, r1 = rod * (i % 5 === 0 ? 0.42 : 0.46); return <path key={i} d={`M ${cx + Math.sin(a) * r0} ${pivotY - Math.cos(a) * r0} L ${cx + Math.sin(a) * r1} ${pivotY - Math.cos(a) * r1}`} stroke={accent} strokeWidth={i % 5 === 0 ? 3 : 1.5} />; })}
      <path d={`M ${cx} ${pivotY} L ${tipX} ${tipY}`} stroke={fg} strokeWidth={u * 0.012} strokeLinecap="round" />
      <g transform={`rotate(${angle} ${cx} ${pivotY})`}><rect x={cx - u * 0.028} y={pivotY - rod * 0.62} width={u * 0.056} height={u * 0.04} rx={u * 0.008} fill={accent} stroke={fg} strokeWidth="2" /></g>
      <circle cx={cx} cy={pivotY} r={u * 0.016} fill={accent} stroke={fg} strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={cx - u * 0.066 + i * u * 0.044} cy={base + u * 0.06} r={u * 0.011} fill={i === whole % 4 ? fg : "none"} stroke={fg} strokeWidth="2" opacity={i === whole % 4 ? 1 : 0.45} />)}
      {Array.from({ length: cols }, (_, i) => {
        const x = W * 0.08 + i * colW + colW * 0.14, w = colW * 0.72, span = eqBottom - eqTop, hgt = span * level(i, beat), py = eqBottom - span * Math.min(1, peak(i));
        return <g key={i}>
          <rect x={x} y={eqBottom - hgt} width={w} height={hgt} rx={w / 2} fill={i % 4 === 0 ? accent : fg} />
          <rect x={x} y={py - u * 0.012} width={w} height={u * 0.008} rx={u * 0.004} fill={fg} opacity="0.7" />
        </g>;
      })}
      <path d={`M ${W * 0.08} ${eqBottom + u * 0.012} H ${W * 0.92}`} stroke={fg} strokeWidth="2" />
    </svg>
  </div>;
}

/**
 * Tessera — a Bauhaus mosaic: a grid of tiles (quarter circles, half circles, dots) in ink, accent and lavender;
 * on every beat one tile turns a quarter, in turn, with a flash outline. A strip of small tiles fills beat by beat at the bottom.
 */
function TesseraBackdrop({ palette: [bg, fg, accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const uid = React.useId().replace(/[^\w-]/g, "");
  const W = 1000, H = W / aspectRatio, beat = time * 2, whole = Math.floor(beat), frac = beat - whole;
  const wide = W > H * 1.3, cols = wide ? 5 : 3, rows = 2;
  const tile = Math.min((W * (wide ? 0.6 : 0.84)) / cols, (H * (wide ? 0.38 : 0.36)) / rows);
  const x0 = W * 0.92 - cols * tile, y0 = H * 0.07, n = cols * rows, gap = tile * 0.04;
  const light = mixColor(bg, "#ffffff", 0.45), fills = [fg, accent, light, accent, fg, light, light, fg, accent, fg];
  const ease = (v: number) => easeInOut(Math.min(1, v / 0.45));
  const tiles = Array.from({ length: n }, (_, k) => {
    const c = k % cols, r = Math.floor(k / cols), x = x0 + c * tile, y = y0 + r * tile, s = tile - gap;
    const turns = beat >= k ? Math.floor((beat - k) / n) + 1 : 0, active = whole % n === k;
    const angle = 90 * ((active ? turns - 1 : turns) + (active ? ease(frac) : 0)) + (k % 4) * 90;
    const base = fills[k % fills.length], ink = base === fg ? light : fg, mark = base === accent ? light : accent;
    const v = (k * 7 + 3) % 5, h = s / 2;
    const motif = v === 0 ? <path d={`M ${-h} ${-h} H ${h} A ${s} ${s} 0 0 1 ${-h} ${h} Z`} fill={ink} />
      : v === 1 ? <><path d={`M ${-h} ${-h} A ${h} ${h} 0 0 0 ${-h} ${h} Z`} fill={ink} /><path d={`M ${h} ${-h} A ${h} ${h} 0 0 1 ${h} ${h} Z`} fill={mark} /></>
      : v === 2 ? <><path d={`M ${-h} ${h} A ${s} ${s} 0 0 1 ${h} ${-h} V ${h} Z`} fill={ink} /><circle cx={-h * 0.45} cy={-h * 0.45} r={s * 0.12} fill={mark} /></>
      : v === 3 ? <><circle r={h * 0.82} fill={ink} /><circle r={h * 0.3} fill={mark} /></>
      : <><path d={`M ${-h} ${-h} H ${h} V 0 A ${h} ${h} 0 0 1 ${-h} 0 Z`} fill={ink} /><circle cx={h * 0.5} cy={h * 0.5} r={s * 0.1} fill={mark} /></>;
    return <g key={k} transform={`translate(${x + tile / 2} ${y + tile / 2})`}>
      <defs><clipPath id={`tess-${uid}-${k}`}><rect x={-h} y={-h} width={s} height={s} rx={s * 0.04} /></clipPath></defs>
      <g clipPath={`url(#tess-${uid}-${k})`}><rect x={-h} y={-h} width={s} height={s} fill={base} /><g transform={`rotate(${angle})`}>{motif}</g></g>
      {active && <rect x={-h - gap} y={-h - gap} width={s + gap * 2} height={s + gap * 2} rx={s * 0.06} fill="none" stroke={fg} strokeWidth="3" opacity={(1 - frac) ** 2} />}
    </g>;
  });
  const strip = wide ? 16 : 10, cell = (W * 0.84) / strip, sy = H * 0.885, filled = whole % strip;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      {tiles}
      <path d={`M ${W * 0.08} ${sy - cell * 0.35} H ${W * 0.92}`} stroke={accent} strokeWidth="2" />
      {Array.from({ length: strip }, (_, i) => {
        const x = W * 0.08 + i * cell, s = cell * 0.62, on = i <= filled;
        return <g key={i} transform={`translate(${x + cell / 2} ${sy + s / 2})`}>
          <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.08} fill={on ? (i % 3 === 1 ? accent : fg) : "none"} stroke={on ? "none" : fg} strokeWidth="1.5" opacity={on ? 1 : 0.3} />
          {on && <path d={`M ${-s / 2} ${-s / 2} H ${s / 2} A ${s} ${s} 0 0 1 ${-s / 2} ${s / 2} Z`} fill={light} opacity="0.85" transform={`rotate(${(i % 4) * 90})`} />}
        </g>;
      })}
    </svg>
  </div>;
}

const mixColor = (a: string, b: string, k: number) => /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b) ? "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("") : a;

/**
 * Torque — une affiche industrielle sous tension : deux rails crantés inclinés défilent en sens opposés par poussées
 * (chaque temps, le couple accélère puis relâche), bordés de filets vermillon ; des traits de vitesse partent à chaque poussée ;
 * en portrait, un compte-tours monte vers la zone rouge sur le temps puis retombe. Dessiné aux proportions réelles du cadre,
 * la bande du titre reste libre (rails plus bas d'inclinaison en paysage).
 */
function TorqueBackdrop({ palette: [bg, fg, accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const W = 1000, H = W / aspectRatio, u = Math.min(W, H), wide = aspectRatio > 1.2;
  const tilt = wide ? -7 : -12;
  const beat = time * 2, whole = Math.floor(beat), frac = beat - whole;
  const surge = whole + easeInOut(Math.min(1, frac / 0.5));
  const push = Math.max(0, 1 - frac / 0.5) * (frac < 0.5 ? 1 : 0);
  const railH = u * (wide ? 0.085 : 0.11), gap = u * 0.06;
  const rails = [{ y: H * (wide ? 0.08 : 0.13), dir: 1 }, { y: H * (wide ? 0.92 : 0.87), dir: -1 }];
  const rev = frac < 0.1 ? 0.18 + 0.74 * (frac / 0.1) : 0.18 + 0.74 * Math.exp(-(frac - 0.1) * 3.2);
  const gauge = aspectRatio < 0.8;
  const gx = W * 0.72, gy = H * 0.72, gr = u * 0.15;
  const angle = (k: number) => ((135 + 270 * k) * Math.PI) / 180;
  const arc = (from: number, to: number, r: number) => `M ${gx + Math.cos(angle(from)) * r} ${gy + Math.sin(angle(from)) * r} A ${r} ${r} 0 ${(to - from) * 270 > 180 ? 1 : 0} 1 ${gx + Math.cos(angle(to)) * r} ${gy + Math.sin(angle(to)) * r}`;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", width: "100%", height: "100%" }} aria-hidden>
      <g transform={`rotate(${tilt} ${W / 2} ${H / 2})`}>
        {rails.map(({ y, dir }) => {
          const shift = ((surge * gap * 1.5 * dir) % gap + gap) % gap;
          const inner = y + (dir > 0 ? 1 : -1) * (railH / 2 + u * 0.03);
          return <g key={y}>
            <rect x={-W * 0.4} y={y - railH / 2} width={W * 1.8} height={railH} fill={fg} />
            {Array.from({ length: Math.ceil((W * 1.8) / gap) + 2 }, (_, i) => {
              const x = -W * 0.4 + i * gap + shift - gap;
              return <path key={i} d={`M ${x} ${y + railH * 0.32} l ${railH * 0.32} ${-railH * 0.64}`} stroke={bg} strokeWidth={u * 0.008} strokeLinecap="round" />;
            })}
            <path d={`M ${-W * 0.4} ${inner} H ${W * 1.4}`} stroke={accent} strokeWidth={u * 0.012} />
            {push > 0.02 && [0.15, 0.45, 0.75].map((k, i) => {
              const x = W * k + dir * push * u * 0.2;
              return <path key={i} d={`M ${x} ${inner + (dir > 0 ? 1 : -1) * u * 0.03} h ${-dir * u * (0.08 + push * 0.12)}`} stroke={fg} strokeWidth={u * 0.006} strokeLinecap="round" opacity={push * 0.7} />;
            })}
          </g>;
        })}
      </g>
      {gauge && <g>
        <circle cx={gx} cy={gy} r={gr * 1.12} fill="none" stroke={fg} strokeWidth={u * 0.006} />
        <path d={arc(0, 0.8, gr)} fill="none" stroke={fg} strokeOpacity=".25" strokeWidth={u * 0.012} />
        <path d={arc(0.8, 1, gr)} fill="none" stroke={accent} strokeWidth={u * 0.022} />
        {Array.from({ length: 11 }, (_, i) => {
          const a = angle(i / 10), r0 = gr * (i % 5 === 0 ? 0.74 : 0.82);
          return <path key={i} d={`M ${gx + Math.cos(a) * r0} ${gy + Math.sin(a) * r0} L ${gx + Math.cos(a) * gr * 0.92} ${gy + Math.sin(a) * gr * 0.92}`} stroke={i >= 8 ? accent : fg} strokeWidth={u * (i % 5 === 0 ? 0.008 : 0.004)} />;
        })}
        <path d={`M ${gx} ${gy} L ${gx + Math.cos(angle(rev)) * gr * 0.86} ${gy + Math.sin(angle(rev)) * gr * 0.86}`} stroke={accent} strokeWidth={u * 0.01} strokeLinecap="round" />
        <circle cx={gx} cy={gy} r={u * 0.016} fill={fg} />
        {rev > 0.8 && <circle cx={gx} cy={gy} r={gr * (1.2 + (rev - 0.8) * 1.5)} fill="none" stroke={accent} strokeWidth={u * 0.004} opacity={(rev - 0.8) * 4} />}
      </g>}
    </svg>
  </div>;
}

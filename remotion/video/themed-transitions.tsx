import { useId, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, random } from "remotion";
import type { VideoProps } from "../props";
import { luminance, textColorOn, useTitleFont } from "./theme";
import { condensedFont as castFont } from "./fonts";

/**
 * Transitions thématiques (docs/MOTION-RULES.md) : chaque couverture reprend le motif d'un thème
 * (presse d'Anvil, rouage de Ratchet, fil de Suture…) au lieu d'un simple panneau de couleur.
 *
 * Convention commune : `p` = part de l'image couverte (0 → rien, 1 → tout couvert).
 * `phase: "out"` = fin de la scène précédente (la couverture arrive, `p` linéaire de 0 à 1) ;
 * `phase: "in"` = début de la scène (la couverture découvre, `p` = 1 − progression d'entrée).
 */

type Palette = VideoProps["palette"];

export type CoverContext = {
  p: number;
  phase: "out" | "in";
  frame: number;
  width: number;
  height: number;
  /** 1 % du plus petit côté, en px */
  unit: number;
  /** Couleur de rideau (la plus contrastée sur le fond) */
  color: string;
  palette: Palette;
  /** Titre de la scène qui arrive (masque typographique) */
  title: string;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const inOut = Easing.inOut(Easing.cubic);
const fill: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" };

/** Grande surface (encre du thème si elle ressort sur le fond, sinon rideau) et couleur de détail contrastée. */
function surfaces({ palette: [bg, main, accent], color }: CoverContext) {
  const contrast = (a: string, b: string) => Math.abs(luminance(a) - luminance(b));
  const surface = contrast(main, bg) >= 0.3 ? main : color;
  const other = surface === main ? accent : main;
  const detail = contrast(other, surface) >= 0.15 ? other : textColorOn(surface);
  return { surface, detail, bg };
}

/** Avance par crans : chaque quart de course part sec et se cale. */
export function ratchetSteps(t: number, steps = 4) {
  const v = clamp01(t) * steps;
  const k = Math.floor(v);
  if (k >= steps) return 1;
  return (k + Easing.out(Easing.cubic)(Math.min(1, (v - k) * 1.8))) / steps;
}

// ───────────── Anvil : la presse ─────────────

/** Deux mâchoires lourdes se referment en accélérant, frappent (secousse, éclair sur la jointure), puis se rouvrent. */
export function PressCover(c: CoverContext) {
  const { surface, detail } = surfaces(c);
  const enter = 1 - c.p;
  // Sortie : accélération franche ; entrée : maintien fermé un instant, puis retrait
  const close = c.phase === "out" ? clamp01(c.p) ** 3 : enter < 0.18 ? 1 : 1 - clamp01((enter - 0.18) / 0.82);
  if (close <= 0) return null;
  const impact = c.phase === "in" ? Math.max(0, 1 - enter / 0.3) : 0;
  const shake = impact * c.unit * 0.7 * Math.sin(c.frame * 2.6);
  const stripe = c.unit * 1.5;
  const jaw = (top: boolean): CSSProperties => ({
    position: "absolute", left: 0, right: 0, height: "50.5%", [top ? "top" : "bottom"]: 0,
    transform: `translateY(${(top ? -1 : 1) * (1 - close) * 101}%) translateY(${shake}px)`,
    background: surface,
  });
  const hazard = (top: boolean): CSSProperties => ({
    position: "absolute", left: "8%", right: "8%", height: c.unit * 2.4, [top ? "bottom" : "top"]: c.unit * 0.9,
    background: `repeating-linear-gradient(135deg, ${detail} 0 ${stripe}px, transparent ${stripe}px ${stripe * 2}px)`,
  });
  const edge = (top: boolean): CSSProperties => ({
    position: "absolute", left: 0, right: 0, height: c.unit * 0.45, [top ? "bottom" : "top"]: 0, background: detail,
    boxShadow: impact > 0 ? `0 0 ${c.unit * 4 * impact}px ${c.unit * impact}px ${detail}` : undefined,
  });
  return <div style={fill}>
    {[true, false].map((top) => <div key={String(top)} style={jaw(top)}><div style={hazard(top)} /><div style={edge(top)} /></div>)}
  </div>;
}

// ───────────── Ratchet : le rouage ─────────────

const GEAR = (() => {
  const teeth = 24;
  return Array.from({ length: teeth * 4 }, (_, i) => {
    const angle = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 === 0 || i % 4 === 3 ? 0.86 : 1;
    return `${i ? "L" : "M"} ${(Math.cos(angle) * r).toFixed(4)} ${(Math.sin(angle) * r).toFixed(4)}`;
  }).join(" ") + " Z";
})();

/** Ouverture dentée : un rouage se referme (ou s'ouvre) cran par cran en tournant d'une dent à chaque cran. */
export function CogCover(c: CoverContext) {
  const id = useId().replace(/[^\w-]/g, "");
  const { surface, detail } = surfaces(c);
  const p = ratchetSteps(c.p);
  if (p <= 0) return null;
  // Rayon des creux (0,86) au-delà de la diagonale quand l'ouverture est complète
  const radius = ((1 - p) * Math.hypot(c.width, c.height)) / 2 / 0.84;
  const rotation = p * 120;
  const gear = `translate(${c.width / 2} ${c.height / 2}) rotate(${rotation}) scale(${Math.max(0.001, radius)})`;
  return <svg width={c.width} height={c.height} style={fill} aria-hidden>
    <defs><mask id={`${id}-m`}><rect width={c.width} height={c.height} fill="white" /><path d={GEAR} fill="black" transform={gear} /></mask></defs>
    <rect width={c.width} height={c.height} fill={surface} mask={`url(#${id}-m)`} />
    {radius > 1 && <path d={GEAR} fill="none" stroke={detail} strokeWidth={(c.unit * 0.7) / Math.max(0.001, radius)} transform={gear} />}
  </svg>;
}

// ───────────── Suture : le fil ─────────────

/** Une aiguille coud l'écran : derrière elle, les deux pans se rejoignent, points de croix sur la couture ; puis la couture s'ouvre. */
export function StitchCover(c: CoverContext) {
  const { surface, detail } = surfaces(c);
  if (c.p <= 0) return null;
  const needle = c.phase === "out" ? -12 + inOut(c.p) * 130 : 118;
  const open = c.phase === "in" ? 1 - inOut(clamp01(c.p)) : 0;
  const edgeAt = (x: number) => (x <= needle ? 50.5 : x >= needle + 14 ? 0 : 50.5 * (1 - (x - needle) / 14));
  const xa = Math.max(0, Math.min(100, needle)), xb = Math.max(0, Math.min(100, needle + 14));
  const top = `0% 0%, 100% 0%, 100% ${edgeAt(100)}%, ${xb}% ${edgeAt(xb)}%, ${xa}% ${edgeAt(xa)}%, 0% ${edgeAt(0)}%`;
  const bottom = top.replace(/(-?[\d.]+)% (-?[\d.]+)%/g, (_, x, y) => `${x}% ${100 - Number(y)}%`);
  const sewn = Math.max(0, Math.min(100, needle));
  const step = (c.unit * 3.2 * 100) / c.width;
  const h = c.unit * 1.6;
  const stitches = Array.from({ length: Math.max(0, Math.floor(sewn / step)) }, (_, i) => (i + 0.5) * step);
  return <div style={fill}>
    <div style={{ ...fill, background: surface, clipPath: `polygon(${top})`, transform: `translateY(${-open * 101}%)` }} />
    <div style={{ ...fill, background: surface, clipPath: `polygon(${bottom})`, transform: `translateY(${open * 101}%)` }} />
    <svg width={c.width} height={c.height} style={{ ...fill, opacity: 1 - open * 1.6 }} aria-hidden>
      <g stroke={detail} strokeWidth={c.unit * 0.42} strokeLinecap="round" transform={`translate(0 ${c.height / 2}) scale(1 ${1 + open * 6})`}>
        {stitches.map((x) => { const px = (x / 100) * c.width; return <path key={x} d={`M ${px - h} ${-h} L ${px + h} ${h} M ${px - h} ${h} L ${px + h} ${-h}`} />; })}
        {c.phase === "out" && needle < 100 && <path d={`M ${(sewn / 100) * c.width} 0 L ${((needle + 6) / 100) * c.width} ${-c.unit * 5}`} strokeWidth={c.unit * 0.3} />}
      </g>
    </svg>
  </div>;
}

// ───────────── Interlock : les crochets ─────────────

/** Deux pièces crantées glissent l'une vers l'autre et s'emboîtent ; à l'entrée, elles se déverrouillent à la verticale. */
export function ClaspCover(c: CoverContext) {
  const { surface, detail } = surfaces(c);
  if (c.p <= 0) return null;
  const rows = c.height > c.width ? 5 : 3;
  const edges = Array.from({ length: rows }, (_, i) => 50 + (i % 2 ? -7 : 7));
  const path = (side: "left" | "right") => {
    const pts: string[] = [side === "left" ? "0% 0%" : "100% 0%"];
    edges.forEach((x, i) => { const e = x + (side === "left" ? 0.25 : -0.25); pts.push(`${e}% ${(i / rows) * 100}%`, `${e}% ${((i + 1) / rows) * 100}%`); });
    pts.push(side === "left" ? "0% 100%" : "100% 100%");
    return `polygon(${pts.join(", ")})`;
  };
  const slide = c.phase === "out" ? inOut(clamp01(c.p)) : 1;
  const lift = c.phase === "in" ? 1 - inOut(clamp01(c.p)) : 0;
  return <div style={fill}>
    <div style={{ ...fill, background: surface, clipPath: path("left"), transform: `translate(${-(1 - slide) * 60}%, ${-lift * 101}%)` }} />
    <div style={{ ...fill, background: detail, clipPath: path("right"), transform: `translate(${(1 - slide) * 60}%, ${lift * 101}%)` }} />
  </div>;
}

// ───────────── Tessera : les tuiles ─────────────

/** Tuiles carrées Bauhaus (quart de cercle) qui pivotent en 3D en vague diagonale, du coin haut gauche au coin bas droit. */
export function TessellateCover(c: CoverContext) {
  const { surface, detail, bg } = surfaces(c);
  if (c.p <= 0) return null;
  const tile = Math.min(c.width, c.height) / 4;
  const cols = Math.ceil(c.width / tile), rows = Math.ceil(c.height / tile), maxD = Math.max(1, cols + rows - 2);
  const light = `color-mix(in srgb, ${bg}, white 45%)`;
  const colors = [surface, detail, light];
  return <div style={fill}>
    {Array.from({ length: cols * rows }, (_, i) => {
      const col = i % cols, row = Math.floor(i / cols), d = (col + row) / maxD;
      const local = clamp01(c.phase === "out" ? c.p * 1.7 - d * 0.7 : c.p * 1.7 - (1 - d) * 0.7);
      // Tuile presque de profil : invisible (évite les fines lamelles résiduelles)
      if (local <= 0.06) return null;
      const base = colors[(col + row * 2) % 3], mark = colors[(col + row * 2 + 1) % 3];
      const corner = ["0 100% 0 0", "100% 0 0 0", "0 0 100% 0", "0 0 0 100%"][(col * 3 + row) % 4];
      return <div key={i} style={{ position: "absolute", left: col * tile, top: row * tile, width: tile + 1, height: tile + 1, background: base, overflow: "hidden", transform: `perspective(${tile * 6}px) rotateY(${(1 - local) * (col % 2 ? 90 : -90)}deg)`, backfaceVisibility: "hidden" }}>
        <div style={{ position: "absolute", inset: "12%", background: mark, borderRadius: corner }} />
      </div>;
    })}
  </div>;
}

// ───────────── Masque typographique ─────────────

/** Sortie : un aplat monte du bas. Entrée : la scène apparaît à travers les lettres géantes de son titre, qui grossissent jusqu'à disparaître. */
export function StencilCover(c: CoverContext) {
  const id = useId().replace(/[^\w-]/g, "");
  const font = useTitleFont();
  const { surface } = surfaces(c);
  if (c.p <= 0) return null;
  if (c.phase === "out") return <div style={{ ...fill, background: surface, transform: `translateY(${(1 - Easing.in(Easing.cubic)(clamp01(c.p))) * 101}%)` }} />;
  const enter = 1 - c.p;
  const word = c.title.replace(/\|/g, " ").split(/\s+/).find(Boolean) ?? "";
  const zoom = 1 + clamp01((enter - 0.12) / 0.88) ** 3 * 30;
  const opacity = 1 - clamp01((enter - 0.7) / 0.3);
  const size = Math.min(c.height * 0.4, (c.width * 0.86) / (Math.max(3, [...word].length) * 0.6));
  const cx = c.width / 2, cy = c.height / 2;
  return <svg width={c.width} height={c.height} style={{ ...fill, opacity }} aria-hidden>
    <defs><mask id={`${id}-m`}>
      <rect width={c.width} height={c.height} fill="white" />
      {word
        ? <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily={font.fontFamily} fontWeight={font.fontWeight} fontSize={size} fill="black" transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>{word}</text>
        : <circle cx={cx} cy={cy} r={c.unit * 12 * zoom} fill="black" />}
    </mask></defs>
    <rect width={c.width} height={c.height} fill={surface} mask={`url(#${id}-m)`} />
  </svg>;
}

// ───────────── Encre ─────────────

const INK_SPOTS = Array.from({ length: 4 }, (_, i) => ({ x: 0.15 + random(`ink-x-${i}`) * 0.7, y: 0.12 + random(`ink-y-${i}`) * 0.76, k: 0.75 + random(`ink-k-${i}`) * 0.5, delay: i * 0.08 }));

/** Gouttes d'encre qui s'étalent (bords irréguliers, auréole humide) ; à l'entrée, l'encre se retire en s'ouvrant par d'autres taches. */
export function InkCover(c: CoverContext) {
  const id = useId().replace(/[^\w-]/g, "");
  const { surface, bg } = surfaces(c);
  if (c.p <= 0) return null;
  const diag = Math.hypot(c.width, c.height);
  // L'encre démarre en gouttes puis accélère en s'étalant (rayon final ≥ 0,64 diagonale : l'écran est couvert)
  const spread = (amount: number, delay: number, k: number) => clamp01((amount - delay) / (1 - delay)) ** 1.6 * diag * 0.85 * k;
  const filter = <filter id={`${id}-f`} x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" />
    <feDisplacementMap in="SourceGraphic" scale={c.unit * 9} xChannelSelector="R" yChannelSelector="G" />
  </filter>;
  const halo = `color-mix(in srgb, ${surface}, ${bg} 55%)`;
  if (c.phase === "out") {
    return <svg width={c.width} height={c.height} style={fill} aria-hidden>
      <defs>{filter}</defs>
      <g filter={`url(#${id}-f)`}>
        {INK_SPOTS.map((s, i) => <circle key={`h${i}`} cx={s.x * c.width} cy={s.y * c.height} r={spread(c.p, s.delay, s.k) * 1.08} fill={halo} />)}
        {INK_SPOTS.map((s, i) => <circle key={i} cx={s.x * c.width} cy={s.y * c.height} r={spread(c.p, s.delay, s.k)} fill={surface} />)}
      </g>
      {c.p > 0.97 && <rect width={c.width} height={c.height} fill={surface} />}
    </svg>;
  }
  const open = 1 - c.p;
  return <svg width={c.width} height={c.height} style={fill} aria-hidden>
    <defs>{filter}<mask id={`${id}-m`}>
      <rect width={c.width} height={c.height} fill="white" />
      <g filter={`url(#${id}-f)`}>{INK_SPOTS.map((s, i) => <circle key={i} cx={(1 - s.x) * c.width} cy={(1 - s.y) * c.height} r={spread(open, s.delay, s.k)} fill="black" />)}</g>
    </mask></defs>
    <rect width={c.width} height={c.height} fill={surface} mask={`url(#${id}-m)`} />
  </svg>;
}

// ───────────── Brûlure de pellicule ─────────────

/** La pellicule brûle depuis un coin (cœur blanc, halo orangé, léger scintillement) puis la brûlure se retire vers le coin opposé. */
export function BurnCover(c: CoverContext) {
  const { bg } = surfaces(c);
  if (c.p <= 0) return null;
  const accent = c.palette[2];
  const diag = Math.hypot(c.width, c.height);
  const amount = c.phase === "out" ? Easing.in(Easing.quad)(clamp01(c.p)) : Easing.inOut(Easing.quad)(clamp01(c.p));
  const radius = amount * diag * 2.4;
  const at = c.phase === "out" ? "14% 86%" : "86% 14%";
  // Scintillement doux (pas de flash) : ±6 % d'intensité
  const flicker = 0.94 + random(`burn-${c.frame}`) * 0.06;
  const hot = `color-mix(in srgb, ${accent}, #ff6a00 55%)`;
  return <div style={{ ...fill, opacity: flicker }}>
    <div style={{ ...fill, background: `radial-gradient(circle at ${at}, #fffaf0 0px, #fff0c4 ${radius * 0.42}px, ${hot} ${radius * 0.62}px, color-mix(in srgb, ${hot}, ${bg} 70%) ${radius * 0.8}px, transparent ${radius}px)` }} />
    <div style={{ ...fill, background: "#ff8a3d", mixBlendMode: "screen", opacity: amount * 0.45 }} />
  </div>;
}

// ───────────── Filtres partagés ─────────────

/** Flou horizontal (filé de caméra) : `filter: url(#id)`. */
export function MotionBlurFilter({ id, amount }: { id: string; amount: number }) {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs><filter id={id} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={`${Math.max(0, amount)} 0`} /></filter></defs>
  </svg>;
}

/** Ondulation liquide : `filter: url(#id)` ; `amount` en px de déplacement. */
export function RippleFilter({ id, amount, frame }: { id: string; amount: number; frame: number }) {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs><filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="turbulence" baseFrequency={`0.004 ${0.022 + Math.sin(frame * 0.35) * 0.004}`} numOctaves="2" seed="11" />
      <feDisplacementMap in="SourceGraphic" scale={Math.max(0, amount)} xChannelSelector="R" yChannelSelector="G" />
    </filter></defs>
  </svg>;
}

/** Traînées lumineuses du filé (whip). */
export function WhipStreaks({ intensity, frame, unit, color }: { intensity: number; frame: number; unit: number; color: string }) {
  if (intensity <= 0.02) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    {Array.from({ length: 7 }, (_, i) => {
      const r = (k: string) => random(`whip-${k}-${i}`);
      return <div key={i} style={{ position: "absolute", top: `${8 + r("y") * 84}%`, left: `${-40 + ((r("x") * 100 + frame * 37) % 160)}%`, width: `${25 + r("w") * 45}%`, height: unit * (0.25 + r("h") * 0.9), borderRadius: unit, background: `linear-gradient(90deg, transparent, ${i % 2 ? color : "white"}, transparent)`, opacity: intensity * (0.35 + r("o") * 0.5) }} />;
    })}
  </AbsoluteFill>;
}

/** Ondes concentriques de l'entrée « ripple ». */
export function RippleRings({ progress, unit, color }: { progress: number; unit: number; color: string }) {
  if (progress >= 1) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center", justifyContent: "center" }}>
    {[0, 0.25].map((delay) => {
      const k = clamp01((progress - delay) / (1 - delay));
      return <div key={delay} style={{ position: "absolute", width: unit * (10 + k * 150), height: unit * (10 + k * 150), borderRadius: "50%", border: `${unit * 0.4}px solid ${color}`, opacity: (1 - k) * 0.45 }} />;
    })}
  </AbsoluteFill>;
}

// ───────────── Bold Orbit : l'éclipse ─────────────

/** Un anneau de lumière se trace autour du centre puis enfle jusqu'à remplir l'écran ; à l'entrée, une ouverture bordée d'une couronne lumineuse découvre la scène. */
export function EclipseCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const accent = c.palette[2];
  const diag = Math.hypot(c.width, c.height);
  const cx = c.width / 2, cy = c.height / 2;
  // Éclipse totale : la lumière trace l'orbite, puis un disque noir (la couleur de fond) enfle derrière une couronne rose
  // et plonge le cadre dans le noir ; la scène suivante se découvre dans l'ouverture du disque. Jamais d'aplat rose plein écran.
  const dark = c.palette[0];
  if (c.phase === "out") {
    const t = clamp01(c.p);
    const r0 = Math.min(c.width, c.height) * 0.22;
    const draw = Easing.out(Easing.cubic)(clamp01(t / 0.5));
    const swell = Easing.in(Easing.cubic)(clamp01((t - 0.42) / 0.58));
    const r = r0 + swell * (diag * 0.62 - r0);
    const ring = c.unit * (0.7 + 0.5 * swell);
    return <svg width={c.width} height={c.height} style={fill} aria-hidden>
      {swell > 0 && <circle cx={cx} cy={cy} r={r} fill={dark} opacity={clamp01(swell * 5)} />}
      {/* Couronne : un trait net et deux halos translucides plus larges (pas de flou SVG, coupé quand l'anneau enfle) */}
      {[[5, 0.12], [2.6, 0.26], [1, 1]].map(([k, o]) => <circle key={k} cx={cx} cy={cy} r={r} fill="none" stroke={k === 1 ? "#fff6fb" : accent} strokeWidth={ring * k} opacity={o} pathLength="100" strokeDasharray={`${draw * 100} 100`} transform={`rotate(-90 ${cx} ${cy})`} />)}
      {draw < 1 && <circle cx={cx + Math.cos(draw * Math.PI * 2 - Math.PI / 2) * r} cy={cy + Math.sin(draw * Math.PI * 2 - Math.PI / 2) * r} r={c.unit * 0.9} fill="#fff6fb" />}
      {t > 0.97 && <rect width={c.width} height={c.height} fill={dark} />}
    </svg>;
  }
  const open = Easing.inOut(Easing.cubic)(1 - clamp01(c.p));
  const r = open * diag * 0.62;
  const corona = c.unit * (1.4 + 2.2 * (1 - open));
  return <div style={{ ...fill, background: `radial-gradient(circle at 50% 50%, transparent ${r}px, #fff6fb ${r + c.unit * 0.2}px, ${accent} ${r + corona * 0.45}px, color-mix(in srgb, ${accent} 30%, ${dark}) ${r + corona}px, ${dark} ${r + corona * 2.4}px)` }} />;
}

// ───────────── Metro : la rame ─────────────

/** Une rame traverse l'écran de droite à gauche (nez arrondi, rangée de fenêtres, bande de couleur) : elle couvre la coupe puis sa queue découvre la scène. */
export function TrainCover(c: CoverContext) {
  const { surface, detail, bg } = surfaces(c);
  if (c.p <= 0) return null;
  const nose = Math.min(c.width, c.height) * 0.28;
  // Sortie : le nez entre par la droite et s'arrête au bord gauche ; entrée : la queue file vers la gauche
  const left = c.phase === "out" ? c.width * (1 - Easing.in(Easing.quad)(clamp01(c.p))) - nose * clamp01(c.p) : -c.width * 3;
  const right = c.phase === "out" ? c.width * 4 : c.width * clamp01(c.p) + nose * clamp01(c.p) * (c.p < 1 ? 1 : 0);
  const win = c.unit * 7, gap = c.unit * 2.2;
  return <div style={fill}>
    <div style={{ position: "absolute", top: 0, bottom: 0, left, width: Math.max(0, right - left), background: surface, borderRadius: c.phase === "out" ? `${nose}px 0 0 ${nose}px` : `0 ${nose}px ${nose}px 0`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: "30%", height: "15%", background: `repeating-linear-gradient(90deg, color-mix(in srgb, ${bg}, ${surface} 18%) 0 ${win}px, transparent ${win}px ${win + gap}px)`, backgroundPosition: `${c.phase === "out" ? nose : 0}px 0` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "56%", height: c.unit * 2.4, background: detail }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "61%", height: c.unit * 0.6, background: detail, opacity: 0.6 }} />
    </div>
    <WhipStreaks intensity={0.6 * (c.phase === "out" ? clamp01(c.p) : clamp01(c.p))} frame={c.frame} unit={c.unit} color={detail} />
  </div>;
}

// ───────── Torque : le cisaillement ─────────

/** Un pan d'encre au bord incliné (comme les rails), bordé d'un filet vermillon, traverse l'écran de droite à gauche. */
export function ShearCover(c: CoverContext) {
  const { surface, detail } = surfaces(c);
  if (c.p <= 0) return null;
  const slant = c.height * Math.tan((12 * Math.PI) / 180);
  const run = c.width + slant;
  const e = c.phase === "out" ? Easing.in(Easing.cubic)(clamp01(c.p)) : Easing.inOut(Easing.cubic)(clamp01(c.p));
  // Sortie : bord d'attaque (bas) de W à -slant, le pan couvre à sa droite ; entrée : bord de fuite de W à -slant, le pan couvre à sa gauche
  const x = c.phase === "out" ? c.width - e * run : -slant + e * run;
  const far = c.phase === "out" ? c.width * 2 : -c.width;
  const band = (from: number, to: number) => `${x + from} ${c.height} ${x + slant + from} 0 ${x + slant + to} 0 ${x + to} ${c.height}`;
  const side = c.phase === "out" ? 1 : -1;
  return <svg width={c.width} height={c.height} style={fill} aria-hidden>
    <polygon points={band(0, (far - x) )} fill={surface} />
    <polygon points={band(side * c.unit * 1.2, side * c.unit * 3)} fill={detail} />
    <polygon points={band(side * c.unit * 4.2, side * c.unit * 4.8)} fill={detail} opacity={0.6} />
  </svg>;
}

// ───────── Linea / Slate : le filet ─────────

/** Un aplat de la couleur du fond, mené par un filet fin d'accent, balaie l'écran (horizontal : droite → gauche ; vertical : bas → haut). */
export function HairlineCover(c: CoverContext & { axis: "x" | "y" }) {
  if (c.p <= 0) return null;
  const [bg, , accent] = c.palette;
  const e = Easing.inOut(Easing.cubic)(clamp01(c.p));
  // Position du bord (fraction du cadre) : en sortie le pan entre par la fin de l'axe, en entrée il repart par le début
  const edge = c.phase === "out" ? 1 - e : e;
  const line = Math.max(2, c.unit * 0.25);
  const along = c.axis === "x" ? c.width : c.height;
  const panel: CSSProperties = c.axis === "x"
    ? (c.phase === "out" ? { left: edge * along, right: 0, top: 0, bottom: 0 } : { left: 0, width: edge * along, top: 0, bottom: 0 })
    : (c.phase === "out" ? { top: edge * along, bottom: 0, left: 0, right: 0 } : { top: 0, height: edge * along, left: 0, right: 0 });
  const rule: CSSProperties = c.axis === "x"
    ? { left: edge * along - line / 2, width: line, top: 0, bottom: 0 }
    : { top: edge * along - line / 2, height: line, left: 0, right: 0 };
  return <div style={fill}>
    <div style={{ position: "absolute", background: bg, ...panel }} />
    <div style={{ position: "absolute", background: accent, ...rule }} />
  </div>;
}

// ───────── Capsule (Interlock) : la pilule ─────────

/** Sortie : un point s'étire en pilule horizontale puis enfle jusqu'à couvrir l'écran. Entrée : la pilule se resserre et file vers la droite. */
export function CapsuleCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const color = c.palette[2];
  const thin = Math.min(c.width, c.height) * 0.14, fullW = c.width * 1.3, fullH = c.height * 1.3;
  let w: number, h: number, x = c.width / 2;
  if (c.phase === "out") {
    const a = Easing.inOut(Easing.cubic)(clamp01(c.p / 0.5)), b = Easing.in(Easing.cubic)(clamp01((c.p - 0.45) / 0.55));
    w = thin + a * (fullW - thin); h = thin + b * (fullH - thin);
  } else {
    const q = 1 - c.p;
    const a = Easing.inOut(Easing.cubic)(clamp01(q / 0.5)), b = Easing.in(Easing.cubic)(clamp01((q - 0.4) / 0.6));
    h = fullH - a * (fullH - thin); w = fullW * (1 - b); x = c.width / 2 + b * c.width * 0.6;
  }
  if (w < 1) return null;
  return <div style={{ position: "absolute", left: x - w / 2, top: c.height / 2 - h / 2, width: w, height: h, borderRadius: Math.min(w, h) / 2, background: color, pointerEvents: "none" }} />;
}

// ───────── Smear (Sticker) : traînées verticales ─────────

/** Colonnes de lumière verticales (jaune → magenta → violet) qui flashent pendant la transition « smear ». */
export function SmearStreaks({ intensity, frame, colors: [hot, cold] }: { intensity: number; frame: number; colors: [string, string] }) {
  if (intensity <= 0.02) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden", mixBlendMode: "screen" }}>
    {Array.from({ length: 9 }, (_, i) => {
      const r = (k: string) => random(`smear-${k}-${i}-${Math.floor(frame / 2)}`);
      return <div key={i} style={{ position: "absolute", left: `${4 + i * 10.5 + (r("x") - 0.5) * 4}%`, width: `${3 + r("w") * 6}%`, top: "-10%", bottom: "-10%", background: `linear-gradient(180deg, transparent, ${cold}, ${hot} 50%, ${cold}, transparent)`, filter: "blur(8px)", opacity: intensity * (0.25 + r("o") * 0.5) }} />;
    })}
  </AbsoluteFill>;
}

// ───────── Noise : le faisceau ─────────

/** Une bande de lumière blanche striée de colonnes s'ouvre depuis la ligne médiane jusqu'à remplir l'écran ; à l'entrée, elle se referme en ligne. */
export function FlareCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const light = c.palette[1];
  const open = c.phase === "out" ? Easing.in(Easing.cubic)(clamp01(c.p)) : Easing.inOut(Easing.cubic)(clamp01(c.p));
  const h = open * c.height * 1.3;
  return <div style={{ ...fill, opacity: c.phase === "in" ? Math.min(1, c.p * 1.6) : 1 }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: c.height / 2 - h / 2, height: h, background: `linear-gradient(180deg, transparent, ${light} 18%, ${light} 82%, transparent)` }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: c.height / 2 - h / 2, height: h, background: "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.14) 0 0.6%, transparent 0.6% 2.2%, rgb(0 0 0 / 0.08) 2.2% 2.8%, transparent 2.8% 5%)", opacity: 1 - open * 0.8 }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: c.height / 2 - 1, height: 2, background: light, boxShadow: `0 0 ${c.unit * 3}px ${c.unit}px ${light}`, opacity: 1 - open }} />
  </div>;
}

// ───────── Ember : l'embrasement ─────────

/** Un éclat chaud (cœur blanc, halo orange-rouge) grandit depuis le centre jusqu'à remplir l'écran, puis se résorbe au centre. */
export function IgniteCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const accent = c.palette[2];
  const diag = Math.hypot(c.width, c.height);
  const amount = c.phase === "out" ? Easing.in(Easing.quad)(clamp01(c.p)) : Easing.inOut(Easing.cubic)(clamp01(c.p));
  const r = amount * diag * 1.5;
  const flicker = 0.95 + random(`ignite-${c.frame}`) * 0.05;
  return <div style={{ ...fill, opacity: flicker, background: `radial-gradient(circle at 50% 50%, #fffaf0 0px, #ffe2b8 ${r * 0.32}px, color-mix(in srgb, ${accent}, #ffb347 45%) ${r * 0.55}px, ${accent} ${r * 0.72}px, transparent ${r}px)` }} />;
}

// ───────── Halo : le tourbillon ─────────

/** Anneau de lumière (accent) qui s'élargit en tournant pendant la transition « whirl ». */
export function WhirlRing({ intensity, unit, color }: { intensity: number; unit: number; color: string }) {
  if (intensity <= 0.02) return null;
  const size = unit * (30 + intensity * 120);
  return <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: size, height: size * 0.62, borderRadius: "50%", border: `${unit * (0.6 + intensity * 1.6)}px solid ${color}`, filter: `blur(${unit * (0.4 + intensity)}px)`, opacity: intensity * 0.85, transform: `rotate(${intensity * 40}deg)` }} />
  </AbsoluteFill>;
}

// ───────── Melt : la coulure ─────────

/** Colonnes de liquide (rose → bleu) à bout arrondi qui descendent du haut à des vitesses différentes ; à l'entrée, elles s'écoulent vers le bas. */
export function DripCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [, , accent] = c.palette;
  const blue = `color-mix(in srgb, #3b5bff 80%, ${accent})`;
  const cols = 12, w = c.width / cols;
  return <div style={fill}>
    {Array.from({ length: cols }, (_, i) => {
      const delay = random(`drip-${i}`) * 0.35;
      const k = clamp01((c.p - delay) / (1 - delay));
      const e = Easing.in(Easing.quad)(k);
      const h = c.height * 1.15;
      // Sortie : la colonne descend depuis le haut ; entrée : le haut de la colonne descend et la découvre
      const top = c.phase === "out" ? -h + e * h : c.height * (1 - Easing.inOut(Easing.cubic)(k));
      return <div key={i} style={{ position: "absolute", left: i * w - 1, width: w + 2, top, height: h, borderRadius: c.phase === "out" ? `0 0 ${w / 2}px ${w / 2}px` : `${w / 2}px ${w / 2}px 0 0`, background: `linear-gradient(180deg, ${accent}, ${blue})` }} />;
    })}
  </div>;
}

// ───────── Holo : l'entaille ─────────

/** Bandes diagonales (couleur du fond, liseré irisé) qui s'élargissent jusqu'à se rejoindre, puis se resserrent à l'entrée. */
export function SlashCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [bg, main, accent] = c.palette;
  const e = c.phase === "out" ? Easing.in(Easing.cubic)(clamp01(c.p)) : Easing.inOut(Easing.cubic)(clamp01(c.p));
  const bands = 7, span = Math.hypot(c.width, c.height) * 1.3, pitch = span / bands;
  return <div style={fill}>
    <div style={{ position: "absolute", left: "50%", top: "50%", width: span, height: span, transform: "translate(-50%, -50%) rotate(-28deg)" }}>
      {Array.from({ length: bands }, (_, i) => {
        const w = pitch * e * 1.04;
        return <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: i * pitch + pitch / 2 - w / 2, width: w, background: bg, boxShadow: e < 0.98 ? `-${c.unit * 0.3}px 0 0 ${accent}, ${c.unit * 0.3}px 0 0 ${main}` : undefined, opacity: clamp01((e - 0.02) / 0.08) }} />;
      })}
    </div>
  </div>;
}

// ───────── Lumen : les colonnes de lumière ─────────

/** Colonnes verticales (accent, cœur clair) qui s'élargissent jusqu'à se rejoindre ; à l'entrée, elles s'amincissent en traits puis s'éteignent. */
export function StreakCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [, main, accent] = c.palette;
  const cols = 9, pitch = c.width / cols;
  const e = c.phase === "out" ? Easing.in(Easing.cubic)(clamp01(c.p)) : Easing.inOut(Easing.cubic)(clamp01(c.p));
  return <div style={fill}>
    {Array.from({ length: cols }, (_, i) => {
      const k = clamp01(e * 1.25 - random(`streak-${i}`) * 0.25);
      const w = Math.max(1, pitch * 1.06 * k);
      return <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: i * pitch + pitch / 2 - w / 2, width: w, background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent}, ${main} 35%) 50%, ${accent})`, boxShadow: `0 0 ${c.unit * 2}px ${accent}`, opacity: c.phase === "in" ? Math.min(1, k * 1.5) : 1 }} />;
    })}
  </div>;
}

// ───────── Gloss : la montée du liquide ─────────

/** Le liquide (rose → blanc) monte du bas en vague jusqu'à couvrir l'écran ; à l'entrée, il redescend en découvrant la scène. */
export function SurgeCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [, main, accent] = c.palette;
  const level = Easing.inOut(Easing.cubic)(clamp01(c.p));
  const W = c.width, H = c.height;
  const pts = Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    const y = 1.08 - level * 1.25 + Math.sin(x * 6 + c.frame * 0.25) * 0.03 * (1 - level) - Math.exp(-(((x - 0.5) / 0.18) ** 2)) * 0.12 * (1 - level);
    return `${(x * W).toFixed(1)} ${(y * H).toFixed(1)}`;
  });
  return <svg width={W} height={H} style={fill} aria-hidden>
    <defs><linearGradient id={`surge-${c.frame}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={`color-mix(in srgb, ${accent}, ${main} 55%)`} /><stop offset="0.25" stopColor={accent} /><stop offset="1" stopColor={`color-mix(in srgb, ${accent}, black 35%)`} /></linearGradient></defs>
    <path d={`M0 ${H}L${pts.join("L")}L${W} ${H}Z`} fill={`url(#surge-${c.frame})`} />
  </svg>;
}

// ───────── Hollow, Cursive, Overlap, Bloom ─────────

/** Aplat du fond bordé de trois filets d'accent : monte du bas (sortie) puis continue vers le haut (entrée). */
export function StrataCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [bg, , accent] = c.palette;
  const e = c.phase === "out" ? Easing.in(Easing.cubic)(clamp01(c.p)) : Easing.out(Easing.cubic)(1 - clamp01(c.p));
  const top = c.phase === "out" ? (1 - e) * 115 - 15 : -e * 115;
  return <div style={{ ...fill }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: `${top}%`, height: "115%", background: bg }}>
      {[0, 1, 2].map((k) => <div key={k} style={{ position: "absolute", left: 0, right: 0, top: `${k * 3.5}%`, height: c.unit * 0.4, background: accent }} />)}
    </div>
  </div>;
}

/** Trait de feutre en diagonale (accent) qui s'élargit jusqu'à couvrir l'écran, puis file vers la droite. */
export function ScrawlCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const accent = c.palette[2];
  const grow = c.phase === "out" ? Easing.in(Easing.cubic)(clamp01(c.p)) : 1;
  const leave = c.phase === "in" ? Easing.out(Easing.cubic)(1 - clamp01(c.p)) : 0;
  const diag = Math.hypot(c.width, c.height);
  return <div style={fill}>
    <div style={{ position: "absolute", left: "50%", top: "50%", width: diag * 1.2, height: Math.max(c.unit * 2, diag * 1.1 * grow), borderRadius: c.unit * 6, background: accent, transform: `translate(-50%, -50%) translateX(${leave * diag * 1.2}px) rotate(-14deg)` }} />
  </div>;
}

/** Bande pleine (couleur principale) : son bas descend jusqu'à couvrir l'écran ; à l'entrée, son haut descend et la découvre. */
export function ScanCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const main = c.palette[1];
  const e = c.phase === "out" ? Easing.in(Easing.cubic)(clamp01(c.p)) : Easing.out(Easing.cubic)(1 - clamp01(c.p));
  const style: CSSProperties = c.phase === "out" ? { top: 0, height: `${e * 100.5}%` } : { top: `${e * 100}%`, bottom: 0 };
  return <div style={fill}><div style={{ position: "absolute", left: 0, right: 0, background: main, ...style }} /></div>;
}

/** Lueur horizontale diffuse (accent) pendant la transition « smudge ». */
export function SmudgeGlow({ intensity, color }: { intensity: number; color: string }) {
  if (intensity <= 0.02) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse 80% 30% at 50% 50%, color-mix(in srgb, ${color}, transparent 30%), transparent 75%)`, opacity: intensity * 0.9, mixBlendMode: "screen" }} />;
}

// ───────── Lustre ─────────

/** Ondulation de métal liquide (Lustre) : champ de bruit qui glisse en continu, déplacement proportionnel à `amount` (px). */
export function LiquidWarpFilter({ id, amount, frame }: { id: string; amount: number; frame: number }) {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs><filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.005 0.008" numOctaves="2" seed="9" result="noise" />
      <feOffset in="noise" dx={Math.sin(frame * 0.05) * 40} dy={Math.cos(frame * 0.04) * 30} result="flow" />
      <feDisplacementMap in="SourceGraphic" in2="flow" scale={Math.max(0, amount)} xChannelSelector="R" yChannelSelector="G" />
    </filter></defs>
  </svg>;
}

/**
 * Étincelle (Lustre) : une étoile chromée à quatre branches s'ouvre en tournant depuis le centre jusqu'à couvrir le cadre
 * (sortie), puis se referme en continuant sa rotation pour découvrir la scène suivante (entrée). Quatre petites étincelles
 * filent sur ses branches.
 */
export function SparkleCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [, main, accent] = c.palette;
  const e = Easing.inOut(Easing.cubic)(clamp01(c.p));
  const W = c.width, H = c.height, d = Math.hypot(W, H) / 2;
  // Étoile pleine : à 45°, son bord passe à ≈ 0,49 R ; 2,3 × la demi-diagonale suffit à couvrir les coins
  const R = e * d * 2.3, turn = c.phase === "out" ? e * 50 : 100 - e * 50;
  const ice = `color-mix(in srgb, #8FE9FF 72%, ${main})`;
  const gid = `sparkle-${c.phase}-${c.frame}`;
  const star = "M0 -1C0.15 -0.45 0.45 -0.15 1 0C0.45 0.15 0.15 0.45 0 1C-0.15 0.45 -0.45 0.15 -1 0C-0.45 -0.15 -0.15 -0.45 0 -1Z";
  return <svg width={W} height={H} style={fill} aria-hidden>
    <defs>
      {/* Chrome : bandes rose / bleu glacé / blanc répétées en diagonale, comme le métal du titre */}
      <linearGradient id={gid} gradientUnits="userSpaceOnUse" spreadMethod="repeat" x1="-0.1" y1="-0.2" x2="0.08" y2="0.32">
        <stop offset="0" stopColor={ice} /><stop offset="0.2" stopColor="#FFFFFF" /><stop offset="0.34" stopColor={ice} />
        <stop offset="0.52" stopColor={accent} /><stop offset="0.7" stopColor={`color-mix(in srgb, ${accent}, #000 30%)`} /><stop offset="0.86" stopColor={accent} /><stop offset="1" stopColor={ice} />
      </linearGradient>
      <radialGradient id={`${gid}-core`} cx="0" cy="0" r="0.5" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.8" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
    </defs>
    <g transform={`translate(${W / 2} ${H / 2}) rotate(${turn}) scale(${Math.max(0.001, R)})`}>
      <path d={star} fill={`url(#${gid})`} />
      <path d={star} fill={`url(#${gid}-core)`} />
      <path d={star} fill="none" stroke={`color-mix(in srgb, ${accent}, #000 40%)`} strokeWidth={0.02} />
      <path d={star} fill="none" stroke="#FFFFFF" strokeOpacity={0.7 * (1 - e)} strokeWidth={0.008} />
    </g>
    {[0, 1, 2, 3].map((k) => {
      const a = (turn + k * 90) * Math.PI / 180 - Math.PI / 2, r = R * 0.9 + c.unit * 4;
      const s = c.unit * (2.2 + 1.8 * Math.sin(Math.PI * e));
      return <path key={k} d={star} fill="#FFFFFF" opacity={0.9 * Math.sin(Math.PI * e)} transform={`translate(${W / 2 + Math.cos(a) * r} ${H / 2 + Math.sin(a) * r}) scale(${s})`} />;
    })}
  </svg>;
}

// ───────── Thermal : le scan thermique ─────────

/** Fausses couleurs thermiques (Thermal) : l'image passe en luminance, étirée vers le bas, puis en échelle bleu → cyan → blanc → rouge. `amount` 0 → 1. */
export function ThermalFilter({ id, amount, unit, palette: [bg, main, accent] }: { id: string; amount: number; unit: number; palette: Palette }) {
  const k = Math.max(0, Math.min(1, amount));
  const rgb = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex) ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) : [0.5, 0.5, 0.5];
  // Échelle : noir, bleu nuit, principale, cyan, blanc, accent
  const stops = [rgb(bg).map((v) => v * 0.5), rgb(main).map((v) => v * 0.45), rgb(main), rgb(main).map((v, i) => i === 0 ? v * 0.4 + 0.15 : 0.45 * v + 0.55), [1, 1, 1], rgb(accent)];
  const table = (c: number) => stops.map((s) => s[c].toFixed(3)).join(" ");
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs><filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation={`0 ${(k * unit * 6).toFixed(2)}`} result="drawn" />
      <feColorMatrix in="drawn" type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" result="lum" />
      <feComponentTransfer in="lum" result="heat"><feFuncR type="table" tableValues={table(0)} /><feFuncG type="table" tableValues={table(1)} /><feFuncB type="table" tableValues={table(2)} /></feComponentTransfer>
      <feComposite in="heat" in2="drawn" operator="arithmetic" k2={k} k3={1 - k} />
    </filter></defs>
  </svg>;
}

/**
 * Scan thermique (Thermal) : une ligne de scan blanche descend ; au-dessus, le cadre est recouvert de colonnes thermiques
 * (bandes bleu → cyan → blanc → rouge qui coulent vers le bas). À l'entrée, une nouvelle ligne descend et découvre la scène
 * suivante au-dessus d'elle, les colonnes s'écoulant sous la ligne.
 */
export function ThermalScanCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [bg, main, accent] = c.palette;
  const e = Easing.inOut(Easing.cubic)(clamp01(c.p));
  const W = c.width, H = c.height;
  // Sortie : la zone couverte grandit du haut vers le bas ; entrée : elle se réduit par le haut
  const scan = c.phase === "out" ? e * (H + c.unit * 6) : (1 - e) * (H + c.unit * 6);
  const top = c.phase === "out" ? 0 : scan, bottom = c.phase === "out" ? scan : H + c.unit * 6;
  const cyan = `color-mix(in srgb, #6FF6FF 65%, ${main})`, deep = `color-mix(in srgb, ${main} 45%, ${bg})`;
  const gid = `thermal-scan-${c.phase}-${c.frame}`;
  const cols = 22, cw = W / cols, flow = c.frame * c.unit * 1.4;
  return <svg width={W} height={H} style={fill} aria-hidden>
    <defs>
      <linearGradient id={gid} gradientUnits="userSpaceOnUse" spreadMethod="repeat" x1="0" y1={flow} x2="0" y2={flow + H * 0.55}>
        <stop offset="0" stopColor={deep} /><stop offset="0.22" stopColor={main} /><stop offset="0.38" stopColor={cyan} /><stop offset="0.47" stopColor="#FFFFFF" />
        <stop offset="0.54" stopColor={accent} /><stop offset="0.64" stopColor={cyan} /><stop offset="0.8" stopColor={main} /><stop offset="1" stopColor={deep} />
      </linearGradient>
      <clipPath id={`${gid}-c`}><rect x="0" y={top} width={W} height={Math.max(0, bottom - top)} /></clipPath>
    </defs>
    <g clipPath={`url(#${gid}-c)`}>
      <rect width={W} height={H} fill={deep} />
      {/* Colonnes de largeurs irrégulières, chacune avec son décalage de chaleur ; bords sombres comme sur le titre */}
      {Array.from({ length: cols }, (_, i) => {
        const x = i * cw, shift = random(`thermal-col-${i}`) * H * 0.5;
        return <g key={i} transform={`translate(0 ${shift.toFixed(1)})`}>
          <rect x={x - 0.5} y={-shift} width={cw + 1} height={H} fill={`url(#${gid})`} />
          <rect x={x + cw * (0.3 + random(`thermal-in-${i}`) * 0.3)} y={-shift} width={cw * 0.35} height={H} fill={bg} opacity={0.45} />
        </g>;
      })}
    </g>
    {/* Ligne de scan et sa lueur */}
    <rect x="0" y={scan - c.unit * 2.5} width={W} height={c.unit * 5} fill={cyan} opacity={0.35} style={{ filter: `blur(${c.unit * 1.5}px)` }} />
    <rect x="0" y={scan - c.unit * 0.25} width={W} height={c.unit * 0.5} fill="#FFFFFF" />
  </svg>;
}

// ───────── Cast : la projection ─────────

/**
 * Projection (Cast) : l'ombre couchée du premier mot de la scène suivante surgit du bas du cadre en perspective et fonce
 * vers le spectateur jusqu'à remplir l'écran (anthracite), puis recule et se couche pour découvrir la scène.
 */
export function CastCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [, main] = c.palette;
  const e = Easing.inOut(Easing.cubic)(clamp01(c.p));
  const word = (c.title.trim().split(/\s+/)[0] || "•").toUpperCase();
  const flood = clamp01((e - 0.62) / 0.3);
  const size = c.height * (0.25 + e * e * 3.2);
  return <div style={fill}>
    <div style={{ position: "absolute", left: "50%", top: "100%", perspective: c.height * 0.9, perspectiveOrigin: "50% 0%" }}>
      <div style={{ transformOrigin: "50% 0%", transform: `translate(-50%, ${-e * c.height * 0.55}px) rotateX(${70 - e * 40}deg) scaleY(-1)`, fontFamily: castFont, fontSize: size, lineHeight: 0.84, whiteSpace: "nowrap", color: main, opacity: clamp01((e - 0.03) * 8) }}>{word}</div>
    </div>
    <div style={{ ...fill, background: main, opacity: flood }} />
  </div>;
}

// ───────── Shard : le bris de verre ─────────

/** Toile de fissures : rayons depuis un point d'impact, coupés par des anneaux ; chaque case est un éclat. */
function shatterPanes(W: number, H: number, cx: number, cy: number) {
  const rays = 9, rings = [0.16, 0.42, 0.75, 1.6].map((r) => r * Math.hypot(W, H));
  const angle = (i: number) => (i / rays) * Math.PI * 2 + (random(`shard-a-${i}`) - 0.5) * 0.45;
  const point = (i: number, j: number) => {
    const r = j < 0 ? 0 : rings[j] * (0.85 + random(`shard-r-${i % rays}-${j}`) * 0.3), a = angle(i % rays);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const panes: { pts: (readonly [number, number])[]; ring: number; i: number }[] = [];
  for (let j = 0; j < rings.length; j++) for (let i = 0; i < rays; i++) {
    panes.push({ pts: j === 0 ? [point(i, -1), point(i, 0), point(i + 1, 0)] : [point(i, j - 1), point(i, j), point(i + 1, j), point(i + 1, j - 1)], ring: j, i });
  }
  return panes;
}

/**
 * Bris de verre (Shard) : à la sortie, une toile de fissures claires part d'un point d'impact et s'étend sur tout le cadre,
 * puis les éclats deviennent opaques (couleur du fond) du centre vers les bords. À l'entrée, les éclats tombent en
 * tournant, du centre vers les bords, et découvrent la scène suivante.
 */
export function ShatterCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [bg, main] = c.palette;
  const W = c.width, H = c.height, cx = W * 0.54, cy = H * 0.46;
  const panes = shatterPanes(W, H, cx, cy);
  const p = clamp01(c.p);
  const web = c.phase === "out" ? clamp01(p / 0.45) : 1;
  return <svg width={W} height={H} style={fill} aria-hidden>
    {c.phase === "out" && <defs><clipPath id={`shatter-web-${c.frame}`}><circle cx={cx} cy={cy} r={web * Math.hypot(W, H)} /></clipPath></defs>}
    <g clipPath={c.phase === "out" ? `url(#shatter-web-${c.frame})` : undefined}>
      {panes.map(({ pts, ring, i }, k) => {
        const centerX = pts.reduce((s, q) => s + q[0], 0) / pts.length, centerY = pts.reduce((s, q) => s + q[1], 0) / pts.length;
        const path = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
        if (c.phase === "out") {
          // Les éclats se remplissent du centre vers les bords
          const start = 0.35 + ring * 0.15 + random(`shard-o-${k}`) * 0.08;
          const fillK = clamp01((p - start) / 0.12);
          return <path key={k} d={path} fill={bg} fillOpacity={fillK} stroke={main} strokeOpacity={0.85 * (1 - fillK * 0.6)} strokeWidth={c.unit * 0.25} strokeLinejoin="round" />;
        }
        // Entrée : chaque éclat tombe avec sa rotation, l'anneau intérieur en premier
        const t = clamp01(((1 - p) - ring * 0.12 - random(`shard-i-${k}`) * 0.08) / 0.6);
        const fy = t * t * H * (1 + random(`shard-v-${k}`) * 0.6), fx = (centerX - cx) * t * 0.25, rot = (random(`shard-t-${i}-${ring}`) - 0.5) * 80 * t;
        return t >= 1 ? null : <path key={k} d={path} transform={`translate(${fx.toFixed(1)} ${fy.toFixed(1)}) rotate(${rot.toFixed(1)} ${centerX.toFixed(1)} ${centerY.toFixed(1)})`} fill={bg} stroke={main} strokeOpacity={0.6} strokeWidth={c.unit * 0.25} strokeLinejoin="round" />;
      })}
    </g>
    {/* Impact : petit point clair qui s'éteint */}
    {c.phase === "out" && <circle cx={cx} cy={cy} r={c.unit * (0.6 + web * 1.4)} fill={main} opacity={0.9 * (1 - clamp01((p - 0.4) / 0.4))} />}
  </svg>;
}

// ───────── Wiggle : la tache ─────────

/** Tremblé dessiné (Wiggle) : champ de bruit fin qui glisse en continu, déplacement `amount` (px). */
export function BoilFilter({ id, amount, frame }: { id: string; amount: number; frame: number }) {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs><filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="5" result="noise" />
      <feOffset in="noise" dx={Math.sin(frame * 0.35) * 30} dy={Math.cos(frame * 0.28) * 30} result="flow" />
      <feDisplacementMap in="SourceGraphic" in2="flow" scale={Math.max(0, amount)} xChannelSelector="R" yChannelSelector="G" />
    </filter></defs>
  </svg>;
}

/**
 * Tache (Wiggle) : une tache dessinée à la main (accent, contour d'encre, hachures claires) gonfle depuis le centre avec un
 * rebond jusqu'à couvrir l'écran, son bord bouillonnant ; à l'entrée, elle se rétracte en ressort et découvre la scène.
 */
export function BlobCover(c: CoverContext) {
  if (c.p <= 0) return null;
  const [, , accent] = c.palette;
  const p = clamp01(c.p);
  // Gonflement avec dépassement (sortie) ; rétraction qui s'accélère (entrée)
  const e = c.phase === "out" ? Easing.out(Easing.back(1.4))(p) : Easing.in(Easing.back(1.4))(p);
  const W = c.width, H = c.height, R = Math.max(0, e) * Math.hypot(W, H) * 0.62;
  const gid = `blob-${c.phase}-${c.frame}`;
  const lobes = 9;
  const path = Array.from({ length: lobes * 4 }, (_, k) => {
    const a = (k / (lobes * 4)) * Math.PI * 2, r = R * (1 + 0.08 * Math.sin(a * lobes + c.frame * 0.25) + 0.04 * Math.sin(a * 3 - c.frame * 0.18));
    return `${k ? "L" : "M"}${(W / 2 + Math.cos(a) * r).toFixed(1)} ${(H / 2 + Math.sin(a) * r).toFixed(1)}`;
  }).join("") + "Z";
  return <svg width={W} height={H} style={fill} aria-hidden>
    <defs>
      <filter id={gid} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7" result="n" />
        <feOffset in="n" dx={Math.sin(c.frame * 0.4) * 25} dy={Math.cos(c.frame * 0.33) * 25} result="m" />
        <feDisplacementMap in="SourceGraphic" in2="m" scale={c.unit * 3} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <pattern id={`${gid}-h`} patternUnits="userSpaceOnUse" width={c.unit * 2.4} height={c.unit * 2.4} patternTransform="rotate(-35)">
        <rect width={c.unit * 0.7} height={c.unit * 2.4} fill="#FFE45C" opacity="0.35" />
      </pattern>
    </defs>
    <g filter={`url(#${gid})`}>
      <path d={path} fill="#0E0D0C" transform={`translate(${c.unit * 1.2} ${c.unit * 1.5})`} />
      <path d={path} fill={accent} stroke="#0E0D0C" strokeWidth={c.unit * 0.8} />
      <path d={path} fill={`url(#${gid}-h)`} />
    </g>
  </svg>;
}

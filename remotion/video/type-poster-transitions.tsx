import { useId, type CSSProperties, type ReactNode } from "react";
import { Easing } from "remotion";
import type { CoverContext } from "./themed-transitions";
import { paintStroke } from "./type-poster-art";
import { condensedFont } from "./fonts";
import type { TypePosterKind } from "../../config/type-posters";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Progression décalée : chaque élément part avec `delay` de retard mais arrive à 1 en même temps que les autres. */
const stagger = (p: number, delay: number) => clamp01((p - delay) / (1 - delay));
/** Contraste d'un détail qui doit disparaître quand la couverture est pleine (la coupe a lieu sous un aplat identique). */
const fadeNearFull = (p: number, span = 0.25) => clamp01((1 - p) / span);

const mixHex = (a: string, b: string, k: number) => /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b)
  ? "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("")
  : a;

const coverSvg: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none" };

/**
 * Couvertures plein cadre des affiches typographiques : chaque thème cache la frontière avec son propre motif
 * (coulures, plis, éventail, cube, plaques miroir, hélice, pinceau, spectre, pile, ruban).
 * `p` = 1 : cadre couvert ; à `p` = 1 les deux phases (sortie / entrée) dessinent exactement la même image.
 */
export function TypePosterCover({ kind, ...c }: CoverContext & { kind: TypePosterKind }) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const p = Easing.inOut(Easing.cubic)(clamp01(c.p));
  if (p <= 0) return null;
  const [bg, ink, accent] = c.palette;
  if (kind === "blocktype") return <BlockPivot p={p} bg={bg} ink={ink} title={c.title} />;
  const props = { p, bg, ink, accent, frame: c.frame, phase: c.phase, uid };
  return <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ ...coverSvg, opacity: clamp01((p - 0.015) / 0.08) }} aria-hidden>
    {kind === "spill" && <SpillCurtain {...props} />}
    {kind === "veil" && <VeilFolds {...props} />}
    {kind === "fanout" && <FanBlades {...props} />}
    {kind === "positive" && <MirrorPlates {...props} />}
    {kind === "helix" && <HelixStrands {...props} />}
    {kind === "power" && <BrushSweep {...props} />}
    {kind === "spectra" && <SpectrumBars {...props} />}
    {kind === "batch" && <StackBands {...props} />}
    {kind === "turn" && <RibbonTwist {...props} />}
  </svg>;
}

type Part = { p: number; bg: string; ink: string; accent: string; frame: number; phase: "in" | "out"; uid: string };

/** Spill : des colonnes de liquide tombent à des vitesses différentes, gouttes en tête ; à l'entrée elles finissent leur chute vers le bas. */
function SpillCurtain({ p, bg, ink, phase }: Part) {
  const shade = mixHex(ink, bg, 0.22);
  const detail = fadeNearFull(p);
  return <>{Array.from({ length: 10 }, (_, i) => {
    const x = i * 112 - 60;
    const w = 190;
    const delay = 0.2 * (0.5 + 0.5 * Math.sin(i * 1.7 + 0.4));
    // Gravité : départ lent, chute qui accélère
    const pi = Easing.in(Easing.quad)(stagger(p, delay));
    if (pi <= 0) return null;
    if (phase === "out") {
      const y = -150 + pi * 1380;
      return <g key={i}>
        <rect x={x} y={-200} width={w} height={y + 200} fill={ink} />
        <ellipse cx={x + w / 2} cy={y} rx={w / 2} ry={w * 0.55} fill={ink} />
        <rect x={x + w * 0.66} y={-200} width={w * 0.12} height={y + 150} fill={shade} opacity={detail} />
        {pi < 0.92 && <circle cx={x + w * (0.35 + 0.3 * Math.sin(i * 2.3))} cy={y + 110 + pi * 90} r={12 + (i % 3) * 5} fill={ink} />}
      </g>;
    }
    // Entrée : la queue de la colonne passe et libère l'image par le haut
    const top = -200 + (1 - pi) * 1420;
    return <g key={i}>
      <rect x={x} y={top} width={w} height={1400} fill={ink} />
      <ellipse cx={x + w / 2} cy={top} rx={w * 0.38} ry={w * 0.7} fill={ink} />
      <rect x={x + w * 0.66} y={top} width={w * 0.12} height={1400} fill={shade} opacity={detail} />
    </g>;
  })}</>;
}

/** Veil : trois plis flous, liserés de violet, montent du premier plan en décalé. */
function VeilFolds({ p, ink, accent, uid }: Part) {
  const blur = `${uid}-veil-soft`;
  const mid = mixHex(accent, ink, 0.55);
  const a = p, b = stagger(p, 0.12), d = stagger(p, 0.22);
  const rim = fadeNearFull(p, 0.3);
  return <>
    <defs><filter id={blur} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="28" /></filter></defs>
    <ellipse cx="180" cy="1050" rx={a * 1800 + 70} ry={a * 1550 + 70} fill={accent} opacity={0.55 * rim} filter={`url(#${blur})`} />
    <ellipse cx="180" cy="1050" rx={a * 1800} ry={a * 1550} fill={accent} />
    {b > 0 && <ellipse cx="620" cy="1120" rx={b * 1350} ry={b * 1250} fill={mid} stroke={accent} strokeWidth={22 * rim} />}
    {d > 0 && <ellipse cx="900" cy="1150" rx={d * 1400} ry={d * 1400} fill={ink} stroke={accent} strokeWidth={30 * rim} />}
  </>;
}

/** Fanout : sept lames pivotent autour d'une charnière à gauche, s'ouvrent en éventail ; à l'entrée elles se replient vers le bas. */
function FanBlades({ p, bg, ink, phase }: Part) {
  const hx = -250, hy = 500, radius = 2300, blades = 7, from = -76, to = 76;
  const step = (to - from) / blades;
  const detail = fadeNearFull(p, 0.3);
  const point = (deg: number) => `${hx + radius * Math.cos(deg * Math.PI / 180)} ${hy + radius * Math.sin(deg * Math.PI / 180)}`;
  return <>{Array.from({ length: blades }, (_, i) => {
    const order = phase === "out" ? i : blades - 1 - i;
    const pi = Easing.out(Easing.cubic)(stagger(p, order * 0.055));
    const a0 = from + i * step, a1 = from + (i + 1) * step + 0.8;
    // Sortie : les lames partent repliées en haut ; entrée : elles se replient en bas
    const rest = phase === "out" ? from : to;
    const s0 = rest + (a0 - rest) * pi, s1 = rest + (a1 - rest) * pi;
    if (Math.abs(s1 - s0) < 0.05) return null;
    const fill = i % 2 ? mixHex(ink, bg, 0.16 * detail) : ink;
    return <path key={i} d={`M ${hx} ${hy} L ${point(s0)} L ${point(s1)} Z`} fill={fill} stroke={bg} strokeWidth={5 * detail} strokeLinejoin="round" />;
  })}</>;
}

/** Positive : deux plaques de métal se referment sur l'horizon, rayées de lignes qui fuient vers lui. */
function MirrorPlates({ p, bg, ink, frame, uid }: Part) {
  const top = `${uid}-plate-top`, bottom = `${uid}-plate-bottom`;
  const dim = mixHex(ink, bg, 0.5);
  const h = p * 505;
  const detail = fadeNearFull(p, 0.35);
  const flow = (frame * 0.035) % 1;
  const lines = Array.from({ length: 9 }, (_, k) => {
    const depth = (k + flow) / 9;
    return { offset: 500 * depth ** 1.7, alpha: clamp01(depth * 4) * clamp01((1 - depth) * 6) };
  });
  return <>
    <defs>
      <linearGradient id={top} x1="0" y1="0" x2="0" y2="1"><stop stopColor={dim} /><stop offset="0.7" stopColor={ink} /><stop offset="1" stopColor={ink} /></linearGradient>
      <linearGradient id={bottom} x1="0" y1="1" x2="0" y2="0"><stop stopColor={dim} /><stop offset="0.7" stopColor={ink} /><stop offset="1" stopColor={ink} /></linearGradient>
    </defs>
    <rect x="0" y={-5} width="1000" height={h + 5} fill={`url(#${top})`} />
    <rect x="0" y={1000 - h} width="1000" height={h + 5} fill={`url(#${bottom})`} />
    {lines.map(({ offset, alpha }, k) => <g key={k} opacity={alpha * detail * 0.45}>
      {500 - offset < h && <rect x="0" y={500 - offset} width="1000" height={2 + offset * 0.012} fill={bg} />}
      {500 + offset > 1000 - h && <rect x="0" y={500 + offset} width="1000" height={2 + offset * 0.012} fill={bg} />}
    </g>)}
    {p < 0.98 && <path d="M 0 500 H 1000" stroke={bg} strokeWidth={(1 - p) * 35} />}
  </>;
}

/** Helix : deux brins s'enroulent l'un autour de l'autre en s'élargissant, le brin principal porte la trame imprimée. */
function HelixStrands({ p, bg, ink, uid }: Part) {
  const grain = `${uid}-helix-grain`;
  const twist = Math.cos(p * Math.PI * 1.4);
  const amp = (1 - p) * 650;
  const strand = (sign: number) => `M 500 -500 C ${500 - sign * amp * twist} 100, ${500 + sign * amp * twist} 900, 500 1500`;
  const detail = fadeNearFull(p, 0.3);
  return <>
    <defs><pattern id={grain} width="17" height="19" patternUnits="userSpaceOnUse"><circle cx="2" cy="4" r="1.6" fill={bg} /><circle cx="10" cy="8" r="2" fill={bg} /><circle cx="5" cy="15" r="1.4" fill={bg} /></pattern></defs>
    <path d={strand(-1)} fill="none" stroke={mixHex(ink, bg, 0.35)} strokeWidth={p * 1500} />
    <path d={strand(1)} fill="none" stroke={ink} strokeWidth={p * 2200} />
    <path d={strand(1)} fill="none" stroke={`url(#${grain})`} strokeWidth={p * 2200} opacity={0.35 * detail} />
    {p < 0.98 && <>
      <ellipse cx="500" cy="500" rx={80 + p * 450} ry={20 + p * 130} fill="none" stroke={bg} strokeWidth="4" transform={`rotate(${(1 - p) * 70} 500 500)`} />
      <ellipse cx="500" cy="500" rx={60 + p * 380} ry={16 + p * 110} fill="none" stroke={bg} strokeWidth="3" opacity={detail} transform={`rotate(${-(1 - p) * 110} 500 500)`} />
    </>}
  </>;
}

/** Power : cinq coups de brosse acides arrivent en alternance gauche / droite, ombrés d'encre, avec les traces des poils. */
function BrushSweep({ p, ink, accent }: Part) {
  const delays = [0, 0.14, 0.05, 0.2, 0.09];
  const detail = fadeNearFull(p, 0.3);
  const strokes = delays.map((delay, i) => {
    const pi = Easing.out(Easing.poly(4))(stagger(p, delay));
    const dir = i % 2 ? 1 : -1;
    return { i, pi, x: -400 + (1 - pi) * 2300 * dir, sy: 0.4 + pi * 5.6 };
  });
  return <g transform="rotate(-18 500 500)">
    {strokes.map(({ i, pi, x, sy }) => pi > 0 && <g key={`s${i}`} transform={`translate(${x + 30} ${-300 + i * 350 + 40}) scale(1.8 ${sy})`} opacity={detail}><path d={paintStroke(i + 7)} fill={ink} /></g>)}
    {strokes.map(({ i, pi, x, sy }) => pi > 0 && <g key={i} transform={`translate(${x} ${-300 + i * 350}) scale(1.8 ${sy})`}>
      <path d={paintStroke(i)} fill={accent} />
      <path d="M 40 30 L 960 36 M 60 52 L 900 58 M 90 70 L 820 74" stroke={ink} strokeWidth={0.6} opacity={0.35 * detail} />
    </g>)}
  </g>;
}

/** Spectra : le cadre s'écrase en bande, traversée de barres spectrales qui filent à des vitesses différentes. */
function SpectrumBars({ p, bg, accent, uid }: Part) {
  const spectrum = `${uid}-spectrum`;
  const colors = [accent, "#00f0ff", "#eb4dff", "#ff5c19"];
  const skew = -25 * Math.sin(p * Math.PI);
  return <>
    <defs><linearGradient id={spectrum} x1="0" y1="0" x2="1" y2="0">{colors.map((color, i) => <stop key={i} offset={i / (colors.length - 1)} stopColor={color} />)}</linearGradient></defs>
    <rect y={500 - p * 505} width="1000" height={p * 1010} fill={bg} />
    {Array.from({ length: 7 }, (_, i) => {
      const pi = Easing.out(Easing.cubic)(stagger(p, Math.abs(i - 3) * 0.06));
      const thick = (i === 3 ? 46 : 18 + (i % 3) * 8) * pi;
      return <rect key={i} x={-500 + pi * 500 - (i % 2) * (1 - pi) * 300} y={500 + (i - 3) * 105 * p - thick / 2} width="1500" height={thick} fill={i % 2 ? colors[(i + 1) % 4] : `url(#${spectrum})`} transform={`skewX(${skew})`} />;
    })}
  </>;
}

/** Batch : la pile d'échos se resserre vers le centre en ondulant, puis s'épaissit jusqu'à la bande d'encre. */
function StackBands({ p, bg, ink }: Part) {
  const detail = fadeNearFull(p, 0.3);
  return <>{Array.from({ length: 9 }, (_, i) => {
    const center = 500 + (i - 4) * (1 - p) * 115;
    const height = 16 + p * 140 + p ** 4 * 900;
    const sway = Math.sin(i * 1.3 + p * Math.PI) * (1 - p) * 70;
    const width = 200 + p * 820;
    return <rect key={i} x={500 - width / 2 + sway} y={center - height / 2} width={width} height={height} rx={(1 - p) * 8} fill={i % 2 ? mixHex(ink, bg, 0.18 * detail) : ink} />;
  })}</>;
}

/** Turn : deux rubans fins tournent en avance, puis le ruban principal se tord et s'ouvre sur tout le cadre. */
function RibbonTwist({ p, bg, ink }: Part) {
  const soft = mixHex(ink, bg, 0.4);
  return <g transform="translate(500 500)">
    {[-1, 1].map((side) => {
      const pi = p;
      return <g key={side} transform={`rotate(${-48 * (1 - pi) * side}) translate(0 ${side * (1 - pi) * 420})`}>
        <rect x="-1600" y={-60 - pi * 140} width="3200" height={120 + pi * 280} fill={soft} transform={`skewX(${18 * side * (1 - pi)})`} />
      </g>;
    })}
    <g transform={`rotate(${-30 * (1 - p)})`}>
      <path d={`M -1600 ${-p * 1600} H 1600 V ${p * 1600} H -1600 Z`} fill={ink} transform={`skewY(${-24 * (1 - p)})`} />
      {p < 0.98 && <path d="M -1600 0 H 1600" stroke={bg} strokeWidth={4 + Math.sin(p * Math.PI) * 12} />}
    </g>
  </g>;
}

/**
 * Block : le cube de lettres pivote d'un quart de tour en fonçant vers la caméra ; ses faces portent déjà le titre suivant,
 * puis le cadre passe au noir du fond, sous lequel la scène change. Carré non déformé (slice) dans tous les formats.
 */
function BlockPivot({ p, bg, ink, title }: { p: number; bg: string; ink: string; title: string }) {
  const grow = Easing.in(Easing.cubic)(p);
  const scale = 0.25 + grow * 4.2;
  const turn = (1 - p) * -90;
  const flat = clamp01((p - 0.82) / 0.14);
  const faces = [
    { d: "M 500 100 L 900 300 L 500 500 L 100 300 Z", matrix: "matrix(.4 -.2 .4 .2 100 300)", fill: ink },
    { d: "M 100 300 L 500 500 V 900 L 100 700 Z", matrix: "matrix(.4 .2 0 .4 100 300)", fill: mixHex(ink, bg, 0.28) },
    { d: "M 500 500 L 900 300 V 700 L 500 900 Z", matrix: "matrix(.4 -.2 0 .4 500 500)", fill: mixHex(ink, bg, 0.55) },
  ];
  const word = title.trim().toUpperCase();
  return <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" style={coverSvg} aria-hidden>
    <rect width="1000" height="1000" fill={bg} opacity={Math.min(1, p * 2.2)} />
    <g transform={`translate(500 500) rotate(${turn}) scale(${scale}) translate(-500 -500)`}>
      {faces.map((f) => <g key={f.d}>
        <path d={f.d} fill={f.fill} stroke={bg} strokeWidth={6 / scale} strokeLinejoin="round" />
        {word && <g transform={f.matrix}><text x={35} y={900} fontFamily={condensedFont} fontSize={1100} textLength={930} lengthAdjust="spacingAndGlyphs" fill={mixHex(f.fill, bg, 0.3)}>{word}</text></g>}
      </g>)}
    </g>
    {flat > 0 && <rect width="1000" height="1000" fill={bg} opacity={flat} />}
  </svg>;
}

// ───────── Mouvement du contenu (titre, sous-titre, écrans) pendant la transition ─────────

/** Flou directionnel (x, y en px). */
function DirBlurFilter({ id, x, y }: { id: string; x: number; y: number }) {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs><filter id={id} x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation={`${Math.max(0, x)} ${Math.max(0, y)}`} /></filter></defs>
  </svg>;
}

/** Séparation RGB horizontale (`shift` px) suivie d'un flou de vitesse horizontal. */
function SplitFilter({ id, shift, blur }: { id: string; shift: number; blur: number }) {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs><filter id={id} x="-20%" y="-10%" width="140%" height="120%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feOffset in="r" dx={-shift} result="r2" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="b" dx={shift} result="b2" />
      <feBlend in="r2" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="b2" mode="screen" result="rgb" />
      <feGaussianBlur in="rgb" stdDeviation={`${Math.max(0, blur)} 0`} />
    </filter></defs>
  </svg>;
}

type MotionCtx = { unit: number; frame: number };
export type PosterMotion = {
  /** Durées d'entrée / de sortie, en images */
  enter: number;
  exit: number;
  /** La couverture d'entrée se retire à vitesse constante (sinon : selon la courbe de la recette) */
  linearCover?: boolean;
  /** Contenu entrant, `e` = 1 → 0 (reste de l'entrée) */
  in: (e: number, c: MotionCtx) => CSSProperties;
  /** Contenu sortant, `t` = 0 → 1 */
  out: (t: number, c: MotionCtx) => CSSProperties;
  /** Filtre SVG du contenu ; `s` = intensité 0 → 1. Renvoie l'intensité en px (0 = pas de filtre) et le filtre. */
  filter?: (s: number, c: MotionCtx, id: string) => { amount: number; node: ReactNode };
  /** Mouvement du fond (Veil a un premier plan dans le fond) ; `s` = intensité 0 → 1. */
  backdrop?: (s: number, unit: number) => CSSProperties;
};

const sq = (t: number) => t * t;

/** Le geste de chaque affiche, appliqué au contenu autour de la couverture (voir posterBrick dans transitions.tsx). */
export const POSTER_MOTION: Record<TypePosterKind, PosterMotion> = {
  // Gravité : le contenu s'allonge vers le bas en tombant ; le suivant tombe d'en haut et s'écrase légèrement à l'arrivée
  spill: {
    enter: 24, exit: 22, linearCover: true,
    out: (t, { unit }) => ({ transform: `translateY(${sq(t) * unit * 9}px) scaleY(${1 + sq(t) * 0.5})`, transformOrigin: "50% 0%" }),
    in: (e, { unit }) => ({ transform: `translateY(${-sq(e) * unit * 8}px) scaleY(${1 + e * 0.22})`, transformOrigin: "50% 100%" }),
    filter: (s, { unit }, id) => ({ amount: s * unit * 2.4, node: <DirBlurFilter id={id} x={0} y={s * unit * 2.4} /> }),
  },
  // Mise au point : le contenu et le premier plan se dissolvent dans le flou en montant, le suivant fait le point
  veil: {
    enter: 24, exit: 22, linearCover: true,
    out: (t, { unit }) => ({ transform: `translateY(${-t * unit * 3}px) scale(${1 + t * 0.06})`, filter: `blur(${sq(t) * unit * 2.2}px)` }),
    in: (e, { unit }) => ({ transform: `translateY(${e * unit * 3}px) scale(${1 + e * 0.05})`, filter: e > 0.01 ? `blur(${e * unit * 2}px)` : undefined }),
    backdrop: (s, unit) => ({ transform: `scale(${1 + s * 0.06})`, filter: s > 0.01 ? `blur(${s * unit * 1.4}px)` : undefined }),
  },
  // Pli en éventail : le contenu se replie en perspective autour de la charnière gauche, le suivant se déplie
  fanout: {
    enter: 22, exit: 20, linearCover: true,
    out: (t, { unit }) => ({ transform: `perspective(${unit * 180}px) rotateY(${sq(t) * 68}deg) skewY(${-t * 6}deg)`, transformOrigin: "0% 50%" }),
    in: (e, { unit }) => ({ transform: `perspective(${unit * 180}px) rotateY(${-sq(e) * 68}deg) skewY(${e * 6}deg)`, transformOrigin: "0% 50%" }),
  },
  // Cube : le contenu fonce vers la caméra en tournant avec le cube ; le suivant arrive d'un coup de poing
  blocktype: {
    enter: 16, exit: 14, linearCover: true,
    out: (t) => ({ transform: `scale(${1 + sq(t) * 0.6}) rotate(${-sq(t) * 14}deg)` }),
    in: (e) => ({ transform: `scale(${1 + e * 0.22}) rotate(${e * 8}deg)` }),
  },
  // Horizon : le contenu s'écrase sur la ligne d'horizon, le suivant s'ouvre depuis elle
  positive: {
    enter: 22, exit: 20, linearCover: true,
    out: (t) => ({ transform: `scaleY(${1 - sq(t) * 0.88}) scaleX(${1 + sq(t) * 0.08})` }),
    in: (e) => ({ transform: `scaleY(${1 - sq(e) * 0.88})` }),
    filter: (s, { unit }, id) => ({ amount: s * unit * 1.8, node: <DirBlurFilter id={id} x={0} y={s * unit * 1.8} /> }),
  },
  // Rotation : le contenu s'enroule en tournant vers le centre, le suivant se déroule dans le même sens
  helix: {
    enter: 22, exit: 20, linearCover: true,
    out: (t, { unit }) => ({ transform: `rotate(${-sq(t) * 42}deg) scale(${1 - sq(t) * 0.38})`, filter: t > 0.05 ? `blur(${sq(t) * unit * 1.2}px)` : undefined }),
    in: (e, { unit }) => ({ transform: `rotate(${sq(e) * 42}deg) scale(${1 - sq(e) * 0.3})`, filter: e > 0.05 ? `blur(${sq(e) * unit * 1.2}px)` : undefined }),
  },
  // Impact : la brosse secoue le cadre (oscillation continue), le suivant claque en place
  power: {
    enter: 20, exit: 18,
    out: (t, { unit, frame }) => ({ transform: `translate(${Math.sin(frame * 0.9) * t * unit * 1.6}px, ${Math.cos(frame * 1.1) * t * unit}px) scale(${1 + t * 0.1})` }),
    in: (e, { unit, frame }) => ({ transform: `translate(${Math.sin(frame * 0.9) * e * unit * 1.2}px, 0) scale(${1 + e * 0.2}) rotate(${-e * 3}deg)` }),
  },
  // Étirement chromatique : le contenu s'étire à l'horizontale en se séparant en RVB, le suivant se resserre
  spectra: {
    enter: 18, exit: 16,
    out: (t) => ({ transform: `scaleX(${1 + sq(t) * 2.4}) scaleY(${1 - sq(t) * 0.45}) skewX(${-t * 10}deg)` }),
    in: (e) => ({ transform: `scaleX(${1 + sq(e) * 2.4}) scaleY(${1 - sq(e) * 0.45}) skewX(${e * 10}deg)` }),
    filter: (s, { unit }, id) => ({ amount: s * unit * 2.5, node: <SplitFilter id={id} shift={s * unit * 2.5} blur={s * unit * 1.5} /> }),
  },
  // Effondrement : la pile s'écrase vers sa ligne médiane, la suivante rebondit (courbe « back » de la recette)
  batch: {
    enter: 24, exit: 20,
    out: (t) => ({ transform: `scaleY(${1 - sq(t) * 0.86}) scaleX(${1 + sq(t) * 0.14})` }),
    in: (e) => ({ transform: `scaleY(${1 - e * 0.85}) scaleX(${1 + e * 0.12})` }),
  },
  // Torsion : le contenu bascule en 3D vers l'arrière avec le ruban, le suivant arrive par le dessous
  turn: {
    enter: 22, exit: 18,
    out: (t, { unit }) => ({ transform: `perspective(${unit * 200}px) rotateX(${sq(t) * 75}deg) skewX(${-t * 10}deg)` }),
    in: (e, { unit }) => ({ transform: `perspective(${unit * 200}px) rotateX(${-sq(e) * 75}deg) skewX(${e * 10}deg)` }),
  },
};

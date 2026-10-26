import React, { type CSSProperties, type ReactNode } from "react";
import { outlineText } from "../../lib/posts/outline-text";
import { metalTitleHeight, referenceMotionTiming, type ReferenceMotionKind } from "../../config/reference-motion";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Ralenti avec léger dépassement (peut dépasser 1 avant d'y revenir). */
const backOut = (t: number) => { const c = 1.6, x = clamp01(t) - 1; return 1 + (c + 1) * x ** 3 + c * x ** 2; };

/** Lucent : quatre motifs lumineux qui changent de tuile à chaque scène. */
const LUCENT_SHAPES = ["bolt", "eclipse", "prism", "comet"] as const;
/** Echo Frame : la fenêtre photo se recompose à chaque scène (portrait, panoramique, haute) ; l'écho alterne vertical / horizontal. */
const ECHO_FRAMES = [
  { tall: { left: 27, top: 30, width: 46, height: 41 }, wide: { left: 35, top: 30, width: 30, height: 41 }, crop: "center" },
  { tall: { left: 12, top: 34, width: 76, height: 33 }, wide: { left: 24, top: 33, width: 52, height: 35 }, crop: "50% 35%" },
  { tall: { left: 31, top: 27, width: 38, height: 47 }, wide: { left: 39, top: 26, width: 22, height: 48 }, crop: "40% 60%" },
];

/**
 * Geometry shared by static catalogue art and frame-driven compositions.
 * `scene` recompose le décor ; `remaining` (secondes avant la scène suivante, Infinity sinon) déclenche la sortie :
 * le décor quitte la scène par le même geste qui l'a fait entrer, sans saut à la frontière.
 */
export function ReferenceBackdrop({ kind, palette: [bg, main, accent], time, aspectRatio, renderPhoto, scene = 0, remaining = Infinity }: { kind: ReferenceMotionKind; palette: [string, string, string]; time: number; aspectRatio: number; renderPhoto?: (style: CSSProperties) => ReactNode; scene?: number; remaining?: number }) {
  const { settle, burst } = referenceMotionTiming(time);
  const wide = aspectRatio > 1.15;
  // Sortie (0 → 1) pendant les 0,35 dernières secondes de la scène
  const leave = clamp01((0.35 - remaining) / 0.35);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg, containerType: "size" }}>
    {kind === "lucent" && <>
      {/* Halo qui change de couleur d'une scène à l'autre derrière la grille */}
      <div style={{ position: "absolute", width: "90cqmin", height: "90cqmin", borderRadius: "50%", background: `radial-gradient(circle, ${scene % 2 ? accent : main}30, transparent 65%)`, filter: "blur(6cqmin)", ...(wide ? { right: "-6%", top: "5%" } : { left: "50%", top: "30%", transform: "translateX(-50%)" }), opacity: (.8 + Math.sin(time * .7) * .2) * (1 - leave * .6) }} />
      <div style={{ position: "absolute", width: wide ? "51cqmin" : "min(78cqmin, 49cqh)", height: wide ? "51cqmin" : "min(78cqmin, 49cqh)", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: "3cqmin", perspective: "120cqmin", ...(wide ? { right: "8%", top: "23%" } : { left: "50%", top: "39%", transform: "translateX(-50%)" }) }}>
        {[0, 1, 2, 3].map((i) => {
          // Les tuiles basculent une à une sur leur axe vertical : de face après l'entrée, sur la tranche à la frontière
          const order = (i + scene) % 4;
          const enter = backOut((time - order * 0.07) / 0.55);
          const out = clamp01(leave * 1.3 - order * 0.08);
          const turn = (1 - enter) * -90 + out * 90;
          const sweep = ((time * 0.45 + order * 0.12) % 1.6) - 0.3;
          return <div key={i} style={{ position: "relative", overflow: "hidden", borderRadius: "19%", background: "linear-gradient(135deg, #252025, #0d0b10 50%, #1c151b)", boxShadow: "inset 0 1px 2px rgba(255,255,255,.4), inset 1px 0 2px rgba(255,255,255,.12), 0 12px 25px rgba(0,0,0,.22)", transform: `translateY(${Math.sin(time * .8 + i) * 1.1}cqmin) rotateY(${turn}deg)`, opacity: Math.abs(turn) > 89 ? 0 : 1 }}>
            <div style={{ position: "absolute", inset: "-20%", background: `conic-gradient(from ${time * 22 + i * 90}deg, ${main}, ${accent}, #ffd57b, ${main})`, filter: "blur(3cqmin)", opacity: .12, transform: `translate(${Math.sin(time + i) * 12}%, ${Math.cos(time + i) * 12}%)` }} />
            <LucentShape shape={LUCENT_SHAPES[(i + scene) % 4]} bg={bg} main={main} accent={accent} time={time} i={i} />
            {/* Reflet de verre qui traverse la tuile en biais */}
            {sweep > -0.2 && sweep < 1.2 && <div style={{ position: "absolute", top: "-30%", bottom: "-30%", left: `${sweep * 100 - 20}%`, width: "22%", transform: "skewX(-20deg)", background: "linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent)", mixBlendMode: "screen" }} />}
          </div>;
        })}
      </div>
    </>}
    {kind === "bold-orbit" && <BoldOrbit palette={[bg, main, accent]} time={time} aspectRatio={aspectRatio} />}
    {kind === "gold-rush" && <>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at ${40 + Math.sin(time * .6) * 15}% 100%, ${accent} 0%, ${accent} 25%, transparent 72%)` }} />
      <div style={{ position: "absolute", left: "-20%", right: "-20%", top: "38%", height: "4%", transform: `rotate(${-26 + Math.sin(time * .5) * 8}deg)`, background: `linear-gradient(90deg, transparent, ${main}55, transparent)`, filter: "blur(4cqmin)" }} />
      <div style={{ position: "absolute", left: "9%", right: "9%", bottom: "11%", borderBottom: `1px solid ${main}66` }} />
    </>}
    {kind === "echo-frame" && (() => {
      const frame = ECHO_FRAMES[scene % ECHO_FRAMES.length];
      const box = wide ? frame.wide : frame.tall;
      // L'écho d'entrée et celui de sortie sont le même geste : zoom, flou et copies décalées dans l'axe de la scène
      const echo = Math.max(burst, leave ** 2);
      const vertical = scene % 2 === 0;
      const slide = (1 - settle) * 28 - leave * 20;
      const rect = (dx = 0, dy = 0): CSSProperties => ({ position: "absolute", left: `${box.left + dx}%`, top: `${box.top + dy}%`, width: `${box.width}%`, height: `${box.height}%`, overflow: "hidden" });
      return <>
        <div style={rect()}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + echo * .8}) ${vertical ? `translateY(${slide}%)` : `translateX(${slide}%)`}`, filter: echo > .002 ? `blur(${echo * 14}px)` : undefined }}>{renderPhoto?.({ width: "100%", height: "100%", objectFit: "cover", objectPosition: frame.crop, transform: `scale(${1 + Math.sin(time * .5) * .04})` })}</div>
        </div>
        {echo > .002 && [-1, 1].map((k) => <div key={k} style={{ ...rect(vertical ? 0 : k * 11 * echo, vertical ? k * 11 * echo : 0), opacity: echo * .25, transform: vertical ? `scaleY(${1 + echo * .6})` : `scaleX(${1 + echo * .6})`, filter: `blur(${4 + echo * 12}px)` }}>{renderPhoto?.({ width: "100%", height: "100%", objectFit: "cover", objectPosition: frame.crop })}</div>)}
        {/* Repères de coupe aux quatre coins de la fenêtre : écartés pendant l'écho, ils se resserrent quand l'image se pose */}
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => {
          const gap = 1.6 + echo * 3;
          const line = `1.5px solid ${main}`;
          return <div key={`${x}${y}`} style={{ position: "absolute", left: `calc(${box.left + x * box.width}% + ${(x ? 1 : -1) * gap}cqmin)`, top: `calc(${box.top + y * box.height}% + ${(y ? 1 : -1) * gap}cqmin)`, width: "2.6cqmin", height: "2.6cqmin", transform: "translate(-50%, -50%)", ...(x ? { borderRight: line } : { borderLeft: line }), ...(y ? { borderBottom: line } : { borderTop: line }), opacity: .55 * settle }} />;
        })}
        {["6%", "94%"].map((left) => <div key={left} style={{ position: "absolute", left, top: "49%", width: "1.2cqmin", height: "1.2cqmin", background: main, borderRadius: "50%" }} />)}
      </>;
    })()}
  </div>;
}

/** Motifs lumineux de Lucent : éclair, éclipse, prisme, comète. */
function LucentShape({ shape, bg, main, accent, time, i }: { shape: (typeof LUCENT_SHAPES)[number]; bg: string; main: string; accent: string; time: number; i: number }) {
  const molten = `linear-gradient(${115 + Math.sin(time + i) * 35}deg, #fff4bc 3%, ${main} 32%, ${accent} 65%, #ffdc78 93%)`;
  if (shape === "eclipse") return <><div style={{ position: "absolute", inset: "19% 5% -15% 12%", borderRadius: "50%", background: `conic-gradient(from ${-45 + time * 12}deg, transparent 5%, ${accent} 23%, ${main} 47%, #ffd57b 57%, transparent 75%)`, filter: "blur(1cqmin)", transform: `rotate(${time * 8}deg)` }} /><div style={{ position: "absolute", inset: "29% -2% -24% 24%", borderRadius: "50%", background: bg, boxShadow: "inset 2px 1px 3px rgba(255,255,255,.1)" }} /></>;
  if (shape === "comet") return <div style={{ position: "absolute", left: "8%", right: "8%", top: "42%", height: "16%", background: molten, filter: `blur(.4cqmin) drop-shadow(0 0 1.8cqmin ${main})`, transform: `rotate(${-32 + Math.sin(time * .9 + i) * 6}deg) translateX(${Math.sin(time * 1.1 + i) * 8}%)`, clipPath: "polygon(0 46%, 88% 0, 100% 50%, 88% 100%, 0 54%)" }} />;
  return <div style={{ position: "absolute", inset: shape === "prism" ? "12% 14% 5%" : "-7% 3% -4%", clipPath: shape === "prism" ? "polygon(50% 0,100% 100%,0 100%)" : "polygon(66% 0,22% 54%,51% 54%,35% 100%,87% 39%,57% 39%)", background: molten, filter: `blur(${shape === "prism" ? .7 : .25}cqmin) drop-shadow(0 0 1.8cqmin ${main})`, transform: `rotate(${i % 2 ? -75 : -8}deg) translateY(${Math.sin(time * 1.1 + i) * 3}%)` }} />;
}

/**
 * Bold Orbit — six dots on a visible orbit; a pink light races around with a comet tail and lights each dot it passes.
 * Each scene opens with the dots bursting out of the centre (shockwave), then the system turns slowly; the centre glows softly.
 * Drawn in a square viewport (circles stay round in every ratio); the title area (below / right) stays free.
 */
function BoldOrbit({ palette: [bg, main, accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const wide = aspectRatio > 1.15, squareish = !wide && aspectRatio >= .8;
  const size = wide ? "64cqmin" : squareish ? "52cqmin" : "min(80cqmin, 52cqh)";
  const t = Math.max(0, time);
  const enter = 1 - (1 - Math.min(1, t / .9)) ** 4;
  const spin = t * .35 + (1 - enter) * 2.1;
  const light = t * 1.7 - .6;
  const R = 140 * enter;
  const wave = Math.min(1, t / .7);
  const dots = Array.from({ length: 6 }, (_, i) => {
    const angle = spin + i * Math.PI / 3 - Math.PI / 2;
    const near = Math.cos(((light - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2));
    const lit = Math.max(0, near) ** 18;
    return { x: 200 + Math.cos(angle) * R, y: 200 + Math.sin(angle) * R, lit };
  });
  const trail = Array.from({ length: 16 }, (_, k) => {
    const a = light - k * .07;
    return { x: 200 + Math.cos(a) * R, y: 200 + Math.sin(a) * R, o: (1 - k / 16) ** 2, r: 9 * (1 - k / 20) };
  });
  const stars = Array.from({ length: 22 }, (_, i) => ({ x: 20 + ((i * 137.5) % 360), y: 20 + ((i * 89.3 + 40) % 360), o: .15 + .35 * (.5 + .5 * Math.sin(t * 1.6 + i * 2.3)) }))
    .filter((s) => Math.hypot(s.x - 200, s.y - 200) > 165);
  return <div style={{ position: "absolute", width: size, height: size, ...(wide ? { left: "7%", top: "50%", transform: "translateY(-50%)" } : { left: "50%", top: squareish ? "8%" : "11%", transform: "translateX(-50%)" }) }}>
    <svg viewBox="0 0 400 400" width="100%" height="100%" overflow="visible" aria-hidden>
      <defs>
        <radialGradient id={`${id}-core`}><stop stopColor={accent} stopOpacity={.32 + .1 * Math.sin(t * 2.4)} /><stop offset=".55" stopColor={accent} stopOpacity=".06" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r="1.4" fill={main} opacity={s.o * enter} />)}
      <circle cx="200" cy="200" r="120" fill={`url(#${id}-core)`} />
      <circle cx="200" cy="200" r={40 + wave * 200} fill="none" stroke={main} strokeWidth={3 * (1 - wave)} opacity={(1 - wave) * .7} />
      <circle cx="200" cy="200" r={Math.max(1, R)} fill="none" stroke={main} strokeOpacity=".22" strokeWidth="1.5" strokeDasharray="2 7" transform={`rotate(${-t * 8} 200 200)`} />
      <circle cx="200" cy="200" r={Math.max(1, R * .64)} fill="none" stroke={main} strokeOpacity=".09" strokeWidth="1" />
      <circle cx="200" cy="200" r="182" fill="none" stroke={accent} strokeOpacity=".35" strokeWidth="1" pathLength="100" strokeDasharray={`${enter * 100} 100`} transform="rotate(-90 200 200)" />
      <g filter={`url(#${id}-glow)`}>{trail.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={p.r * 1.6} fill={accent} opacity={p.o * .8 * enter} />)}</g>
      {trail.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={p.r * .55} fill={accent} opacity={p.o * enter} />)}
      {dots.map((d, i) => <g key={i}>
        {d.lit > .05 && <circle cx={d.x} cy={d.y} r={34} fill={accent} opacity={d.lit * .45} filter={`url(#${id}-glow)`} />}
        <circle cx={d.x} cy={d.y} r={16 + d.lit * 4} fill={d.lit > .3 ? accent : bg} stroke={d.lit > .3 ? "#fff6fb" : main} strokeOpacity={d.lit > .3 ? 1 : .55} strokeWidth={d.lit > .3 ? 2 : 1.6} />
      </g>)}
      <circle cx={trail[0].x} cy={trail[0].y} r="5" fill="#fff6fb" opacity={enter} />
    </svg>
  </div>;
}

const mix = (a: string, b: string, k: number) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");

/** Vector letter outlines avoid browser-dependent background-clip/text and 3D text rasterization. */
export function MetalTitle({ text, time, style }: { text: string; time: number; style?: CSSProperties }) {
  const instance = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { turn, settle } = referenceMotionTiming(time);
  const height = metalTitleHeight(text);
  const shape = outlineText(text.toUpperCase(), "condensed", 30, 10, 900, height - 65, 260, "currentColor", true).replace('<g fill="currentColor"', '<g');
  const glyph = `metal-${instance}`, gold = `gold-${instance}`, rim = `rim-${instance}`, spec = `spec-${instance}`, soft = `soft-${instance}`;
  const tilt = 7 + Math.sin(time * .6) * 3, yaw = turn * .65;
  // The extrusion follows the camera: turning one way reveals the opposite flank, tilting back shows more of the underside.
  const depth = 40, layers = 34;
  const dx = depth * (.42 - Math.sin(yaw * Math.PI / 180) * 1.3), dy = depth * (.72 + Math.sin(tilt * Math.PI / 180) * .9);
  const sweep = ((Math.max(0, time) * .32) % 1.7 - .35) * 1000;
  return <div style={{ position: "relative", width: style?.maxWidth ?? "100%", maxWidth: "100%", transform: `perspective(1100px) rotateX(${tilt}deg) rotateY(${yaw}deg) rotateZ(-5deg) scale(${.9 + settle * .1})` }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 1000 ${height}`} width="1000" height={height} role="img" aria-label={text} style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
      <defs>
        <g id={glyph} dangerouslySetInnerHTML={{ __html: shape }} />
        <linearGradient id={gold} x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform={`rotate(${turn} .5 .5)`}>
          <stop stopColor="#e2a944"/><stop offset=".18" stopColor="#fff4bd"/><stop offset=".3" stopColor="#d5a343"/><stop offset=".46" stopColor="#805319"/><stop offset=".63" stopColor="#f9d77b"/><stop offset=".79" stopColor="#fff5c7"/><stop offset="1" stopColor="#b37b20"/>
        </linearGradient>
        <linearGradient id={rim} x1="0%" y1="0%" x2="30%" y2="100%"><stop stopColor="#fffbe6"/><stop offset=".45" stopColor="#f2c766"/><stop offset="1" stopColor="#6e4511"/></linearGradient>
        <linearGradient id={spec} gradientUnits="userSpaceOnUse" x1={sweep - 140} y1="0" x2={sweep + 60} y2={height * .6}><stop stopColor="#ffffff" stopOpacity="0"/><stop offset=".5" stopColor="#ffffff" stopOpacity=".8"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></linearGradient>
        <filter id={soft} x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
      </defs>
      <use href={`#${glyph}`} aria-hidden="true" fill="#000000" opacity=".3" filter={`url(#${soft})`} transform={`translate(${dx * 1.25} ${dy * 1.3})`} />
      {Array.from({ length: layers }, (_, i) => { const k = 1 - i / layers; const shade = mix("#1a0f04", "#9c6a1f", (1 - k) ** 1.6); return <use key={i} href={`#${glyph}`} aria-hidden="true" fill={shade} stroke={shade} strokeWidth="1.4" strokeLinejoin="round" transform={`translate(${(dx * k).toFixed(2)} ${(dy * k).toFixed(2)})`} />; })}
      <use href={`#${glyph}`} aria-hidden="true" fill="none" stroke={`url(#${rim})`} strokeWidth="5" strokeLinejoin="round" />
      <use href={`#${glyph}`} fill={`url(#${gold})`} />
      <use href={`#${glyph}`} aria-hidden="true" fill={`url(#${spec})`} />
    </svg>
  </div>;
}

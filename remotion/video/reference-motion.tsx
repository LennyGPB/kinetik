import React, { type CSSProperties, type ReactNode } from "react";
import { outlineText } from "../../lib/posts/outline-text";
import { metalTitleHeight, referenceMotionTiming, type ReferenceMotionKind } from "../../config/reference-motion";

/** Geometry shared by static catalogue art and frame-driven compositions. */
export function ReferenceBackdrop({ kind, palette: [bg, main, accent], time, aspectRatio, renderPhoto }: { kind: ReferenceMotionKind; palette: [string, string, string]; time: number; aspectRatio: number; renderPhoto?: (style: CSSProperties) => ReactNode }) {
  const { settle, burst, phase } = referenceMotionTiming(time);
  const wide = aspectRatio > 1.15;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg, containerType: "size" }}>
    {kind === "lucent" && <div style={{ position: "absolute", width: wide ? "51cqmin" : "min(78cqmin, 49cqh)", height: wide ? "51cqmin" : "min(78cqmin, 49cqh)", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: "3cqmin", ...(wide ? { right: "8%", top: "23%" } : { left: "50%", top: "39%", transform: "translateX(-50%)" }) }}>
      {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "relative", overflow: "hidden", borderRadius: "19%", background: "linear-gradient(135deg, #252025, #0d0b10 50%, #1c151b)", boxShadow: "inset 0 1px 2px rgba(255,255,255,.4), inset 1px 0 2px rgba(255,255,255,.12), 0 12px 25px rgba(0,0,0,.22)", transform: `translateY(${Math.sin(time * .8 + i) * 1.1}cqmin)` }}>
        <div style={{ position: "absolute", inset: "-20%", background: `conic-gradient(from ${time * 22 + i * 90}deg, ${main}, ${accent}, #ffd57b, ${main})`, filter: "blur(3cqmin)", opacity: .12, transform: `translate(${Math.sin(time + i) * 12}%, ${Math.cos(time + i) * 12}%)` }} />
        {i === 1 ? <><div style={{ position: "absolute", inset: "19% 5% -15% 12%", borderRadius: "50%", background: `conic-gradient(from ${-45 + time * 12}deg, transparent 5%, ${accent} 23%, ${main} 47%, #ffd57b 57%, transparent 75%)`, filter: "blur(1cqmin)", transform: `rotate(${time * 8}deg)` }} /><div style={{ position: "absolute", inset: "29% -2% -24% 24%", borderRadius: "50%", background: bg, boxShadow: "inset 2px 1px 3px rgba(255,255,255,.1)" }} /></> : <div style={{ position: "absolute", inset: i === 2 ? "12% 14% 5%" : "-7% 3% -4%", clipPath: i === 2 ? "polygon(50% 0,100% 100%,0 100%)" : "polygon(66% 0,22% 54%,51% 54%,35% 100%,87% 39%,57% 39%)", background: `linear-gradient(${115 + Math.sin(time + i) * 35}deg, #fff4bc 3%, ${main} 32%, ${accent} 65%, #ffdc78 93%)`, filter: `blur(${i === 2 ? .7 : .25}cqmin) drop-shadow(0 0 1.8cqmin ${main})`, transform: `rotate(${i === 3 ? -75 : -8}deg) translateY(${Math.sin(time * 1.1 + i) * 3}%)` }} />}
      </div>)}
    </div>}
    {kind === "bold-orbit" && <div style={{ position: "absolute", width: !wide && aspectRatio >= .8 ? "44cqmin" : "51cqmin", height: !wide && aspectRatio >= .8 ? "44cqmin" : "51cqmin", left: wide ? "9%" : "50%", top: !wide && aspectRatio >= .8 ? "16%" : "25%", transform: wide ? undefined : "translateX(-50%)" }}>
      <svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden>{Array.from({ length: 6 }, (_, i) => {
        const angle = i * Math.PI / 3 - Math.PI / 2 + time * .12;
        const x = 200 + Math.cos(angle) * 122 * settle, y = 200 + Math.sin(angle) * 122 * settle;
        const light = Math.pow(Math.max(0, Math.cos((phase * 6 - i) * Math.PI / 3)), 14);
        return <g key={i}><circle cx={x} cy={y} r={23 + light * 3} fill={light > .12 ? accent : bg} stroke={light > .12 ? "#fff8fe" : "#545154"} strokeWidth={light > .12 ? 1.5 : .7} style={{ filter: light > .12 ? `drop-shadow(0 0 ${10 + light * 22}px ${accent})` : undefined }} />{light > .12 && <circle cx={x} cy={y} r="38" fill={accent} opacity={light * .3} style={{ filter: "blur(13px)" }} />}</g>;
      })}</svg>
    </div>}
    {kind === "gold-rush" && <>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at ${40 + Math.sin(time * .6) * 15}% 100%, ${accent} 0%, ${accent} 25%, transparent 72%)` }} />
      <div style={{ position: "absolute", left: "-20%", right: "-20%", top: "38%", height: "4%", transform: `rotate(${-26 + Math.sin(time * .5) * 8}deg)`, background: `linear-gradient(90deg, transparent, ${main}55, transparent)`, filter: "blur(4cqmin)" }} />
      <div style={{ position: "absolute", left: "9%", right: "9%", bottom: "11%", borderBottom: `1px solid ${main}66` }} />
    </>}
    {kind === "echo-frame" && <>
      <div style={{ position: "absolute", left: wide ? "35%" : "27%", top: "30%", width: wide ? "30%" : "46%", height: "41%", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + burst * .8}) translateY(${(1 - settle) * 28}%)`, filter: `blur(${burst * 14}px)` }}>{renderPhoto?.({ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1 + Math.sin(time * .5) * .04})` })}</div>
      </div>
      {burst > .002 && [-1, 1].map((i) => <div key={i} style={{ position: "absolute", left: wide ? "35%" : "27%", top: `${30 + i * 11 * burst}%`, width: wide ? "30%" : "46%", height: "41%", opacity: burst * .25, transform: `scaleY(${1 + burst * .6})`, filter: `blur(${4 + burst * 12}px)`, overflow: "hidden" }}>{renderPhoto?.({ width: "100%", height: "100%", objectFit: "cover" })}</div>)}
      {["6%", "94%"].map((left) => <div key={left} style={{ position: "absolute", left, top: "49%", width: "1.2cqmin", height: "1.2cqmin", background: main, borderRadius: "50%" }} />)}
    </>}
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

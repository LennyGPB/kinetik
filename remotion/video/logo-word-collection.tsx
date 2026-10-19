import React from "react";
import { SIGNATURE_COLLECTION_IDS, type CollectionSignatureId } from "../../config/logo-motion-collection";
import { outlineGlyphs, type OutlineFace } from "../../lib/posts/outline-text";

export const isCollectionSignature = (id: string): id is CollectionSignatureId => (SIGNATURE_COLLECTION_IDS as readonly string[]).includes(id);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - (1 - clamp(x)) ** 4;
const pulse = (x: number) => x <= 0 || x >= 1 ? 0 : Math.sin(x * Math.PI) ** 2;
const FACES: Record<CollectionSignatureId, OutlineFace> = {
  "logo-aperture": "condensed", "logo-ribbon": "wide", "logo-register": "condensed",
  "logo-orbital": "wide", "logo-halftone": "condensed", "logo-relief": "serif",
  "logo-shutter": "wide", "logo-tidal": "italic", "logo-monogram": "serif",
  "logo-zipper": "condensed", "logo-tunnel": "wide", "logo-specimen": "serif",
  "logo-prism-word": "wide", "logo-pendulum": "rounded", "logo-negative": "condensed",
};

/** No browser clocks, random values or CSS animations: previews and exports share exact frames. */
export function CollectionSignature({ template, text, colors, time = 0, duration = 6 }: {
  template: CollectionSignatureId; text: string; colors: [string, string, string]; time?: number; duration?: number;
}) {
  const id = `signature-${React.useId().replace(/[^\w-]/g, "")}`;
  const [bg, fg, accent] = colors;
  const t = Math.max(0, time), enter = ease(t / 1.15), beat = pulse((t - duration * .54) / .95);
  const { glyphs, size } = React.useMemo(() => outlineGlyphs(text, FACES[template], 70, 0, 860, text.length > 18 ? 410 : 280, 230, true), [text, template]);
  const y0 = Math.min(...glyphs.map(g => g.box.y0), 120), y1 = Math.max(...glyphs.map(g => g.box.y1), 120);
  const cy = (y0 + y1) / 2, offset = 310 - cy;
  const word = (fill = fg, extra: React.SVGProps<SVGGElement> = {}) => <g fill={fill} {...extra} transform={`translate(0 ${offset}) ${extra.transform ?? ""}`}>
    {glyphs.map((g, i) => <path key={i} d={g.d} transform={`translate(${g.x} ${g.y}) scale(${g.scale})`} />)}
  </g>;
  const drawWord = ({ key, ...extra }: React.SVGProps<SVGUseElement> = {}) => <use key={key} href={`#${id}-word`} fill={fg} {...extra} />;
  const n = Math.max(1, glyphs.length - 1);
  let scene: React.ReactNode;
  switch (template) {
    case "logo-aperture": {
      const r = 12 + enter * 640 - beat * 110;
      scene = <><defs><clipPath id={`${id}-iris`}><circle cx="500" cy="310" r={r} /></clipPath></defs>
        <circle cx="500" cy="310" r={r + 16} fill="none" stroke={accent} strokeWidth="2" />
        <g clipPath={`url(#${id}-iris)`}>{drawWord()}
          {[0, 1, 2, 3].map(i => <path key={i} d="M 45 110 L 45 70 L 85 70" fill="none" stroke={accent} strokeWidth="3" transform={`rotate(${i * 90} 500 310)`} />)}</g></>;
      break;
    }
    case "logo-ribbon":
      scene = <>{Array.from({ length: 10 }, (_, i) => {
        const open = ease((t - i * .035) / .75), fold = (1 - open) * 80 + beat * (i % 2 ? 22 : -22);
        return <g key={i}><defs><clipPath id={`${id}-r${i}`}><rect x={i * 100} y="0" width="100.5" height="620" /></clipPath></defs>
          <g clipPath={`url(#${id}-r${i})`} transform={`translate(0 ${i % 2 ? fold : -fold})`}>
            {drawWord({ fill: i % 2 ? fg : accent, transform: `translate(${i * 100 + 50} 310) scale(${.25 + open * .75} 1) translate(${-i * 100 - 50} -310)` })}</g></g>;
      })}</>;
      break;
    case "logo-register": {
      const drift = (1 - enter) * 65 + 5 + beat * 18;
      scene = <>{drawWord({ fill: accent, transform: `translate(${-drift} ${drift * .2})` })}{drawWord({ fill: fg, opacity: .7, transform: `translate(${drift} ${-drift * .2})` })}
        {drawWord({ opacity: enter })}{[100, 900].map(x => <g key={x} stroke={accent} opacity=".7"><path d={`M${x - 12} 100h24 M${x} 88v24 M${x - 12} 520h24 M${x} 508v24`} fill="none" /></g>)}</>;
      break;
    }
    case "logo-orbital":
      scene = <><ellipse cx="500" cy="310" rx="445" ry={110 + beat * 35} fill="none" stroke={accent} strokeOpacity=".4" transform={`rotate(${-18 + t * 3} 500 310)`} />
        {glyphs.map((g, i) => { const e = ease((t - i / n * .35) / .85), a = i / n * Math.PI * 2 + t * 2;
          return <g key={i} fill={fg} transform={`translate(${(1 - e) * Math.cos(a) * 290} ${offset + (1 - e) * Math.sin(a) * 210 - beat * Math.sin(i) * 16})`}><path d={g.d} transform={`translate(${g.x} ${g.y}) scale(${g.scale})`} /></g>;
        })}</>;
      break;
    case "logo-halftone": {
      const radius = 1 + enter * 8 + beat * 3;
      scene = <><defs><pattern id={`${id}-dots`} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r={radius} fill={fg} /></pattern><clipPath id={`${id}-ink`}>{glyphs.map((g, i) => <path key={i} d={g.d} transform={`translate(${g.x} ${g.y + offset}) scale(${g.scale})`} />)}</clipPath></defs>
        <rect width="1000" height="620" fill={`url(#${id}-dots)`} clipPath={`url(#${id}-ink)`} /><circle cx="870" cy="100" r={24 + beat * 10} fill={accent} /><path d="M100 490H900" stroke={accent} strokeWidth="3" /></>;
      break;
    }
    case "logo-relief":
      scene = <>{Array.from({ length: 8 }, (_, i) => { const depth = (8 - i) * (2 + (1 - enter) * 7 + beat * 2);
        return drawWord({ key: i, fill: i % 2 ? accent : bg, stroke: accent, strokeWidth: 1, transform: `translate(${depth} ${depth})` });
      })}{drawWord({ fill: fg })}</>;
      break;
    case "logo-shutter":
      scene = <>{drawWord({ fill: accent, opacity: .18 })}{Array.from({ length: 12 }, (_, i) => {
        const e = ease((t - (i % 3) * .12) / .8), h = 620 * Math.max(0, e - beat * .2);
        return <g key={i}><defs><clipPath id={`${id}-s${i}`}><rect x={i * 1000 / 12} y={i % 2 ? 620 - h : 0} width={1000 / 12 + 1} height={h} /></clipPath></defs><g clipPath={`url(#${id}-s${i})`}>{drawWord()}</g></g>;
      })}</>;
      break;
    case "logo-tidal": {
      const level = 620 - enter * 320 + Math.sin(t * 1.8) * 38 + beat * 70;
      scene = <>{drawWord()}<defs><clipPath id={`${id}-wave`}><path d={`M0 ${level} Q250 ${level - 100} 500 ${level} T1000 ${level} V800H0Z`} /></clipPath></defs>
        <g clipPath={`url(#${id}-wave)`}>{drawWord({ fill: accent, transform: `translate(${Math.sin(t * 2) * 5} 3)` })}</g>
        <path d={`M40 ${level + 160} Q270 ${level + 60} 500 ${level + 160} T960 ${level + 160}`} fill="none" stroke={accent} strokeWidth="2" opacity=".5" /></>;
      break;
    }
    case "logo-monogram": {
      const first = glyphs[0];
      scene = <>{first && <path d={first.d} fill={accent} opacity={.15 * enter} transform={`translate(500 330) scale(${first.scale * (2.6 + beat * .2)}) translate(${-((first.box.x0 + first.box.x1) / 2 - first.x) / first.scale} ${-(cy - first.y) / first.scale})`} />}
        <path d={`M${500 - 330 * enter} 130H${500 + 330 * enter} M${500 - 330 * enter} 490H${500 + 330 * enter}`} stroke={accent} strokeWidth="1.5" />
        {drawWord({ opacity: enter, transform: `translate(500 310) scale(${.88 + enter * .12}) translate(-500 -310)` })}</>;
      break;
    }
    case "logo-zipper":
      scene = <>{[0, 1].map(i => <g key={i}><defs><clipPath id={`${id}-z${i}`}><rect x="-500" y={i ? 310 : -300} width="2000" height="610" /></clipPath></defs><g clipPath={`url(#${id}-z${i})`}>{drawWord({ transform: `translate(${(i ? -1 : 1) * ((1 - enter) * 700 + beat * 35)} 0)`, fill: i ? accent : fg })}</g></g>)}</>;
      break;
    case "logo-tunnel":
      scene = <>{Array.from({ length: 7 }, (_, i) => { const s = 1 + (7 - i) * (.11 + (1 - enter) * .3 + beat * .035);
        return drawWord({ key: i, fill: "none", stroke: accent, strokeWidth: 1.2, opacity: .1 + i * .08, transform: `translate(500 310) scale(${s}) translate(-500 -310)` });
      })}{drawWord({ opacity: enter })}</>;
      break;
    case "logo-specimen":
      scene = <><path d="M70 160V470 M930 160V470 M50 450H950" stroke={accent} strokeWidth="1.5" />
        {glyphs.map((g, i) => <g key={i} transform={`translate(${(g.box.x0 - 500) * (1 - enter) * .45 + beat * (i - n / 2) * 3} ${offset})`}>
          <path d={g.d} fill={fg} transform={`translate(${g.x} ${g.y}) scale(${g.scale})`} /><path d={`M${g.box.x0} ${y1 + 35}v14`} stroke={accent} strokeWidth="2" /></g>)}
        <circle cx={70 + enter * 860} cy="450" r="5" fill={accent} /></>;
      break;
    case "logo-prism-word":
      scene = <>{Array.from({ length: 7 }, (_, i) => { const x = i * 170 - 100, drift = (1 - enter) * (i % 2 ? 130 : -130) + beat * (i % 2 ? 18 : -18);
        return <g key={i}><defs><clipPath id={`${id}-p${i}`}><path d={`M${x} 0h171l-160 620h-171Z`} /></clipPath></defs><g clipPath={`url(#${id}-p${i})`}>{drawWord({ fill: i % 3 === 0 ? accent : fg, transform: `translate(${drift} 0)` })}</g></g>;
      })}</>;
      break;
    case "logo-pendulum":
      scene = <>{glyphs.map((g, i) => { const local = Math.max(0, t - i / n * .25), angle = Math.sin(local * 7 + i * .45) * 32 * Math.exp(-local * 3) + beat * Math.sin(i * .9) * 10;
        const cx = (g.box.x0 + g.box.x1) / 2;
        return <g key={i} transform={`translate(0 ${offset}) rotate(${angle} ${cx} ${y0 - size * .65})`}>
          <path d={`M${cx} ${y0 - size * .65}V${g.box.y0 - 10}`} stroke={accent} strokeWidth="1.3" opacity=".65" />
          <circle cx={cx} cy={y0 - size * .65} r="3" fill={accent} /><path d={g.d} fill={fg} transform={`translate(${g.x} ${g.y}) scale(${g.scale})`} /></g>;
      })}</>;
      break;
    case "logo-negative":
      scene = <><defs><mask id={`${id}-counter`} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="620"><rect width="1000" height="620" fill="white" />{drawWord({ fill: "black", transform: `translate(500 310) scale(${.5 + enter * .5 - beat * .04}) translate(-500 -310)` })}</mask></defs>
        <rect x={500 - enter * 450} y="115" width={enter * 900} height="390" rx="3" fill={fg} mask={`url(#${id}-counter)`} />
        <path d={`M50 ${530 + beat * 12}H${50 + enter * 900}`} stroke={accent} strokeWidth="5" /></>;
      break;
  }
  return <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden", containerType: "size" }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 620" role="img" aria-label={text} style={{ position: "absolute", width: "min(94cqw, 145cqh)", height: "auto", left: "50%", top: "50%", transform: "translate(-50%, -50%)", overflow: "visible" }}>
      <defs><g id={`${id}-word`}>{word("inherit")}</g></defs>{scene}
    </svg>
  </div>;
}

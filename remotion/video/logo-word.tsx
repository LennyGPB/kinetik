import React from "react";
import { logoMotionState, type LogoMotionId } from "../../config/logo-motion";
import { outlineText } from "../../lib/posts/outline-text";

const pulse = (p: number, start: number, end: number) => p <= start || p >= end ? 0 : Math.sin((p - start) / (end - start) * Math.PI) ** 2;
const ease = (v: number) => 1 - (1 - Math.max(0, Math.min(1, v))) ** 4;

/** Frame-driven vectors keep the picker, player and exported video in sync. */
export function LogoWordArt({ template, text, colors, time = 0, duration = 6 }: { template: LogoMotionId; text: string; colors: [string, string, string]; time?: number; duration?: number }) {
  const id = `word-${React.useId().replace(/[^\w-]/g, "")}`;
  const { progress: p, inverted } = logoMotionState(time, duration);
  const neon = template === "logo-neon-stack", sliced = template === "logo-slice";
  const [bg, fg, accent] = colors;
  const paper = sliced && inverted ? fg : bg, ink = sliced && inverted ? bg : fg;
  const h = text.length > 18 ? 520 : 340;
  const shape = outlineText(text, "rounded", 60, 8, 880, h - 40, 255, "currentColor", true).replace('<g fill="currentColor"', '<g');
  const paths = shape.match(/<path[^>]*\/>/g) ?? [];
  const sliceBurst = pulse(p, .08, .25) + pulse(p, .56, .75);
  const elastic = pulse(p, .06, .32) + pulse(p, .53, .83);
  const entrance = ease(p / .1);
  const depthX = -18 + Math.sin(p * Math.PI * 2) * 12;
  const depthY = 13 + Math.cos(p * Math.PI * 2) * 5;
  const viewHeight = h;
  const center = viewHeight / 2;
  return <div style={{ position: "absolute", inset: 0, background: paper, overflow: "hidden", containerType: "size" }}>
    <div style={{ position: "absolute", left: "50%", top: "50%", width: "min(78cqw, 130cqh)", transform: `translate(-50%,-50%) ${neon ? `perspective(1400px) rotateX(${8 * Math.cos(p * Math.PI * 2)}deg) rotateY(${-25 * (1 - entrance) + 14 * Math.sin(p * Math.PI * 2)}deg) rotateZ(${-2 * Math.sin(p * Math.PI * 2)}deg) scale(${.88 + entrance * .12})` : ""}` }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 1000 ${viewHeight}`} width="1000" height={viewHeight} role="img" aria-label={text} style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <g id={id} dangerouslySetInnerHTML={{ __html: shape }} />
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#ffffff"/><stop offset=".45" stopColor={fg}/><stop offset="1" stopColor={accent}/></linearGradient>
          <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={accent}/><stop offset=".6" stopColor={bg}/><stop offset="1" stopColor={accent}/></linearGradient>
          <linearGradient id={`${id}-light`} x1={-.8 + p * 3} x2={-.3 + p * 3} y1="0" y2=".4"><stop stopColor="#ffffff" stopOpacity="0"/><stop offset=".5" stopColor="#ffffff" stopOpacity=".9"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></linearGradient>
          <filter id={`${id}-glow`} x="-40%" y="-70%" width="180%" height="240%"><feGaussianBlur stdDeviation="18"/></filter>
          <filter id={`${id}-merge`} x="-30%" y="-50%" width="160%" height="200%"><feGaussianBlur stdDeviation={elastic * (text.length > 18 ? 3 : 10)}/><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -10"/></filter>
          {sliced && Array.from({ length: 8 }, (_, i) => <clipPath key={i} id={`${id}-slice-${i}`}><rect x="-400" y={i * h / 8} width="1800" height={h / 8 + .6}/></clipPath>)}
        </defs>
        {neon ? <g>
          <use href={`#${id}`} fill="#000000" opacity=".4" transform="translate(0 22)" filter={`url(#${id}-glow)`}/>
          {Array.from({ length: 24 }, (_, i) => <use key={i} href={`#${id}`} fill={`url(#${id}-side)`} transform={`translate(${(24 - i) / 24 * depthX} ${(24 - i) / 24 * depthY})`} />)}
          <use href={`#${id}`} fill={`url(#${id}-face)`} stroke={fg} strokeOpacity=".5" strokeWidth=".7"/>
          <use href={`#${id}`} fill={`url(#${id}-light)`}/>
        </g> : sliced ? Array.from({ length: 8 }, (_, i) => {
          const direction = i % 2 ? -1 : 1;
          const enter = 1 - ease((p - i * .004) / .09);
          const shift = direction * (sliceBurst * (65 + i * 13) + enter * 210);
          return <g key={i} clipPath={`url(#${id}-slice-${i})`}><use href={`#${id}`} fill={ink} stroke={ink} strokeWidth="3" strokeLinejoin="round" transform={`translate(${shift} 0)`}/></g>;
        }) : <g filter={`url(#${id}-merge)`} fill={ink} stroke={ink} strokeWidth={3 + elastic * (text.length > 18 ? 12 : 20)} strokeLinejoin="round" transform={`translate(500 ${center}) skewX(${-9 + Math.sin(p * Math.PI * 4) * elastic * 18}) scale(${1 - elastic * .32} ${1 + elastic * .22}) translate(-500 ${-center})`}>
          {paths.map((path, i) => {
            const position = path.match(/translate\(([\d.-]+),([\d.-]+)\)/);
            const glyphX = position ? Number(position[1]) + 45 : 500;
            const glyphY = position ? Number(position[2]) - 70 : center;
            const squash = 1 + elastic * Math.sin(i * .95 + p * Math.PI * 4) * (text.length > 18 ? .2 : .45);
            const offset = elastic * Math.sin(i * 1.2 + p * Math.PI * 4) * (text.length > 18 ? 12 : 22);
            const lift = elastic * Math.sin(i * .85 + p * Math.PI * 4) * (text.length > 18 ? 5 : 15);
            return <g key={i} transform={`translate(${glyphX + offset} ${glyphY + lift}) scale(${squash} ${1 / squash}) translate(${-glyphX} ${-glyphY})`} dangerouslySetInnerHTML={{ __html: path }} />;
          })}
        </g>}
      </svg>
    </div>
  </div>;
}

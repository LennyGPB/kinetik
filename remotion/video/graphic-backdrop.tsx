import type { GraphicMotionKind } from "../../config/graphic-motion";

/** Authored graphics, shared by catalogue thumbnails and frame-driven renders. */
export function GraphicBackdrop({ kind, palette, time: elapsed = 0, beatPosition, aspectRatio = 9 / 16 }: { kind: GraphicMotionKind; palette: [string, string, string]; time?: number; beatPosition?: number; aspectRatio?: number }) {
  // Legacy artwork uses seconds at 120 BPM. Drive that clock from the actual beats.
  const time = beatPosition === undefined ? elapsed : beatPosition / 2;
  const [bg, fg, accent] = palette;
  const phase = time * Math.PI;
  if (["anvil", "cadence", "blackout", "tessera"].includes(kind)) return <RefinedGraphic kind={kind} palette={palette} time={time} aspectRatio={aspectRatio} />;
  if (kind === "tessera" || kind === "ratchet") return <PrecisionBackdrop kind={kind} palette={palette} time={time} aspectRatio={aspectRatio} />;
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
      {kind === "interlock" && <>
        <path d="M 80 335 V 100 H 480 V 220 H 320" fill="none" stroke={accent} strokeWidth="55" transform={`translate(${-35 + Math.sin(phase * 0.6) * 25} 0)`} />
        <path d="M 920 665 V 900 H 520 V 780 H 680" fill="none" stroke={fg} strokeWidth="55" transform={`translate(${35 - Math.sin(phase * 0.6) * 25} 0)`} />
        <path d="M 520 100 H 600 M 400 900 H 480" stroke={fg} strokeWidth="3" opacity="0.5" />
      </>}
      {kind === "torque" && <g transform={`rotate(-12 500 500) translate(${Math.sin(phase) * 22} 0)`}>
        <path d="M -300 180 H 1300 M -300 820 H 1300" stroke={fg} strokeWidth="100" />
        <path d="M -300 290 H 1300 M -300 710 H 1300" stroke={accent} strokeWidth="18" />
        {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M ${i * 115 - 150} 145 l -50 70 M ${i * 115 - 150} 785 l -50 70`} stroke={bg} strokeWidth="13" />)}
      </g>}
      {kind === "cadence" && <>
        <g transform={`translate(500 170) rotate(${Math.sin(phase * 0.6) * 32})`}>
          <path d="M 0 -210 V 130" stroke={fg} strokeWidth="5" /><circle cy="155" r="74" fill={accent} /><circle cy="155" r="20" fill={bg} />
        </g>
        {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M ${70 + i * 150} 1000 V ${840 - Math.sin(phase + i * 0.65) * 80}`} stroke={fg} strokeWidth="95" />)}
      </>}
      {kind === "vector-beat" && <>
        {[0, 1, 2].map((i) => <g key={i} transform={`translate(${Math.sin(phase + i) * 45} ${i * 90})`}><path d="M -120 80 H 630 L 790 210 L 630 340 H -120" fill="none" stroke={i === 1 ? accent : fg} strokeWidth={i === 1 ? 40 : 5} opacity={i === 1 ? 1 : 0.5} /></g>)}
        <path d={`M 1100 830 H ${320 + Math.sin(phase) * 30} l 125 -95 M ${320 + Math.sin(phase) * 30} 830 l 125 95`} fill="none" stroke={accent} strokeWidth="42" />
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
    {kind === "anvil" && <>
      {[false, true].map((bottom) => <div key={String(bottom)} style={{ position: "absolute", left: "7%", right: "7%", ...(bottom ? { bottom: "9%" } : { top: "10%" }), height: "18%", transform: `translateY(${(bottom ? -1 : 1) * pulse * 1.4}cqmin)` }}>
        <div style={{ position: "absolute", inset: 0, background: fg, clipPath: bottom ? "polygon(12% 0,88% 0,88% 20%,100% 20%,100% 100%,0 100%,0 20%,12% 20%)" : "polygon(0 0,100% 0,100% 80%,88% 80%,88% 100%,12% 100%,12% 80%,0 80%)" }}/>
        <div style={{ position: "absolute", left: "15%", right: "15%", height: "0.8cqmin", background: accent, ...(bottom ? { top: "-12%" } : { bottom: "-12%" }) }}/>
        <div style={{ position: "absolute", inset: "30% 13%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: "4cqmin", height: "0.8cqmin", background: bg, opacity: 0.65 }}/>)}</div>
      </div>)}
      <div style={{ position: "absolute", left: "4%", top: "34%", bottom: "34%", width: 1, background: accent, opacity: 0.6 }}/><div style={{ position: "absolute", right: "4%", top: "34%", bottom: "34%", width: 1, background: accent, opacity: 0.6 }}/>
    </>}
    {kind === "cadence" && <>
      <div style={{ position: "absolute", top: "8%", left: "calc(50% - 17cqmin)", width: "34cqmin", height: "34cqmin" }}><svg viewBox="0 0 240 240" width="100%" height="100%" aria-hidden><path d="M 32 190 A 100 100 0 0 1 208 190" fill="none" stroke={fg} strokeWidth="2" opacity="0.5"/>{Array.from({ length: 9 }, (_, i) => <path key={i} d="M 120 22 V 35" stroke={fg} strokeWidth="2" transform={`rotate(${-64 + i * 16} 120 120)`}/>)}<g transform={`rotate(${Math.cos(time * Math.PI * 2) * 46} 120 160)`}><path d="M 120 160 V 45" stroke={fg} strokeWidth="4"/><rect x="108" y="60" width="24" height="30" rx="3" fill={accent} stroke={fg} strokeWidth="2"/></g><circle cx="120" cy="160" r="10" fill={fg}/></svg></div>
      <div style={{ position: "absolute", bottom: "8%", height: "15%", left: "8%", right: "8%", display: "flex", gap: "2cqmin", alignItems: "flex-end", borderBottom: `1px solid ${fg}` }}>{Array.from({ length: wide ? 12 : 8 }, (_, i) => <span key={i} style={{ flex: 1, height: `${25 + Math.pow(1 - ((beat - i / 8) - Math.floor(beat - i / 8)), 3) * 70}%`, background: i % 3 === 0 ? accent : fg }}/>)}</div>
    </>}
    {kind === "tessera" && <>
      <div style={{ position: "absolute", right: "8%", top: "9%", width: wide ? "34cqmin" : "48cqmin", height: wide ? "34cqmin" : "48cqmin" }}><svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden>{[0, 1, 2, 3].map((i) => {
        const step = Math.max(0, time * 0.5 - i * 0.25), fraction = step % 1;
        const turn = (Math.floor(step) + 1 - Math.pow(1 - Math.min(1, fraction / 0.5), 4)) * 90;
        return <g key={i} transform={`translate(${i % 2 * 200 + 100} ${Math.floor(i / 2) * 200 + 100})`}><rect x="-94" y="-94" width="188" height="188" rx="5" fill={i === 1 || i === 2 ? accent : fg}/><svg x="-94" y="-94" width="188" height="188" viewBox="-94 -94 188 188" overflow="hidden"><g transform={`rotate(${turn})`}><path d="M -86 -86 H 86 A 172 172 0 0 1 -86 86 Z" fill={bg} opacity="0.8"/><circle cx="43" cy="43" r="24" fill={bg}/></g></svg></g>;
      })}</svg></div>
      <div style={{ position: "absolute", bottom: "10%", left: "8%", right: "8%", borderTop: `1px solid ${accent}`, display: "flex", gap: "1cqmin", paddingTop: "2cqmin" }}>{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ flex: 1, height: "1cqmin", background: i <= Math.floor(time * 2) % 12 ? fg : accent, opacity: i <= Math.floor(time * 2) % 12 ? 1 : 0.25 }}/>)}</div>
    </>}
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

import { Easing } from "remotion";
import type { CoverContext } from "./themed-transitions";
import { paintStroke } from "./type-poster-art";
import type { TypePosterKind } from "../../config/type-posters";

/** Entire-frame covers: the graphic's own brush, stretch, stack and ribbon hide each scene boundary. */
export function TypePosterCover({ kind, ...c }: CoverContext & { kind: TypePosterKind }) {
  const p = Easing.inOut(Easing.cubic)(Math.max(0, Math.min(1, c.p)));
  if (p <= 0) return null;
  const [bg, ink, accent] = c.palette;
  return <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", opacity: Math.max(0, Math.min(1, (p - 0.015) / 0.08)) }} aria-hidden>
    {kind === "power" && <g transform="rotate(-18 500 500)">{Array.from({ length: 5 }, (_, i) => <g key={i} transform={`translate(-400 ${-300 + i * 350}) scale(1.8 ${p * 6})`}><path d={paintStroke(i)} fill={accent} /></g>)}</g>}
    {kind === "spectra" && <>
      <rect y={500 - p * 505} width="1000" height={p * 1010} fill={bg} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-500 + p * 500} y={500 + (i - 2) * 100 * p - 15 * p} width="1500" height={30 * p} fill={i % 2 ? ink : accent} transform={`skewX(${-25 * Math.sin(p * Math.PI)})`} />)}
    </>}
    {kind === "batch" && Array.from({ length: 9 }, (_, i) => {
      const center = 500 + (i - 4) * (1 - p) * 115;
      const height = 16 + p * 140 + p ** 4 * 900;
      return <rect key={i} x={500 - (100 + p * 410)} y={center - height / 2} width={200 + p * 820} height={height} fill={ink} />;
    })}
    {kind === "turn" && <g transform={`translate(500 500) rotate(${-30 * (1 - p)})`}>
      <path d={`M -1600 ${-p * 1600} H 1600 V ${p * 1600} H -1600 Z`} fill={ink} transform={`skewY(${-24 * (1 - p)})`} />
      {p < 0.98 && <path d="M -1600 0 H 1600" stroke={bg} strokeWidth={4 + Math.sin(p * Math.PI) * 12} />}
    </g>}
    {kind === "fanout" && <g transform={`translate(500 500) rotate(${-18 * (1 - p)})`}>
      <path d={`M -1100 ${-(p ** 3) * 1600} L ${-1100 + p * 2500} ${-p * 1500} V ${p * 1500} L -1100 ${p ** 3 * 1600} Z`} fill={ink} />
      {p < 0.98 && <path d={`M -1100 0 H ${-1100 + p * 2500}`} stroke={bg} strokeWidth="10" />}
    </g>}
    {kind === "blocktype" && <g transform={`translate(500 500) rotate(${(1 - p) * 45}) scale(${p * 4}) translate(-500 -500)`}>
      <path d="M 500 100 L 900 300 L 500 500 L 100 300 Z M 100 300 L 500 500 V 900 L 100 700 Z M 500 500 L 900 300 V 700 L 500 900 Z" fill={ink} stroke={bg} strokeWidth="10" />
    </g>}
    {kind === "positive" && <>
      <rect x="0" y={500 - p * 510} width="1000" height={p * 1020} fill={ink} />
      {p < 0.98 && <path d="M 0 500 H 1000" stroke={bg} strokeWidth={(1 - p) * 35} />}
    </>}
    {kind === "helix" && <>
      <path d={`M 500 -500 C ${500 - (1 - p) * 650} 100, ${500 + (1 - p) * 650} 900, 500 1500`} fill="none" stroke={ink} strokeWidth={p * 2200} />
      {p < 0.98 && <ellipse cx="500" cy="500" rx={80 + p * 450} ry={20 + p * 130} fill="none" stroke={bg} strokeWidth="4" transform={`rotate(${(1 - p) * 70} 500 500)`} />}
    </>}
    {kind === "spill" && <>
      {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M ${i * 115 - 80} -100 H ${i * 115 + 100} V ${-100 + p * 1600 - Math.sin(i * 1.7) * 110 * (1 - p)} Q ${i * 115 + 10} ${p * 1700} ${i * 115 - 80} ${-100 + p * 1600} Z`} fill={ink} />)}
    </>}
    {kind === "veil" && <>
      <ellipse cx="180" cy="1050" rx={p * 1800} ry={p * 1550} fill={accent} />
      <ellipse cx="900" cy="1150" rx={p * 1400} ry={p * 1400} fill={ink} />
    </>}
  </svg>;
}

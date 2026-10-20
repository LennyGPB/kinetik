import { PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

/** A sloping letter plane pulls into long, tapering liquid tails. */
export function SpillArt({ text, palette: [bg, ink], time, enter = 1, fontFamily, id = "spill" }: PosterArtProps) {
  const gradient = `${id}-fall`;
  const count = Math.max(1, [...text].length);
  const step = 850 / count;
  return <svg viewBox="0 0 1000 1100" preserveAspectRatio="xMidYMid meet" style={posterSvg} aria-hidden>
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor={ink} /><stop offset="0.35" stopColor={`color-mix(in srgb, ${ink}, ${bg} 28%)`} /><stop offset="1" stopColor={bg} stopOpacity="0" /></linearGradient></defs>
    <g transform={`translate(500 550) scale(${0.8 + enter * 0.2}) translate(-500 -370)`}>
      {Array.from({ length: count * 2 }, (_, i) => {
        const x = 100 + (i / 2 + 0.15) * step;
        const sx = 0.92 * x + 15;
        const sy = 396 - x * 0.25;
        const wave = Math.sin(time * 0.9 + i * 0.8);
        const length = (280 + Math.sin(i * 2.3) * 95 + wave * 28) * enter;
        const width = step * (i % 2 ? 0.08 : 0.17);
        return <path key={i} d={`M ${sx - width} ${sy - 16} C ${sx + width} ${sy + 45}, ${sx + width + wave * 9} ${sy + 105}, ${sx + wave * 13} ${sy + length} C ${sx - width * 0.1} ${sy + 130}, ${sx - width * 1.5} ${sy + 55}, ${sx - width} ${sy - 16} Z`} fill={`url(#${gradient})`} />;
      })}
      <g transform={`matrix(.92 -.25 .5 .4 -180 ${240 + Math.sin(time * 0.7) * 3})`}>
        <PosterWord text={text} x={100} width={850} y={390} size={250} color={ink} fontFamily={fontFamily} />
      </g>
    </g>
  </svg>;
}

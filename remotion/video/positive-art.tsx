import { PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

/** Repeated metal type recedes towards a dark horizon, then returns as its reflection. */
export function PositiveArt({ text, palette: [bg, ink], time, enter = 1, fontFamily, id = "positive" }: PosterArtProps) {
  const gradient = `${id}-metal`;
  const rows = [{ y: 205, size: 230 }, { y: 365, size: 210 }, { y: 505, size: 190 }, { y: 620, size: 155 }];
  return <svg viewBox="0 0 1000 1300" preserveAspectRatio="xMidYMid meet" style={posterSvg} aria-hidden>
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor={ink} /><stop offset={0.45 + Math.sin(time * 0.9) * 0.12} stopColor={`color-mix(in srgb, ${ink}, ${bg} 36%)`} /><stop offset="1" stopColor={bg} /></linearGradient></defs>
    {[false, true].map(mirror => <g key={String(mirror)} transform={mirror ? "translate(0 1300) scale(1 -1)" : undefined}>
      {rows.map((row, i) => <g key={i} transform={`translate(500 ${row.y + Math.sin(time * 0.9 + i * 0.6) * (4 - i) * 2 * enter}) scale(${1 - i * 0.025 + Math.sin(time * 0.9 + i * 0.6) * 0.018 * enter} ${0.3 + 0.7 * enter}) skewX(${-12 + i * 3}) translate(-500 ${-row.y})`}>
        <PosterWord text={text} x={65} width={870} y={row.y} size={row.size} color={`url(#${gradient})`} fontFamily={fontFamily} />
      </g>)}
    </g>)}
  </svg>;
}

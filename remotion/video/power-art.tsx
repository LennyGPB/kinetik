import { paintStroke, PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

export function PowerArt({ text, palette: [, ink, acid], time, enter = 1, fontFamily, aspectRatio = 9 / 16 }: PosterArtProps) {
  const rows = aspectRatio > 1.2 ? 5 : aspectRatio > 0.85 ? 7 : 9;
  return <svg viewBox={`0 0 1000 ${rows * 160}`} preserveAspectRatio="none" style={posterSvg} aria-hidden>
    {Array.from({ length: rows }, (_, i) => {
      const settle = 1 - Math.pow(1 - Math.max(0, Math.min(1, enter * 1.2 - i * 0.025)), 4);
      const shift = (1 - settle) * (i % 2 ? 110 : -110) + Math.sin(time * 1.1 + i * 0.65) * 12 * enter;
      return <g key={i} transform={`translate(${shift} ${i * 160})`}>
        <g transform={`translate(${8 + Math.sin(time * 0.6 + i) * 5} -4)`}><PosterWord text={text} y={145} size={175} color="none" stroke={acid} fontFamily={fontFamily} /></g>
        <PosterWord text={text} y={145} size={175} color={ink} fontFamily={fontFamily} />
      </g>;
    })}
    {[[680, 110, -18, 300], [520, 420, 24, 450], [260, 1120, -32, 620], [620, 1240, 20, 350]].map(([x, y, angle, length], i) => <g key={i} transform={`translate(${x} ${y / 1440 * rows * 160 + Math.sin(time * 0.7 + i) * 7}) rotate(${angle}) scale(${length / 1000} 0.7)`}>
      <path d={paintStroke(i + 1)} fill={acid} />
      <path d="M 80 28 L 900 37 M 100 61 L 820 72" stroke={ink} strokeWidth="2" opacity="0.28" />
    </g>)}
  </svg>;
}

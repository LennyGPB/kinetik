import { posterSvg, type PosterArtProps } from "./type-poster-art";

/** Two lines open around a shared hinge, with letter-by-letter perspective. */
export function FanoutArt({ text, palette: [, ink], time, enter = 1, fontFamily }: PosterArtProps) {
  const chars = [...text.toUpperCase()];
  const split = Math.ceil(chars.length / 2);
  const rows = [chars.slice(0, split), chars.slice(split)];
  return <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" style={posterSvg} aria-hidden>
    {rows.map((row, line) => <g key={line}>
      {row.map((char, i) => {
        const t = row.length > 1 ? i / (row.length - 1) : 0.5;
        const step = 800 / Math.max(1, row.length);
        const x = 90 + i * step;
        const wave = Math.sin(time * 1.1 + t * 1.4 + line * Math.PI) * enter;
        const y = (line === 0 ? 320 - Math.sin(t * Math.PI) * 48 + t * 45 : 600 - t * 80) + wave * 7;
        const size = (line ? 250 : 310) * (1 - t * 0.45);
        const angle = (line ? -12 : -6) + t * (line ? -14 : 12) + (1 - enter) * (line ? 32 : -32) + wave * 4;
        return <g key={i} transform={`translate(${x} ${y}) rotate(${angle}) scale(1 ${0.25 + enter * 0.75})`}>
          <text x="0" y="0" fontFamily={fontFamily} fontWeight="800" fontSize={size} textLength={step * 0.98} lengthAdjust="spacingAndGlyphs" fill={ink}>{char}</text>
        </g>;
      })}
    </g>)}
  </svg>;
}

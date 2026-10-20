import { posterSvg, type PosterArtProps } from "./type-poster-art";

/** A printed letter strip winds between two rings. Geometry and grain are frame-deterministic. */
export function HelixArt({ text, palette: [bg, ink], enter = 1, fontFamily, id = "helix", time }: PosterArtProps) {
  const chars = [...text.toUpperCase()];
  const pattern = `${id}-print`;
  const letters = chars.map((char, i) => {
    const t = chars.length > 1 ? i / (chars.length - 1) : 0.5;
    const angle = t * Math.PI * 2 - 0.8 + Math.sin(time * 0.75) * 0.24 * enter;
    const x = 500 + Math.sin(angle) * 105;
    const y = 245 + t * 650;
    const size = Math.min(390, 1800 / Math.max(4, chars.length));
    return <g key={i} transform={`translate(${x} ${y}) rotate(${90 + Math.cos(angle) * 18 * enter}) scale(${0.3 + 0.7 * enter} 1)`}>
      <text textAnchor="middle" dominantBaseline="central" fontFamily={fontFamily} fontSize={size} fontWeight="800" fill={ink}>{char}</text>
      <text textAnchor="middle" dominantBaseline="central" fontFamily={fontFamily} fontSize={size} fontWeight="800" fill={`url(#${pattern})`}>{char}</text>
    </g>;
  });
  return <svg viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet" style={posterSvg} aria-hidden>
    <defs><pattern id={pattern} width="17" height="19" patternUnits="userSpaceOnUse"><circle cx="2" cy="4" r="0.8" fill={bg} opacity="0.65" /><circle cx="10" cy="8" r="1" fill={bg} opacity="0.5" /><circle cx="5" cy="15" r="0.7" fill={bg} opacity="0.7" /><circle cx="15" cy="17" r="0.9" fill={bg} opacity="0.5" /></pattern></defs>
    <g transform={`rotate(${-8 + Math.sin(time * 0.3) * 2} 500 600)`}>
      <ellipse cx="500" cy="170" rx="290" ry="72" transform="rotate(-12 500 170)" fill="none" stroke={ink} strokeWidth="4" />
      <ellipse cx="500" cy="1000" rx="290" ry="72" transform="rotate(14 500 1000)" fill="none" stroke={ink} strokeWidth="4" />
      {letters}
      <text x="270" y="400" textLength="270" lengthAdjust="spacingAndGlyphs" fontSize="64" fontWeight="800" fontFamily={fontFamily} fill={ink} transform="rotate(-62 270 400)">{text.toUpperCase()}</text>
      <text x="700" y="810" textLength="270" lengthAdjust="spacingAndGlyphs" fontSize="64" fontWeight="800" fontFamily={fontFamily} fill={ink} transform="rotate(120 700 810)">{text.toUpperCase()}</text>
      <path d="M 220 1020 C 250 1115 720 1125 795 1010" fill="none" stroke={ink} strokeWidth="4" />
    </g>
  </svg>;
}

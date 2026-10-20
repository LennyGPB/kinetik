import { PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

const mixHex = (a: string, b: string, k: number) => /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b)
  ? "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("")
  : a;

/**
 * Affine face projections keep the letter cube geometrically identical in every format.
 * Each face gets its own light (top lit, left in half-shade, right in shadow) so the cube reads in volume.
 */
export function BlocktypeArt({ text, palette: [bg, ink], time, enter = 1, fontFamily }: PosterArtProps) {
  const faces = [
    { matrix: "matrix(.4 -.2 .4 .2 100 300)", fill: bg, color: ink },
    { matrix: "matrix(.4 .2 0 .4 100 300)", fill: mixHex(bg, ink, 0.1), color: mixHex(ink, bg, 0.12) },
    { matrix: "matrix(.4 -.2 0 .4 500 500)", fill: mixHex(bg, ink, 0.2), color: mixHex(ink, bg, 0.3) },
  ];
  return <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" style={posterSvg} aria-hidden>
    <g transform={`translate(500 ${500 + Math.sin(time * 1.1) * 12 * enter}) rotate(${(1 - enter) * -18 + Math.sin(time * 0.8) * 5 * enter}) scale(${(0.5 + enter * 0.5) * (0.98 + Math.cos(time * 0.8) * 0.02)}) translate(-500 -500)`}>
      {faces.map((face) => <g key={face.matrix} transform={face.matrix}>
        <rect width="1000" height="1000" fill={face.fill} />
        <PosterWord text={text} x={35} width={930} y={900} size={1100} color={face.color} fontFamily={fontFamily} />
        <path d="M 0 0 H 1000 V 1000 H 0 Z" fill="none" stroke={bg} strokeWidth="24" />
      </g>)}
      {/* Arêtes du cube, fines et claires : elles dessinent le volume sur fond noir */}
      <path d="M 500 100 L 900 300 L 500 500 L 100 300 Z M 500 500 V 900 M 100 300 V 700 L 500 900 L 900 700 V 300" fill="none" stroke={mixHex(ink, bg, 0.55)} strokeWidth="3" strokeLinejoin="round" />
    </g>
  </svg>;
}

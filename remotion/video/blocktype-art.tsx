import { PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

/** Affine face projections keep the letter cube geometrically identical in every format. */
export function BlocktypeArt({ text, palette: [bg, ink], time, enter = 1, fontFamily }: PosterArtProps) {
  const faces = ["matrix(.4 -.2 .4 .2 100 300)", "matrix(.4 .2 0 .4 100 300)", "matrix(.4 -.2 0 .4 500 500)"];
  return <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" style={posterSvg} aria-hidden>
    <g transform={`translate(500 ${500 + Math.sin(time * 1.1) * 12 * enter}) rotate(${(1 - enter) * -18 + Math.sin(time * 0.8) * 5 * enter}) scale(${(0.5 + enter * 0.5) * (0.98 + Math.cos(time * 0.8) * 0.02)}) translate(-500 -500)`}>
      {faces.map((matrix, i) => <g key={matrix} transform={matrix}>
        <rect width="1000" height="1000" fill={bg} />
        <PosterWord text={text} x={35} width={930} y={900} size={1100} color={ink} fontFamily={fontFamily} />
        <path d="M 0 0 H 1000 V 1000 H 0 Z" fill="none" stroke={bg} strokeWidth="24" />
        {i === 0 && <rect width="1000" height="1000" fill={bg} opacity="0.08" />}
      </g>)}
    </g>
  </svg>;
}

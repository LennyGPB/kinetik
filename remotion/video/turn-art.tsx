import { PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

export function TurnArt({ text, palette: [, ink], time, enter = 1, fontFamily }: PosterArtProps) {
  return <svg viewBox="0 0 1000 700" preserveAspectRatio="none" style={posterSvg} aria-hidden>
    <g transform={`translate(500 350) rotate(${-13 + Math.sin(time * 0.85) * 2.5 * enter}) scale(0.88) translate(-500 -350)`}>
    {[{ top: 65, height: 155, shift: 110 }, { top: 230, height: 240, shift: 0 }, { top: 480, height: 150, shift: -100 }].map((band, i) => <svg key={i} x={0} y={band.top} width={1000} height={band.height} viewBox={`0 ${band.top} 1000 ${band.height}`} overflow="hidden">
      <g transform={`translate(${band.shift * (1 - enter * 0.75) + Math.sin(time * 1.15 + i * 1.6) * (i === 1 ? 5 : 25) * enter} ${i === 1 ? 0 : (i === 0 ? -100 : 180) + (1 - enter) * (i ? 100 : -100)}) translate(500 350) scale(1 ${i === 1 ? 1 : -0.82}) translate(-500 -350)`}>
        <PosterWord text={text} x={50} width={900} y={535} size={440} color={ink} fontFamily={fontFamily} />
      </g>
    </svg>)}
    </g>
  </svg>;
}

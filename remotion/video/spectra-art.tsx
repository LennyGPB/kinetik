import { PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

export function SpectraArt({ text, palette: [bg, ink, accent], time, enter = 1, fontFamily, id = "spectra" }: PosterArtProps) {
  const gradient = `${id}-spectrum`;
  const rows = [{ y: 0, h: 145, color: true }, { y: 150, h: 100 }, { y: 254, h: 28 }, { y: 300, h: 180, reverse: true }, { y: 486, h: 35, reverse: true }, { y: 540, h: 175 }, { y: 720, h: 32 }, { y: 780, h: 160, color: true }];
  return <svg viewBox="0 0 1000 950" preserveAspectRatio="none" style={posterSvg} aria-hidden>
    <defs><linearGradient id={gradient} x1="0%" y1="0%" x2={`${75 + Math.sin(time * 0.45) * 20}%`} y2="100%"><stop stopColor={accent} /><stop offset="0.28" stopColor="#00f0ff" /><stop offset="0.52" stopColor="#eb4dff" /><stop offset="0.76" stopColor="#ff5c19" /><stop offset="1" stopColor={accent} /></linearGradient></defs>
    {rows.map((row, i) => <svg key={i} x={0} y={row.y} width={1000} height={row.h} viewBox="0 0 1000 180" preserveAspectRatio="none" overflow="hidden">
      {row.reverse && <rect width="1000" height="180" fill={`url(#${gradient})`} />}
      <g transform={`translate(${(1 - enter) * (i % 2 ? -150 : 150) + Math.sin(time * 1.15 + i * 0.8) * 14 * enter} 0) translate(500 90) scale(${0.98 + Math.cos(time * 1.15 + i * 0.8) * 0.02 * enter} 1) skewX(${-9 + Math.sin(time * 1.15 + i * 0.8) * 2.5 * enter}) translate(-500 -90)`}><PosterWord text={text} x={70} width={900} y={158} size={190} color={row.reverse ? bg : row.color ? `url(#${gradient})` : ink} fontFamily={fontFamily} /></g>
    </svg>)}
  </svg>;
}

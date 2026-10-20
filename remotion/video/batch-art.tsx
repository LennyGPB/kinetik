import { PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

export function BatchArt({ text, palette: [, ink], time, enter = 1, fontFamily }: PosterArtProps) {
  const rows = [{ y: 35, h: 15, w: 690 }, { y: 62, h: 36, w: 780 }, { y: 110, h: 67, w: 880 }, { y: 190, h: 195, w: 960 }, { y: 398, h: 85, w: 900 }, { y: 496, h: 38, w: 800 }, { y: 546, h: 16, w: 700 }];
  return <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={posterSvg} aria-hidden>
    {rows.map((row, i) => {
      const wave = Math.sin(time * 1.05 + Math.abs(i - 3) * 0.7) * enter;
      const width = row.w * (1 + wave * 0.025);
      return <svg key={i} x={(1000 - width) / 2} y={300 + (row.y - 300) * enter + (i === 3 ? 0 : wave * 5)} width={width} height={Math.max(1, row.h * (0.2 + enter * 0.8))} viewBox="0 0 1000 200" preserveAspectRatio="none" overflow="hidden">
      <PosterWord text={text} x={5} width={990} y={184} size={230} color={ink} fontFamily={fontFamily} />
    </svg>;
    })}
  </svg>;
}

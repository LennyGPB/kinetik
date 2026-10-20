import { PosterWord, posterSvg, type PosterArtProps } from "./type-poster-art";

/** Violet reflections cross a dark word above two softly defocused foreground folds. */
export function VeilArt({ text, palette: [, ink, violet], time, enter = 1, fontFamily, id = "veil" }: PosterArtProps) {
  const band = `${id}-reflection`;
  const phase = Math.sin(time * 0.75);
  return <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" style={posterSvg} aria-hidden>
    <defs>
      <linearGradient id={band} x1="0" y1="0" x2="0" y2="1"><stop stopColor={ink} /><stop offset={0.38 + phase * 0.08} stopColor={ink} /><stop offset={0.53 + phase * 0.08} stopColor={violet} /><stop offset={0.67 + phase * 0.08} stopColor={ink} /><stop offset="1" stopColor={ink} /></linearGradient>
    </defs>
    <g transform={`translate(500 500) scale(${0.9 + enter * 0.1}) translate(-500 -500)`}>
      <PosterWord text={text.toLowerCase()} preserveCase x={90} width={820} y={600} size={300} color={`url(#${band})`} fontFamily={fontFamily} />
    </g>
  </svg>;
}

/** Foreground follows the actual frame, independently of the square title viewport. */
export function VeilForeground({ palette: [, ink, violet], time }: { palette: [string, string, string]; time: number }) {
  return <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }} aria-hidden>
    <defs><filter id="veil-foreground-soft" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="18" /></filter></defs>
    <g filter="url(#veil-foreground-soft)" transform={`translate(${Math.sin(time * 0.75) * 15} ${Math.cos(time * 0.65) * 14})`}>
      <path d="M -250 1500 L -180 1150 C -140 940 -20 730 165 770 C 400 820 285 1050 500 1080 L 500 1500 Z" fill={ink} stroke={violet} strokeWidth="55" />
      <path d="M 400 1500 L 520 1150 C 610 970 680 845 810 830 C 915 810 960 730 1090 680 L 1250 1500 Z" fill={ink} stroke={violet} strokeWidth="48" />
    </g>
  </svg>;
}

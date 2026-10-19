import type { CSSProperties } from "react";

export const COLLECTION_BACKGROUNDS = ["monolith", "focus", "prism", "papercut", "metro"] as const;
export type CollectionBackgroundKind = (typeof COLLECTION_BACKGROUNDS)[number];

/** Frame-driven motifs shared with gallery thumbnails; the centre stays clear. */
export function CollectionBackground({ kind, palette, time = 2, aspectRatio = 1 }: { kind: CollectionBackgroundKind; palette: [string, string, string]; time?: number; aspectRatio?: number }) {
  const [bg, main, accent] = palette;
  const fill: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" };
  const tint = (color: string, opacity: number) => `color-mix(in srgb, ${color} ${opacity}%, transparent)`;

  if (kind === "monolith") return <div style={fill}>
    <div style={{ position: "absolute", top: "5%", left: "7%", width: "8%", height: "0.4%", background: main }} />
    <div style={{ position: "absolute", right: "5%", bottom: "5%", width: "1%", height: `${12 + Math.sin(time * 0.4) * 3}%`, background: main }} />
    <div style={{ position: "absolute", left: "7%", right: "10%", bottom: "5%", height: 1, background: tint(main, 15) }} />
  </div>;

  if (kind === "focus") return <div style={fill}>
    <div style={{ ...fill, background: `radial-gradient(ellipse at 50% 45%, ${tint(main, 7)}, transparent 60%)` }} />
    {[0, 1].map((i) => <div key={i} style={{ position: "absolute", width: `${65 + i * 16}%`, aspectRatio: "1", right: `${-38 - i * 8}%`, top: `${-10 + Math.sin(time * 0.15) * 2}%`, borderRadius: "50%", border: `1px solid ${tint(main, 12 - i * 5)}` }} />)}
    <div style={{ position: "absolute", left: "7%", bottom: "7%", width: "3%", height: 2, background: accent }} />
  </div>;

  if (kind === "prism") return <div style={fill}>
    <div style={{ ...fill, background: `radial-gradient(ellipse at 100% 0%, ${tint(main, 16)}, transparent 65%)` }} />
    {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: `${74 + i * 8}%`, top: "-20%", width: "28%", height: "140%", transform: `rotate(${20 + Math.sin(time * 0.2 + i) * 3}deg)`, background: `linear-gradient(100deg, ${tint(i % 2 ? main : accent, 22)}, ${tint(bg, 50)} 55%, ${tint(i % 2 ? accent : main, 10)})`, borderLeft: `1px solid ${tint(i % 2 ? accent : main, 40)}` }} />)}
    <div style={{ position: "absolute", left: "-10%", bottom: "-15%", width: "45%", height: "28%", transform: "rotate(25deg)", background: `linear-gradient(120deg, ${tint(main, 30)}, ${tint(accent, 6)})` }} />
  </div>;

  if (kind === "papercut") return <div style={fill}>
    {[{ x: -16, y: -18, r: -18, color: main }, { x: 83, y: 72, r: 18, color: accent }, { x: 87, y: -10, r: 35, color: main }].map((sheet, i) => <div key={i} style={{ position: "absolute", left: `${sheet.x}%`, top: `${sheet.y + Math.sin(time * 0.25 + i) * 1.5}%`, width: "34%", height: "34%", transform: `rotate(${sheet.r}deg)`, background: sheet.color, boxShadow: `0 10px 20px -10px ${tint("#201c16", 25)}` }}>
      <div style={{ position: "absolute", right: 0, bottom: 0, width: "25%", height: "25%", clipPath: "polygon(100% 0, 100% 100%, 0 100%)", background: `color-mix(in srgb, ${sheet.color}, black 15%)` }} />
    </div>)}
    <div style={{ position: "absolute", left: "6%", right: "6%", bottom: "5%", height: 1, background: tint(accent, 20) }} />
  </div>;

  return <MetroNetwork palette={palette} time={time} aspectRatio={aspectRatio} />;
}

type Point = [number, number];

/** Point et direction à la distance `d` le long d'une ligne brisée. */
function along(points: Point[], d: number): Point {
  let rest = Math.max(0, d);
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (rest <= len) return [x0 + ((x1 - x0) * rest) / len, y0 + ((y1 - y0) * rest) / len];
    rest -= len;
  }
  return points[points.length - 1];
}
const lengthOf = (points: Point[]) => points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i][0], y - points[i][1]), 0);

/**
 * Metro — un vrai plan de réseau : quatre lignes à 45° (couleurs de la marque + deux couleurs de signalétique teintées),
 * des stations qui s'allument au passage des rames, une correspondance, des pastilles de lignes. Dessiné aux proportions
 * réelles du cadre (stations rondes dans tous les formats) ; la bande centrale reste libre pour le titre.
 */
function MetroNetwork({ palette: [bg, main, accent], time, aspectRatio }: { palette: [string, string, string]; time: number; aspectRatio: number }) {
  const W = 1000, H = W / aspectRatio, u = Math.min(W, H) / 100;
  const coral = `color-mix(in srgb, #ff4f6d 75%, ${main})`, blue = `color-mix(in srgb, #3f8cff 75%, ${accent})`;
  const lines: { color: string; points: Point[]; speed: number; offset: number }[] = [
    { color: main, points: [[-80, H * 0.13], [W * 0.52, H * 0.13], [W * 0.52 + H * 0.13 + 80, -80]], speed: 210, offset: 0 },
    { color: accent, points: [[W + 80, H * 0.22], [W * 0.93, H * 0.22], [W * 0.93, H * 0.74], [W * 0.93 - H * 0.06, H * 0.8], [-80, H * 0.8]], speed: 170, offset: 420 },
    { color: coral, points: [[W * 0.07, H + 80], [W * 0.07, H * 0.3], [W * 0.07 - H * 0.3 - 80, -80]], speed: 150, offset: 260 },
    { color: blue, points: [[-80, H * 0.92], [W * 0.55, H * 0.92], [W * 0.55 + H * 0.08 + 80, H + 80]], speed: 190, offset: 120 },
  ];
  const draw = Math.min(1, Math.max(0, time) / 1.4);
  const stroke = u * 1.6;
  const inFrame = ([x, y]: Point) => x > u * 3 && x < W - u * 3 && y > u * 3 && y < H - u * 3;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", background: `radial-gradient(ellipse at 50% 50%, color-mix(in srgb, ${bg}, white 5%), ${bg} 70%)` }}>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} fill="none" aria-hidden>
      {Array.from({ length: Math.ceil(H / (u * 8)) }, (_, i) => <path key={i} d={`M0 ${i * u * 8}H${W}`} stroke={main} strokeOpacity=".035" />)}
      {lines.map((line, k) => {
        const length = lengthOf(line.points);
        const head = ((time * line.speed + line.offset) % (length + 400)) - 200;
        const stations = Array.from({ length: Math.floor(length / (u * 22)) }, (_, i) => (i + 0.5) * u * 22).map((d) => ({ d, at: along(line.points, d) })).filter((st) => inFrame(st.at));
        const car = [0, 0.5, 1].map((f) => along(line.points, head - f * u * 9));
        return <g key={k}>
          <path d={`M${line.points.map((pt) => pt.join(" ")).join("L")}`} stroke={line.color} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
          {stations.map((st, i) => {
            const lit = Math.max(0, 1 - Math.abs(head - st.d) / (u * 6));
            return <g key={i} opacity={draw > st.d / length ? 1 : 0}>
              {lit > 0 && <circle cx={st.at[0]} cy={st.at[1]} r={u * (1.6 + lit * 2.2)} fill={line.color} opacity={lit * 0.35} />}
              <circle cx={st.at[0]} cy={st.at[1]} r={u * 1.15} fill={lit > 0.3 ? line.color : bg} stroke={line.color} strokeWidth={u * 0.55} />
            </g>;
          })}
          {draw >= 1 && head > 0 && head < length && <>
            <path d={`M${car.map((pt) => pt.join(" ")).join("L")}`} stroke={line.color} strokeWidth={u * 2.8} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M${car.map((pt) => pt.join(" ")).join("L")}`} stroke="white" strokeWidth={u * 1.1} strokeLinecap="round" strokeDasharray={`${u * 1.4} ${u * 0.8}`} opacity=".9" />
          </>}
        </g>;
      })}
      <rect x={W * 0.07 - u * 2.6} y={H * 0.8 - u * 1.7} width={u * 5.2} height={u * 3.4} rx={u * 1.7} fill="white" stroke={bg} strokeWidth={u * 0.5} opacity={draw} />
      {lines.map((line, k) => <g key={k} transform={`translate(${W * 0.16 + k * u * 4.4} ${H * 0.05})`} opacity={draw}>
        <circle r={u * 1.7} fill={line.color} />
        <text textAnchor="middle" dominantBaseline="central" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize={u * 2} fill={bg}>{k + 1}</text>
      </g>)}
    </svg>
  </div>;
}

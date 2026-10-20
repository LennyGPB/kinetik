import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { luminance, textColorOn, useBodyFont, useTitleFont } from "./theme";

export function PitchChartScene({ scene, props }: { scene: Scene; props: VideoProps }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const heading = useTitleFont(), body = useBodyFont();
  const chart = scene.pitchVisual!.chart!;
  const progress = interpolate(frame, [fps * 0.4, fps * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const unit = Math.min(width, height) / 1080, padding = width * 0.12;
  const chartWidth = width - padding * 2, chartHeight = height * 0.35;
  const max = Math.max(1, ...chart.points.map((p) => p.value));
  const step = chartWidth / chart.points.length;
  const points = chart.points.map((p, i) => ({ ...p, x: step * (i + 0.5), y: chartHeight - p.value / max * chartHeight * 0.85 }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const foreground = Math.abs(luminance(props.palette[1]) - luminance(props.palette[0])) > 0.35 ? props.palette[1] : textColorOn(props.palette[0]);
  const accent = props.palette[2];
  return <AbsoluteFill style={{ padding: `${height * 0.14}px ${padding}px`, color: foreground }}>
    <h2 style={{ ...heading, margin: 0, fontSize: unit * 66, lineHeight: 1.05, letterSpacing: "-0.03em", maxWidth: "100%" }}>{scene.title}</h2>
    {scene.subtitle && <p style={{ fontFamily: body, fontSize: unit * 25, opacity: 0.8, marginTop: unit * 18 }}>{scene.subtitle}</p>}
    <svg width={chartWidth} height={chartHeight + unit * 95} viewBox={`0 -40 ${chartWidth} ${chartHeight + unit * 135}`} style={{ marginTop: height * 0.07, overflow: "visible", fontFamily: body }} role="img" aria-label={`${scene.title}: ${chart.points.map((p) => `${p.label} ${p.value} ${chart.unit}`).join(", ")}`}>
      <line x1={0} x2={chartWidth} y1={chartHeight} y2={chartHeight} stroke={foreground} opacity={0.2} strokeWidth={unit * 2} />
      {chart.type === "line" && <path d={line} fill="none" stroke={accent} strokeWidth={unit * 7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />}
      {points.map((point, i) => <g key={`${point.label}-${i}`}>
        {chart.type === "bar" ? <rect x={step * i + step * 0.17} y={chartHeight - (chartHeight - point.y) * progress} width={step * 0.66} height={(chartHeight - point.y) * progress} rx={unit * 10} fill={accent} /> : <circle cx={point.x} cy={point.y} r={unit * 6} fill={accent} opacity={progress >= i / Math.max(1, points.length - 1) ? 1 : 0} />}
        <text x={point.x} y={point.y - unit * 22} textAnchor="middle" fill={foreground} fontSize={unit * 27} fontWeight={700} opacity={progress}>{new Intl.NumberFormat(props.locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 2 }).format(point.value)}{chart.unit ? ` ${chart.unit}` : ""}</text>
        <text x={point.x} y={chartHeight + unit * 40} textAnchor="middle" fill={foreground} fontSize={Math.min(unit * 23, step / 7)}>{point.label.length > 12 ? `${point.label.slice(0, 11)}…` : point.label}</text>
      </g>)}
    </svg>
  </AbsoluteFill>;
}

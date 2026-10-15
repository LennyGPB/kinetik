import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoProps } from "../props";
import { textColorOn, useBeat, useUnit } from "./theme";
import { AnimatedTitle } from "./titles";

export type ExtraLogoLayout = "orbit" | "poster" | "echo" | "emblem";

export function ExtraLogoScene({ layout, props, tile, name, subtitle, progress, eased, settle }: {
  layout: ExtraLogoLayout;
  props: VideoProps;
  tile: ReactNode;
  name: ReactNode;
  subtitle: ReactNode;
  progress: number;
  eased: number;
  settle: number;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = useUnit();
  const color = textColorOn(props.palette[0]);
  const accent = props.palette[2];
  const pulse = useBeat().pulse(frame);
  const text = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2.5, maxWidth: "100%", opacity: settle, transform: `translateY(${(1 - settle) * u * 3}px)` }}>
      {name}{subtitle}
    </div>
  );

  if (layout === "orbit") {
    const turn = frame / fps * 12;
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: u * 8, textAlign: "center" }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center", width: u * 56, height: u * 44, marginBottom: u * 4 }}>
          {[0, 1, 2].map((index) => (
            <div key={index} style={{ position: "absolute", width: u * (48 + index * 3), height: u * (25 + index * 3), borderRadius: "50%", border: `${u * 0.15}px solid ${index === 1 ? accent : color}`, opacity: eased * (index === 1 ? 0.6 : 0.18), transform: `rotate(${index * 60 + turn * (index === 1 ? -1 : 1)}deg) scale(${0.6 + eased * 0.4})` }}>
              <span style={{ position: "absolute", top: "50%", left: -u * 0.5, width: u, height: u * 3, borderRadius: u, background: index === 1 ? accent : color }} />
            </div>
          ))}
          <div style={{ opacity: eased, transform: `scale(${0.75 + eased * 0.25})`, position: "relative" }}>{tile}</div>
        </div>
        {text}
      </AbsoluteFill>
    );
  }

  if (layout === "poster") {
    const posterWidth = Math.min(width - u * 14, u * 104);
    const posterHeight = Math.min(height - u * 14, u * 78);
    const fitName = Math.min(u * 12, (posterWidth - u * 10) / Math.max(1, props.appName.length * 0.72));
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: posterWidth, height: posterHeight, overflow: "hidden", color, border: `${u * 0.15}px solid ${color}40`, transform: `translateY(${(1 - eased) * u * 15}px) rotate(${(1 - eased) * -6}deg)`, opacity: Math.min(1, progress * 5), background: props.palette[0] }}>
          <div style={{ position: "absolute", inset: 0, background: props.palette[1], clipPath: `polygon(${100 - eased * 45}% 30%, 100% 30%, 100% 100%, ${100 - eased * 68}% 100%)` }} />
          <div style={{ position: "absolute", top: u * 5, left: u * 5, right: u * 5, color }}><AnimatedTitle text={props.appName} size={fitName} color={color} palette={props.palette} energy={props.graph.energy} align="left" delay={8} /></div>
          <div style={{ position: "absolute", left: u * 6, bottom: u * 6, opacity: settle, transform: `rotate(-8deg) scale(${0.8 + settle * 0.2})` }}>{tile}</div>
          {subtitle && <div style={{ position: "absolute", bottom: u * 6, right: u * 5, width: posterWidth * 0.42, padding: u * 1.5, background: props.palette[0], textAlign: "right", opacity: settle }}>{subtitle}</div>}
          <div style={{ position: "absolute", top: u * 3, left: u * 5, width: u * 10 * eased, height: u * 0.3, background: accent }} />
        </div>
      </AbsoluteFill>
    );
  }

  if (layout === "echo") {
    const converge = interpolate(progress, [0.1, 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const spread = 1 - converge;
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: u * 8, textAlign: "center" }}>
        <div style={{ position: "relative", width: u * 66, height: u * 40, display: "grid", placeItems: "center", marginBottom: u * 4 }}>
          {[-2, -1, 1, 2].map((offset) => (
            <div key={offset} style={{ position: "absolute", opacity: Math.min(1, progress * 8) * spread * 0.45, transform: `translate(${offset * u * 15 * spread}px, ${Math.abs(offset) * u * 3 * spread}px) rotate(${offset * 9 * spread}deg) scale(${1 - Math.abs(offset) * 0.1})` }}>{tile}</div>
          ))}
          <div style={{ position: "relative", opacity: Math.min(1, progress * 6), transform: `scale(${0.75 + eased * 0.25 + pulse * 0.025})` }}>{tile}</div>
        </div>
        {text}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: u * 8, textAlign: "center" }}>
      <div style={{ position: "relative", width: u * 48, height: u * 48, display: "grid", placeItems: "center", marginBottom: u * 5 }}>
        <svg viewBox="0 0 200 200" fill="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: `rotate(${(1 - eased) * -35}deg)` }}>
          <path d="M100 5 195 100 100 195 5 100Z" pathLength={1} stroke={accent} strokeWidth={0.7} strokeDasharray={1} strokeDashoffset={1 - eased} />
          <rect x={34} y={34} width={132} height={132} rx={12} pathLength={1} stroke={color} strokeOpacity={0.4} strokeWidth={0.6} strokeDasharray={1} strokeDashoffset={1 - settle} />
          {[0, 90, 180, 270].map((angle) => <path key={angle} d="M100 0V12" stroke={color} strokeOpacity={settle * 0.6} strokeWidth={1} transform={`rotate(${angle} 100 100)`} />)}
        </svg>
        <div style={{ opacity: settle, transform: `scale(${0.6 + settle * 0.4})` }}>{tile}</div>
      </div>
      {text}
    </AbsoluteFill>
  );
}

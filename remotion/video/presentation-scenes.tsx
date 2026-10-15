import { PreviewTarget } from "./movable-text";
import { MovableText } from "./movable-text";
import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { AnimatedTitle } from "./titles";
import { textColorOn, useBodyFont, useIsPortrait, useTitleFont, useUnit } from "./theme";

/** Alternate scene compositions. All timing is calculated from Remotion frames. */
export function PresentationScene({ scene, props, logo }: { scene: Scene; props: VideoProps; logo: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = useUnit();
  const portrait = useIsPortrait();
  const stacked = height >= width;
  const body = useBodyFont();
  const font = useTitleFont();
  const color = textColorOn(props.palette[0]);
  const accent = props.palette[2];
  const p = interpolate(frame, [0, Math.min(fps * 0.8, scene.duration * fps * 0.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 1 - Math.pow(1 - p, 4);
  const titleSize = u * (scene.title.length > 45 ? 6 : scene.title.length > 25 ? 7.5 : 9.5);
  const title = (align: "center" | "left" = "center") => <AnimatedTitle text={scene.title.replace(/\s+([?!:;])/g, "\u00a0$1")} size={titleSize} color={color} palette={props.palette} energy={props.graph.energy} align={align} />;
  const subtitle = scene.subtitle && <MovableText target="subtitle"><p style={{ margin: 0, fontFamily: body, fontSize: u * 3.1, lineHeight: 1.4, color, opacity: p * 0.75 }}>{scene.subtitle}</p></MovableText>;
  const src = props.screenUrls[0];
  const host = props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? props.appName;
  const cta = <div style={{ fontFamily: body, fontSize: u * 3.3, fontWeight: 600, maxWidth: "100%", overflowWrap: "anywhere", background: accent, color: textColorOn(accent), borderRadius: u * 1.4, padding: `${u * 1.8}px ${u * 3.5}px`, opacity: p, transform: `translateY(${(1 - eased) * u * 3}px)` }}>{host}</div>;

  if (scene.kind === "intro" && scene.presentation === "editorial") {
    return (
      <AbsoluteFill style={{ justifyContent: "center", padding: u * 10, gap: u * 5 }}>
        <div style={{ width: u * 14 * eased, height: u * 0.5, background: accent }} />
        <div style={{ maxWidth: portrait ? "100%" : "80%" }}>{title("left")}</div>
        <div style={{ maxWidth: u * 70 }}>{subtitle}</div>
        <div style={{ position: "absolute", right: u * 8, bottom: u * 8, ...font, fontSize: u * 3.5, color, opacity: p * 0.6 }}>{props.appName}</div>
      </AbsoluteFill>
    );
  }

  if (scene.kind === "intro" && scene.presentation === "split") {
    return (
      <AbsoluteFill style={{ flexDirection: stacked ? "column" : "row", alignItems: "center", justifyContent: "center", padding: u * 8, gap: u * 7 }}>
        <div style={{ width: stacked ? "100%" : "50%", display: "flex", flexDirection: "column", gap: u * 4 }}>{title("left")}{subtitle}</div>
        <div style={{ width: stacked ? u * 62 : "40%", height: u * (portrait ? 62 : stacked ? 40 : 65), display: "grid", placeItems: "center", opacity: p, transform: `translateY(${(1 - eased) * u * 12}px) rotate(${(1 - eased) * 7}deg)` }}>
          {src ? <PreviewTarget target="screens"><Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} /></PreviewTarget> : logo}
        </div>
      </AbsoluteFill>
    );
  }

  if (scene.kind === "feature" && scene.presentation === "spotlight") {
    const words = scene.title.trim().split(/\s+/);
    const last = words.pop();
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: u * 9, gap: u * 4, textAlign: "center" }}>
        <div style={{ position: "absolute", width: u * 60, height: u * 60, borderRadius: "50%", background: `radial-gradient(circle, ${accent}35, transparent 70%)`, opacity: p, transform: `scale(${0.6 + eased * 0.4})` }} />
        <MovableText target="title"><div style={{ position: "relative", ...font, fontSize: titleSize, color, lineHeight: 1.1, opacity: p, transform: `translateY(${(1 - eased) * u * 6}px)`, overflowWrap: "anywhere" }}>
          {words.join(" ")}{words.length > 0 && <br />}
          <span style={{ color: textColorOn(accent), background: accent, display: "inline-block", padding: `${u * 0.8}px ${u * 2}px`, transform: `rotate(${-3 * eased}deg)` }}>{last}</span>
        </div></MovableText>
        <div style={{ position: "relative", maxWidth: u * 75 }}>{subtitle}</div>
      </AbsoluteFill>
    );
  }

  if (scene.kind === "feature" && scene.presentation === "card") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: u * 10 }}>
        <div style={{ width: "100%", maxWidth: u * 110, padding: u * 7, borderRadius: u * 2, background: props.palette[0], border: `${u * 0.15}px solid ${color}50`, display: "flex", flexDirection: "column", gap: u * 5, opacity: p, transform: `translateY(${(1 - eased) * u * 12}px) rotate(${-3 * eased}deg)` }}>
          <span style={{ fontFamily: body, fontSize: u * 2.7, color, opacity: 0.65 }}>{props.appName}</span>
          {title("left")}{subtitle}
          <span style={{ width: `${eased * 35}%`, height: u * 0.45, background: accent }} />
        </div>
      </AbsoluteFill>
    );
  }

  if (scene.kind === "cta" && scene.presentation === "browser") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: u * 8, gap: u * 4, textAlign: "center" }}>
        {title()}
        <div style={{ width: "100%", maxWidth: u * 105, borderRadius: u * 1.5, border: `${u * 0.15}px solid ${color}40`, overflow: "hidden", background: props.palette[0], opacity: p, transform: `translateY(${(1 - eased) * u * 10}px)` }}>
          <div style={{ borderBottom: `${u * 0.1}px solid ${color}30`, padding: `${u * 1}px ${u * 2}px`, color, fontFamily: body, fontSize: u * 2, textAlign: "left", overflowWrap: "anywhere" }}>{host}</div>
          <div style={{ height: u * (portrait ? 45 : 32), display: "grid", placeItems: "center", padding: u * 2 }}>
            {src ? <PreviewTarget target="screens"><Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain", minHeight: 0 }} /></PreviewTarget> : logo}
          </div>
        </div>
        {cta}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: u * 9, gap: u * 5, textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: u * 3, opacity: p, transform: `scale(${0.8 + eased * 0.2})` }}>
        {logo}<span style={{ ...font, fontSize: Math.min(u * 5, u * 60 / Math.max(1, props.appName.length * 0.7)), color }}>{props.appName}</span>
      </div>
      {title()}
      <div style={{ maxWidth: u * 75 }}>{subtitle}</div>
      {cta}
    </AbsoluteFill>
  );
}

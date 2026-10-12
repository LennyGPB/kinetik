import { MovableText } from "./movable-text";
import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { LogoLayout } from "../../config/recipes";
import type { Scene } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { textColorOn, useBodyFont, useIsPortrait, useTitleFont, useUnit } from "./theme";
import { ExtraLogoScene } from "./logo-extra-layouts";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Frame-based choreography shared by the editor previews and MP4 renderer. */
export function LogoLayoutScene({ layout, scene, props, tile }: {
  layout: Exclude<LogoLayout, "signature">;
  scene: Scene;
  props: VideoProps;
  tile: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const u = useUnit();
  const portrait = useIsPortrait();
  const font = useTitleFont();
  const body = useBodyFont();
  const color = textColorOn(props.palette[0]);
  // Timing compresses for short scenes; all reveals finish in the first 60%.
  const revealFrames = Math.min(fps * 1.4, Math.max(12, scene.duration * fps * 0.6));
  const progress = interpolate(frame, [0, revealFrames], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - progress, 4);
  const settle = interpolate(progress, [0.45, 1], [0, 1], clamp);
  const nameSize = Math.min(u * (portrait ? 8 : 10), (width - u * 16) / Math.max(1, props.appName.length * 0.72));
  const name = (
    <MovableText target="title">
    <div style={{ ...font, color, fontSize: nameSize, lineHeight: 1.12, overflowWrap: "anywhere", maxWidth: "100%" }}>
      {props.appName}
    </div>
    </MovableText>
  );
  const subtitle = scene.subtitle && (
    <MovableText target="subtitle"><p style={{ margin: 0, fontFamily: body, fontSize: u * 3.2, lineHeight: 1.4, color, opacity: settle * 0.75, maxWidth: u * 75 }}>{scene.subtitle}</p></MovableText>
  );

  if (layout === "orbit" || layout === "poster" || layout === "echo" || layout === "emblem") {
    return <ExtraLogoScene layout={layout} props={props} tile={tile} name={name} subtitle={subtitle} progress={progress} eased={eased} settle={settle} />;
  }

  if (layout === "app-icon") {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: u * 120, padding: u * 8 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: u * 5 }}>
          <div style={{ opacity: Math.min(1, progress * 6), transform: `translateY(${(1 - eased) * u * 14}px) rotateY(${(1 - eased) * -42}deg) rotateZ(${(1 - eased) * -12}deg) scale(${1.65 - eased * 0.65})` }}>{tile}</div>
          <div style={{ opacity: settle, transform: `translateY(${(1 - settle) * u * 4}px)` }}>{name}</div>
          {subtitle}
        </div>
      </AbsoluteFill>
    );
  }

  if (layout === "typographic") {
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: u * 8, textAlign: "center" }}>
        <div style={{ position: "absolute", left: u * 7, right: u * 7, top: "50%", opacity: 0.1, transform: `translateY(-50%) translateX(${(1 - eased) * u * -18}px)`, ...font, color, fontSize: nameSize * 1.9, lineHeight: 0.95, overflowWrap: "anywhere" }}>{props.appName}</div>
        <div style={{ position: "relative", display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", justifyContent: "center", gap: u * 5, maxWidth: "100%" }}>
          <div style={{ opacity: settle, transform: `scale(${0.7 + settle * 0.3}) rotate(${(1 - settle) * 8}deg)` }}>{tile}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: u * 3, maxWidth: portrait ? "100%" : "65%", textAlign: portrait ? "center" : "left", transform: `translateX(${(1 - eased) * u * 20}px)`, opacity: Math.min(1, progress * 5) }}>
            {name}
            <div style={{ height: u * 0.35, width: `${settle * 100}%`, background: props.palette[2] }} />
            {subtitle}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const collapse = interpolate(progress, [0.2, 0.85], [0, 1], clamp);
  const screens = props.screenUrls.slice(0, 3);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: u * 8, textAlign: "center" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {screens.map((src, index) => {
          const offset = index - (screens.length - 1) / 2;
          return (
            <div key={`${src}-${index}`} style={{ position: "absolute", width: u * (portrait ? 32 : 36), height: u * 48, opacity: Math.min(1, progress * 10) * (1 - collapse), transform: `translateX(${offset * u * 27 * (1 - collapse)}px) translateY(${(1 - eased) * u * 12}px) rotate(${offset * 9 * (1 - collapse)}deg) scale(${1 - collapse * 0.6})` }}>
              <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: u * 1.2 }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 4, width: "100%" }}>
        <div style={{ opacity: screens.length ? settle : eased, transform: `scale(${0.65 + (screens.length ? settle : eased) * 0.35})` }}>{tile}</div>
        <div style={{ opacity: settle, transform: `translateY(${(1 - settle) * u * 3}px)` }}>{name}</div>
        {subtitle}
      </div>
    </AbsoluteFill>
  );
}

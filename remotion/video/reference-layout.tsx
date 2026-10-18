import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { AnimatedTitle } from "./titles";
import { MovableText } from "./movable-text";
import { MetalTitle } from "./reference-motion";
import { metalTitleHeight } from "../../config/reference-motion";
import { textColorOn, useBodyFont, useUnit } from "./theme";

export function ReferenceTextLayout(l: TextLayoutProps) {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const u = useUnit(), body = useBodyFont();
  const kind = l.props.recipe.referenceMotion!;
  const wide = width > height * 1.15;
  const color = textColorOn(l.props.palette[0]);
  const words = l.scene.title.split(/\s+/).filter(Boolean);
  const baseSize = Math.min(u * (kind === "bold-orbit" ? 5.5 : 10), width * .75 / Math.max(1, ...words.map((word) => word.length * .6)));
  const title = (text: string, size = baseSize) => <AnimatedTitle text={text} size={size} color={color} palette={l.props.palette} energy={l.props.graph.energy} align="center" />;
  const positions = kind === "lucent" ? wide ? { left: "7%", right: "56%", top: "28%" } : { left: "9%", right: "9%", top: "15%" } : kind === "bold-orbit" ? wide ? { left: "54%", right: "8%", top: "40%" } : { left: "10%", right: "10%", top: width / height >= .8 ? "70%" : "64%" } : { left: "9%", right: "9%", top: "27%" };
  return <AbsoluteFill style={{ color, fontFamily: body }}>
    <div style={{ position: "absolute", left: "7%", right: "7%", top: "5%", display: "flex", justifyContent: "space-between", fontSize: u * 1.8, gap: u * 3 }}><span>{l.props.appName}</span><span>{kind === "gold-rush" ? "MOTION / STUDIO" : "KINETIK / DESIGN"}</span></div>
    {kind === "echo-frame" ? <>
      <div style={{ position: "absolute", top: "9%", left: "7%", right: "7%" }}>{title(words.slice(0, Math.ceil(words.length / 2)).join(" "), baseSize * 1.2)}</div>
      <div style={{ position: "absolute", top: "77%", left: "7%", right: "7%" }}>{title(words.slice(Math.ceil(words.length / 2)).join(" "), baseSize * 1.2)}</div>
      {l.subtitle && <div style={{ position: "absolute", top: "72.5%", left: "10%", right: "10%", textAlign: "center" }}><MovableText target="subtitle"><p style={{ margin: 0, fontSize: u * 1.8, lineHeight: 1.2 }}>{l.subtitle}</p></MovableText></div>}
      <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "5%", textAlign: "center", fontSize: u * 2.3 }}>{l.footer}</div>
    </> : <div style={{ position: "absolute", ...positions, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 3 }}>
      {l.header}{l.kicker}
      {kind === "gold-rush" ? <MovableText target="title"><MetalTitle text={l.scene.title} time={frame / fps} style={{ maxWidth: Math.min(width * .8, height * .46 * 1000 / metalTitleHeight(l.scene.title)) }} /></MovableText> : l.title ? l.title("center", baseSize) : title(l.scene.title)}
      {l.subtitle && <MovableText target="subtitle"><p style={{ margin: 0, fontSize: u * 2.7, lineHeight: 1.35, maxWidth: u * 70 }}>{l.subtitle}</p></MovableText>}
      {l.footer}
    </div>}
  </AbsoluteFill>;
}

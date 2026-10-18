import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { LogoWordArt } from "./logo-word";
import { MovableText } from "./movable-text";

export function LogoMotionLayout({ scene, props }: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // The existing editor wrapper keeps text content, drag position, scale and end fades editable.
  return <AbsoluteFill style={{ background: props.palette[0], justifyContent: "center", alignItems: "center" }}>
    <MovableText target="title"><div style={{ width, height }}><LogoWordArt template={props.recipe.logoMotion!} text={scene.title} colors={props.palette} time={frame / fps} duration={scene.duration} /></div></MovableText>
  </AbsoluteFill>;
}

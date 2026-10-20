import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { useId } from "react";
import { TYPE_POSTERS, typePosterPlacement, type TypePosterKind } from "../../config/type-posters";
import { Subtitle, type TextLayoutProps } from "./composition";
import { condensedFont, wideFont } from "./fonts";
import { MovableText } from "./movable-text";
import { useRecipe, useTitleFont } from "./theme";
import { TYPE_POSTER_ART } from "./type-poster-art-registry";

export function TypePosterLayout({ kind, ...l }: TextLayoutProps & { kind: TypePosterKind }) {
  const frame = useCurrentFrame();
  const artId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const { fps, width, height } = useVideoConfig();
  const recipe = useRecipe();
  const brandFont = useTitleFont();
  const Art = TYPE_POSTER_ART[kind];
  const fontFamily = recipe.brandFonts ? brandFont.fontFamily as string : TYPE_POSTERS[kind].font === "wide" ? wideFont : condensedFont;
  const duration = kind === "batch" ? 26 : kind === "turn" ? 22 : 18;
  const enter = Easing.out(Easing.poly(kind === "power" ? 5 : 3))(Math.min(1, frame / duration));
  const placement = typePosterPlacement(kind, width / height);
  const artHeight = height * Number.parseFloat(String(placement.height)) / 100;
  return <AbsoluteFill>
    <div style={placement}>
      <MovableText target="title"><div style={{ position: "relative", height: artHeight }}><Art text={l.scene.title} palette={l.props.palette} time={frame / fps} enter={enter} fontFamily={fontFamily} aspectRatio={width / height} id={`${kind}-${artId}-${l.scene.id}`} /></div></MovableText>
    </div>
    <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "5%", display: "flex", alignItems: "center", flexDirection: "column", gap: Math.min(width, height) * 0.015, textAlign: "center" }}>
      {l.subtitle && <Subtitle text={l.subtitle} color={l.props.palette[1]} delay={duration + 4} size={2.6} />}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

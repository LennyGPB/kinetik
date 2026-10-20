import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { wideFont } from "./fonts";
import { MeltTitle } from "./melt-art";
import { MovableText } from "./movable-text";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Melt (template `offprint`) : ligne en capitales espacées en haut (sous-titre, sinon nom de l'app),
 * mot qui fond au centre (les coulures descendent vers le bas du cadre), bouton dessous, petits textes aux coins du bas.
 */
export function MeltLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [, main] = l.props.palette;
  const enter = Easing.out(Easing.cubic)(Math.min(1, frame / 20));
  const title = l.scene.title;
  const size = Math.min(u * 15, (width * 0.82) / Math.max(3, [...title].length * 0.78));
  const small = { fontFamily: body, fontSize: u * 1.6, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.25, color: main } as const;
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: "8%", right: "8%", top: "6%", textAlign: "center" }}>
      <MovableText target="subtitle"><span style={{ ...small, letterSpacing: "0.32em", fontWeight: 600 }}>{l.subtitle || l.props.appName}</span></MovableText>
    </div>
    <div style={{ position: "absolute", left: "5%", right: "5%", top: "50%", transform: "translateY(-50%)", fontSize: size }}>
      <MovableText target="title"><MeltTitle text={title} time={frame / fps} enter={enter} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : wideFont} /></MovableText>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: "78%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2 }}>
      {l.kicker}
      {l.footer}
    </div>
    <div style={{ ...small, position: "absolute", left: "6%", bottom: "4.5%" }}>{l.props.appName}<br />Motion</div>
    <div style={{ ...small, position: "absolute", right: "6%", bottom: "4.5%", textAlign: "right" }}>{l.props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "Vol. 1"}</div>
  </AbsoluteFill>;
}

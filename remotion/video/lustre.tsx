import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { wideFont } from "./fonts";
import { LustreTitle } from "./lustre-art";
import { MovableText } from "./movable-text";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Lustre : le mot chromé au centre, un peu au-dessus du milieu, puis deux lignes de
 * crédits en capitales très espacées (sous-titre, nom de l'app), comme sous un titre d'album. Le mot se gonfle à l'entrée
 * (ressort), ondule en continu et se liquéfie en sortant.
 */
export function LustreLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [, main] = l.props.palette;
  const time = frame / fps;
  // Entrée en ressort (organique), crédits 6 images plus tard ; sortie : le métal fond sur les 12 dernières images
  const enter = Easing.out(Easing.back(1.6))(Math.min(1, frame / 20));
  const credits = Easing.out(Easing.cubic)(Math.min(1, Math.max(0, (frame - 10) / 14)));
  const melt = Easing.in(Easing.cubic)(Math.min(1, Math.max(0, (frame - (durationInFrames - 12)) / 12)));
  const vertical = height > width;
  const credit = { fontFamily: body, fontSize: u * (vertical ? 2.6 : 2.3), fontWeight: 600, letterSpacing: "0.32em", textTransform: "uppercase", color: main, textAlign: "center", paddingLeft: "0.32em" } as const;
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: vertical ? "3%" : "10%", right: vertical ? "3%" : "10%", top: vertical ? "30%" : "22%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <MovableText target="title">
        <div style={{ width: vertical ? width * 0.94 : width * 0.62 }}>
          <LustreTitle text={l.scene.title} time={time} enter={enter} melt={melt} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : wideFont} />
        </div>
      </MovableText>
      <div style={{ marginTop: u * 3, display: "flex", flexDirection: "column", gap: u * 1.6, opacity: credits * (1 - melt), transform: `translateY(${(1 - credits) * u * 2 + melt * u * 3}px)` }}>
        {l.subtitle && <MovableText target="subtitle"><div style={credit}>{l.subtitle}</div></MovableText>}
        <div style={{ ...credit, opacity: 0.75 }}>{l.props.appName}</div>
      </div>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", bottom: vertical ? "14%" : "10%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, opacity: 1 - melt }}>
      {l.kicker}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

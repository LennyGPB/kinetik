import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import type { TextLayoutProps } from "./composition";
import { condensedFont } from "./fonts";
import { GlossTitle } from "./gloss-art";
import { MovableText } from "./movable-text";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Gloss : en-tête en trois colonnes, accroche en petites capitales au-dessus du mot,
 * mot posé juste au-dessus de la colonne de liquide (le fond la fait monter jusqu'à ~56 % du cadre), bouton dans le noir du haut.
 */
export function GlossLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [, main] = l.props.palette;
  const enter = Easing.out(Easing.cubic)(Math.min(1, frame / 22));
  const settle = Math.min(1, Math.max(0, (frame - 8) / 14));
  const title = l.scene.title;
  const size = u * Math.min(16, 70 / Math.max(2.5, [...title].length * 0.45));
  const head = { fontFamily: body, fontSize: u * 1.7, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em", color: main } as const;
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: "5%", right: "5%", top: "5%", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: u * 2 }}>
      <span style={head}>{l.props.appName}</span>
      <span style={{ ...head, textAlign: "center" }}>Motion poster</span>
      <span style={{ ...head, textAlign: "right" }}>{l.props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "Gloss"}</span>
    </div>
    <div style={{ position: "absolute", left: "6%", right: "6%", bottom: "44%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 1.2 }}>
      {l.subtitle && <MovableText target="subtitle"><span style={{ ...head, fontSize: u * 1.9, opacity: settle }}>{l.subtitle}</span></MovableText>}
      <MovableText target="title"><GlossTitle text={title} enter={enter} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : condensedFont} style={{ fontSize: size }} /></MovableText>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: "20%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2 }}>
      {l.kicker}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { LumenTitle } from "./lumen-art";
import { MovableText } from "./movable-text";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Lumen (template `interlock`) : accroche en minuscules violette au-dessus du mot
 * (comme « lost in »), mot à colonnes de lumière au centre, bouton dessous, pied de page en trois parties (@nom, numéro, site).
 */
export function LumenLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [, main, accent] = l.props.palette;
  const enter = Easing.out(Easing.cubic)(Math.min(1, frame / 26));
  const settle = Math.min(1, Math.max(0, (frame - 12) / 14));
  const handle = `@${l.props.appName.toLowerCase().replace(/\s+/g, "")}`;
  const foot = { fontFamily: body, fontSize: u * 1.6, fontWeight: 600, letterSpacing: "0.04em", color: "#ece6f5", opacity: 0.85, textTransform: "uppercase" } as const;
  return <AbsoluteFill>
    {l.subtitle && <div style={{ position: "absolute", left: "16%", right: "16%", top: "34%" }}>
      <MovableText target="subtitle"><span style={{ fontFamily: body, fontSize: u * 2.6, fontWeight: 500, color: `color-mix(in srgb, ${accent}, white 45%)`, opacity: settle, textShadow: `0 0 ${u}px ${accent}` }}>{l.subtitle.toLowerCase()}</span></MovableText>
    </div>}
    <div style={{ position: "absolute", left: "6%", right: "6%", top: "50%", transform: "translateY(-50%)" }}>
      <MovableText target="title"><LumenTitle text={l.scene.title} time={frame / fps} enter={enter} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : body} /></MovableText>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: "70%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2 }}>
      {l.kicker}
      {l.footer}
    </div>
    <div style={{ position: "absolute", left: "5%", right: "5%", bottom: "5%", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "end", gap: u * 2 }}>
      <span style={foot}>{handle}</span>
      <span style={{ ...foot, color: main }}>N° 001</span>
      <span style={{ ...foot, textAlign: "right", textTransform: "none" }}>{l.props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? ""}</span>
    </div>
  </AbsoluteFill>;
}

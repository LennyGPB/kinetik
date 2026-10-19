import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { Subtitle } from "./composition";
import { wideFont } from "./fonts";
import { HoloCapsule } from "./holo-art";
import { MovableText } from "./movable-text";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Holo (template `patina`) : capsule holographique verticale (portrait) ou horizontale
 * (carré, paysage) avec le titre découpé, petites étiquettes tournées de part et d'autre, sous-titre et bouton dessous.
 */
export function HoloLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [, main, accent] = l.props.palette;
  const vertical = height > width * 1.2;
  const enter = Easing.out(Easing.back(1.4))(Math.min(1, frame / 20));
  const box = vertical ? { left: "32%", right: "32%", top: "7%", bottom: "24%" } : { left: "14%", right: "14%", top: "14%", bottom: "38%" };
  const label = { position: "absolute", fontFamily: body, fontSize: u * 1.7, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", whiteSpace: "nowrap", color: main } as const;
  return <AbsoluteFill>
    <div style={{ position: "absolute", ...box }}>
      {/* L’enveloppe déplaçable n’a pas de hauteur propre : la capsule reçoit celle de sa boîte */}
      <MovableText target="title"><div style={{ position: "relative", height: height * (vertical ? 0.69 : 0.48) }}><HoloCapsule text={l.scene.title} time={frame / fps} enter={enter} palette={l.props.palette} vertical={vertical} fontFamily={brand ? (titleFont.fontFamily as string) : wideFont} /></div></MovableText>
    </div>
    {/* Étiquettes tournées de part et d'autre de la capsule */}
    <div style={{ ...label, left: vertical ? "18%" : "6%", top: vertical ? "41%" : "37%", transform: "translate(-50%, -50%) rotate(-90deg)" }}>{l.props.appName}</div>
    <div style={{ ...label, right: vertical ? "18%" : "6%", top: vertical ? "41%" : "37%", transform: "translate(50%, -50%) rotate(90deg)", color: accent }}>Motion</div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: vertical ? "80%" : "68%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, textAlign: "center" }}>
      {l.kicker}
      {l.subtitle && <Subtitle text={l.subtitle} color={main} delay={l.subtitleDelay} size={2.6} />}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

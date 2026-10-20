import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { Subtitle } from "./composition";
import { wideFont } from "./fonts";
import { HoloCapsule, holoPlacement } from "./holo-art";
import { MovableText } from "./movable-text";
import { textColorOn, useBeat, useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

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
  const { beatFrames } = useBeat();
  const [, main, accent] = l.props.palette;
  const ink = textColorOn(l.props.palette[0]);
  const vertical = height > width * 1.2;
  const enter = Easing.out(Easing.exp)(Math.min(1, frame / Math.min(24, Math.max(14, beatFrames))));
  const box = holoPlacement(vertical);
  const label = { position: "absolute", fontFamily: body, fontSize: u * 1.7, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", whiteSpace: "nowrap", color: main } as const;
  return <AbsoluteFill>
    <div style={{ position: "absolute", ...box }}>
      {/* L’enveloppe déplaçable n’a pas de hauteur propre : la capsule reçoit celle de sa boîte */}
      <MovableText target="title"><div style={{ position: "relative", height: height * (vertical ? 0.64 : 0.44) }}><HoloCapsule text={l.scene.title} time={frame / fps} enter={enter} palette={l.props.palette} vertical={vertical} fontFamily={brand ? (titleFont.fontFamily as string) : wideFont} /></div></MovableText>
    </div>
    {/* Étiquettes tournées de part et d'autre de la capsule */}
    <div style={{ ...label, left: vertical ? "15%" : "6%", top: "50%", maxWidth: vertical ? height * 0.46 : height * 0.4, overflow: "hidden", textOverflow: "ellipsis", transform: "translate(-50%, -50%) rotate(-90deg)", color: ink }}>{l.props.appName}</div>
    <div style={{ ...label, right: vertical ? "15%" : "6%", top: "50%", transform: "translate(50%, -50%) rotate(90deg)", color: accent }}>Motion</div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: vertical ? "87%" : "78%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, textAlign: "center" }}>
      {l.kicker}
      {l.subtitle && <Subtitle text={l.subtitle} color={ink} delay={l.subtitleDelay} size={2.8} />}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

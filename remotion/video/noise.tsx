import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { Subtitle } from "./composition";
import { wideFont } from "./fonts";
import { MovableText } from "./movable-text";
import { NoiseGrain, NoiseTitle } from "./noise-art";
import { textColorOn, useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Noise (template `optic`) : titre empilé à faisceaux au centre, sous-titre et bouton dessous,
 * pied de page en trois colonnes façon affiche ; grain vivant par-dessus tout (il « mange » aussi les faisceaux).
 */
export function NoiseLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [bg, main] = l.props.palette;
  const color = textColorOn(bg);
  const enter = Easing.out(Easing.cubic)(Math.min(1, frame / 24));
  const small = { fontFamily: body, fontSize: u * 1.55, fontWeight: 700, lineHeight: 1.15 } as const;
  return <AbsoluteFill style={{ color }}>
    <div style={{ position: "absolute", left: "4%", right: "4%", top: "6%", bottom: "26%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <MovableText target="title"><NoiseTitle text={l.scene.title} time={frame / fps} enter={enter} color={main} fontFamily={brand ? (titleFont.fontFamily as string) : wideFont} /></MovableText>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: "76%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, textAlign: "center" }}>
      {l.kicker}
      {l.subtitle && <Subtitle text={l.subtitle} color={color} delay={l.subtitleDelay} size={2.6} />}
      {l.footer}
    </div>
    <div style={{ position: "absolute", left: "5%", right: "5%", bottom: "4%", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "end", ...small }}>
      <span style={{ display: "flex", alignItems: "center", gap: u * 0.6 }}><span style={{ letterSpacing: "-0.1em", opacity: 0.8 }}>|||</span>{l.props.appName}</span>
      <span style={{ textAlign: "center" }}>Motion<br />Typography</span>
      <span style={{ textAlign: "right", opacity: 0.85 }}>{l.props.websiteUrl?.replace(/^https?:\/\//, "") ?? l.props.appName}</span>
    </div>
    <NoiseGrain seed={Math.floor(frame / 2) % 97} opacity={0.34} />
  </AbsoluteFill>;
}

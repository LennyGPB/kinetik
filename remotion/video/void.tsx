import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { Subtitle } from "./composition";
import { displayFont } from "./fonts";
import { MovableText } from "./movable-text";
import { NoiseGrain } from "./noise-art";
import { textColorOn, useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";
import { ThornCrown, VoidTitle } from "./void-art";

/**
 * Mise en page des scènes de texte de Void (template `carousel`) : moitié arrière de la couronne, titre défocalisé,
 * moitié avant de la couronne par-dessus ; sous-titre et bouton dessous, nom de l'app discret en pied ; grain sur tout.
 */
export function VoidLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [bg, main] = l.props.palette;
  const time = frame / fps;
  const enter = Easing.out(Easing.cubic)(Math.min(1, frame / 26));
  const crown = (layer: "back" | "front") => <ThornCrown time={time} enter={enter} layer={layer} aspectRatio={width / height} palette={l.props.palette} />;
  return <AbsoluteFill style={{ color: textColorOn(bg) }}>
    {crown("back")}
    <div style={{ position: "absolute", left: "6%", right: "6%", top: "50%", transform: "translateY(-50%)" }}>
      <MovableText target="title"><VoidTitle text={l.scene.title} time={time} enter={enter} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : displayFont} /></MovableText>
    </div>
    {crown("front")}
    <div style={{ position: "absolute", left: "10%", right: "10%", top: "74%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, textAlign: "center" }}>
      {l.kicker}
      {l.subtitle && <Subtitle text={l.subtitle} color={main} delay={l.subtitleDelay} size={2.6} />}
      {l.footer}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: "4.5%", textAlign: "center", fontFamily: body, fontSize: u * 1.6, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: main, opacity: 0.7 }}>{l.props.appName}</div>
    <NoiseGrain seed={Math.floor(frame / 2) % 83} opacity={0.32} />
  </AbsoluteFill>;
}

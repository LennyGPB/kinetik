import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { displayFont } from "./fonts";
import { WiggleTitle } from "./wiggle-art";
import { MovableText } from "./movable-text";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Wiggle : pastille carrée au trait (initiale de l'app) et petit libellé en capitales,
 * titre dessiné au centre, petite marque sous le titre.
 * Entrée : pastille puis lettres qui sautent une à une (ressort) ; sortie : les lettres s'écrasent et tombent.
 */
export function WiggleLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [, main] = l.props.palette;
  const time = frame / fps;
  const landscape = width > height * 1.2;
  const badge = Easing.out(Easing.back(2.2))(Math.min(1, frame / 10));
  const enter = Math.min(1, Math.max(0, (frame - 4) / 22));
  const leave = Easing.in(Easing.quad)(Math.min(1, Math.max(0, (frame - (durationInFrames - 12)) / 12)));
  const initial = [...(l.props.appName || "K").trim()][0]?.toUpperCase() ?? "K";
  // Pastille qui se dandine aussi, en phase lente
  const tilt = Math.sin(time * 2.2) * 3;
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: landscape ? "10%" : "22%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 1.4, opacity: 1 - leave }}>
      <div style={{ width: u * 9, height: u * 9, border: `${u * 0.45}px solid ${main}`, display: "grid", placeItems: "center", fontFamily: body, fontWeight: 700, fontSize: u * 4.4, color: main, transform: `scale(${badge}) rotate(${tilt}deg)` }}>{initial}</div>
      {l.subtitle && <MovableText target="subtitle"><span style={{ fontFamily: body, fontWeight: 700, fontSize: u * 1.9, letterSpacing: "0.06em", textTransform: "uppercase", color: main, opacity: badge }}>{l.subtitle}</span></MovableText>}
    </div>
    <div style={{ position: "absolute", left: landscape ? "20%" : "6%", right: landscape ? "20%" : "6%", top: landscape ? "33%" : "38%" }}>
      <MovableText target="title">
        <WiggleTitle text={l.scene.title} time={time} enter={enter} leave={leave} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : displayFont} />
      </MovableText>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", bottom: landscape ? "8%" : "12%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, opacity: 1 - leave }}>
      <svg width={u * 5} height={u * 4.4} viewBox="0 0 10 9" aria-hidden style={{ transform: `rotate(${-tilt}deg)`, opacity: badge }}><path d="M5 0.4 9.6 8.6H6.9L5 5.1 3.1 8.6H0.4Z M5 6.4 6 8.6H4Z" fill={main} /></svg>
      {l.kicker}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

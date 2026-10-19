import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { EmberTitle } from "./ember-art";
import { MovableText } from "./movable-text";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte d'Ember (template `flux`) : mot incandescent au centre, accroche en minuscules dans une petite
 * pastille sombre, bouton dessous, étiquettes minuscules aux coins de la carte (façon affiche).
 */
export function EmberLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const enter = Easing.out(Easing.exp)(Math.min(1, frame / 22));
  const label = { position: "absolute", fontFamily: body, fontSize: u * 1.35, fontWeight: 700, lineHeight: 1.15, letterSpacing: "0.04em", textTransform: "uppercase", color: "#f4efe8", opacity: 0.85 } as const;
  const tagline = l.subtitle;
  const settle = Math.min(1, Math.max(0, (frame - 10) / 14));
  return <AbsoluteFill>
    <div style={{ ...label, left: "10%", top: "10%" }}>{l.props.appName}<br /><span style={{ opacity: 0.6 }}>Motion</span></div>
    <div style={{ ...label, left: 0, right: 0, top: "10%", textAlign: "center" }}>●</div>
    <div style={{ ...label, right: "10%", top: "10%", textAlign: "right" }}>Daily<br />poster</div>
    <div style={{ ...label, left: "10%", bottom: "9.5%" }}>{l.props.appName}</div>
    <div style={{ ...label, right: "10%", bottom: "9.5%", textAlign: "right" }}>{l.props.websiteUrl?.replace(/^https?:\/\//, "") ?? "↗"}</div>
    <div style={{ position: "absolute", left: "6%", right: "6%", top: "50%", transform: "translateY(-50%)" }}>
      <MovableText target="title"><EmberTitle text={l.scene.title} time={frame / fps} enter={enter} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : body} /></MovableText>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: "66%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2.2 }}>
      {l.kicker}
      {tagline && <MovableText target="subtitle"><span style={{ display: "inline-block", padding: `${u * 0.9}px ${u * 2.2}px`, borderRadius: 999, background: "rgb(255 255 255 / 0.06)", boxShadow: "0 0 3cqmin rgb(0 0 0 / 0.6)", fontFamily: body, fontWeight: 600, fontSize: u * 2.2, color: "#f4efe8", opacity: settle, transform: `translateY(${(1 - settle) * u * 1.5}px)` }}>{tagline.toLowerCase()}</span></MovableText>}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

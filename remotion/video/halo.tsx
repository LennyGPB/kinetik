import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { displayFont } from "./fonts";
import { HaloTitle } from "./halo-art";
import { MovableText } from "./movable-text";
import { NoiseGrain } from "./noise-art";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Halo (template `lens`) : accroche en capitales très espacées au-dessus du mot,
 * mot à arcs au centre, bouton dessous, étiquettes aux quatre coins et signature « @ » en bas (façon affiche) ; grain par-dessus.
 */
export function HaloLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const enter = Easing.out(Easing.exp)(Math.min(1, frame / 24));
  const settle = Math.min(1, Math.max(0, (frame - 8) / 16));
  const [, main] = l.props.palette;
  const corner = { position: "absolute", fontFamily: body, fontSize: u * 1.7, fontWeight: 700, lineHeight: 1.1, textTransform: "uppercase", color: main } as const;
  const handle = (l.props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? l.props.appName.toLowerCase().replace(/\s+/g, ""));
  return <AbsoluteFill>
    <div style={{ ...corner, left: "7%", top: "5%" }}>{l.props.appName}<br /><span style={{ fontSize: u * 1.2, fontWeight: 600 }}>Motion</span></div>
    <div style={{ ...corner, right: "7%", top: "5%", textAlign: "right" }}>Typo<br /><span style={{ fontSize: u * 1.2, fontWeight: 600 }}>Series</span></div>
    <div style={{ ...corner, left: "7%", bottom: "6%" }}>Daily<br /><span style={{ fontSize: u * 1.2, fontWeight: 600 }}>Design</span></div>
    <div style={{ ...corner, right: "7%", bottom: "6%", textAlign: "right" }}>Keep<br /><span style={{ fontSize: u * 1.2, fontWeight: 600 }}>Creating</span></div>
    {l.subtitle && <div style={{ position: "absolute", left: "8%", right: "8%", top: "33%", textAlign: "center" }}>
      <MovableText target="subtitle"><span style={{ fontFamily: body, fontSize: u * 1.6, fontWeight: 600, letterSpacing: "0.45em", textTransform: "uppercase", color: main, opacity: settle }}>{l.subtitle}</span></MovableText>
    </div>}
    <div style={{ position: "absolute", left: "5%", right: "5%", top: "50%", transform: "translateY(-50%)" }}>
      <MovableText target="title"><HaloTitle text={l.scene.title} time={frame / fps} enter={enter} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : displayFont} /></MovableText>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: "68%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2 }}>
      {l.kicker}
      {l.footer}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: "6.5%", display: "flex", justifyContent: "center", alignItems: "center", gap: u * 1, fontFamily: body, fontSize: u * 2, fontWeight: 700, color: main, opacity: 0.85 }}>
      <svg viewBox="0 0 24 24" width={u * 2.6} height={u * 2.6} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" /></svg>
      {handle}
    </div>
    <NoiseGrain seed={Math.floor(frame / 2) % 89} opacity={0.4} />
  </AbsoluteFill>;
}

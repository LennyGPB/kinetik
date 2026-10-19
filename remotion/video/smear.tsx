import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { Subtitle } from "./composition";
import { MovableText } from "./movable-text";
import { SmearTitle } from "./smear-art";
import { textColorOn, useBodyFont, useTitleFont, useUnit } from "./theme";

/** Mise en page des scènes de texte : nom de fichier en tête, titre étiré au centre, signature et méta-texte en pied. */
export function SmearLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const font = useTitleFont();
  const [bg, main] = l.props.palette;
  const color = textColorOn(bg);
  const title = l.scene.title;
  const size = Math.min(u * 17, (width * 0.86) / Math.max(3, [...title].length * 0.5));
  const enter = Easing.out(Easing.cubic)(Math.min(1, frame / 18));
  const file = `${l.props.appName.toLowerCase().replace(/\s+/g, "")}.mp4`;
  return <AbsoluteFill style={{ color }}>
    <div style={{ position: "absolute", top: "3.5%", left: 0, right: 0, textAlign: "center", fontFamily: body, fontSize: u * 1.8, fontWeight: 600, opacity: 0.85 }}>{file}</div>
    <div style={{ position: "absolute", left: "5%", right: "5%", top: "46%", transform: "translateY(-50%)", fontSize: size }}>
      <MovableText target="title"><SmearTitle text={title} time={frame / fps} enter={enter} palette={l.props.palette} fontFamily={font.fontFamily as string} /></MovableText>
    </div>
    <div style={{ position: "absolute", left: "8%", right: "8%", top: "71%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2.2, textAlign: "center" }}>
      {l.kicker}
      {l.subtitle && <Subtitle text={l.subtitle} color={color} delay={l.subtitleDelay} size={2.8} />}
      {l.footer}
    </div>
    <div style={{ position: "absolute", left: "6%", bottom: "4.5%", color: main, fontFamily: font.fontFamily as string, fontSize: u * 4.2, transform: "rotate(-6deg) skewX(-12deg)", lineHeight: 1 }}>
      {l.props.appName}
      <svg viewBox="0 0 100 12" style={{ display: "block", width: "100%", height: u * 1.4, marginTop: u * 0.3 }} aria-hidden><path d="M 0 8 C 15 2, 25 12, 40 6 S 70 2, 100 7" fill="none" stroke={main} strokeWidth="3" strokeLinecap="round" /></svg>
    </div>
    <div style={{ position: "absolute", right: "6%", bottom: "5%", textAlign: "right", fontFamily: body, fontSize: u * 1.6, fontWeight: 600, lineHeight: 1.3, opacity: 0.85 }}>Motion poster<br />{l.props.appName}</div>
  </AbsoluteFill>;
}

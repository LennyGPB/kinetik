import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { Subtitle } from "./composition";
import { bodyFont, condensedFont, scriptFont, wideFont } from "./fonts";
import { MovableText } from "./movable-text";
import { textColorOn, useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";
import { Typo5Title, type Typo5Kind } from "./typo5-art";

const FONTS: Record<Typo5Kind, string> = { hollow: condensedFont, cursive: wideFont, overlap: bodyFont, bloom: wideFont, reflect: wideFont };

/**
 * Mise en page commune des affiches Hollow, Cursive, Overlap, Bloom et Reflect : en-tête discret, titre au centre,
 * sous-titre (sauf Cursive, qui l'intègre au titre), bouton et pied « petites capitales » comme sur les références.
 */
export function Typo5Layout({ kind, ...l }: TextLayoutProps & { kind: Typo5Kind }) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [bg] = l.props.palette;
  const ink = textColorOn(bg);
  const enter = Easing.out(Easing.cubic)(Math.min(1, frame / 22));
  const fontFamily = brand ? (titleFont.fontFamily as string) : FONTS[kind];
  const caps = { fontFamily: body, fontSize: u * 1.7, fontWeight: 600, letterSpacing: "0.32em", textTransform: "uppercase", color: ink, opacity: 0.85 } as const;
  const art = <Typo5Title kind={kind} text={l.scene.title} time={frame / fps} enter={enter} palette={l.props.palette} fontFamily={fontFamily} scriptFamily={scriptFont} subtitle={kind === "cursive" ? l.subtitle : undefined} />;
  // L’enveloppe déplaçable n’a pas de hauteur propre : Reflect, qui remplit son parent, reçoit celle du cadre
  const title = <MovableText target="title">{kind === "reflect" ? <div style={{ position: "relative", height }}>{art}</div> : art}</MovableText>;
  return <AbsoluteFill>
    <div style={{ ...caps, position: "absolute", left: 0, right: 0, top: "6%", textAlign: "center" }}>{l.props.appName}</div>
    {kind === "reflect"
      ? <div style={{ position: "absolute", inset: 0 }}>{title}</div>
      : <div style={{ position: "absolute", left: "5%", right: "5%", top: "50%", transform: "translateY(-50%)" }}>{title}</div>}
    <div style={{ position: "absolute", left: "10%", right: "10%", top: kind === "reflect" ? "84%" : "74%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, textAlign: "center" }}>
      {l.kicker}
      {kind !== "cursive" && l.subtitle && <Subtitle text={l.subtitle} color={ink} delay={l.subtitleDelay} size={2.6} />}
      {l.footer}
    </div>
    <div style={{ ...caps, position: "absolute", left: 0, right: 0, bottom: "5%", textAlign: "center", fontSize: u * 1.4 }}>{l.props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "Motion poster"}</div>
  </AbsoluteFill>;
}

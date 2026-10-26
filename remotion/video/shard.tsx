import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { condensedFont } from "./fonts";
import { ShardTitle } from "./shard-art";
import { MovableText } from "./movable-text";
import { useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Shard : en-tête en deux colonnes (marque / série), titre fissuré au centre,
 * pastille d'app coupée par le coin bas gauche, sous-titre en bas à droite.
 * Entrée : le titre arrive entier, se fend d'un coup à l'image 9 (fissures en 4 images, glissement sec avec léger rebond) ;
 * sortie : les morceaux tombent.
 */
export function ShardLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const u = useUnit();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [, main] = l.props.palette;
  const font = brand ? (titleFont.fontFamily as string) : condensedFont;
  const time = frame / fps;
  const vertical = height > width, landscape = width > height * 1.2;
  const appear = Easing.out(Easing.cubic)(Math.min(1, frame / 6));
  const crack = Easing.out(Easing.quad)(Math.min(1, Math.max(0, (frame - 9) / 4)));
  const slip = Easing.out(Easing.back(2.6))(Math.min(1, Math.max(0, (frame - 10) / 6)));
  const details = Easing.out(Easing.cubic)(Math.min(1, Math.max(0, (frame - 12) / 10)));
  const fall = Easing.in(Easing.quad)(Math.min(1, Math.max(0, (frame - (durationInFrames - 13)) / 13)));
  const head = { fontFamily: font, fontSize: u * (vertical ? 2.8 : 2.4), letterSpacing: "0.01em", color: main } as const;
  const initial = [...(l.props.appName || "K").trim()][0]?.toUpperCase() ?? "K";
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: "6%", right: "6%", top: "6%", display: "flex", justifyContent: "space-between", opacity: appear * (1 - fall) }}>
      <span style={head}>@{(l.props.appName || "studio").replace(/\s+/g, "")}</span>
      <span style={head}>Motion series&gt;&gt;</span>
    </div>
    <div style={{ position: "absolute", left: landscape ? "18%" : "5%", right: landscape ? "18%" : "5%", top: "50%", transform: `translateY(-50%) scale(${0.96 + 0.04 * appear})`, opacity: appear }}>
      <MovableText target="title">
        <ShardTitle text={l.scene.title} time={time} crack={crack} slip={slip} fall={fall} palette={l.props.palette} fontFamily={font} />
      </MovableText>
    </div>
    {/* Pastille d'app coupée par le coin, comme une icône de logiciel posée au bord */}
    <div style={{ position: "absolute", left: -u * 1.2, bottom: -u * 2, width: u * 10, height: u * 10, border: `${u * 0.4}px solid ${main}`, borderRadius: u * 1.6, display: "flex", alignItems: "flex-end", padding: `0 0 ${u * 1.2}px ${u * 2}px`, fontFamily: font, fontSize: u * 7, lineHeight: 1, color: main, opacity: details * (1 - fall), transform: `translateY(${(1 - details) * u * 3}px)` }}>{initial}</div>
    {l.subtitle && <div style={{ position: "absolute", right: "6%", bottom: "6%", maxWidth: "55%", textAlign: "right", opacity: details * (1 - fall) }}>
      <MovableText target="subtitle"><span style={head}>{l.subtitle}</span></MovableText>
    </div>}
    <div style={{ position: "absolute", left: "10%", right: "10%", bottom: vertical ? "16%" : "14%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, opacity: 1 - fall }}>
      {l.kicker}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { bodyFont, condensedFont } from "./fonts";
import { CastTitle, castHorizon } from "./cast-art";
import { MovableText } from "./movable-text";
import { useBodyFont, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Cast : mot condensé posé sur l'horizon, sous-titre vertical à sa gauche, pastille
 * d'app, projection au sol ; pied de page en deux colonnes (marque à gauche, mention à droite).
 * Entrée : le mot monte hors du sol (dépassement léger) ; sortie : il redescend dans le sol.
 */
export function CastLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const [, main, accent] = l.props.palette;
  const time = frame / fps;
  const horizon = castHorizon(width / height);
  const enter = Easing.out(Easing.back(1.2))(Math.min(1, frame / 18));
  const sink = Easing.in(Easing.quad)(Math.min(1, Math.max(0, (frame - (durationInFrames - 12)) / 12)));
  const rise = enter * (1 - sink);
  const details = Easing.out(Easing.cubic)(Math.min(1, Math.max(0, (frame - 8) / 12))) * (1 - sink);
  const word = l.scene.title.toUpperCase();
  // Le mot reste sur une ligne : la taille suit la longueur totale du titre
  const longest = Math.max(2, [...word].length);
  // Mot très haut : limité par la largeur (lettres condensées ≈ 0,46 em) et par la hauteur au-dessus de l'horizon
  const size = Math.min(height * horizon * 0.62, (width * (width > height ? 0.5 : 0.76)) / (longest * 0.46));
  const initial = [...(l.props.appName || "K").trim()][0]?.toUpperCase() ?? "K";
  const url = l.props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const foot = { fontFamily: body, fontSize: u * 1.9, lineHeight: 1.3, color: main } as const;
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: `${(1 - horizon) * 100}%`, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative" }}>
        <MovableText target="title">
          <CastTitle text={word} time={time} rise={rise} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : condensedFont} side={l.subtitle} sideFont={bodyFont} style={{ fontSize: size, color: main }} />
        </MovableText>
        {/* Pastille d'app, posée au sol à gauche du mot */}
        <div style={{ position: "absolute", right: "100%", bottom: size * 0.08, marginRight: size * 0.2, width: u * 7, height: u * 7, borderRadius: u * 1.5, background: accent, color: "#FFFFFF", display: "grid", placeItems: "center", fontFamily: body, fontWeight: 700, fontSize: u * 3.6, boxShadow: `0 ${u * 0.8}px ${u * 2}px rgba(0,0,0,0.25)`, opacity: details, transform: `translateY(${(1 - details) * u * 2}px)` }}>{initial}</div>
      </div>
    </div>
    <div style={{ position: "absolute", left: "6%", right: "6%", bottom: "5%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", opacity: details }}>
      <div style={{ display: "flex", alignItems: "center", gap: u * 1.4 }}>
        <svg width={u * 4} height={u * 4} viewBox="0 0 10 10" aria-hidden><path d="M5 0.6 9.4 9.4H6.6L5 6.2 3.4 9.4H0.6Z" fill={main} /></svg>
        <span style={foot}><b>{l.props.appName}</b><br />{url ?? "Motion poster"}</span>
      </div>
      <span style={{ ...foot, borderLeft: `${u * 0.25}px double ${main}`, paddingLeft: u * 1.2 }}>Motion poster<br />{width > height ? "16:9" : width === height ? "1:1" : "9:16"} · Cast</span>
    </div>
    <div style={{ position: "absolute", left: "10%", right: "10%", top: "8%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, opacity: 1 - sink }}>
      {l.kicker}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextLayoutProps } from "./composition";
import { displayFont, monoFont } from "./fonts";
import { ThermalTitle, thermalScale } from "./thermal-art";
import { MovableText } from "./movable-text";
import { useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Mise en page des scènes de texte de Thermal : en-tête technique en trois colonnes, pastille d'app, mot thermique en
 * perspective dont la coulée descend jusqu'au bas du cadre, sous-titre en deux étiquettes noires décalées (« TEXT / EFFECT »).
 * Entrée : la face apparaît puis la coulée descend (ralenti exponentiel) ; sortie : le mot s'enfonce dans sa coulée.
 */
export function ThermalLayout(l: TextLayoutProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const u = useUnit();
  const brand = useRecipe().brandFonts;
  const titleFont = useTitleFont();
  const { cyan } = thermalScale(l.props.palette);
  const time = frame / fps;
  const vertical = height > width, landscape = width > height * 1.2;
  const face = Easing.out(Easing.cubic)(Math.min(1, frame / 8));
  const pour = Easing.out(Easing.exp)(Math.min(1, Math.max(0, (frame - 3) / 26)));
  const tags = Easing.out(Easing.cubic)(Math.min(1, Math.max(0, (frame - 14) / 10)));
  const sink = Easing.in(Easing.cubic)(Math.min(1, Math.max(0, (frame - (durationInFrames - 12)) / 12)));
  const head = { fontFamily: monoFont, fontSize: u * 1.35, lineHeight: 1.35, letterSpacing: "0.04em", textTransform: "uppercase", color: "#FFFFFF", opacity: 0.8 } as const;
  const tag = { fontFamily: displayFont, fontWeight: 800, fontSize: u * (vertical ? 4.2 : 3.6), letterSpacing: "0.04em", textTransform: "uppercase", color: "#FFFFFF", background: "#000000", padding: `${u * 0.3}px ${u * 1}px`, lineHeight: 1.1 } as const;
  const words = (l.subtitle ?? "").trim().split(/\s+/).filter(Boolean);
  const half = Math.ceil(words.length / 2);
  const tagLines = words.length > 1 ? [words.slice(0, half).join(" "), words.slice(half).join(" ")] : words;
  const initial = [...(l.props.appName || "K").trim()][0]?.toUpperCase() ?? "K";
  const url = l.props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return <AbsoluteFill>
    <div style={{ position: "absolute", left: "5%", right: "5%", top: "5%", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: u * 2, opacity: face * (1 - sink) }}>
      <span style={head}>{l.props.appName}<br />Heat map · 01</span>
      <span style={{ ...head, textAlign: "center", fontWeight: 700, opacity: 1 }}>Thermal graphics<br />{url ?? "Motion poster"}</span>
      <span style={{ ...head, textAlign: "right" }}>Signal ▲<br />Render live</span>
    </div>
    {/* Pastille d'app, comme une icône de logiciel */}
    <div style={{ position: "absolute", left: "50%", top: vertical ? "16%" : "15%", width: u * 7.5, height: u * 7.5, marginLeft: -u * 3.75, borderRadius: u * 1.6, background: `color-mix(in srgb, ${l.props.palette[1]} 30%, #050814)`, border: `${u * 0.35}px solid ${cyan}`, boxShadow: `0 0 ${u * 3}px color-mix(in srgb, ${cyan} 45%, transparent)`, display: "grid", placeItems: "center", fontFamily: displayFont, fontWeight: 800, fontSize: u * 4, color: cyan, opacity: face * (1 - sink), transform: `scale(${0.8 + 0.2 * face})` }}>{initial}</div>
    <div style={{ position: "absolute", left: vertical ? "-4%" : landscape ? "22%" : "4%", right: vertical ? "-4%" : landscape ? "22%" : "4%", top: vertical ? "24%" : landscape ? "18%" : "20%", opacity: face }}>
      <MovableText target="title">
        <ThermalTitle text={l.scene.title} time={time} pour={pour} sink={sink} palette={l.props.palette} fontFamily={brand ? (titleFont.fontFamily as string) : displayFont} />
      </MovableText>
    </div>
    {tagLines.length > 0 && <div style={{ position: "absolute", left: "50%", top: vertical ? "70%" : "72%", transform: `translateX(-50%) translateY(${(1 - tags) * u * 2 + sink * u * 4}px)`, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: u * 0.6, opacity: tags * (1 - sink) }}>
      <MovableText target="subtitle"><div style={{ display: "flex", flexDirection: "column", gap: u * 0.6 }}>
        {tagLines.map((line, i) => <span key={i} style={{ ...tag, alignSelf: "flex-start", marginLeft: i * u * 3 }}>{line}</span>)}
      </div></MovableText>
    </div>}
    <div style={{ position: "absolute", left: "10%", right: "10%", bottom: vertical ? "7%" : "6%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 2, opacity: 1 - sink }}>
      {l.kicker}
      {l.footer}
    </div>
  </AbsoluteFill>;
}

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { popoutTarget, stageColors, stageFocusState, stageFormat } from "../../config/stage-motion";
import type { Scene, ScreenFocus } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import type { TextLayoutProps } from "./composition";
import { MovableText, useTextFade } from "./movable-text";
import { AnimatedTitle } from "./titles";
import { textColorOn, useBodyFont, useUnit } from "./theme";

/**
 * Textes du template Stage, posés par-dessus le plateau 3D (stage3d.tsx).
 * Le texte occupe la zone que la caméra laisse libre : à gauche en paysage et en carré, en haut en portrait.
 * Les scènes de captures montrent l'appareil au centre, avec le titre dans une pastille au-dessus.
 */

export function StageTextLayout(l: TextLayoutProps) {
  const { width, height } = useVideoConfig();
  const u = useUnit();
  const body = useBodyFont();
  const format = stageFormat(width / height);
  const portrait = format === "portrait";
  const { base, glow } = stageColors(l.props.palette, l.props.recipe.stage);
  const color = textColorOn(base);
  const zone = portrait ? width * 0.84 : width * (format === "square" ? 0.5 : 0.42);
  const longest = Math.max(1, ...l.scene.title.split(/\s+/).map((word) => word.length * 0.6));
  const size = Math.min(u * l.titleSize * (portrait ? 0.95 : 1.05), zone / longest);
  const align = portrait ? "center" : "left";
  const subtitleFade = useTextFade("subtitle");
  const frame = useCurrentFrame();
  const subtitleIn = interpolate(frame, [l.subtitleDelay ?? 12, (l.subtitleDelay ?? 12) + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rule = interpolate(frame, [6, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ color, fontFamily: body }}>
      {/* Voile très léger côté texte : lisible même quand un anneau passe derrière */}
      <AbsoluteFill style={{ background: portrait ? `linear-gradient(180deg, ${base}cc 0%, ${base}66 34%, transparent 52%)` : `linear-gradient(90deg, ${base}d9 0%, ${base}80 34%, transparent 58%)`, pointerEvents: "none" }} />
      <div
        style={{
          position: "absolute",
          ...(portrait ? { left: "8%", right: "8%", top: "8%" } : { left: format === "square" ? "6%" : "7%", width: zone, top: 0, bottom: 0, justifyContent: "center" }),
          display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start", textAlign: align, gap: u * (portrait ? 2.6 : 2.4),
        }}
      >
        {l.header}
        {l.kicker}
        {l.rule && !portrait && <div style={{ width: u * 7 * rule, height: u * 0.45, borderRadius: 999, background: glow, boxShadow: `0 0 ${u * 1.6}px ${glow}` }} />}
        {l.title ? l.title(align, size) : <AnimatedTitle text={l.scene.title} size={size} color={color} palette={l.props.palette} energy={l.props.graph.energy} align={align} />}
        {l.subtitle && (
          <MovableText target="subtitle">
            <p style={{ margin: 0, fontSize: u * (portrait ? 3.2 : 2.9), lineHeight: 1.35, maxWidth: portrait ? undefined : zone * 0.92, opacity: 0.78 * subtitleIn * subtitleFade, transform: `translateY(${(1 - subtitleIn) * u * 1.5}px)`, color: l.scene.textColors?.subtitle ?? color }}>{l.subtitle}</p>
          </MovableText>
        )}
        {l.footer}
      </div>
    </AbsoluteFill>
  );
}

/**
 * Scène de captures : l'appareil est au centre ; le titre flotte au-dessus dans une pastille.
 * Avec une mise en avant, chaque cadrage peut avoir son titre (et sa couleur, et sa fin) ; la légende de la découpe
 * se pose sous la plaque sortie de l'écran (même géométrie que stage3d.tsx : popoutTarget).
 */
export function StageScreensTitle({ scene, props, focuses = [] }: { scene: Scene; props: VideoProps; focuses?: ScreenFocus[] }) {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const u = useUnit();
  const body = useBodyFont();
  const format = stageFormat(width / height);
  const { base, glow } = stageColors(props.palette, props.recipe.stage);
  const sceneFade = useTextFade("title");
  const step = focuses.length ? stageFocusState(focuses, durationInFrames, frame) : null;
  const current = step ? focuses[step.index] : undefined;
  const titleOf = (focus?: ScreenFocus) => focus?.title?.trim() || scene.title;
  const text = titleOf(current);
  // La pastille ne rejoue son entrée que si le texte change d'un cadrage à l'autre
  let first = step?.index ?? 0;
  while (first > 0 && titleOf(focuses[first - 1]) === text) first--;
  const since = first > 0 ? Math.round((first * durationInFrames) / focuses.length) : 0;
  const enter = spring({ frame: frame - since - (since ? 0 : 6), fps, config: { damping: 15, stiffness: 120 } });
  const stepEnd = current?.titleEnd !== undefined && current.titleEnd < 1 && step ? step.start + current.titleEnd * step.frames : undefined;
  const stepFade = stepEnd === undefined ? 1 : interpolate(frame, [stepEnd - 8, stepEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const float = Math.sin(frame / fps * 1.6) * u * 0.35;
  const size = u * (format === "portrait" ? 3.6 : 3.1);
  const subtitleIn = interpolate(frame, [16, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Légende de la découpe, sous la plaque
  const ratio = current ? props.screenRatios?.[props.screenUrls.indexOf(current.src)] ?? 9 / 19.5 : 1;
  const card = step && current ? popoutTarget((step.rect.w / Math.max(0.001, step.rect.h)) * ratio, format, width / height) : null;
  const labelIn = step ? interpolate(step.pop, [0.75, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ fontFamily: body, alignItems: "center", pointerEvents: "none" }}>
      {/* En zoom, l'écran agrandi passe sous la pastille : fondu du haut de l'image pour la lisibilité */}
      {step && step.zoom > 0 && <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: format === "portrait" ? "26%" : "22%", opacity: step.zoom, background: `linear-gradient(${base} 30%, transparent)` }} />}
      <div style={{ position: "absolute", top: format === "portrait" ? "14%" : "6%", left: "6%", right: "6%", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 1.6 }}>
        <MovableText target="title">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: size * 0.45, padding: `${size * 0.5}px ${size * 0.95}px`, borderRadius: 999,
            background: "rgb(255 255 255 / 0.94)", color: "#111116", fontWeight: 650, fontSize: size, lineHeight: 1.1, whiteSpace: "nowrap", maxWidth: width * 0.86,
            boxShadow: `0 ${u * 1.2}px ${u * 4}px -${u}px rgb(0 0 0 / 0.55), 0 0 ${u * 3}px -${u * 0.5}px ${glow}`,
            opacity: Math.min(1, enter) * sceneFade * stepFade, transform: `translateY(${(1 - enter) * u * 3 + float}px) scale(${0.9 + 0.1 * enter})`,
          }}>
            <span style={{ width: size * 0.55, height: size * 0.55, flex: "none", borderRadius: "50%", background: glow, boxShadow: `0 0 ${size * 0.5}px ${glow}` }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", color: current?.titleColor ?? scene.textColors?.title ?? "#111116" }}>{text}</span>
          </div>
        </MovableText>
        {scene.subtitle && (
          <MovableText target="subtitle">
            <p style={{ margin: 0, color: textColorOn(base), fontSize: u * 2.4, opacity: 0.75 * subtitleIn, textAlign: "center" }}>{scene.subtitle}</p>
          </MovableText>
        )}
      </div>
      {card && step?.label && labelIn > 0 && (
        <div style={{ position: "absolute", left: card.cx * width, top: (card.cy + card.h / 2) * height + u * 2.6, opacity: labelIn, transform: `translate(-50%, ${(1 - labelIn) * u * 2}px)` }}>
          <span style={{ padding: `${u * 1.2}px ${u * 2.6}px`, borderRadius: 999, background: "rgb(255 255 255 / 0.1)", border: "1px solid rgb(255 255 255 / 0.2)", color: textColorOn(base), fontWeight: 600, fontSize: u * 3, whiteSpace: "nowrap" }}>{step.label}</span>
        </div>
      )}
    </AbsoluteFill>
  );
}

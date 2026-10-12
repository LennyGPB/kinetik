import { MovableText } from "./movable-text";
import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { defaultLogoLayout } from "../../config/recipes";
import { LogoLayoutScene } from "./logo-layouts";
import { PresentationScene } from "./presentation-scenes";
import { ScreensScene } from "./screens";
import { AnimatedTitle, useTitlePaint } from "./titles";
import { isLight, useBeat, textColorOn, useBodyFont, useIsPortrait, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Les 5 types de scènes du SceneGraph (intro, logo, feature, screens, cta).
 * Une scène ne connaît que son contenu : son style vient de la recette (useRecipe) et des briques.
 */

type SceneProps = { scene: Scene; props: VideoProps };

// ───────────── Éléments communs ─────────────

function useSpring(delay = 0, energy: VideoProps["graph"]["energy"] = "balanced") {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: energy === "high" ? { damping: 12, stiffness: 180 } : { damping: 18, stiffness: 110 } });
}

function Center({ children, gap }: { children: ReactNode; gap?: number }) {
  const u = useUnit();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: `0 ${u * 8}px`, gap: gap ?? u * 3 }}>
      {children}
    </AbsoluteFill>
  );
}

function Subtitle({ text, color, delay = 10 }: { text: string; color: string; delay?: number }) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const font = useBodyFont();
  const opacity = interpolate(frame, [delay, delay + 12], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <MovableText target="subtitle"><p style={{ margin: 0, fontFamily: font, fontSize: u * 3.6, color, opacity, transform: `translateY(${(0.8 - opacity) * 20}px)` }}>{text}</p></MovableText>;
}

/** Logo affiché tel quel : contain, jamais recadré ni déformé. */
function LogoTile({ props, size }: { props: VideoProps; size: number }) {
  const font = useTitleFont();
  // Sur fond clair, une tuile blanche disparaît : bordure fine et ombre neutre.
  const light = isLight(props.palette[0]);
  const glow = useRecipe().titleEffect === "glow";
  const withBackground = props.graph.logoBackground !== false;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: withBackground ? "white" : "transparent",
        display: "grid",
        placeItems: "center",
        border: withBackground && light ? "1px solid rgb(0 0 0 / 0.08)" : undefined,
        boxShadow: !withBackground ? "none" : light
          ? `0 ${size * 0.12}px ${size * 0.4}px -${size * 0.12}px rgb(0 0 0 / 0.25)`
          : glow
            ? `0 0 ${size * 0.08}px ${props.palette[1]}, 0 0 ${size * 0.35}px ${props.palette[1]}`
            : `0 ${size * 0.15}px ${size * 0.5}px -${size * 0.1}px ${props.palette[2]}`,
      }}
    >
      {props.logoUrl ? (
        <Img src={props.logoUrl} style={{ width: "72%", height: "72%", objectFit: "contain" }} />
      ) : (
        <span style={{ ...font, fontSize: size * 0.5, color: props.palette[1] }}>{props.appName.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

// ───────────── Scènes ─────────────

function IntroScene({ scene, props }: SceneProps) {
  const portrait = useIsPortrait();
  const u = useUnit();
  const color = textColorOn(props.palette[0]);
  if (scene.presentation === "editorial" || scene.presentation === "split") return <PresentationScene scene={scene} props={props} logo={<LogoTile props={props} size={u * 22} />} />;
  return (
    <Center>
      <AnimatedTitle text={scene.title} size={u * (portrait ? 11 : 10)} color={color} palette={props.palette} energy={props.graph.energy} />
      {scene.subtitle && <Subtitle text={scene.subtitle} color={color} delay={14} />}
    </Center>
  );
}

function LogoScene({ scene, props }: SceneProps) {
  const recipe = useRecipe();
  const u = useUnit();
  const layout = props.graph.logoLayout ?? defaultLogoLayout(recipe);
  if (layout === "signature") return <SignatureLogoScene scene={scene} props={props} />;
  return <LogoLayoutScene layout={layout} scene={scene} props={props} tile={<LogoTile props={props} size={u * (props.graph.logoEmphasis ? 30 : 23)} />} />;
}

function SignatureLogoScene({ scene, props }: SceneProps) {
  const u = useUnit();
  const { width } = useVideoConfig();
  const frame = useCurrentFrame();
  const p = useSpring(0, props.graph.energy);
  const pulse = useBeat().pulse(frame);
  const size = u * (props.graph.logoEmphasis ? 34 : 24);
  const nameP = useSpring(10, props.graph.energy);
  const ring = interpolate(frame, [0, 24], [0.6, 1.8], { extrapolateRight: "clamp" });
  const ringOpacity = interpolate(frame, [0, 6, 24], [0, 0.6, 0], { extrapolateRight: "clamp" });
  const font = useTitleFont();
  const recipe = useRecipe();
  const color = textColorOn(props.palette[0]);
  const paint = useTitlePaint(color, props.palette);
  // "soft" (ex. Apple-like) : apparition douce, sans rotation ni onde
  const soft = true;
  const beat = recipe.beatPulse ? pulse : 0;
  const tileTransform = soft ? `scale(${0.94 + 0.06 * p})` : `scale(${p * (1 + beat * 0.04)}) rotate(${(1 - p) * -18}deg)`;

  return (
    <Center gap={u * 5}>
      <div style={{ position: "relative", opacity: soft ? p : 1, transform: tileTransform }}>
        {!soft && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `${u * 0.5}px solid ${props.palette[2]}`, transform: `scale(${ring})`, opacity: ringOpacity }} />}
        <LogoTile props={props} size={size} />
      </div>
      <MovableText target="title"><div style={{ ...font, fontSize: Math.min(u * 9, (width - u * 16) / Math.max(1, props.appName.length * 0.72)), maxWidth: "100%", overflowWrap: "anywhere", lineHeight: 1.1, opacity: nameP, transform: `translateY(${(1 - nameP) * 30}px)` }}>
        <span style={paint}>{props.appName}</span>
      </div></MovableText>
      {scene.subtitle && <Subtitle text={scene.subtitle} color={color} delay={18} />}
    </Center>
  );
}

function FeatureScene({ scene, props }: SceneProps) {
  const u = useUnit();
  const color = textColorOn(props.palette[0]);
  const bar = useSpring(8, props.graph.energy);
  const solid = useRecipe().accent === "solid";
  const font = useBodyFont();
  if (scene.presentation === "spotlight" || scene.presentation === "card") return <PresentationScene scene={scene} props={props} logo={<LogoTile props={props} size={u * 18} />} />;
  return (
    <Center gap={u * 3.5}>
      <span style={{ fontFamily: font, fontWeight: 600, fontSize: u * 2.6, letterSpacing: "0.2em", textTransform: "uppercase", color: props.palette[2] }}>{props.appName}</span>
      <AnimatedTitle text={scene.title} size={u * 8.5} color={color} palette={props.palette} energy={props.graph.energy} />
      <div style={{ height: u * (solid ? 0.4 : 0.9), width: `${bar * (solid ? 10 : 22)}%`, borderRadius: 999, background: solid ? props.palette[2] : `linear-gradient(90deg, ${props.palette[1]}, ${props.palette[2]})` }} />
      {scene.subtitle && <Subtitle text={scene.subtitle} color={color} delay={16} />}
    </Center>
  );
}

function CtaScene({ scene, props }: SceneProps) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const color = textColorOn(props.palette[0]);
  const button = useSpring(12, props.graph.energy);
  const recipe = useRecipe();
  const font = useBodyFont();
  const solid = recipe.accent === "solid";
  const beat = useBeat();
  const pulse = recipe.beatPulse ? beat.pulse(frame) : 0;
  const host = props.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  // Le site est déjà affiché dans le bouton : on évite le doublon si le sous-titre le répète.
  const subtitle = scene.subtitle && host && scene.subtitle.toLowerCase().includes(host.toLowerCase()) ? undefined : scene.subtitle;
  const accent = props.palette[2];

  if (scene.presentation === "end-card" || scene.presentation === "browser") return <PresentationScene scene={scene} props={props} logo={<LogoTile props={props} size={u * 15} />} />;

  return (
    <Center gap={u * 4}>
      {props.graph.logoEmphasis && <LogoTile props={props} size={u * 16} />}
      <AnimatedTitle text={scene.title} size={u * 9.5} color={color} palette={props.palette} energy={props.graph.energy} />
      {subtitle && <Subtitle text={subtitle} color={color} delay={10} />}
      <div
        style={{
          marginTop: u * 1.5,
          padding: `${u * 2}px ${u * 5}px`,
          borderRadius: 999,
          fontFamily: font,
          fontWeight: 600,
          fontSize: u * 3.4,
          // Texte lisible quelle que soit la couleur d'accent (ex. doré clair du template Luxe)
          color: solid ? textColorOn(accent) : "white",
          // "solid" : bouton plein de la couleur d'accent (ex. bleu Apple), sans halo
          background: solid ? accent : `linear-gradient(120deg, ${props.palette[1]}, ${accent})`,
          boxShadow: solid ? "none" : `0 ${u}px ${u * 4}px -${u}px ${accent}`,
          transform: `scale(${button * (1 + pulse * 0.03)})`,
        }}
      >
        {host ?? props.appName}
      </div>
    </Center>
  );
}

export const SCENES: Record<Scene["kind"], (p: SceneProps) => ReactNode> = {
  intro: IntroScene,
  logo: LogoScene,
  feature: FeatureScene,
  screens: ScreensScene,
  cta: CtaScene,
};

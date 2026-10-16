import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Composition } from "../../config/recipes";
import type { Scene } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { MovableText } from "./movable-text";
import { AnimatedTitle } from "./titles";
import { isLight, textColorOn, useBodyFont, useIsPortrait, useRecipe, useTitleFont, useTitleScale, useUnit } from "./theme";

/**
 * BRIQUES « composition » (recipe.composition) : où se placent le titre, le sous-titre et les éléments d'une scène de texte.
 * Utilisées par intro, feature, cta, stat et quote quand la scène garde la mise en scène du template.
 * Chaque scène fournit ses éléments (surtitre, titre, pied) ; la composition décide de la silhouette.
 */

export type TextLayoutProps = {
  scene: Scene;
  props: VideoProps;
  /** Taille de base du titre en unités (1u = 1 % du plus petit côté) */
  titleSize: number;
  /** Remplace le titre animé (ex. compteur de la scène stat) */
  title?: (align: "center" | "left", size: number) => ReactNode;
  /** Petit texte au-dessus du titre (nom de l'app, guillemet…) */
  kicker?: ReactNode;
  subtitle?: string;
  subtitleDelay?: number;
  /** Filet d'accent sous le titre (centré) ou au-dessus (gauche, affiche) */
  rule?: boolean;
  /** Éléments sous le texte : bouton, logo… */
  footer?: ReactNode;
  /** Élément au-dessus de tout (logo du CTA) */
  header?: ReactNode;
};

export function Subtitle({ text, color, delay = 10, size = 3.6 }: { text: string; color: string; delay?: number; size?: number }) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const font = useBodyFont();
  const opacity = interpolate(frame, [delay, delay + 12], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <MovableText target="subtitle"><p style={{ margin: 0, fontFamily: font, fontSize: u * size, lineHeight: 1.35, color, opacity, transform: `translateY(${(0.8 - opacity) * 20}px)` }}>{text}</p></MovableText>;
}

function AccentRule({ props, width, delay = 8 }: { props: VideoProps; width: number; delay?: number }) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const solid = useRecipe().accent === "solid";
  const p = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 110 } });
  const [, main, accent] = props.palette;
  // Filet plein plus court et plus fin que le dégradé (ex. Apple-like)
  return <div style={{ height: u * (solid ? 0.4 : 0.9), width: `${p * width * (solid ? 0.45 : 1)}%`, borderRadius: 999, background: solid ? accent : `linear-gradient(90deg, ${main}, ${accent})` }} />;
}

/** Taille du titre en affiche : énorme pour un titre court, raisonnable pour un long (il ne doit jamais déborder). */
function posterScale(text: string) {
  return text.length <= 12 ? 1.75 : text.length <= 24 ? 1.4 : text.length <= 40 ? 1.12 : 0.95;
}

/**
 * Largeur du mot le plus long d'un titre, en em (1 = taille de la police), mesurée avec la vraie police.
 * Tant que la police n'est pas chargée (ou hors navigateur) : estimation prudente.
 */
let measureContext: CanvasRenderingContext2D | null | undefined;
function longestWordEm(text: string, font: CSSProperties) {
  const words = text.split(/s+/).filter(Boolean);
  const upper = font.textTransform === "uppercase";
  const spacing = Number.parseFloat(String(font.letterSpacing ?? 0)) || 0;
  if (measureContext === undefined) measureContext = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  const spec = `${font.fontWeight ?? 400} 100px ${font.fontFamily}`;
  const ready = Boolean(measureContext && typeof document !== "undefined" && document.fonts?.check(spec));
  if (measureContext && ready) measureContext.font = spec;
  return Math.max(0, ...words.map((raw) => {
    const word = upper ? raw.toUpperCase() : raw;
    const width = measureContext && ready ? measureContext.measureText(word).width / 100 : word.length * 0.62;
    return width + spacing * word.length;
  }));
}

export function TextLayout(layout: TextLayoutProps) {
  const composition: Composition = useRecipe().composition;
  const Layout = LAYOUTS[composition];
  return <Layout {...layout} />;
}

function titleNode({ scene, props, title }: TextLayoutProps, align: "center" | "left", size: number, color = textColorOn(props.palette[0])) {
  if (title) return title(align, size);
  return <AnimatedTitle text={scene.title} size={size} color={color} palette={props.palette} energy={props.graph.energy} align={align} />;
}

// Symétrique, tout au centre (composition historique)
function CenterLayout(l: TextLayoutProps) {
  const u = useUnit();
  const color = textColorOn(l.props.palette[0]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: `0 ${u * 8}px`, gap: u * 3.5 }}>
      {l.header}
      {l.kicker}
      {titleNode(l, "center", u * l.titleSize)}
      {l.rule && <AccentRule props={l.props} width={22} />}
      {l.subtitle && <Subtitle text={l.subtitle} color={color} delay={l.subtitleDelay} />}
      {l.footer}
    </AbsoluteFill>
  );
}

// Bloc aligné à gauche, filet d'accent au-dessus, beaucoup d'air à droite
function LeftLayout(l: TextLayoutProps) {
  // Le bloc à gauche laisse de l'air à droite : en paysage le titre peut être plus grand qu'au centre
  const portrait = useIsPortrait();
  const u = useUnit();
  const color = textColorOn(l.props.palette[0]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", textAlign: "left", padding: `0 ${u * 11}px` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: u * 3.2, maxWidth: "88%" }}>
        {l.header}
        <AccentRule props={l.props} width={l.rule ? 30 : 14} delay={2} />
        {l.kicker}
        {titleNode(l, "left", u * l.titleSize * (portrait ? 1 : 1.2))}
        {l.subtitle && <div style={{ maxWidth: u * 80 }}><Subtitle text={l.subtitle} color={color} delay={l.subtitleDelay} /></div>}
        {l.footer}
      </div>
    </AbsoluteFill>
  );
}

// Affiche : titre géant calé en haut à gauche, numéro de scène, pied de page séparé par un filet
function PosterLayout(l: TextLayoutProps) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const font = useBodyFont();
  const color = textColorOn(l.props.palette[0]);
  const index = l.props.graph.scenes.findIndex((s) => s.id === l.scene.id);
  const line = interpolate(frame, [4, 22], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const meta = interpolate(frame, [0, 10], [0, 0.7], { extrapolateRight: "clamp" });
  // Titre géant, mais jamais coupé au milieu d'un mot : le plus long doit tenir sur une ligne (marges latérales réduites)
  const { width } = useVideoConfig();
  const titleFont = useTitleFont();
  const titleScale = useTitleScale();
  const padX = u * 5;
  const wordEm = longestWordEm(l.scene.title, titleFont) * (l.title ? 1 : titleScale);
  const titleSize = Math.min(u * l.titleSize * posterScale(l.scene.title), wordEm ? (width - padX * 2 - u) / wordEm : Infinity);
  return (
    <AbsoluteFill style={{ padding: `${u * 7}px ${padX}px`, display: "flex", flexDirection: "column", textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontWeight: 600, fontSize: u * 2.4, letterSpacing: "0.14em", textTransform: "uppercase", color, opacity: meta }}>
        <span>{l.props.appName}</span>
        <span>{String(Math.max(0, index) + 1).padStart(2, "0")}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: u * 3, minHeight: 0 }}>
        {l.header}
        {l.kicker}
        {titleNode(l, "left", titleSize)}
      </div>
      <div style={{ height: Math.max(2, u * 0.25), width: `${line}%`, background: color, opacity: 0.85 }} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: u * 4, paddingTop: u * 3, minHeight: u * 6 }}>
        <div style={{ maxWidth: u * 75 }}>{l.subtitle && <Subtitle text={l.subtitle} color={color} delay={l.subtitleDelay} size={3.2} />}</div>
        {l.footer}
      </div>
    </AbsoluteFill>
  );
}

// Verre : le bloc centré est posé sur une carte de verre dépoli, qui arrive en se défloutant
function GlassLayout(l: TextLayoutProps) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = textColorOn(l.props.palette[0]);
  const light = isLight(l.props.palette[0]);
  const p = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const accent = l.props.palette[2];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: `0 ${u * 7}px` }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: u * 3,
          maxWidth: "92%",
          padding: `${u * 6}px ${u * 7}px`,
          borderRadius: u * 4,
          backdropFilter: `blur(${u * 2.4}px) saturate(1.6) brightness(${light ? 1.03 : 1.08})`,
          WebkitBackdropFilter: `blur(${u * 2.4}px) saturate(1.6) brightness(${light ? 1.03 : 1.08})`,
          background: light
            ? "linear-gradient(135deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.25))"
            : "linear-gradient(135deg, rgb(255 255 255 / 0.16), rgb(255 255 255 / 0.04))",
          boxShadow: [
            `inset 0 0 0 ${Math.max(1, u * 0.12)}px rgb(255 255 255 / ${light ? 0.7 : 0.28})`,
            `inset 0 ${u * 0.5}px ${u * 1.5}px rgb(255 255 255 / 0.18)`,
            `inset 0 -${u * 1.2}px ${u * 3}px color-mix(in oklab, ${accent}, transparent 75%)`,
            `0 ${u * 3}px ${u * 8}px -${u * 2}px rgb(0 0 0 / ${light ? 0.12 : 0.4})`,
          ].join(", "),
          opacity: Math.min(1, p * 1.4),
          transform: `translateY(${(1 - p) * u * 4}px) scale(${0.96 + p * 0.04})`,
          filter: p < 0.98 ? `blur(${(1 - p) * u * 0.8}px)` : undefined,
        }}
      >
        {l.header}
        {l.kicker}
        {titleNode(l, "center", u * l.titleSize * 0.9)}
        {l.rule && <AccentRule props={l.props} width={30} />}
        {l.subtitle && <Subtitle text={l.subtitle} color={color} delay={l.subtitleDelay} />}
        {l.footer}
      </div>
    </AbsoluteFill>
  );
}

// Relief 3D : le bloc arrive incliné en perspective et se pose ; le titre est extrudé (épaisseur faite d'ombres empilées)
function ExtrudeLayout(l: TextLayoutProps) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = textColorOn(l.props.palette[0]);
  const p = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  // Lettrage 3D : face de la couleur de marque sur fond clair (blanche sur fond foncé), tranche dans la même teinte, plus sombre
  const light = isLight(l.props.palette[0]);
  const side = l.props.palette[1];
  const face = light ? side : "#ffffff";
  const depth = 9;
  const extrusion = Array.from({ length: depth }, (_, i) => {
    const d = (i + 1) * u * 0.13;
    return `${d}px ${d}px 0 color-mix(in oklab, ${side}, black ${(light ? 30 : 8) + i * 4}%)`;
  }).join(", ");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: `0 ${u * 9}px`, perspective: u * 160 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: u * 3.5,
          transformStyle: "preserve-3d",
          transform: `rotateX(${8 + (1 - p) * 26}deg) rotateY(${-9 - (1 - p) * 24}deg) translateZ(${(1 - p) * -u * 20}px)`,
        }}
      >
        {l.header}
        {l.kicker}
        <div style={{ textShadow: `${extrusion}, ${u * 1.6}px ${u * 2.2}px ${u * 2.5}px rgb(0 0 0 / 0.25)` }}>{titleNode(l, "center", u * l.titleSize * 1.05, face)}</div>
        {l.rule && <AccentRule props={l.props} width={24} />}
        {l.subtitle && <Subtitle text={l.subtitle} color={color} delay={l.subtitleDelay} />}
        {l.footer}
      </div>
    </AbsoluteFill>
  );
}

const LAYOUTS: Record<Composition, (p: TextLayoutProps) => ReactNode> = { center: CenterLayout, left: LeftLayout, poster: PosterLayout, glass: GlassLayout, extrude: ExtrudeLayout };

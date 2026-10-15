import { PreviewTarget } from "./movable-text";
import { MovableText } from "./movable-text";
import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { defaultLogoLayout } from "../../config/recipes";
import { LogoLayoutScene } from "./logo-layouts";
import { PresentationScene } from "./presentation-scenes";
import { ScreensScene } from "./screens";
import { Subtitle, TextLayout } from "./composition";
import { formatStat, parseStat } from "./stat";
import { AnimatedTitle, useTitlePaint } from "./titles";
import { isLight, useBeat, textColorOn, useBodyFont, useIsPortrait, useRecipe, useTitleFont, useUnit } from "./theme";

/**
 * Les 7 types de scènes du SceneGraph (intro, logo, feature, screens, cta, stat, quote).
 * Les scènes de texte passent par <TextLayout> : leur silhouette vient de la composition de la recette (composition.tsx).
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

/** Logo affiché tel quel : contain, jamais recadré ni déformé. */
function LogoTile({ props, size }: { props: VideoProps; size: number }) {
  const font = useTitleFont();
  // Sur fond clair, une tuile blanche disparaît : bordure fine et ombre neutre.
  const light = isLight(props.palette[0]);
  const glow = useRecipe().titleEffect === "glow";
  const withBackground = props.graph.logoBackground === true;
  return (
    <PreviewTarget target="logo"><div
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
    </div></PreviewTarget>
  );
}

// ───────────── Scènes ─────────────

function IntroScene({ scene, props }: SceneProps) {
  const portrait = useIsPortrait();
  const u = useUnit();
  if (scene.presentation === "editorial" || scene.presentation === "split") return <PresentationScene scene={scene} props={props} logo={<LogoTile props={props} size={u * 22} />} />;
  return <TextLayout scene={scene} props={props} titleSize={portrait ? 11 : 10} subtitle={scene.subtitle} subtitleDelay={14} />;
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
  const ring = interpolate(frame, [0, 24], [0.6, 1.8], { extrapolateRight: "clamp" });
  const ringOpacity = interpolate(frame, [0, 6, 24], [0, 0.6, 0], { extrapolateRight: "clamp" });
  const recipe = useRecipe();
  const color = textColorOn(props.palette[0]);
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
      <AnimatedTitle text={props.appName} size={Math.min(u * 9, (width - u * 16) / Math.max(1, props.appName.length * 0.72))} color={color} palette={props.palette} energy={props.graph.energy} delay={10} />
      {scene.subtitle && <Subtitle text={scene.subtitle} color={color} delay={18} />}
    </Center>
  );
}

function FeatureScene({ scene, props }: SceneProps) {
  const u = useUnit();
  const font = useBodyFont();
  // En affiche, le nom de l'app est déjà dans l'en-tête
  const poster = useRecipe().composition === "poster";
  if (scene.presentation === "spotlight" || scene.presentation === "card") return <PresentationScene scene={scene} props={props} logo={<LogoTile props={props} size={u * 18} />} />;
  // Surtitre : nom de l'app par défaut, texte choisi dans l'éditeur, ou masqué ("")
  const text = scene.kicker ?? props.appName;
  const kicker = text ? <span style={{ fontFamily: font, fontWeight: 600, fontSize: u * 2.6, letterSpacing: "0.2em", textTransform: "uppercase", color: scene.textColors?.kicker ?? props.palette[2] }}>{text}</span> : undefined;
  return <TextLayout scene={scene} props={props} titleSize={8.5} kicker={poster ? undefined : kicker} rule subtitle={scene.subtitle} subtitleDelay={16} />;
}

function CtaScene({ scene, props }: SceneProps) {
  const u = useUnit();
  const frame = useCurrentFrame();
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

  const button_ = (
    <div
      style={{
        marginTop: recipe.composition === "poster" ? 0 : u * 1.5,
        padding: `${u * 2}px ${u * 5}px`,
        borderRadius: 999,
        fontFamily: font,
        fontWeight: 600,
        fontSize: u * 3.4,
        whiteSpace: "nowrap",
        // Texte lisible quelle que soit la couleur d'accent (ex. doré clair du template Luxe)
        color: solid ? textColorOn(accent) : "white",
        // "solid" : bouton plein de la couleur d'accent (ex. bleu Apple), sans halo
        background: solid ? accent : `linear-gradient(120deg, ${props.palette[1]}, ${accent})`,
        boxShadow: solid ? "none" : `0 ${u}px ${u * 4}px -${u}px ${accent}`,
        transform: `scale(${button * (1 + pulse * 0.03)})`,
        transformOrigin: recipe.composition === "center" ? "50% 50%" : "0% 50%",
      }}
    >
      {host ?? props.appName}
    </div>
  );
  return (
    <TextLayout
      scene={scene}
      props={props}
      titleSize={9.5}
      header={props.graph.logoEmphasis ? <LogoTile props={props} size={u * 16} /> : undefined}
      subtitle={subtitle}
      subtitleDelay={10}
      footer={button_}
    />
  );
}

// ───────────── Chiffre clé (stat) ─────────────

function StatScene({ scene, props }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const font = useTitleFont();
  const color = textColorOn(props.palette[0]);
  const paint = useTitlePaint(color, props.palette);
  const stat = parseStat(scene.title);
  // Le compteur monte vite puis ralentit, et se fige un peu avant la fin de la scène
  const countFrames = Math.min(fps * (props.graph.energy === "high" ? 0.8 : 1.3), scene.duration * fps * 0.6);
  const p = interpolate(frame, [4, 4 + countFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const appear = spring({ frame, fps, config: { damping: 16, stiffness: 140 } });
  const accent = props.palette[2];
  const short = scene.title.length <= 10;
  return (
    <TextLayout
      scene={scene}
      props={props}
      titleSize={short ? 16 : scene.title.length <= 18 ? 12 : 8.5}
      rule
      subtitle={scene.subtitle}
      subtitleDelay={Math.round(countFrames * 0.6)}
      title={(align, size) => (
        <MovableText target="title">
          <div style={{ ...font, fontSize: size, lineHeight: 1, textAlign: align, fontVariantNumeric: "tabular-nums", opacity: appear, transform: `translateY(${(1 - appear) * size * 0.25}px)`, overflowWrap: "anywhere" }}>
            {stat ? (
              <>
                <span style={paint}>{stat.before}</span>
                <span style={{ ...paint, color: accent, textShadow: paint.textShadow }}>{formatStat(stat.value * p, stat)}</span>
                <span style={paint}>{stat.after}</span>
              </>
            ) : (
              <span style={paint}>{scene.title}</span>
            )}
          </div>
        </MovableText>
      )}
    />
  );
}

// ───────────── Témoignage (quote) ─────────────

function QuoteScene({ scene, props }: SceneProps) {
  const u = useUnit();
  const frame = useCurrentFrame();
  const font = useTitleFont();
  const accent = props.palette[2];
  const mark = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const kicker = <span aria-hidden style={{ ...font, fontSize: u * 16, lineHeight: 0.6, height: u * 7, color: accent, opacity: mark, transform: `scale(${0.7 + mark * 0.3})` }}>“</span>;
  const length = scene.title.length;
  return (
    <TextLayout
      scene={scene}
      props={props}
      titleSize={length > 60 ? 5.2 : length > 35 ? 6.4 : 7.8}
      kicker={kicker}
      subtitle={scene.subtitle}
      subtitleDelay={18}
    />
  );
}

export const SCENES: Record<Scene["kind"], (p: SceneProps) => ReactNode> = {
  intro: IntroScene,
  logo: LogoScene,
  feature: FeatureScene,
  screens: ScreensScene,
  cta: CtaScene,
  stat: StatScene,
  quote: QuoteScene,
};

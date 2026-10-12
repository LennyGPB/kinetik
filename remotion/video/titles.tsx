import { MovableText } from "./movable-text";
import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TitleAnimation, TitleEffect } from "../../config/recipes";
import type { VideoProps } from "../props";
import { isLight, useRecipe, useTitleFont, useTitleScale } from "./theme";

/**
 * BRIQUES « titres » : animation d'apparition (recipe.titleAnimation) et habillage (recipe.titleEffect).
 * Toutes les scènes affichent leurs titres via <AnimatedTitle>, jamais en texte brut.
 */

type Palette = VideoProps["palette"];
type Energy = VideoProps["graph"]["energy"];

type TitleProps = {
  text: string;
  /** Taille de base en px (ajustée par la police de la recette) */
  size: number;
  color: string;
  palette: Palette;
  energy: Energy;
  align?: "center" | "left";
  /** Décalage de l'animation, en images */
  delay?: number;
};

/** Contexte passé à chaque animation (calculé une fois dans AnimatedTitle). */
type AnimationContext = {
  text: string;
  size: number;
  color: string;
  /** Style à appliquer sur chaque bout de texte affiché (couleur, halo, chrome…) */
  paint: CSSProperties;
  accent: string;
  main: string;
  light: boolean;
  frame: number;
  fps: number;
  energy: Energy;
  justify: "center" | "flex-start";
};

export function AnimatedTitle({ text, size: baseSize, color, palette, energy, align = "center", delay = 0 }: TitleProps) {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const recipe = useRecipe();
  const font = useTitleFont();
  const size = baseSize * useTitleScale();
  const [bg, main, accent] = palette;
  const ctx: AnimationContext = {
    text,
    size,
    color,
    paint: paintFor(recipe.titleEffect, color, main, accent),
    accent,
    main,
    light: isLight(bg),
    frame,
    fps,
    energy,
    justify: align === "left" ? "flex-start" : "center",
  };

  return <MovableText target="title"><div style={{ ...font, fontSize: size, lineHeight: 1, color, textAlign: align }}>{ANIMATIONS[recipe.titleAnimation](ctx)}</div></MovableText>;
}

// ───────────── Habillages (titleEffect) ─────────────

function paintFor(effect: TitleEffect, color: string, main: string, accent: string): CSSProperties {
  switch (effect) {
    case "none":
      return { color };
    // Tube néon : cœur clair, halo de la couleur principale
    case "glow":
      return {
        color,
        textShadow: `0 0 0.03em ${main}, 0 0 0.12em ${main}, 0 0 0.35em color-mix(in oklab, ${main}, transparent 30%), 0 0 0.8em color-mix(in oklab, ${accent}, transparent 55%)`,
      };
    // Métal brossé aux couleurs de la marque (lisible sur fond clair comme foncé)
    case "chrome":
      return {
        color: "transparent",
        backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${main}, white 55%) 0%, ${main} 46%, color-mix(in oklab, ${main}, black 35%) 52%, ${accent} 78%, color-mix(in oklab, ${accent}, white 50%) 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
      };
  }
}

// ───────────── Animations (titleAnimation) ─────────────

const words = (text: string) => text.split(" ").filter(Boolean);

/** Ligne de mots qui revient à la ligne proprement (utilisée par la plupart des animations). */
function Line({ ctx, children }: { ctx: AnimationContext; children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", justifyContent: ctx.justify, columnGap: ctx.size * 0.25, rowGap: ctx.size * 0.05 }}>{children}</div>;
}

const ANIMATIONS: Record<TitleAnimation, (ctx: AnimationContext) => ReactNode> = {
  // Chaque mot monte depuis un masque
  words: (ctx) => (
    <Line ctx={ctx}>
      {words(ctx.text).map((word, i) => {
        const p = spring({ frame: ctx.frame - i * 3, fps: ctx.fps, config: ctx.energy === "high" ? { damping: 13, stiffness: 200 } : { damping: 20, stiffness: 120 } });
        return (
          // Le masque déborde vers le haut pour ne pas couper les accents des capitales (É, Ê…)
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingTop: ctx.size * 0.18, marginTop: -ctx.size * 0.18, paddingBottom: ctx.size * 0.08 }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%)`, ...ctx.paint }}>{word}</span>
          </span>
        );
      })}
    </Line>
  ),

  // Lettre par lettre, avec un petit rebond
  letters: (ctx) => {
    let index = 0;
    return (
      <Line ctx={ctx}>
        {words(ctx.text).map((word, w) => (
          <span key={w} style={{ display: "inline-flex", whiteSpace: "nowrap" }}>
            {[...word].map((char) => {
              const p = spring({ frame: ctx.frame - index++ * 1.4, fps: ctx.fps, config: ctx.energy === "high" ? { damping: 10, stiffness: 190 } : { damping: 13, stiffness: 150 } });
              return (
                <span
                  key={index}
                  style={{
                    display: "inline-block",
                    opacity: Math.min(1, p * 2),
                    transform: `translateY(${(1 - p) * 0.55}em) scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -14}deg)`,
                    ...ctx.paint,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </span>
        ))}
      </Line>
    );
  },

  // Fondu + flou qui se dissipe (keynote, luxe)
  fade: (ctx) => {
    const p = interpolate(ctx.frame, [0, ctx.energy === "high" ? 14 : 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    return (
      <div style={{ opacity: p, filter: p < 1 ? `blur(${(1 - p) * ctx.size * 0.12}px)` : undefined, transform: `translateY(${(1 - p) * ctx.size * 0.22}px)` }}>
        <Line ctx={ctx}>
          {words(ctx.text).map((word, i) => (
            <span key={i} style={ctx.paint}>
              {word}
            </span>
          ))}
        </Line>
      </div>
    );
  },

  // Un bloc de couleur s'étire puis se retire et dévoile le texte (éditorial, brutalist)
  mask: (ctx) => {
    const duration = ctx.energy === "high" ? 14 : 20;
    const q = interpolate(ctx.frame, [0, duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const ease = Easing.inOut(Easing.cubic);
    const covering = q < 0.5;
    const scale = covering ? ease(q * 2) : 1 - ease((q - 0.5) * 2);
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <div style={{ opacity: covering ? 0 : 1, transform: `translateX(${covering ? 0 : (1 - q) * -0.08}em)` }}>
          <Line ctx={ctx}>
            {words(ctx.text).map((word, i) => (
              <span key={i} style={ctx.paint}>
                {word}
              </span>
            ))}
          </Line>
        </div>
        <div style={{ position: "absolute", left: "-0.06em", right: "-0.06em", top: "0.04em", bottom: "0.02em", background: ctx.accent, transformOrigin: covering ? "left" : "right", transform: `scaleX(${scale})` }} />
      </div>
    );
  },

  // Séparation RGB qui se stabilise, puis un sursaut toutes les 2 secondes
  glitch: (ctx) => {
    const settle = interpolate(ctx.frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const burst = ctx.frame > 12 && ctx.frame % 60 < 3;
    const shake = burst ? 1 : 1 - settle;
    const offset = (seed: string) => (random(`${seed}-${ctx.frame}`) - 0.5) * 0.16 * shake;
    const slice = () => {
      const top = Math.round(random(`slice-${ctx.frame}`) * 60);
      return shake > 0.05 ? `inset(${top}% 0 ${Math.max(0, 70 - top)}% 0)` : undefined;
    };
    const layer = (style: CSSProperties) => (
      <Line ctx={ctx}>
        {words(ctx.text).map((word, i) => (
          <span key={i} style={style}>
            {word}
          </span>
        ))}
      </Line>
    );
    const blend = ctx.light ? "multiply" : "screen";
    return (
      <div style={{ position: "relative", display: "inline-block", opacity: ctx.frame < 0 ? 0 : random(`flash-${ctx.frame}`) < 0.25 * (1 - settle) ? 0.3 : 1 }}>
        <div style={{ position: "absolute", inset: 0, color: ctx.main, mixBlendMode: blend, transform: `translateX(${0.04 * shake + offset("r")}em)`, clipPath: slice() }}>{layer({})}</div>
        <div style={{ position: "absolute", inset: 0, color: ctx.accent, mixBlendMode: blend, transform: `translateX(${-0.04 * shake + offset("b")}em)` }}>{layer({})}</div>
        <div style={{ position: "relative", transform: `translateX(${offset("base") * 0.5}em)` }}>{layer(ctx.paint)}</div>
      </div>
    );
  },

  // Machine à écrire avec curseur bloc (terminal). Le texte final est déjà en place : aucune mise en page qui saute.
  typewriter: (ctx) => {
    const chars = [...ctx.text];
    const speed = ctx.energy === "high" ? 1.3 : 0.9;
    const shown = Math.max(0, Math.min(chars.length, Math.floor((ctx.frame - 2) * speed)));
    const typing = shown < chars.length;
    const cursorOn = typing || Math.floor(ctx.frame / 15) % 2 === 0;
    return (
      <div>
        <span style={ctx.paint}>{chars.slice(0, shown).join("")}</span>
        <span style={{ display: "inline-block", width: 0, position: "relative" }}>
          <span style={{ position: "absolute", left: "0.06em", top: "-0.78em", width: "0.55em", height: "0.92em", background: ctx.accent, opacity: cursorOn ? 1 : 0, boxShadow: `0 0 0.3em ${ctx.accent}` }} />
        </span>
        <span style={{ opacity: 0 }}>{chars.slice(shown).join("")}</span>
      </div>
    );
  },

  // Enseigne néon : chaque lettre s'allume en grésillant, puis un léger grésillement de temps en temps
  flicker: (ctx) => {
    let index = 0;
    const spread = ctx.energy === "high" ? 10 : 16;
    return (
      <Line ctx={ctx}>
        {words(ctx.text).map((word, w) => (
          <span key={w} style={{ display: "inline-flex", whiteSpace: "nowrap" }}>
            {[...word].map((char) => {
              const i = index++;
              const local = ctx.frame - (2 + random(`flicker-${i}`) * spread);
              // allumé · éteint · allumé · à moitié · allumé
              const ignition = local < 0 ? 0 : local < 2 ? 1 : local < 4 ? 0 : local < 5 ? 1 : local < 6 ? 0.5 : 1;
              const hum = ctx.frame % 90 === Math.floor(random(`hum-${i}`) * 90) ? 0.4 : 1;
              const lit = ignition * hum;
              return (
                <span key={i} style={lit > 0.6 ? { ...ctx.paint, opacity: lit } : { color: ctx.color, opacity: 0.1 + lit * 0.4 }}>
                  {char}
                </span>
              );
            })}
          </span>
        ))}
      </Line>
    );
  },
};

/** Style de texte (couleur + habillage) pour les textes animés hors <AnimatedTitle> (ex. nom de l'app sur la scène logo). */
export function useTitlePaint(color: string, palette: Palette): CSSProperties {
  return paintFor(useRecipe().titleEffect, color, palette[1], palette[2]);
}

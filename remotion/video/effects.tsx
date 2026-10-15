import type { ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { Effect } from "../../config/recipes";
import type { VideoProps } from "../props";
import { Cube } from "./cube3d";
import { monoFont } from "./fonts";
import { isLight } from "./theme";

/**
 * BRIQUES « effets » (recipe.effects) : calques plein écran superposés à la vidéo.
 * Chaque effet déclare son calque : "under" = entre le fond et les scènes, "over" = par-dessus tout.
 */

type EffectContext = { frame: number; fps: number; width: number; height: number; palette: VideoProps["palette"]; light: boolean };

type EffectBrick = { layer: "under" | "over"; render: (c: EffectContext) => ReactNode };

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const EFFECTS: Record<Effect, EffectBrick> = {
  // Bords légèrement assombris
  vignette: {
    layer: "under",
    render: ({ light }) => <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 10%, transparent 55%, rgb(0 0 0 / ${light ? 0.08 : 0.35}))` }} />,
  },

  // Grain de pellicule : la texture saute à chaque image (12 positions, déterministe)
  grain: {
    layer: "over",
    render: ({ frame, light }) => {
      const step = Math.floor(frame / 2) % 12;
      return (
        <AbsoluteFill
          style={{
            backgroundImage: NOISE,
            backgroundSize: "240px 240px",
            backgroundPosition: `${Math.round(random(`grain-x-${step}`) * 240)}px ${Math.round(random(`grain-y-${step}`) * 240)}px`,
            opacity: light ? 0.1 : 0.14,
            mixBlendMode: "overlay",
          }}
        />
      );
    },
  },

  // Fuite de lumière : une lueur chaude traverse l'image en diagonale toutes les ~6 secondes
  light: {
    layer: "over",
    render: ({ frame, fps, width, height, palette, light }) => {
      const cycle = 6 * fps;
      const p = (frame % cycle) / cycle;
      const size = Math.max(width, height) * 0.9;
      const x = -size + p * (width + size * 2);
      const y = height * 0.15 + p * height * 0.3;
      return (
        <div
          style={{
            position: "absolute",
            left: x - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            background: `radial-gradient(closest-side, color-mix(in oklab, ${palette[2]}, white 40%), color-mix(in oklab, ${palette[2]}, transparent 70%) 45%, transparent)`,
            opacity: light ? 0.2 : 0.24,
            mixBlendMode: light ? "soft-light" : "screen",
          }}
        />
      );
    },
  },

  // Lignes d'écran cathodique + léger scintillement
  scanlines: {
    layer: "over",
    render: ({ frame }) => (
      <AbsoluteFill
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgb(255 255 255 / 0.05) 0 2px, transparent 2px 5px)",
          opacity: 0.8 + 0.2 * Math.sin(frame * 1.7),
          mixBlendMode: "overlay",
        }}
      />
    ),
  },

  // Cinéma : bandes noires qui se referment au début (format 2.39 en paysage, bandes fines en vertical et en carré)
  letterbox: {
    layer: "over",
    render: ({ frame, fps, width, height }) => {
      const target = width > height ? Math.min(height * 0.12, (height - width / 2.39) / 2) : height * 0.055;
      const bar = target * interpolate(frame, [0, fps * 0.7], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      return (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bar, background: "#000" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bar, background: "#000" }} />
        </>
      );
    },
  },

  // Viseur de caméra : coins, point REC qui clignote chaque seconde, timecode qui défile
  viewfinder: {
    layer: "over",
    render: ({ frame, fps, width, height, light }) => {
      const min = Math.min(width, height);
      const inset = min * 0.045;
      const arm = min * 0.06;
      const stroke = Math.max(2, min * 0.004);
      const color = light ? "rgb(0 0 0 / 0.7)" : "rgb(255 255 255 / 0.85)";
      const corner = (top: boolean, left: boolean) => ({
        position: "absolute" as const,
        [top ? "top" : "bottom"]: inset,
        [left ? "left" : "right"]: inset,
        width: arm,
        height: arm,
        [top ? "borderTop" : "borderBottom"]: `${stroke}px solid ${color}`,
        [left ? "borderLeft" : "borderRight"]: `${stroke}px solid ${color}`,
      });
      const seconds = Math.floor(frame / fps);
      const timecode = `00:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}:${String(frame % fps).padStart(2, "0")}`;
      const text = { position: "absolute" as const, fontFamily: monoFont, fontSize: min * 0.024, color, letterSpacing: "0.08em" };
      return (
        <>
          {[true, false].flatMap((top) => [true, false].map((left) => <div key={`${top}-${left}`} style={corner(top, left)} />))}
          <div style={{ ...text, top: inset + arm * 0.25, left: inset + arm * 1.3, display: "flex", alignItems: "center", gap: min * 0.012 }}>
            <span style={{ width: min * 0.018, height: min * 0.018, borderRadius: "50%", background: "#ff3b30", opacity: frame % fps < fps * 0.6 ? 1 : 0.15 }} />
            REC
          </div>
          <div style={{ ...text, bottom: inset + arm * 0.25, right: inset + arm * 1.3 }}>{timecode}</div>
        </>
      );
    },
  },

  // Pellicule ancienne : scintillement de la lumière, poussières et rayures qui changent à chaque image
  film: {
    layer: "over",
    render: ({ frame, width, height, light }) => {
      const min = Math.min(width, height);
      const flicker = (random(`flicker-${frame}`) - 0.5) * 0.06;
      const ink = light ? "rgb(40 30 20 / 0.55)" : "rgb(255 250 235 / 0.6)";
      const specks = Array.from({ length: 6 }, (_, i) => ({
        x: random(`dust-x-${frame}-${i}`) * width,
        y: random(`dust-y-${frame}-${i}`) * height,
        s: min * (0.002 + random(`dust-s-${frame}-${i}`) * 0.005),
        show: random(`dust-on-${frame}-${i}`) > 0.55,
      }));
      // Une rayure verticale vit ~1 s puis saute ailleurs
      const scratchSeed = Math.floor(frame / 30);
      const scratch = random(`scratch-on-${scratchSeed}`) > 0.4;
      const sx = random(`scratch-x-${scratchSeed}`) * width + Math.sin(frame * 0.7) * min * 0.004;
      return (
        <>
          <AbsoluteFill style={{ background: flicker > 0 ? "white" : "black", opacity: Math.abs(flicker), mixBlendMode: "overlay" }} />
          <AbsoluteFill style={{ background: "radial-gradient(130% 100% at 50% 50%, transparent 60%, rgb(60 40 10 / 0.28))" }} />
          {specks.filter((d) => d.show).map((d, i) => (
            <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: d.s, height: d.s * (i % 2 ? 1 : 2.4), borderRadius: "50%", background: ink, transform: `rotate(${i * 47}deg)` }} />
          ))}
          {scratch && <div style={{ position: "absolute", left: sx, top: 0, bottom: 0, width: Math.max(1, min * 0.0012), background: ink, opacity: 0.5 }} />}
        </>
      );
    },
  },

  // Rayons de lumière : éventail de faisceaux depuis le coin haut gauche, qui tourne lentement
  rays: {
    layer: "over",
    render: ({ frame, fps, width, height, palette, light }) => {
      const angle = -18 + Math.sin((frame / fps) * 0.25) * 6;
      const glow = `color-mix(in oklab, ${palette[2]}, white 55%)`;
      return (
        <AbsoluteFill
          style={{
            background: `repeating-conic-gradient(from ${angle}deg at -8% -12%, ${glow} 0deg 2.2deg, transparent 2.2deg 7deg)`,
            maskImage: `radial-gradient(${Math.max(width, height) * 1.1}px at 0% 0%, black, transparent 75%)`,
            WebkitMaskImage: `radial-gradient(${Math.max(width, height) * 1.1}px at 0% 0%, black, transparent 75%)`,
            opacity: light ? 0.22 : 0.16,
            mixBlendMode: light ? "soft-light" : "screen",
          }}
        />
      );
    },
  },

  // Verre liquide : trois lentilles de verre dépoli qui se déforment en continu et dérivent sur de longues boucles.
  // Elles sortent en partie du cadre puis reviennent, et passent régulièrement sur les textes (flou léger, le temps d'un passage).
  liquid: {
    layer: "over",
    render: ({ frame, fps, width, height, palette }) => {
      const min = Math.min(width, height);
      const t = frame / fps;
      const px = min * 0.0015;
      const accent = palette[2];
      return LIQUID_LENSES.map((lens, i) => {
        const size = min * lens.size;
        const x = width * (0.5 + lens.reachX * Math.sin((t / lens.period) * Math.PI * 2 + lens.phase)) - size / 2;
        const y = height * (0.5 + lens.reachY * Math.sin((t / (lens.period * 1.37)) * Math.PI * 2 + lens.phase * 2)) - size / 2;
        // Forme liquide : les 8 rayons de border-radius ondulent chacun à son rythme
        const r = (k: number) => (50 + 14 * Math.sin(t * (0.7 + k * 0.13) + i * 2 + k)).toFixed(1);
        const radius = `${r(0)}% ${r(1)}% ${r(2)}% ${r(3)}% / ${r(4)}% ${r(5)}% ${r(6)}% ${r(7)}%`;
        const tilt = Math.sin(t * 0.3 + i) * 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size * lens.ratio,
              borderRadius: radius,
              transform: `rotate(${tilt}deg)`,
              backdropFilter: `blur(${min * 0.006}px) saturate(1.25) brightness(1.05)`,
              WebkitBackdropFilter: `blur(${min * 0.006}px) saturate(1.25) brightness(1.05)`,
              background: "radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.16), rgb(255 255 255 / 0.03) 45%, transparent 75%)",
              boxShadow: [
                `inset 0 0 0 ${px}px rgb(255 255 255 / 0.5)`,
                `inset ${px * 4}px ${px * 4}px ${px * 10}px rgb(255 255 255 / 0.14)`,
                `inset -${px * 5}px -${px * 5}px ${px * 12}px color-mix(in oklab, ${accent}, transparent 72%)`,
                `0 ${px * 10}px ${px * 30}px -${px * 12}px rgb(0 0 0 / 0.2)`,
              ].join(", "),
              overflow: "hidden",
            }}
          >
            {/* Reflet spéculaire en haut à gauche */}
            <div style={{ position: "absolute", left: "16%", top: "10%", width: "34%", height: "18%", borderRadius: "50%", background: "radial-gradient(closest-side, rgb(255 255 255 / 0.55), transparent)", transform: "rotate(-24deg)" }} />
          </div>
        );
      });
    },
  },

  // Profondeur 3D : deux gros cubes au premier plan, flous comme hors de la mise au point, qui traversent le cadre
  // sur de longues boucles en tournant (ils passent devant les textes puis ressortent)
  depth: {
    layer: "over",
    render: ({ frame, fps, width, height, palette }) => {
      const min = Math.min(width, height);
      const t = frame / fps;
      return DEPTH_CUBES.map((cube, i) => {
        const size = min * cube.size;
        const x = width * (0.5 + cube.reachX * Math.sin((t / cube.period) * Math.PI * 2 + cube.phase)) - size / 2;
        const y = height * (0.5 + cube.reachY * Math.sin((t / (cube.period * 1.3)) * Math.PI * 2 + cube.phase * 1.7)) - size / 2;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, perspective: size * 5, filter: `blur(${min * cube.blur}px)`, opacity: 0.92 }}>
            <Cube size={size} rotateX={-20 + t * 9 * (i ? -1 : 1)} rotateY={t * 23 + i * 50} rotateZ={t * 6} color={i ? palette[2] : palette[1]} />
          </div>
        );
      });
    },
  },

  // Impression : passe-partout de la couleur du fond éclaircie, filet fin à l'intérieur
  border: {
    layer: "over",
    render: ({ width, height, palette, light }) => {
      const min = Math.min(width, height);
      const frameColor = light ? `color-mix(in oklab, ${palette[0]}, black 6%)` : `color-mix(in oklab, ${palette[0]}, white 92%)`;
      const pad = min * 0.028;
      return (
        <>
          <AbsoluteFill style={{ boxShadow: `inset 0 0 0 ${pad}px ${frameColor}` }} />
          <div style={{ position: "absolute", inset: pad * 1.6, border: `${Math.max(1, min * 0.0018)}px solid ${palette[1]}`, opacity: 0.55 }} />
        </>
      );
    },
  },
};

/**
 * Lentilles de l'effet « liquid » : taille (fraction du plus petit côté), proportions, période de la boucle en secondes,
 * amplitude du trajet (fraction du cadre ; au-delà de 0.5 la lentille sort en partie du cadre) et phase de départ.
 */
const LIQUID_LENSES = [
  { size: 0.34, ratio: 0.9, period: 11, reachX: 0.72, reachY: 0.3, phase: 0.4 },
  { size: 0.24, ratio: 1.15, period: 14, reachX: 0.68, reachY: 0.34, phase: 2.6 },
  { size: 0.4, ratio: 0.75, period: 19, reachX: 0.78, reachY: 0.26, phase: 4.4 },
];

/** Cubes de l'effet « depth » : taille, période de la boucle (s), amplitude du trajet, phase, flou (fractions du plus petit côté). */
const DEPTH_CUBES = [
  { size: 0.2, period: 13, reachX: 0.75, reachY: 0.32, phase: 1.1, blur: 0.005 },
  { size: 0.13, period: 17, reachX: 0.7, reachY: 0.36, phase: 3.9, blur: 0.0025 },
];

/** Calque d'effets de la recette pour un niveau donné. */
export function Effects({ effects, layer, palette }: { effects: Effect[]; layer: "under" | "over"; palette: VideoProps["palette"] }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const c: EffectContext = { frame, fps, width, height, palette, light: isLight(palette[0]) };
  return (
    <>
      {effects
        .filter((effect) => EFFECTS[effect].layer === layer)
        .map((effect) => (
          <AbsoluteFill key={effect} style={{ pointerEvents: "none" }}>
            {EFFECTS[effect].render(c)}
          </AbsoluteFill>
        ))}
    </>
  );
}

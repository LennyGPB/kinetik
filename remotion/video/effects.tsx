import type { ReactNode } from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { Effect } from "../../config/recipes";
import type { VideoProps } from "../props";
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
};

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

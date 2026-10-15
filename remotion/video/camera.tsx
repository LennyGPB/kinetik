import { useContext, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { Camera } from "../../config/recipes";
import type { VideoProps } from "../props";
import { GlitchSlices, glitchBurst } from "./glitch-fx";
import { TextEditingContext } from "./movable-text";
import { useRecipe, useUnit } from "./theme";

/**
 * BRIQUES « caméra » (recipe.camera) : mouvement global appliqué au contenu d'une scène, jamais au fond.
 * Frame locale à la scène. Les mouvements restent faibles pour ne jamais faire sortir un texte du cadre.
 */

type Energy = VideoProps["graph"]["energy"];
type CameraContext = { p: number; frame: number; fps: number; u: number; index: number; energy: Energy };

const CAMERA_MOVES: Record<Camera, (c: CameraContext) => string | undefined> = {
  still: () => undefined,
  // Travelling latéral lent, sens alterné d'une scène à l'autre, et léger zoom
  drift: ({ p, u, index }) => {
    const side = index % 2 === 0 ? 1 : -1;
    return `translateX(${side * (p - 0.5) * u * 2.4}px) scale(${1 + p * 0.03})`;
  },
  // Avancée continue vers le contenu, qui ralentit en fin de plan
  push: ({ p }) => `scale(${1 + Easing.out(Easing.quad)(p) * 0.07})`,
  // Caméra à l'épaule : somme de sinus aux phases tirées au sort (stable d'un rendu à l'autre), plus ample en énergie haute
  handheld: ({ frame, fps, u, index, energy }) => {
    const amp = energy === "high" ? 1 : energy === "calm" ? 0.45 : 0.7;
    const t = frame / fps;
    const wave = (axis: string, speeds: [number, number]) =>
      Math.sin(t * speeds[0] + random(`${axis}-${index}-a`) * 6.28) * 0.6 + Math.sin(t * speeds[1] + random(`${axis}-${index}-b`) * 6.28) * 0.4;
    return `translate(${wave("x", [1.7, 3.9]) * u * 0.55 * amp}px, ${wave("y", [1.3, 3.1]) * u * 0.45 * amp}px) rotate(${wave("r", [0.9, 2.3]) * 0.35 * amp}deg) scale(1.02)`;
  },
  // Balancier 3D : la scène pivote doucement en perspective autour des axes vertical et horizontal
  swing: ({ frame, fps, u, index }) => {
    const t = frame / fps;
    return `perspective(${u * 160}px) rotateY(${Math.sin(t * 0.55 + index * 1.7) * 7}deg) rotateX(${Math.sin(t * 0.41 + index) * 4}deg) scale(1.05)`;
  },
  // Glitch : rendu à part (GlitchCamera), pas une simple transformation
  glitch: () => undefined,
};

export function CameraMove({ index, energy, children }: { index: number; energy: Energy; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const u = useUnit();
  const recipeCamera = useRecipe().camera;
  // Pendant le déplacement des textes dans l'éditeur, plan fixe : le texte reste sous la souris
  const camera = useContext(TextEditingContext)?.enabled ? "still" : recipeCamera;
  const p = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (camera === "glitch") return <GlitchSlices intensity={glitchBurst(frame, `scene-${index}`)} frame={frame} seed={`cam-${index}`} unit={u}>{children}</GlitchSlices>;
  const transform = CAMERA_MOVES[camera]({ p, frame, fps, u, index, energy });
  if (!transform) return <>{children}</>;
  return <AbsoluteFill style={{ transform, transformOrigin: "50% 50%" }}>{children}</AbsoluteFill>;
}

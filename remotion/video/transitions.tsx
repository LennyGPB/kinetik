import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene, Transition } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { beatFrames } from "./theme";

/**
 * BRIQUES « transitions » (scene.transition, choisie par Claude parmi recipe.transitions).
 * Chaque scène gère sa propre entrée ; sa sortie est un fondu court, sauf pour les transitions franches
 * (cut, curtain) où c'est l'entrée de la scène suivante qui fait le travail.
 */

type Energy = VideoProps["graph"]["energy"];

type TransitionContext = {
  /** Progression de l'entrée (0 → 1) */
  inP: number;
  /** Progression de la sortie (0 → 1) */
  outP: number;
  frame: number;
  durationInFrames: number;
  accent: string;
};

type TransitionBrick = {
  /** Durée d'entrée en images (selon l'énergie) */
  enter: (energy: Energy) => number;
  /** La scène s'efface-t-elle en fondu avant la suivante ? */
  fadeOut: boolean;
  /** Style appliqué au contenu de la scène */
  style: (c: TransitionContext) => CSSProperties;
  /** Calque optionnel par-dessus la scène (flash, rideau…) */
  overlay?: (c: TransitionContext) => ReactNode;
};

const fast = (energy: Energy) => (energy === "high" ? 8 : 14);

const TRANSITION_BRICKS: Record<Transition, TransitionBrick> = {
  fade: { enter: fast, fadeOut: true, style: () => ({}) },
  slide: { enter: fast, fadeOut: true, style: ({ inP, outP }) => ({ transform: `translateX(${(1 - inP) * 8 - outP * 8}%)` }) },
  zoom: { enter: fast, fadeOut: true, style: ({ inP, outP }) => ({ transform: `scale(${1.3 - 0.3 * inP - 0.1 * outP})` }) },
  glitch: {
    enter: fast,
    fadeOut: true,
    style: ({ inP, frame }) => ({ transform: `translateX(${inP < 1 ? Math.sin(frame * 9) * 18 * (1 - inP) : 0}px) skewX(${(1 - inP) * 14}deg)` }),
  },
  // Coupe sèche : l'image arrive pleine, avec un « punch » d'échelle et un flash bref
  cut: {
    enter: () => 5,
    fadeOut: false,
    style: ({ inP }) => ({ opacity: 1, transform: `scale(${1.06 - 0.06 * inP})` }),
    overlay: ({ frame }) => <AbsoluteFill style={{ background: "white", opacity: interpolate(frame, [0, 3], [0.22, 0], { extrapolateRight: "clamp" }), pointerEvents: "none" }} />,
  },
  // Rideau : la sortie de la scène précédente recouvre l'écran (panneau entrant), l'entrée de celle-ci le découvre
  curtain: {
    enter: (energy) => (energy === "high" ? 10 : 14),
    fadeOut: false,
    style: ({ inP }) => ({ opacity: 1, transform: `translateX(${(1 - inP) * -3}%)` }),
    overlay: ({ inP, accent }) => (
      <AbsoluteFill style={{ background: accent, transform: `translateX(${Easing.inOut(Easing.cubic)(inP) * 101}%)`, pointerEvents: "none" }} />
    ),
  },
};

/** Images de la sortie « rideau entrant » quand la scène suivante arrive en curtain. */
const CURTAIN_COVER = 10;

/** Entrée / sortie d'une scène. Frame locale à la scène. */
export function SceneShell({ transition, next, energy, accent, children }: { transition: Transition; next?: Transition; energy: Energy; accent: string; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const brick = TRANSITION_BRICKS[transition];
  const exit = 8;
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const inP = interpolate(frame, [0, brick.enter(energy)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  // La sortie dépend de la transition de la scène SUIVANTE : une coupe ou un rideau ne doit pas être précédé d'un fondu.
  const nextBrick = next ? TRANSITION_BRICKS[next] : undefined;
  const fadesOut = nextBrick ? nextBrick.fadeOut : true;
  const outP = fadesOut ? interpolate(frame, [durationInFrames - exit, durationInFrames], [0, 1], clamp) : 0;
  const c: TransitionContext = { inP, outP, frame, durationInFrames, accent };
  const baseOpacity = transition === "cut" || transition === "curtain" ? 1 : inP;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: baseOpacity * (1 - outP), ...brick.style(c) }}>{children}</AbsoluteFill>
      {brick.overlay?.(c)}
      {next === "curtain" && <CurtainCover frame={frame} durationInFrames={durationInFrames} accent={accent} />}
    </AbsoluteFill>
  );
}

/** Panneau qui entre par la gauche à la fin de la scène, avant une scène en "curtain". */
function CurtainCover({ frame, durationInFrames, accent }: { frame: number; durationInFrames: number; accent: string }) {
  const p = interpolate(frame, [durationInFrames - CURTAIN_COVER, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  if (p <= 0) return null;
  return <AbsoluteFill style={{ background: accent, transform: `translateX(${(p - 1) * 101}%)` }} />;
}

/**
 * Position de départ de chaque scène, en images.
 * Les scènes qui entrent en "cut" sont recalées sur le temps musical le plus proche : la coupe tombe sur le beat
 * (`phaseSeconds` : position d'un temps dans la vidéo, voir beatGrid()).
 * La durée totale ne change pas (seules les frontières internes bougent).
 */
export function sceneTimeline(scenes: Scene[], fps: number, bpm: number, phaseSeconds = 0) {
  const frames = scenes.map((scene) => Math.max(1, Math.round(scene.duration * fps)));
  const starts = frames.map((_, i) => frames.slice(0, i).reduce((sum, f) => sum + f, 0));
  const total = frames.reduce((sum, f) => sum + f, 0);
  const beat = beatFrames(fps, bpm);
  const minScene = fps; // une scène garde au moins 1 seconde

  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].transition !== "cut") continue;
    const phase = phaseSeconds * fps;
    const snapped = Math.round(Math.round((starts[i] - phase) / beat) * beat + phase);
    const nextStart = i + 1 < scenes.length ? starts[i + 1] : total;
    starts[i] = Math.max(starts[i - 1] + minScene, Math.min(nextStart - minScene, snapped));
  }
  return scenes.map((scene, i) => ({ scene, from: starts[i], duration: (i + 1 < scenes.length ? starts[i + 1] : total) - starts[i] }));
}

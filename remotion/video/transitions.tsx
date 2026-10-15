import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { GlitchSlices } from "./glitch-fx";
import type { Scene, Transition } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { beatFrames } from "./theme";
import { CollectionTransitionCover, isCollectionTransition } from "./collection-transitions";

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
  /** 1 % du plus petit côté, en px */
  unit: number;
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
  shutter: { enter: () => 12, fadeOut: false, style: () => ({ opacity: 1 }), overlay: ({ inP, accent }) => <CollectionTransitionCover kind="shutter" progress={inP} color={accent} /> },
  iris: { enter: () => 18, fadeOut: false, style: ({ inP }) => ({ opacity: 1, transform: `scale(${1.08 - inP * 0.08})` }), overlay: ({ inP, accent }) => <CollectionTransitionCover kind="iris" progress={inP} color={accent} /> },
  prism: { enter: () => 16, fadeOut: false, style: () => ({ opacity: 1 }), overlay: ({ inP, accent }) => <CollectionTransitionCover kind="prism" progress={inP} color={accent} /> },
  fold: { enter: () => 18, fadeOut: false, style: () => ({ opacity: 1 }), overlay: ({ inP, accent }) => <CollectionTransitionCover kind="fold" progress={inP} color={accent} /> },
  track: { enter: () => 12, fadeOut: false, style: ({ inP }) => ({ opacity: 1, transform: `translateX(${(1 - inP) * -4}%)` }), overlay: ({ inP, accent }) => <CollectionTransitionCover kind="track" progress={inP} color={accent} /> },
  fade: { enter: fast, fadeOut: true, style: () => ({}) },
  slide: { enter: fast, fadeOut: true, style: ({ inP, outP }) => ({ transform: `translateX(${(1 - inP) * 8 - outP * 8}%)` }) },
  zoom: { enter: fast, fadeOut: true, style: ({ inP, outP }) => ({ transform: `scale(${1.3 - 0.3 * inP - 0.1 * outP})` }) },
  // Glitch : l'image arrive déchirée (tranches décalées, forte séparation RGB, voir SceneShell), avec des blocs de couleur
  // qui clignotent en différence ; le tout se stabilise en ~0,4 s.
  glitch: {
    enter: (energy) => (energy === "high" ? 10 : 13),
    fadeOut: false,
    style: ({ inP, frame }) => ({ opacity: 1, transform: `translateX(${inP < 1 ? Math.sin(frame * 9) * 10 * (1 - inP) : 0}px) skewX(${(1 - inP) * 6}deg)` }),
    overlay: ({ inP, frame, accent }) => (inP >= 1 ? null : <GlitchBlocks frame={frame} intensity={1 - inP} accent={accent} />),
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
  // Cube 3D : la scène arrive par la face droite d'un cube qui tourne (charnière sur le bord droit), en s'éclairant ;
  // la sortie (fin de la scène précédente) fait pivoter l'autre face vers la gauche (voir SceneShell).
  cube: {
    enter: (energy) => (energy === "high" ? 12 : 16),
    fadeOut: false,
    style: ({ inP, unit }) => ({
      opacity: 1,
      transform: `perspective(${unit * 220}px) rotateY(${-(1 - inP) * 60}deg)`,
      transformOrigin: "100% 50%",
      filter: inP < 1 ? `brightness(${0.55 + 0.45 * inP})` : undefined,
    }),
  },
  // Vitre : une grande plaque de verre dépoli recouvre la fin de la scène précédente (sortie), puis repart vers la gauche
  // et dévoile celle-ci, d'abord floue derrière le verre puis nette.
  glass: {
    enter: (energy) => (energy === "high" ? 16 : 24),
    fadeOut: false,
    style: ({ inP }) => ({ opacity: 1, transform: `scale(${1.025 - 0.025 * inP})` }),
    overlay: ({ inP, accent }) => <GlassPane left={-15 - Easing.inOut(Easing.cubic)(inP) * 140} accent={accent} />,
  },
};

/** Blocs de couleur en mode différence, tirés au sort à chaque image (entrée « glitch »). */
function GlitchBlocks({ frame, intensity, accent }: { frame: number; intensity: number; accent: string }) {
  const count = Math.round(2 + intensity * 5);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "difference" }}>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: string) => random(`gblock-${k}-${frame}-${i}`);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${r("x") * 90}%`,
              top: `${r("y") * 95}%`,
              width: `${8 + r("w") * 40}%`,
              height: `${0.6 + r("h") * 5 * intensity}%`,
              background: i % 3 === 0 ? accent : i % 3 === 1 ? "#00ebff" : "#ffffff",
              opacity: 0.35 + intensity * 0.5,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Images de la sortie « rideau entrant » quand la scène suivante arrive en curtain. */
const CURTAIN_COVER = 10;
/** Images de la sortie quand la scène suivante arrive en cube. */
const CUBE_OUT = 12;
/** Images de la sortie « vitre entrante » quand la scène suivante arrive en glass. */
const GLASS_COVER = 16;

/**
 * Plaque de verre dépoli (130 % de large, `left` en % du cadre) : le flou vient de backdrop-filter, le reste fait le verre
 * (reflet diagonal, tranche lumineuse côté bord d'attaque, liseré irisé de la couleur d'accent).
 */
function GlassPane({ left, accent }: { left: number; accent: string }) {
  const { width, height } = useVideoConfig();
  const min = Math.min(width, height);
  if (left <= -130 || left >= 100) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "-4%",
        bottom: "-4%",
        left: `${left}%`,
        width: "130%",
        borderRadius: min * 0.05,
        backdropFilter: `blur(${min * 0.022}px) saturate(1.7) brightness(1.08)`,
        WebkitBackdropFilter: `blur(${min * 0.022}px) saturate(1.7) brightness(1.08)`,
        background: "linear-gradient(100deg, rgb(255 255 255 / 0.22), rgb(255 255 255 / 0.06) 35%, rgb(255 255 255 / 0.04) 70%, rgb(255 255 255 / 0.16))",
        boxShadow: `inset ${min * 0.004}px 0 0 rgb(255 255 255 / 0.75), inset ${min * 0.012}px 0 ${min * 0.02}px color-mix(in oklab, ${accent}, transparent 55%), inset -${min * 0.004}px 0 0 rgb(255 255 255 / 0.5), 0 0 ${min * 0.06}px rgb(0 0 0 / 0.25)`,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Reflet : une bande claire en biais qui accroche la lumière */}
      <div style={{ position: "absolute", top: "-20%", bottom: "-20%", left: "12%", width: "9%", transform: "skewX(-18deg)", background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.22), transparent)" }} />
      <div style={{ position: "absolute", top: "-20%", bottom: "-20%", left: "24%", width: "2.5%", transform: "skewX(-18deg)", background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.16), transparent)" }} />
    </div>
  );
}

/** Entrée / sortie d'une scène. Frame locale à la scène. */
export function SceneShell({ transition, next, energy, accent, nextAccent = accent, children }: { transition: Transition; next?: Transition; energy: Energy; accent: string; nextAccent?: string; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 100;
  const brick = TRANSITION_BRICKS[transition];
  const exit = 8;
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const inP = interpolate(frame, [0, brick.enter(energy)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  // La sortie dépend de la transition de la scène SUIVANTE : une coupe ou un rideau ne doit pas être précédé d'un fondu.
  const nextBrick = next ? TRANSITION_BRICKS[next] : undefined;
  const fadesOut = nextBrick ? nextBrick.fadeOut : true;
  const outP = fadesOut ? interpolate(frame, [durationInFrames - exit, durationInFrames], [0, 1], clamp) : 0;
  const c: TransitionContext = { inP, outP, frame, durationInFrames, accent, unit };
  const baseOpacity = transition === "cut" || transition === "curtain" || transition === "glass" || transition === "glitch" || transition === "cube" ? 1 : inP;
  // Face sortante du cube : charnière sur le bord gauche, la face pivote et s'assombrit
  const cubeOut = next === "cube" ? interpolate(frame, [durationInFrames - CUBE_OUT, durationInFrames], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) }) : 0;
  // Vitre entrante en fin de scène : elle arrive par la droite et finit pile là où la scène suivante la reprend
  const glassIn = next === "glass" ? interpolate(frame, [durationInFrames - GLASS_COVER, durationInFrames], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 0;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: baseOpacity * (1 - outP), ...brick.style(c) }}>
        {cubeOut > 0 ? (
          <AbsoluteFill style={{ transform: `perspective(${unit * 220}px) rotateY(${cubeOut * 60}deg)`, transformOrigin: "0% 50%", filter: `brightness(${1 - cubeOut * 0.45})` }}>{children}</AbsoluteFill>
        ) : transition === "glitch" && inP < 1 ? (
          <GlitchSlices intensity={1 - inP} frame={frame} seed="enter" unit={unit}>{children}</GlitchSlices>
        ) : (
          children
        )}
      </AbsoluteFill>
      {brick.overlay?.(c)}
      {next === "curtain" && <CurtainCover frame={frame} durationInFrames={durationInFrames} accent={nextAccent} />}
      {glassIn > 0 && <GlassPane left={100 - glassIn * 115} accent={nextAccent} />}
      {next && isCollectionTransition(next) && <CollectionTransitionCover kind={next} progress={1 - interpolate(frame, [durationInFrames - 10, durationInFrames - 1], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })} color={nextAccent} />}
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

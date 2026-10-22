import { StageCollectionCover, type StageCollectionTransition } from "./stage-collection-transitions";
import { useId, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { TypePosterCover } from "./type-poster-transitions";
import { GlitchSlices } from "./glitch-fx";
import type { Scene, Transition } from "../../lib/projects/scenes";
import type { MotionEase, MotionExit } from "../../config/recipes";
import type { VideoProps } from "../props";
import { useRecipe } from "./theme";
import { CollectionTransitionCover, isCollectionTransition } from "./collection-transitions";
import { BurnCover, CapsuleCover, DripCover, ScissorCover, ScanCover, ScrawlCover, SmudgeGlow, StrataCover, StreakCover, SurgeCover, FlareCover, IgniteCover, SlashCover, WhirlRing, ClaspCover, CogCover, EclipseCover, SmearStreaks, HairlineCover, ShearCover, TrainCover, InkCover, MotionBlurFilter, PressCover, ratchetSteps, RippleFilter, RippleRings, StencilCover, StitchCover, TessellateCover, WhipStreaks, type CoverContext } from "./themed-transitions";

/**
 * BRIQUES « transitions » (scene.transition, choisie par Claude parmi recipe.transitions).
 * Chaque scène gère sa propre entrée ; sa sortie est un fondu court, sauf pour les transitions franches
 * (cut, curtain) où c'est l'entrée de la scène suivante qui fait le travail.
 */

type Energy = VideoProps["graph"]["energy"];

type TransitionContext = {
  aspectRatio: number;
  /** Progression de l'entrée (0 → 1) */
  inP: number;
  /** Progression de la sortie (0 → 1) */
  outP: number;
  frame: number;
  durationInFrames: number;
  accent: string;
  /** 1 % du plus petit côté, en px */
  unit: number;
  width: number;
  height: number;
  /** Palette de la scène qui arrive */
  palette: VideoProps["palette"];
  /** Titre de la scène qui arrive */
  title: string;
};

function collectionStageBrick(kind: StageCollectionTransition): TransitionBrick {
  return {
    enter: () => 28, fadeOut: false, opaque: true,
    style: ({ inP }) => ({ opacity: Math.min(1, inP * 2) }),
    overlay: ({ inP, accent }) => inP < 1 ? <StageCollectionCover kind={kind} amount={1 - inP} accent={accent} /> : null,
    exit: { frames: 24, style: (t) => ({ opacity: 1 - t * t }), cover: (c) => <StageCollectionCover kind={kind} amount={c.p} accent={c.palette[2]} /> },
  };
}

type TransitionBrick = {
  /** Durée d'entrée en images (selon l'énergie) */
  enter: (energy: Energy) => number;
  /** La scène s'efface-t-elle en fondu avant la suivante ? */
  fadeOut: boolean;
  /** Style appliqué au contenu de la scène */
  style: (c: TransitionContext) => CSSProperties;
  /** Calque optionnel par-dessus la scène (flash, rideau…) */
  overlay?: (c: TransitionContext) => ReactNode;
  /** La scène est pleinement opaque dès sa première image (la couverture ou le mouvement fait le travail). */
  opaque?: boolean;
  /** Habillage du contenu pendant l'entrée (filtre…) ; `id` sert aux filtres SVG. */
  wrap?: (children: ReactNode, c: TransitionContext, id: string) => ReactNode;
  /**
   * Fin de la scène PRÉCÉDENTE quand cette transition suit : durée en images (`t` de 0 à 1),
   * couverture qui arrive, style et habillage du contenu sortant.
   */
  exit?: {
    frames: number;
    cover?: (c: CoverContext) => ReactNode;
    style?: (t: number, c: TransitionContext) => CSSProperties;
    wrap?: (children: ReactNode, t: number, c: TransitionContext, id: string) => ReactNode;
  };
  /**
   * Mouvement de tout le cadre (fond compris) autour de la frontière : `t` = progression de la sortie (out)
   * ou de l'entrée (in). Appliqué par KinetikVideo au fond, via backdropMotion().
   */
  backdrop?: (s: { phase: "out" | "in"; t: number; unit: number; frame: number; id: string }) => { style: CSSProperties; defs?: ReactNode };
};

const fast = (energy: Energy) => (energy === "high" ? 8 : 14);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Couverture d'entrée : `p` = 1 − progression (la couverture découvre la scène). */
const coverIn = (c: TransitionContext): CoverContext => ({ p: 1 - c.inP, phase: "in", frame: c.frame, width: c.width, height: c.height, unit: c.unit, color: c.accent, palette: c.palette, title: c.title });

/** Courbe d'entrée propre au template (recipe.motion.ease) ; absente = ralenti cubique historique. */
export function easeFor(ease: MotionEase | undefined): (t: number) => number {
  switch (ease) {
    case "expo": return Easing.out(Easing.exp);
    case "quint": return Easing.out(Easing.poly(5));
    case "back": return Easing.out(Easing.back(1.5));
    case "steps": return (t) => ratchetSteps(t);
    default: return Easing.out(Easing.cubic);
  }
}

/** Sortie des éléments propre au template (recipe.motion.exit), en plus du fondu ; `p` = progression de la sortie. */
function exitMotion(exit: MotionExit | undefined, p: number, unit: number): CSSProperties | undefined {
  if (!exit || exit === "fade" || p <= 0) return undefined;
  switch (exit) {
    case "sink": return { transform: `translateY(${Easing.in(Easing.cubic)(p) * unit * 5}px)` };
    case "rise": return { transform: `translateY(${-Easing.in(Easing.cubic)(p) * unit * 5}px)` };
    case "shrink": return { transform: `scale(${1 - 0.08 * Easing.in(Easing.cubic)(p)})` };
    case "slam": return { transform: `scale(${1 - 0.16 * p * p}) translateY(${p * p * unit * 2}px)` };
    case "blur": return { filter: `blur(${p * unit * 1.4}px)`, transform: `scale(${1 + 0.03 * p})` };
  }
}

/** Contenu de la scène avec un filtre SVG tant que `amount` > 0 (sinon, aucun filtre : le verre reste possible). */
function filtered(children: ReactNode, id: string, amount: number, filter: (id: string) => ReactNode) {
  if (amount <= 0.05) return children;
  return <>{filter(id)}<AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill></>;
}

const TRANSITION_BRICKS: Record<Transition, TransitionBrick> = {
  "gravity-pull": { enter: () => 24, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="spill" {...coverIn(c)} p={1 - Math.min(1, c.frame / 24)} />, exit: { frames: 22, cover: c => <TypePosterCover kind="spill" {...c} /> } },
  "violet-fold": { enter: () => 24, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="veil" {...coverIn(c)} p={1 - Math.min(1, c.frame / 24)} />, exit: { frames: 22, cover: c => <TypePosterCover kind="veil" {...c} /> } },
  "fan-fold": { enter: () => 22, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="fanout" {...coverIn(c)} p={1 - Math.min(1, c.frame / 22)} />, exit: { frames: 20, cover: c => <TypePosterCover kind="fanout" {...c} /> } },
  "block-pivot": { enter: () => 16, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="blocktype" {...coverIn(c)} p={1 - Math.min(1, c.frame / 16)} />, exit: { frames: 14, cover: c => <TypePosterCover kind="blocktype" {...c} /> } },
  "mirror-horizon": { enter: () => 22, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="positive" {...coverIn(c)} p={1 - Math.min(1, c.frame / 22)} />, exit: { frames: 20, cover: c => <TypePosterCover kind="positive" {...c} /> } },
  "helix-wind": { enter: () => 22, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="helix" {...coverIn(c)} p={1 - Math.min(1, c.frame / 22)} />, exit: { frames: 20, cover: c => <TypePosterCover kind="helix" {...c} /> } },
  "paint-sweep": { enter: () => 20, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="power" {...coverIn(c)} />, exit: { frames: 18, cover: c => <TypePosterCover kind="power" {...c} /> } },
  "type-stretch": { enter: () => 18, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="spectra" {...coverIn(c)} />, exit: { frames: 16, cover: c => <TypePosterCover kind="spectra" {...c} /> } },
  "stack-collapse": { enter: () => 24, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="batch" {...coverIn(c)} />, exit: { frames: 20, cover: c => <TypePosterCover kind="batch" {...c} /> } },
  "ribbon-turn": { enter: () => 22, fadeOut: false, opaque: true, style: () => ({}), overlay: c => <TypePosterCover kind="turn" {...coverIn(c)} />, exit: { frames: 18, cover: c => <TypePosterCover kind="turn" {...c} /> } },
  mosaic: { enter: () => 25, fadeOut: false, style: () => ({ opacity: 1 }), overlay: ({ inP, accent, aspectRatio }) => <CollectionTransitionCover kind="mosaic" progress={inP} color={accent} aspectRatio={aspectRatio} /> },
  rotary: { enter: () => 22, fadeOut: false, style: () => ({ opacity: 1 }), overlay: ({ inP, accent }) => <CollectionTransitionCover kind="rotary" progress={inP} color={accent} /> },
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

  // ───── Transitions thématiques (themed-transitions.tsx) : la couverture reprend le motif d'un thème ─────
  // Presse (Anvil) : les mâchoires se referment en accélérant, frappent, puis se rouvrent ; la scène arrive avec un petit « punch »
  press: {
    enter: (energy) => (energy === "high" ? 14 : 18),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ transform: `scale(${1.04 - 0.04 * clamp01(inP)})` }),
    overlay: (c) => <PressCover {...coverIn(c)} />,
    exit: { frames: 12, cover: (c) => <PressCover {...c} /> },
  },
  // Rouage (Ratchet) : ouverture dentée qui se ferme puis s'ouvre cran par cran
  cog: {
    enter: (energy) => (energy === "high" ? 16 : 20),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <CogCover {...coverIn(c)} />,
    exit: { frames: 14, cover: (c) => <CogCover {...c} /> },
  },
  // Couture (Suture) : une aiguille ferme l'écran derrière elle, puis la couture s'ouvre
  stitch: {
    enter: (energy) => (energy === "high" ? 14 : 18),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <StitchCover {...coverIn(c)} />,
    exit: { frames: 18, cover: (c) => <StitchCover {...c} /> },
  },
  // Emboîtement (Interlock) : deux pièces crantées s'emboîtent, puis se déverrouillent à la verticale
  clasp: {
    enter: (energy) => (energy === "high" ? 12 : 16),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <ClaspCover {...coverIn(c)} />,
    exit: { frames: 12, cover: (c) => <ClaspCover {...c} /> },
  },
  // Pavage (Tessera) : tuiles Bauhaus qui pivotent en 3D en vague diagonale
  tessellate: {
    enter: (energy) => (energy === "high" ? 16 : 22),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <TessellateCover {...coverIn(c)} />,
    exit: { frames: 14, cover: (c) => <TessellateCover {...c} /> },
  },
  // Filé (whip pan) : tout le cadre part en panoramique flou, la scène suivante arrive du côté opposé
  whip: {
    enter: (energy) => (energy === "high" ? 8 : 11),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ transform: `translateX(${(1 - inP) * 45}%)` }),
    wrap: (children, c, id) => filtered(children, id, (1 - c.inP) * c.unit * 4, (fid) => <MotionBlurFilter id={fid} amount={(1 - c.inP) * c.unit * 4} />),
    overlay: ({ inP, frame, unit, accent }) => <WhipStreaks intensity={1 - inP} frame={frame} unit={unit} color={accent} />,
    exit: {
      frames: 7,
      style: (t) => ({ transform: `translateX(${-t * t * 45}%)` }),
      wrap: (children, t, c, id) => filtered(<>{children}<WhipStreaks intensity={t * t} frame={c.frame} unit={c.unit} color={c.accent} /></>, id, t * t * c.unit * 4, (fid) => <MotionBlurFilter id={fid} amount={t * t * c.unit * 4} />),
    },
    backdrop: ({ phase, t, unit, id }) => {
      const s = phase === "out" ? t * t : 1 - t;
      return { style: { transform: `translateX(${(phase === "out" ? -1 : 1) * s * 5}%) scale(${1 + s * 0.12})`, filter: s > 0.05 ? `url(#${id})` : undefined }, defs: <MotionBlurFilter id={id} amount={s * unit * 3} /> };
    },
  },
  // Masque typographique : un aplat monte, puis la scène apparaît à travers les lettres géantes de son titre
  stencil: {
    enter: (energy) => (energy === "high" ? 20 : 26),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <StencilCover {...coverIn(c)} />,
    exit: { frames: 9, cover: (c) => <StencilCover {...c} /> },
  },
  // Encre : des gouttes s'étalent jusqu'à couvrir l'écran, puis l'encre se retire
  ink: {
    enter: (energy) => (energy === "high" ? 18 : 24),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <InkCover {...coverIn(c)} />,
    exit: { frames: 16, cover: (c) => <InkCover {...c} /> },
  },
  // Brûlure de pellicule : l'image brûle depuis un coin, puis la brûlure se retire
  burn: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <BurnCover {...coverIn(c)} />,
    exit: { frames: 14, cover: (c) => <BurnCover {...c} /> },
  },
  // Ondulation : l'image se trouble comme une surface d'eau (fond compris), la scène suivante se stabilise en ondes
  ripple: {
    enter: (energy) => (energy === "high" ? 16 : 22),
    fadeOut: false,
    style: () => ({}),
    wrap: (children, c, id) => filtered(children, id, (1 - c.inP) * c.unit * 10, (fid) => <RippleFilter id={fid} amount={(1 - c.inP) * c.unit * 10} frame={c.frame} />),
    overlay: ({ inP, unit, accent }) => <RippleRings progress={inP} unit={unit} color={accent} />,
    exit: {
      frames: 10,
      style: (t) => ({ opacity: 1 - t }),
      wrap: (children, t, c, id) => filtered(children, id, t * c.unit * 10, (fid) => <RippleFilter id={fid} amount={t * c.unit * 10} frame={c.frame} />),
    },
    backdrop: ({ phase, t, unit, frame, id }) => {
      const s = phase === "out" ? t : 1 - t;
      return { style: { filter: s > 0.05 ? `url(#${id})` : undefined }, defs: <RippleFilter id={id} amount={s * unit * 5} frame={frame} /> };
    },
  },
  // Éclipse (Bold Orbit) : un anneau de lumière se trace puis enfle jusqu'à remplir l'écran, une couronne lumineuse découvre la scène
  eclipse: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ transform: `scale(${1.06 - 0.06 * clamp01(inP)})` }),
    overlay: (c) => <EclipseCover {...coverIn(c)} />,
    exit: { frames: 16, cover: (c) => <EclipseCover {...c} /> },
  },
  // Rame (Metro) : une rame traverse l'écran et emporte la scène
  train: {
    enter: (energy) => (energy === "high" ? 10 : 14),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ transform: `translateX(${(1 - inP) * 6}%)` }),
    overlay: (c) => <TrainCover {...coverIn(c)} />,
    exit: { frames: 12, cover: (c) => <TrainCover {...c} /> },
  },
  // Cisaillement (Torque) : un pan incliné encre bordé de vermillon traverse l'écran comme un rail
  shear: {
    enter: (energy) => (energy === "high" ? 11 : 15),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ transform: `translateX(${(1 - inP) * -5}%)` }),
    overlay: (c) => <ShearCover {...coverIn(c)} />,
    exit: { frames: 11, cover: (c) => <ShearCover {...c} /> },
  },
  // Filet (Linea) : un filet fin balaie l'écran à l'horizontale, la scène s'efface derrière lui puis la suivante apparaît
  hairline: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <HairlineCover {...coverIn(c)} axis="x" />,
    exit: { frames: 14, cover: (c) => <HairlineCover {...c} axis="x" /> },
  },
  // Filet vertical (Slate) : même geste, de bas en haut
  lift: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <HairlineCover {...coverIn(c)} axis="y" />,
    exit: { frames: 14, cover: (c) => <HairlineCover {...c} axis="y" /> },
  },
  // Capsule : un point devient une pilule qui s'étire puis remplit l'écran ; à l'entrée, elle se resserre et file à droite
  capsule: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ transform: `scale(${0.96 + 0.04 * Math.min(1, inP)})` }),
    overlay: (c) => <CapsuleCover {...coverIn(c)} />,
    exit: { frames: 16, cover: (c) => <CapsuleCover {...c} /> },
  },
  // Traînée (Smear) : l'image s'étire verticalement en lumière floue, la scène suivante se condense depuis une traînée
  smear: {
    enter: (energy) => (energy === "high" ? 10 : 14),
    fadeOut: false,
    style: ({ inP, unit }) => (inP < 1 ? { transform: `scaleY(${1 + (1 - inP) * 2.2})`, filter: `blur(${(1 - inP) * unit * 1.2}px) brightness(${1 + (1 - inP) * 0.8})` } : {}),
    overlay: ({ inP, frame, accent, palette }) => <SmearStreaks intensity={1 - inP} frame={frame} colors={[palette[1], accent]} />,
    exit: {
      frames: 9,
      style: (t, c) => ({ transform: `scaleY(${1 + t * 2.2})`, filter: `blur(${t * c.unit * 1.2}px) brightness(${1 + t * 0.8})`, opacity: 1 - t }),
      wrap: (children, t, c) => <>{children}<SmearStreaks intensity={t} frame={c.frame} colors={[c.palette[1], c.accent]} /></>,
    },
  },
  // Faisceau (Noise) : une bande de lumière striée s'ouvre jusqu'à remplir l'écran, puis se referme en ligne
  flare: {
    enter: (energy) => (energy === "high" ? 12 : 18),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ transform: `scaleY(${1.08 - 0.08 * Math.min(1, inP)})` }),
    overlay: (c) => <FlareCover {...coverIn(c)} />,
    exit: { frames: 12, cover: (c) => <FlareCover {...c} /> },
  },
  // Embrasement (Ember) : un éclat chaud part du centre et remplit l'écran, la scène suivante sort du zoom
  ignite: {
    enter: (energy) => (energy === "high" ? 12 : 18),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ transform: `scale(${1.25 - 0.25 * Math.min(1, inP)})` }),
    overlay: (c) => <IgniteCover {...coverIn(c)} />,
    exit: { frames: 12, style: (t) => ({ transform: `scale(${1 + t * t * 0.35})` }), cover: (c) => <IgniteCover {...c} /> },
  },
  // Tourbillon (Halo) : l'image tourne en flou de rotation et s'efface dans un anneau de lumière ; la suivante se déroule à l'inverse
  whirl: {
    enter: (energy) => (energy === "high" ? 12 : 17),
    fadeOut: false,
    style: ({ inP, unit }) => (inP < 1 ? { transform: `rotate(${-(1 - inP) * 28}deg) scale(${1 + (1 - inP) * 0.25})`, filter: `blur(${(1 - inP) * unit * 1.1}px)` } : {}),
    overlay: ({ inP, unit, palette }) => <WhirlRing intensity={1 - inP} unit={unit} color={palette[2]} />,
    exit: {
      frames: 11,
      style: (t, c) => ({ transform: `rotate(${t * t * 28}deg) scale(${1 + t * 0.25})`, filter: `blur(${t * c.unit * 1.1}px)`, opacity: 1 - t }),
      wrap: (children, t, c) => <>{children}<WhirlRing intensity={t} unit={c.unit} color={c.palette[2]} /></>,
    },
  },
  // Défocalisation (Void) : l'image se dissout dans un flou lumineux ambré, la suivante fait sa mise au point
  defocus: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    style: ({ inP, unit }) => (inP < 1 ? { filter: `blur(${(1 - inP) * unit * 3}px) brightness(${1 + (1 - inP) * 0.9})`, transform: `scale(${1.06 - 0.06 * inP})` } : {}),
    overlay: ({ inP, palette }) => (inP < 1 ? <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 50%, color-mix(in srgb, ${palette[2]}, transparent 35%), transparent 70%)`, opacity: (1 - inP) * 0.8 }} /> : null),
    exit: {
      frames: 12,
      style: (t, c) => ({ filter: `blur(${t * c.unit * 3}px) brightness(${1 + t * 0.9})`, opacity: 1 - t * t }),
      wrap: (children, t, c) => <>{children}<AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 50%, color-mix(in srgb, ${c.palette[2]}, transparent 35%), transparent 70%)`, opacity: t * 0.8 }} /></>,
    },
  },
  // Coulure (Melt) : des coulures roses et bleues descendent du haut jusqu'à couvrir l'écran, puis s'écoulent vers le bas
  drip: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <DripCover {...coverIn(c)} />,
    exit: { frames: 16, cover: (c) => <DripCover {...c} /> },
  },
  // Entaille (Holo) : des bandes diagonales s'élargissent jusqu'à couvrir l'écran, liserés irisés, puis se resserrent
  slash: {
    enter: (energy) => (energy === "high" ? 12 : 16),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <SlashCover {...coverIn(c)} />,
    exit: { frames: 12, cover: (c) => <SlashCover {...c} /> },
  },
  // Colonnes de lumière (Lumen) : des colonnes violettes s'élargissent jusqu'à couvrir l'écran, puis redeviennent de fins traits
  streak: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <StreakCover {...coverIn(c)} />,
    exit: { frames: 14, cover: (c) => <StreakCover {...c} /> },
  },
  // Montée (Gloss) : le liquide rose monte en vague jusqu'à couvrir l'écran, puis redescend
  surge: {
    enter: (energy) => (energy === "high" ? 14 : 20),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <SurgeCover {...coverIn(c)} />,
    exit: { frames: 16, cover: (c) => <SurgeCover {...c} /> },
  },
  // Ciseaux (Crosscut) : deux pans arrivent de côtés opposés, se croisent sur la diagonale, puis poursuivent leur course
  scissor: {
    enter: (energy) => (energy === "high" ? 12 : 16),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => <ScissorCover {...coverIn(c)} />,
    exit: { frames: 12, cover: (c) => <ScissorCover {...c} /> },
  },
  // Strates (Hollow) : un aplat bordé de filets en contour monte du bas, couvre, puis continue vers le haut
  strata: { enter: (energy) => (energy === "high" ? 12 : 16), fadeOut: false, opaque: true, style: () => ({}), overlay: (c) => <StrataCover {...coverIn(c)} />, exit: { frames: 12, cover: (c) => <StrataCover {...c} /> } },
  // Trait (Cursive) : un trait de feutre en diagonale s'élargit jusqu'à couvrir l'écran, puis file à droite
  scrawl: { enter: (energy) => (energy === "high" ? 12 : 16), fadeOut: false, opaque: true, style: () => ({}), overlay: (c) => <ScrawlCover {...coverIn(c)} />, exit: { frames: 12, cover: (c) => <ScrawlCover {...c} /> } },
  // Balayage (Overlap) : une bande pleine descend jusqu'à couvrir l'écran, puis poursuit vers le bas
  scan: { enter: (energy) => (energy === "high" ? 10 : 14), fadeOut: false, opaque: true, style: () => ({}), overlay: (c) => <ScanCover {...coverIn(c)} />, exit: { frames: 10, cover: (c) => <ScanCover {...c} /> } },
  // Estompe (Bloom) : l'image s'étale en flou lumineux horizontal, la suivante se resserre depuis la lumière
  smudge: {
    enter: (energy) => (energy === "high" ? 12 : 18),
    fadeOut: false,
    style: ({ inP, unit }) => (inP < 1 ? { transform: `scaleX(${1 + (1 - inP) * 0.35})`, filter: `blur(${(1 - inP) * unit * 2}px) brightness(${1 + (1 - inP)})` } : {}),
    overlay: ({ inP, palette }) => <SmudgeGlow intensity={1 - inP} color={palette[2]} />,
    exit: { frames: 12, style: (t, c) => ({ transform: `scaleX(${1 + t * 0.35})`, filter: `blur(${t * c.unit * 2}px) brightness(${1 + t})`, opacity: 1 - t * t }), wrap: (children, t, c) => <>{children}<SmudgeGlow intensity={t} color={c.palette[2]} /></> },
  },
  // Miroir (Reflect) : l'image se replie sur la ligne médiane, la suivante se déplie depuis elle
  mirror: {
    enter: (energy) => (energy === "high" ? 10 : 14),
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => (inP < 1 ? { transform: `scaleY(${Math.max(0.001, inP)})` } : {}),
    exit: { frames: 10, style: (t) => ({ transform: `scaleY(${Math.max(0.001, 1 - t)})` }) },
  },
  // Tour de plateau (Stage) : l'appareil 3D fait un tour sur lui-même (stage3d.tsx) ; les textes partent dans le sens
  // de la rotation en perspective et la scène suivante arrive de l'autre côté. Hors Stage : simple pivot en perspective.
  turntable: {
    enter: (energy) => (energy === "high" ? 11 : 14),
    fadeOut: false,
    style: ({ inP, unit }) => (inP < 1 ? { transform: `perspective(${unit * 160}px) translateX(${(1 - inP) * unit * 9}px) rotateY(${(1 - inP) * -24}deg)`, filter: `blur(${(1 - inP) * unit * 0.6}px)` } : {}),
    exit: { frames: 12, style: (t, c) => ({ transform: `perspective(${c.unit * 160}px) translateX(${-t * t * c.unit * 9}px) rotateY(${t * t * 24}deg)`, filter: `blur(${t * c.unit * 0.6}px)`, opacity: 1 - t * t }) },
  },
  // ── Univers 3D (stage3d.tsx) : le décor fait le geste, les textes suivent ──
  // Course du soleil (Monument) : les textes s'éclairent et se dissolvent dans la lumière, un halo chaud passe
  sunpath: {
    enter: (energy) => (energy === "high" ? 16 : 22),
    fadeOut: false,
    style: ({ inP, unit }) => (inP < 1 ? { opacity: inP, filter: `brightness(${1 + (1 - inP) * 0.8}) blur(${(1 - inP) * unit * 0.7}px)`, transform: `translateY(${(1 - inP) * unit * 2}px)` } : {}),
    overlay: ({ inP, palette }) => (inP < 1 ? <SunGlow intensity={(1 - inP) * 0.55} color={palette[2]} /> : null),
    exit: { frames: 16, style: (t, c) => ({ opacity: 1 - t, filter: `brightness(${1 + t * 0.8}) blur(${t * c.unit * 0.7}px)`, transform: `translateY(${-t * c.unit * 2}px)` }), cover: (c) => <SunGlow intensity={c.p * 0.55} color={c.palette[2]} /> },
  },
  // Flash (Shoot) : un flash de studio éclate, le plan change sous la lumière (un seul éclair : bien sous 3 flashs/s)
  flash: {
    enter: () => 9,
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: ({ inP }) => (inP < 1 ? <AbsoluteFill style={{ background: "#ffffff", opacity: (1 - inP) ** 2 * 0.95, pointerEvents: "none" }} /> : null),
    exit: { frames: 5, cover: (c) => <AbsoluteFill style={{ background: "#ffffff", opacity: c.p * c.p * 0.95, pointerEvents: "none" }} /> },
  },
  // Courant (Aquarium) : l'appareil tourne dans un nuage de bulles ; les textes remontent comme des bulles
  current: {
    enter: (energy) => (energy === "high" ? 13 : 18),
    fadeOut: false,
    style: ({ inP, unit }) => (inP < 1 ? { opacity: inP, transform: `translateY(${(1 - inP) * unit * 7}px)`, filter: `blur(${(1 - inP) * unit * 0.7}px)` } : {}),
    exit: { frames: 14, style: (t, c) => ({ opacity: 1 - t * t, transform: `translateY(${-t * t * c.unit * 7}px)`, filter: `blur(${t * c.unit * 0.7}px)` }) },
  },
  // Râteau (Zen) : une bande de sable ratissé balaie l'écran et emporte la scène ; la suivante se découvre derrière
  rake: {
    enter: (energy) => (energy === "high" ? 14 : 18),
    fadeOut: false,
    opaque: true,
    style: () => ({}),
    overlay: (c) => (c.inP < 1 ? <RakeCover p={1 - c.inP} phase="in" unit={c.unit} palette={c.palette} /> : null),
    exit: { frames: 16, cover: (c) => <RakeCover p={c.p} phase="out" unit={c.unit} palette={c.palette} /> },
  },
  "array-sweep": {
    enter: () => 26,
    fadeOut: false,
    style: ({ inP, unit }) => ({ opacity: inP, transform: `translateX(${(1 - inP) * unit * 3}px)`, filter: `blur(${(1 - inP) * unit * 0.4}px)` }),
    exit: { frames: 20, style: (t, c) => ({ opacity: 1 - t, transform: `translateX(${-t * c.unit * 3}px)`, filter: `blur(${t * c.unit * 0.4}px)` }) },
  },
  "satin-pass": collectionStageBrick("satin-pass"),
  "tidal-wave": collectionStageBrick("tidal-wave"),
  "blueprint-scan": collectionStageBrick("blueprint-scan"),
  "solar-sweep": collectionStageBrick("solar-sweep"),
  "arm-exchange": collectionStageBrick("arm-exchange"),
  "gyro-turn": {
    enter: () => 28,
    fadeOut: false,
    style: ({ inP, unit }) => ({ opacity: inP, transform: `perspective(${unit * 180}px) rotateY(${(1 - inP) * -10}deg)`, filter: `blur(${(1 - inP) * unit * 0.3}px)` }),
    exit: { frames: 22, style: (t, c) => ({ opacity: 1 - t, transform: `perspective(${c.unit * 180}px) rotateY(${t * 10}deg)`, filter: `blur(${t * c.unit * 0.3}px)` }) },
  },
  "magnetic-lock": {
    enter: () => 22,
    fadeOut: false,
    opaque: true,
    style: ({ inP }) => ({ opacity: inP }),
    overlay: ({ inP, accent }) => inP < 1 ? <MagneticCover p={1 - inP} glow={accent} /> : null,
    exit: { frames: 18, style: (t) => ({ opacity: 1 - t }), cover: (c) => <MagneticCover p={c.p} glow={c.palette[2]} /> },
  },
  "vault-pass": {
    enter: () => 26,
    fadeOut: false,
    opaque: true,
    style: ({ inP, unit }) => ({ opacity: inP, transform: `translateX(${(1 - inP) * unit * 2}px)` }),
    overlay: ({ inP }) => inP < 1 ? <VaultPassCover p={1 - inP} entering /> : null,
    exit: { frames: 22, style: (t) => ({ opacity: 1 - t }), cover: (c) => <VaultPassCover p={c.p} /> },
  },
  "stone-slide": {
    enter: () => 22,
    fadeOut: false,
    opaque: true,
    style: ({ inP, unit }) => ({ opacity: inP, transform: `translateX(${(1 - inP) * unit * 3}px)` }),
    overlay: ({ inP }) => inP < 1 ? <StoneSlideCover p={1 - inP} entering /> : null,
    exit: { frames: 18, style: (t) => ({ opacity: 1 - t }), cover: (c) => <StoneSlideCover p={c.p} /> },
  },
  "halo-pass": {
    enter: () => 24,
    fadeOut: false,
    style: ({ inP, unit }) => ({ opacity: inP, filter: `blur(${(1 - inP) * unit * 0.35}px)`, transform: `scale(${1 + (1 - inP) * 0.025})` }),
    exit: { frames: 20, style: (t, c) => ({ opacity: 1 - t, filter: `blur(${t * c.unit * 0.35}px)` }) },
  },
  // Quartier suivant (Kiosque) : la caméra survole la ville ; les textes filent dans le sens du vol
  district: {
    enter: (energy) => (energy === "high" ? 20 : 26),
    fadeOut: false,
    style: ({ inP, unit }) => (inP < 1 ? { opacity: inP, transform: `translateX(${(1 - inP) ** 2 * unit * 14}px)`, filter: `blur(${(1 - inP) * unit}px)` } : {}),
    exit: { frames: 20, style: (t, c) => ({ opacity: 1 - t, transform: `translateX(${-t * t * c.unit * 14}px)`, filter: `blur(${t * c.unit}px)` }) },
  },
};

/** Facing metal poles meet at the scene boundary, then release the new screen. */
function MagneticCover({ p, glow }: { p: number; glow: string }) {
  const k = Easing.inOut(Easing.cubic)(Math.max(0, Math.min(1, p)));
  return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    {[-1, 1].map((side) => <div key={side} style={{ position: "absolute", left: 0, right: 0, [side < 0 ? "top" : "bottom"]: 0, height: "50.1%", transform: `translateY(${side * (1 - k) * 101}%)`, background: side < 0 ? "linear-gradient(175deg, #2D3B4E, #101A29 75%, #060C15)" : "linear-gradient(5deg, #2D3B4E, #101A29 75%, #060C15)", boxShadow: `${side < 0 ? "0 1px" : "0 -1px"} 0 ${glow}, 0 0 24px #0006` }} />)}
  </AbsoluteFill>;
}

/** A near limestone pillar crosses the lens, continuing through the scene boundary. */
function VaultPassCover({ p, entering = false }: { p: number; entering?: boolean }) {
  const k = Easing.inOut(Easing.cubic)(Math.max(0, Math.min(1, p)));
  return <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(95deg, #B8A98D, #E3D7C0 18%, #F0E7D7 80%, #C8BAA1)", transform: `translateX(${entering ? (1 - k) * 100 : (k - 1) * 100}%)`, boxShadow: "12px 0 40px #5A493530" }} />;
}

/** One stone slab continues left to right across the scene boundary. */
function StoneSlideCover({ p, entering = false }: { p: number; entering?: boolean }) {
  return <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(105deg, #17191D, #292C32 60%, #121418)", borderRight: "1px solid #756C5E", transform: `translateX(${entering ? (1 - p) * 100 : (p - 1) * 100}%)`, boxShadow: "12px 0 36px #0008" }} />;
}

/** Halo chaud qui descend du haut de l'image (course du soleil). */
function SunGlow({ intensity, color }: { intensity: number; color: string }) {
  if (intensity <= 0.001) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", opacity: intensity, background: `radial-gradient(ellipse 80% 60% at 70% 0%, color-mix(in srgb, #ffd9a0 70%, ${color}), transparent 70%)`, mixBlendMode: "screen" }} />;
}

/**
 * Bande de sable ratissé (Zen) : `p` = part couverte. En sortie, elle entre par la gauche ; en entrée, elle repart par la droite.
 * Sillons horizontaux, liseré d'ombre sur le bord qui avance, couleur du sable (fond clair de la palette, sinon sable naturel).
 */
function RakeCover({ p, phase, unit, palette }: { p: number; phase: "in" | "out"; unit: number; palette: VideoProps["palette"] }) {
  if (p <= 0.001) return null;
  const sand = /^#[0-9a-f]{6}$/i.test(palette[0]) && Number.parseInt(palette[0].slice(1, 3), 16) + Number.parseInt(palette[0].slice(3, 5), 16) + Number.parseInt(palette[0].slice(5, 7), 16) > 520 ? palette[0] : "#E7DECF";
  const k = Easing.inOut(Easing.cubic)(Math.min(1, p));
  // Sortie : bord droit de la bande à k × 100 % ; entrée : bord gauche qui part vers la droite
  const left = phase === "out" ? -110 + k * 110 : (1 - k) * 110;
  const grooves = `repeating-linear-gradient(180deg, rgb(0 0 0 / 0.07) 0 ${unit * 0.35}px, rgb(255 255 255 / 0.18) ${unit * 0.35}px ${unit * 0.6}px, transparent ${unit * 0.6}px ${unit * 1.7}px)`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${left}%`, width: "110%", background: `${grooves}, ${sand}`, boxShadow: `${phase === "out" ? "" : "-"}${unit * 2}px 0 ${unit * 4}px rgb(60 40 20 / 0.28)` }} />
    </AbsoluteFill>
  );
}

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
export function SceneShell({ transition, next, energy, accent, nextAccent = accent, palette, nextPalette = palette, title = "", nextTitle = "", children }: {
  transition: Transition; next?: Transition; energy: Energy; accent: string; nextAccent?: string;
  /** Palettes et titres des scènes courante et suivante (couvertures thématiques, masque typographique) */
  palette?: VideoProps["palette"]; nextPalette?: VideoProps["palette"]; title?: string; nextTitle?: string;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const motion = useRecipe().motion;
  const filterId = `t${useId().replace(/[^\w-]/g, "")}`;
  const unit = Math.min(width, height) / 100;
  const brick = TRANSITION_BRICKS[transition];
  const exit = 8;
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const inP = interpolate(frame, [0, brick.enter(energy)], [0, 1], { ...clamp, easing: easeFor(motion?.ease) });
  // La sortie dépend de la transition de la scène SUIVANTE : une coupe ou un rideau ne doit pas être précédé d'un fondu.
  const nextBrick = next ? TRANSITION_BRICKS[next] : undefined;
  const fadesOut = nextBrick ? nextBrick.fadeOut : true;
  const outP = fadesOut ? interpolate(frame, [durationInFrames - exit, durationInFrames], [0, 1], clamp) : 0;
  const ownPalette = palette ?? (["#000000", accent, accent] as VideoProps["palette"]);
  const c: TransitionContext = { inP, outP, frame, durationInFrames, accent, unit, aspectRatio: width / height, width, height, palette: ownPalette, title };
  const baseOpacity = brick.opaque || transition === "cut" || transition === "curtain" || transition === "glass" || transition === "glitch" || transition === "cube" ? 1 : inP;
  // Face sortante du cube : charnière sur le bord gauche, la face pivote et s'assombrit
  const cubeOut = next === "cube" ? interpolate(frame, [durationInFrames - CUBE_OUT, durationInFrames], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) }) : 0;
  // Vitre entrante en fin de scène : elle arrive par la droite et finit pile là où la scène suivante la reprend
  const glassIn = next === "glass" ? interpolate(frame, [durationInFrames - GLASS_COVER, durationInFrames], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 0;
  // Sortie thématique : la transition suivante prend la main sur la fin de cette scène
  const themedExit = nextBrick?.exit;
  const exitT = themedExit ? interpolate(frame, [durationInFrames - themedExit.frames, durationInFrames], [0, 1], clamp) : 0;
  const exitCtx: TransitionContext = { ...c, accent: nextAccent, palette: nextPalette ?? ownPalette, title: nextTitle };

  let content = children;
  if (brick.wrap && inP < 1) content = brick.wrap(content, c, `${filterId}-in`);
  if (themedExit && exitT > 0) {
    if (themedExit.wrap) content = themedExit.wrap(content, exitT, exitCtx, `${filterId}-out`);
    if (themedExit.style) content = <AbsoluteFill style={themedExit.style(exitT, exitCtx)}>{content}</AbsoluteFill>;
  }
  const exitStyle = exitMotion(motion?.exit, outP, unit);
  if (exitStyle) content = <AbsoluteFill style={exitStyle}>{content}</AbsoluteFill>;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: baseOpacity * (1 - outP), ...brick.style(c) }}>
        {cubeOut > 0 ? (
          <AbsoluteFill style={{ transform: `perspective(${unit * 220}px) rotateY(${cubeOut * 60}deg)`, transformOrigin: "0% 50%", filter: `brightness(${1 - cubeOut * 0.45})` }}>{content}</AbsoluteFill>
        ) : transition === "glitch" && inP < 1 ? (
          <GlitchSlices intensity={1 - inP} frame={frame} seed="enter" unit={unit}>{content}</GlitchSlices>
        ) : (
          content
        )}
      </AbsoluteFill>
      {brick.overlay?.(c)}
      {themedExit?.cover && exitT > 0 && themedExit.cover({ p: exitT, phase: "out", frame, width, height, unit, color: nextAccent, palette: exitCtx.palette, title: nextTitle })}
      {next === "curtain" && <CurtainCover frame={frame} durationInFrames={durationInFrames} accent={nextAccent} />}
      {glassIn > 0 && <GlassPane left={100 - glassIn * 115} accent={nextAccent} />}
      {next && isCollectionTransition(next) && <CollectionTransitionCover kind={next} progress={1 - interpolate(frame, [durationInFrames - 10, durationInFrames - 1], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })} color={nextAccent} aspectRatio={width / height} />}
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
export { sceneTimeline } from "../../lib/projects/scene-timing";

/**
 * Mouvement du fond autour des frontières de scène, pour les transitions qui déplacent tout le cadre (whip, ripple).
 * `timeline` = sceneTimeline() ; `energyAt(i)` = énergie de la scène i (entrée) ; `ease` = courbe de la recette.
 * Hors fenêtre de transition (ou transition sans mouvement de fond) : aucun style, le fond est rendu tel quel.
 */
export function backdropMotion(timeline: { scene: Scene; from: number }[], frame: number, energyAt: (i: number) => Energy, unit: number, id: string, ease?: MotionEase): { style?: CSSProperties; defs?: ReactNode } {
  for (let i = 1; i < timeline.length; i++) {
    const brick = TRANSITION_BRICKS[timeline[i].scene.transition];
    if (!brick.backdrop) continue;
    const start = timeline[i].from;
    const out = brick.exit?.frames ?? 0;
    const enter = brick.enter(energyAt(i));
    if (frame >= start - out && frame < start) return brick.backdrop({ phase: "out", t: (frame - (start - out)) / Math.max(1, out), unit, frame, id });
    if (frame >= start && frame < start + enter) return brick.backdrop({ phase: "in", t: easeFor(ease)(clamp01((frame - start) / enter)), unit, frame, id });
  }
  return {};
}

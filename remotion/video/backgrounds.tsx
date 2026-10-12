import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { BackgroundKind, Energy } from "../../config/recipes";
import { displayFont, monoFont } from "./fonts";
import { isLight, useBeat } from "./theme";

/**
 * BRIQUES « fonds animés » (recipe.background), dessinées sous toutes les scènes.
 * Règle d'or : tout est calculé à partir de la frame (aucun état, aucun Math.random) pour un rendu déterministe.
 * Penser à ajouter l'aperçu équivalent (en CSS) dans components/media/video-placeholder.tsx.
 */

type Props = { kind: BackgroundKind; palette: [string, string, string]; energy: Energy };

/** Tout ce dont un fond a besoin pour se dessiner à l'image courante. */
type BackgroundContext = {
  frame: number;
  fps: number;
  width: number;
  height: number;
  /** Plus petit côté, pour des tailles qui marchent dans tous les formats */
  min: number;
  /** Temps en secondes, accéléré ou ralenti selon l'énergie */
  t: number;
  /** Pulsation 0 → 1 sur chaque temps musical */
  pulse: number;
  /** Durée d'un temps musical, en images */
  beat: number;
  bg: string;
  /** Couleurs adoucies sur fond clair (des taches sombres saliraient l'image) */
  main: string;
  accent: string;
  /** Couleurs d'origine, pour les traits fins */
  rawMain: string;
  rawAccent: string;
  light: boolean;
};

export function Background({ kind, palette, energy }: Props) {
  const frame = useCurrentFrame();
  const beat = useBeat();
  const { fps, width, height } = useVideoConfig();
  const [bg, rawMain, rawAccent] = palette;
  const light = isLight(bg);
  const soften = (color: string) => (light ? `color-mix(in oklab, ${color}, ${bg} 70%)` : color);
  const c: BackgroundContext = {
    frame,
    fps,
    width,
    height,
    min: Math.min(width, height),
    t: (frame / fps) * (energy === "high" ? 1.6 : energy === "calm" ? 0.7 : 1),
    pulse: beat.pulse(frame),
    beat: beat.beatFrames,
    bg,
    main: soften(rawMain),
    accent: soften(rawAccent),
    rawMain,
    rawAccent,
    light,
  };

  return <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>{BACKGROUNDS[kind](c)}</AbsoluteFill>;
}

/** Tache de couleur diffuse (radial-gradient : bien moins coûteux qu'un flou). */
function blob(color: string, x: number, y: number, size: number, opacity = 1): CSSProperties {
  return {
    position: "absolute",
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    opacity,
    background: `radial-gradient(closest-side, ${color}, color-mix(in oklab, ${color}, transparent 55%) 45%, transparent)`,
  };
}

const fade = (color: string, percent: number) => `color-mix(in oklab, ${color}, transparent ${percent}%)`;

function Blobs({ c }: { c: BackgroundContext }) {
  const { width, height, min, t, main, accent } = c;
  return (
    <>
      <div style={blob(main, width * (0.3 + 0.12 * Math.sin(t * 0.5)), height * (0.3 + 0.1 * Math.cos(t * 0.4)), min * 1.4)} />
      <div style={blob(accent, width * (0.75 + 0.1 * Math.cos(t * 0.35)), height * (0.75 + 0.1 * Math.sin(t * 0.45)), min * 1.3)} />
      <div style={blob(`color-mix(in oklab, ${main}, white 30%)`, width * (0.5 + 0.15 * Math.sin(t * 0.3)), height * 0.5, min * 0.7, 0.6)} />
    </>
  );
}

const BACKGROUNDS: Record<BackgroundKind, (c: BackgroundContext) => ReactNode> = {
  blobs: (c) => <Blobs c={c} />,

  // Taches sombres et retenues, bande de balayage RGB lente, et bandes décalées par saccades (toutes les ~2,4 s)
  glitch: (c) => {
    const glitching = c.frame % 72 > 66;
    const scan = ((c.frame / c.fps) * 0.18) % 1.4 - 0.2;
    return (
      <>
        <AbsoluteFill style={{ opacity: 0.38 }}>
          <Blobs c={c} />
        </AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: c.height * scan,
            height: c.height * 0.12,
            background: `linear-gradient(180deg, transparent, ${fade(c.rawMain, 88)} 45%, ${fade(c.rawAccent, 88)} 55%, transparent)`,
            boxShadow: `0 ${c.min * 0.004}px 0 ${fade(c.rawAccent, 80)}, 0 -${c.min * 0.004}px 0 ${fade(c.rawMain, 80)}`,
          }}
        />
        {glitching &&
          [c.rawMain, c.rawAccent].map((color, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: c.height * random(`band-y-${c.frame}-${i}`),
                height: c.height * (0.02 + random(`band-h-${c.frame}-${i}`) * 0.06),
                background: color,
                opacity: 0.35,
                mixBlendMode: "screen",
                transform: `translateX(${(random(`band-x-${c.frame}-${i}`) - 0.5) * 60}px)`,
              }}
            />
          ))}
      </>
    );
  },

  // Mur de mots géants qui défilent en sens alternés
  type: (c) => (
    <>
      <Blobs c={c} />
      <AbsoluteFill style={{ justifyContent: "center", gap: c.height * 0.02, opacity: 0.08 }}>
        {["LAUNCH", "FASTER", "TODAY"].map((word, i) => (
          <div
            key={word}
            style={{
              whiteSpace: "nowrap",
              fontFamily: displayFont,
              fontWeight: 800,
              fontSize: c.height * 0.2,
              lineHeight: 0.9,
              color: c.rawMain,
              transform: `translateX(${(i % 2 ? 1 : -1) * ((c.frame * 4) % 1200) - 300}px)`,
            }}
          >
            {`${word} `.repeat(6)}
          </div>
        ))}
      </AbsoluteFill>
    </>
  ),

  // Ondes concentriques (aperçus du site ; plus utilisé par une recette)
  rings: (c) => (
    <>
      <div style={blob(c.main, c.width / 2, c.height / 2, c.min * 1.2, 0.55 + c.pulse * 0.25)} />
      {[0, 1, 2, 3].map((i) => {
        const cycle = 4 * c.fps;
        const progress = ((c.frame + i * c.fps) % cycle) / cycle;
        const size = c.min * interpolate(progress, [0, 1], [0.15, 1.3]);
        const color = i % 2 ? c.accent : c.main;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.width / 2 - size / 2,
              top: c.height / 2 - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `${c.min * 0.004}px solid ${color}`,
              boxShadow: `0 0 ${c.min * 0.03}px ${color}`,
              opacity: interpolate(progress, [0, 0.25, 1], [0, 1, 0]),
            }}
          />
        );
      })}
    </>
  ),

  // Neon : grille fine qui s'efface vers les bords, deux faisceaux de lumière qui dérivent,
  // ligne d'horizon lumineuse qui respire sur le beat.
  aurora: (c) => {
    const { width, height, min, t, pulse, main, accent } = c;
    const cell = min * 0.07;
    const horizon = height * (height > width ? 0.86 : 0.8);
    const beam = (color: string, phase: number, y: number, angle: number): CSSProperties => ({
      position: "absolute",
      left: width * (-0.4 + 0.06 * Math.sin(t * 0.25 + phase)),
      top: y - min * 0.4,
      width: width * 1.8,
      height: min * 0.8,
      transform: `rotate(${angle + 3 * Math.sin(t * 0.2 + phase)}deg)`,
      background: `radial-gradient(45% 50% at ${50 + 10 * Math.sin(t * 0.3 + phase)}% 50%, ${fade(color, 45)}, ${fade(color, 85)} 50%, transparent 80%)`,
      mixBlendMode: "screen",
    });
    const mask = "radial-gradient(70% 60% at 50% 45%, black, transparent)";
    return (
      <>
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(to right, ${fade(main, 88)} 1px, transparent 1px), linear-gradient(to bottom, ${fade(main, 88)} 1px, transparent 1px)`,
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `${width / 2}px ${-((t * cell * 0.15) % cell)}px`,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
        <div style={beam(main, 0, height * 0.25, -10)} />
        <div style={beam(accent, 2.4, height * 0.78, 8)} />
        <div style={{ position: "absolute", left: 0, right: 0, top: horizon - min * 0.25, height: min * 0.5, background: `radial-gradient(50% 50% at 50% 50%, ${fade(main, 70)}, transparent)`, opacity: 0.7 + pulse * 0.3 }} />
        <div
          style={{
            position: "absolute",
            left: "8%",
            right: "8%",
            top: horizon,
            height: Math.max(1, min * 0.003),
            background: `linear-gradient(90deg, transparent, ${main} 30%, ${accent} 70%, transparent)`,
            boxShadow: `0 0 ${min * 0.02}px ${main}`,
            opacity: 0.75 + pulse * 0.25,
          }}
        />
      </>
    );
  },

  // Corporate : sol quadrillé en perspective qui avance, fondu vers une ligne d'horizon lumineuse
  grid: (c) => {
    const cell = c.min * 0.09;
    // Le haut du sol projeté (hauteur 0.9H, inclinaison 50°, perspective 0.8H) tombe à ~69 % de la hauteur
    const horizon = c.height * 0.69;
    const floorMask = "linear-gradient(to top, black 35%, transparent 95%)";
    return (
      <>
        <div style={blob(c.main, c.width * 0.5, c.height * 0.12, c.min * 1.5, 0.55)} />
        <div style={blob(c.accent, c.width * 0.5, horizon, c.min * 1.2, 0.18)} />
        <div
          style={{
            position: "absolute",
            left: "-60%",
            right: "-60%",
            bottom: 0,
            height: c.height * 0.9,
            transformOrigin: "50% 100%",
            transform: `perspective(${c.height * 0.8}px) rotateX(50deg)`,
            backgroundImage: `linear-gradient(to right, ${fade(c.rawMain, 50)} 2px, transparent 2px), linear-gradient(to bottom, ${fade(c.rawMain, 50)} 2px, transparent 2px)`,
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `50% ${(c.t * cell * 0.5) % cell}px`,
            maskImage: floorMask,
            WebkitMaskImage: floorMask,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "10%",
            right: "10%",
            top: horizon,
            height: Math.max(1, c.min * 0.0025),
            background: `linear-gradient(90deg, transparent, ${fade(c.rawMain, 20)} 25%, ${fade(c.rawAccent, 30)} 50%, ${fade(c.rawMain, 20)} 75%, transparent)`,
            boxShadow: `0 0 ${c.min * 0.02}px ${c.rawMain}`,
          }}
        />
      </>
    );
  },

  // Formes géométriques qui flottent et tournent doucement
  shapes: (c) => (
    <>
      {[
        { x: 0.18, y: 0.25, s: 0.32, c: c.main, r: 9999, rot: 0 },
        { x: 0.82, y: 0.75, s: 0.28, c: c.accent, r: 0.22, rot: 1 },
        { x: 0.8, y: 0.2, s: 0.12, c: `color-mix(in oklab, ${c.accent}, white 40%)`, r: 9999, rot: 0 },
        { x: 0.22, y: 0.8, s: 0.16, c: `color-mix(in oklab, ${c.main}, white 25%)`, r: 0.3, rot: -1 },
      ].map((shape, i) => {
        const size = c.min * shape.s;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.width * shape.x - size / 2,
              top: c.height * shape.y - size / 2 + Math.sin(c.t + i * 1.7) * c.min * 0.03,
              width: size,
              height: size,
              borderRadius: shape.r > 1 ? "50%" : size * shape.r,
              background: shape.c,
              opacity: 0.85,
              transform: `rotate(${shape.rot * c.t * 20}deg) scale(${1 + c.pulse * 0.04})`,
            }}
          />
        );
      })}
    </>
  ),

  // Égaliseur audio calé sur le tempo
  bars: (c) => (
    <>
      <div style={blob(c.accent, c.width / 2, c.height, c.min * 1.4, 0.5)} />
      <div style={{ position: "absolute", inset: "auto 6% 0 6%", height: "45%", display: "flex", alignItems: "flex-end", gap: "1%", opacity: 0.45 }}>
        {Array.from({ length: 24 }).map((_, i) => {
          const level = 0.2 + 0.8 * Math.abs(Math.sin(c.t * 2 + i * 0.7)) * (0.6 + 0.4 * c.pulse) * (0.5 + random(`bar-${i}`) * 0.5);
          return <div key={i} style={{ flex: 1, height: `${level * 100}%`, borderRadius: 999, background: `linear-gradient(to top, ${c.accent}, ${c.main})` }} />;
        })}
      </div>
    </>
  ),

  // Orbite pointillée avec un satellite
  orbit: (c) => {
    const size = c.min * 0.9;
    return (
      <>
        <div style={blob(c.accent, c.width / 2, c.height / 2, c.min * 1.1, 0.4)} />
        <div
          style={{
            position: "absolute",
            left: c.width / 2 - size / 2,
            top: c.height / 2 - size / 2,
            width: size,
            height: size,
            borderRadius: "50%",
            border: `${c.min * 0.003}px dashed ${fade(c.main, 50)}`,
            transform: `rotate(${c.t * 15}deg)`,
          }}
        >
          <div style={{ position: "absolute", top: -c.min * 0.02, left: size / 2 - c.min * 0.02, width: c.min * 0.04, height: c.min * 0.04, borderRadius: "50%", background: c.accent, boxShadow: `0 0 ${c.min * 0.03}px ${c.accent}` }} />
        </div>
      </>
    );
  },

  // Apple-like : blanc lumineux, une seule lumière très douce qui respire, aucun décor
  clean: (c) => (
    <>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.bg} 0%, color-mix(in oklab, ${c.bg}, #000 4%) 100%)` }} />
      <div style={{ ...blob("#ffffff", c.width * 0.5, c.height * (0.3 + 0.03 * Math.sin(c.t * 0.4)), c.min * 1.6, 0.9) }} />
    </>
  ),

  // Liquid Glass : panneaux de verre dépoli qui flottent devant des couleurs fluides, avec un reflet qui glisse
  glass: (c) => {
    const { width, height, min, t } = c;
    const blur = `blur(${min * 0.035}px) saturate(170%)`;
    return (
      <>
        <Blobs c={c} />
        {GLASS_PANELS.map((panel, i) => {
          const w = min * panel.w;
          const h = min * panel.h;
          const sheen = ((t * 0.12 + i * 0.27) % 1.6) - 0.3;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: width * panel.x - w / 2,
                top: height * panel.y - h / 2 + Math.sin(t * 0.6 + i * 1.8) * min * 0.025,
                width: w,
                height: h,
                borderRadius: panel.round ? "50%" : min * 0.04,
                overflow: "hidden",
                transform: `rotate(${panel.rot + Math.sin(t * 0.4 + i) * 2}deg)`,
                WebkitBackdropFilter: blur,
                backdropFilter: blur,
                background: "linear-gradient(135deg, rgb(255 255 255 / 0.18), rgb(255 255 255 / 0.04) 60%)",
                border: "1px solid rgb(255 255 255 / 0.24)",
                boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.4), 0 ${min * 0.04}px ${min * 0.08}px -${min * 0.03}px rgb(0 0 0 / 0.45)`,
              }}
            >
              <div style={{ position: "absolute", top: "-50%", bottom: "-50%", left: `${sheen * 100}%`, width: "30%", transform: "rotate(20deg)", background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.16), transparent)" }} />
            </div>
          );
        })}
      </>
    );
  },

  // 3D Flat : cubes isométriques qui flottent au-dessus d'une grille isométrique, avec leur ombre portée
  iso: (c) => {
    const { width, height, min, t } = c;
    const line = fade(c.rawMain, 90);
    const mask = "radial-gradient(70% 60% at 50% 50%, black, transparent)";
    return (
      <>
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(30deg, ${line} 0 1px, transparent 1px ${min * 0.06}px), repeating-linear-gradient(150deg, ${line} 0 1px, transparent 1px ${min * 0.06}px)`,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
        {ISO_CUBES.map((cube, i) => {
          const s = min * cube.s;
          const lift = (0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.4)) * min * 0.035;
          const cx = width * cube.x;
          const cy = height * cube.y;
          const color = cube.accent ? c.rawAccent : c.rawMain;
          return (
            <div key={i}>
              <div style={{ position: "absolute", left: cx - s, top: cy + s * 0.75, width: s * 2, height: s * 0.7, borderRadius: "50%", background: "rgb(0 0 0 / 0.12)", transform: `scale(${1 - lift / (min * 0.1)})`, filter: `blur(${s * 0.12}px)` }} />
              <svg viewBox="-0.87 -1 1.74 2" width={s * 1.74} height={s * 2} style={{ position: "absolute", left: cx - s * 0.87, top: cy - s - lift }}>
                <polygon points="0,-1 0.866,-0.5 0,0 -0.866,-0.5" fill={`color-mix(in oklab, ${color}, white 40%)`} />
                <polygon points="-0.866,-0.5 0,0 0,1 -0.866,0.5" fill={color} />
                <polygon points="0,0 0.866,-0.5 0.866,0.5 0,1" fill={`color-mix(in oklab, ${color}, black 22%)`} />
              </svg>
            </div>
          );
        })}
      </>
    );
  },

  // Brutalist : filets épais sur une grille asymétrique, blocs pleins qui sautent de case en case sur le tempo
  blocks: (c) => {
    const { width, height, min, frame } = c;
    const rule = Math.max(2, min * 0.004);
    const ink = fade(c.rawMain, 20);
    const columns = [0.06, 0.34, 0.62, 0.94];
    const bands = [
      [0, 0.13],
      [0.87, 1],
    ];
    const step = Math.floor(frame / Math.max(6, Math.round(c.beat * 2)));
    return (
      <>
        {columns.map((x) => (
          <div key={x} style={{ position: "absolute", top: 0, bottom: 0, left: width * x - rule / 2, width: rule, background: ink }} />
        ))}
        {bands.map(([top, bottom]) => [top, bottom].filter((y) => y > 0 && y < 1).map((y) => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: height * y - rule / 2, height: rule, background: ink }} />))}
        {[0, 1, 2].map((i) => {
          const col = Math.floor(random(`blk-c-${i}-${step}`) * 3);
          const [top, bottom] = bands[(i + step) % 2];
          const x0 = columns[col];
          const x1 = columns[col + 1];
          const share = 0.35 + random(`blk-w-${i}-${step}`) * 0.65;
          const fromRight = random(`blk-s-${i}-${step}`) > 0.5;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: width * (fromRight ? x1 - (x1 - x0) * share : x0),
                top: height * top,
                width: width * (x1 - x0) * share,
                height: height * (bottom - top),
                background: i === 0 ? c.rawAccent : c.rawMain,
              }}
            />
          );
        })}
      </>
    );
  },

  // Minimal : un seul cercle très fin qui se trace autour du texte, et un point qui en fait le tour
  line: (c) => {
    const { width, height, min, frame, fps, t } = c;
    const r = min * 0.38;
    const drawn = interpolate(frame, [0, fps * 2.5], [0, 1], { extrapolateRight: "clamp" });
    const angle = -Math.PI / 2 + t * 0.35;
    return (
      <>
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <circle cx={width / 2} cy={height / 2} r={r} fill="none" stroke={fade(c.rawMain, 82)} strokeWidth={Math.max(1, min * 0.0018)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - drawn} transform={`rotate(-90 ${width / 2} ${height / 2})`} />
          <circle cx={width / 2} cy={height / 2} r={r * 1.18} fill="none" stroke={fade(c.rawMain, 93)} strokeWidth={Math.max(1, min * 0.0012)} />
        </svg>
        <div style={{ position: "absolute", left: width / 2 + Math.cos(angle) * r - min * 0.008, top: height / 2 + Math.sin(angle) * r - min * 0.008, width: min * 0.016, height: min * 0.016, borderRadius: "50%", background: c.rawMain, opacity: drawn }} />
      </>
    );
  },

  // Editorial : papier crème, colonnes de mise en page et filets qui se tracent à l'ouverture
  paper: (c) => {
    const draw = interpolate(c.frame, [0, c.fps * 1.2], [0, 1], { extrapolateRight: "clamp" });
    const margin = c.width * 0.06;
    const rule = (top: number, origin: "left" | "right") => (
      <div style={{ position: "absolute", left: margin, right: margin, top, height: Math.max(1, c.min * 0.0016), background: fade(c.rawMain, 30), transformOrigin: origin, transform: `scaleX(${draw})` }} />
    );
    return (
      <>
        <AbsoluteFill style={{ background: `linear-gradient(170deg, ${c.bg} 0%, color-mix(in oklab, ${c.bg}, #000 6%) 100%)` }} />
        <div style={blob("#ffffff", c.width * (0.3 + 0.05 * Math.sin(c.t * 0.3)), c.height * 0.2, c.min * 1.5, 0.55)} />
        <AbsoluteFill
          style={{
            left: margin,
            right: margin,
            backgroundImage: `repeating-linear-gradient(90deg, ${fade(c.rawMain, 93)} 0 1px, transparent 1px ${(c.width - margin * 2) / 12}px)`,
          }}
        />
        {rule(c.height * 0.07, "left")}
        {rule(c.height * 0.93, "right")}
        <div style={{ position: "absolute", left: margin, top: c.height * 0.07 - c.min * 0.012, width: c.min * 0.024, height: c.min * 0.024, background: c.rawAccent, opacity: draw }} />
      </>
    );
  },

  // Terminal : du code qui défile lentement en fond, très discret, sous une lueur verte
  terminal: (c) => {
    const size = c.min * 0.024;
    const lineHeight = size * 1.7;
    const lines = Array.from({ length: CODE.length * 2 }, (_, i) => CODE[i % CODE.length]);
    const scroll = (c.frame * size * 0.08) % (CODE.length * lineHeight);
    return (
      <>
        <div style={blob(c.main, c.width * 0.5, c.height * 0.45, c.min * 1.3, 0.22)} />
        <AbsoluteFill style={{ padding: `0 ${c.width * 0.06}px`, opacity: 0.09, transform: `translateY(${-scroll}px)` }}>
          {lines.map((line, i) => (
            <div key={i} style={{ fontFamily: monoFont, fontSize: size, lineHeight: `${lineHeight}px`, color: c.rawMain, whiteSpace: "pre", paddingLeft: `${(i % CODE.length) % 3}em` }}>
              {line}
            </div>
          ))}
        </AbsoluteFill>
        <AbsoluteFill style={{ background: `radial-gradient(80% 70% at 50% 50%, transparent 40%, ${c.bg})` }} />
      </>
    );
  },

  // Luxe : faisceau de lumière dorée qui oscille lentement, poussière en suspension
  spotlight: (c) => {
    const { width, height, min, t } = c;
    return (
      <>
        <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 100%, color-mix(in oklab, ${c.bg}, ${c.rawMain} 8%), ${c.bg} 70%)` }} />
        <div
          style={{
            position: "absolute",
            left: width / 2 - min * 0.9,
            top: -height * 0.1,
            width: min * 1.8,
            height: height * 1.2,
            transformOrigin: "50% 0%",
            transform: `rotate(${Math.sin(t * 0.25) * 7}deg)`,
            background: `radial-gradient(42% 75% at 50% 0%, ${fade(c.rawMain, 72)}, ${fade(c.rawMain, 92)} 55%, transparent 80%)`,
          }}
        />
        {Array.from({ length: 36 }).map((_, i) => {
          const speed = 0.01 + random(`dust-s-${i}`) * 0.02;
          const y = (((random(`dust-y-${i}`) - t * speed) % 1) + 1) % 1;
          const size = min * (0.002 + random(`dust-r-${i}`) * 0.004);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: width * random(`dust-x-${i}`) + Math.sin(t * 0.5 + i) * min * 0.01,
                top: height * y,
                width: size,
                height: size,
                borderRadius: "50%",
                background: c.rawAccent,
                opacity: 0.15 + 0.35 * Math.abs(Math.sin(t * 0.8 + i * 1.3)),
              }}
            />
          );
        })}
      </>
    );
  },

  // Y2K : reflets irisés qui tournent et étincelles à quatre branches qui scintillent
  chrome: (c) => {
    const { width, height, min, t } = c;
    return (
      <>
        <div style={blob(c.main, width * (0.25 + 0.1 * Math.sin(t * 0.4)), height * (0.3 + 0.08 * Math.cos(t * 0.5)), min * 1.2)} />
        <div style={blob(c.accent, width * (0.78 + 0.08 * Math.cos(t * 0.35)), height * (0.7 + 0.1 * Math.sin(t * 0.4)), min * 1.1)} />
        <div style={blob(`color-mix(in oklab, #f0abfc, ${c.bg} ${c.light ? 50 : 0}%)`, width * (0.6 + 0.15 * Math.sin(t * 0.3)), height * 0.25, min * 0.8, 0.8)} />
        {Array.from({ length: 10 }).map((_, i) => {
          const twinkle = Math.pow(Math.max(0, Math.sin(t * 1.6 + i * 2.1)), 3);
          const size = min * (0.03 + random(`spark-s-${i}`) * 0.04) * twinkle;
          if (size < 1) return null;
          return (
            <svg
              key={i}
              viewBox="0 0 100 100"
              width={size}
              height={size}
              style={{
                position: "absolute",
                left: width * (0.05 + random(`spark-x-${i}`) * 0.9) - size / 2,
                top: height * (0.05 + random(`spark-y-${i}`) * 0.9) - size / 2,
                transform: `rotate(${t * 40 + i * 30}deg)`,
                filter: `drop-shadow(0 0 ${min * 0.006}px ${c.rawAccent})`,
              }}
            >
              <path d={SPARKLE} fill={i % 2 ? c.rawMain : c.rawAccent} />
            </svg>
          );
        })}
      </>
    );
  },

  // Dashboard : grille de points + courbes de données qui se tracent puis glissent lentement
  data: (c) => {
    const { width, height, min, fps, frame } = c;
    const dot = min * 0.045;
    const mask = "radial-gradient(75% 65% at 50% 50%, black, transparent)";
    return (
      <>
        <div style={blob(c.main, width * 0.2, height * 0.15, min * 1.2, 0.35)} />
        <div style={blob(c.accent, width * 0.85, height * 0.9, min * 1.1, 0.22)} />
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(${fade(c.rawMain, 70)} ${Math.max(1, min * 0.0018)}px, transparent ${Math.max(1.5, min * 0.0022)}px)`,
            backgroundSize: `${dot}px ${dot}px`,
            maskImage: mask,
            WebkitMaskImage: mask,
            opacity: 0.6,
          }}
        />
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
          {[
            { base: 0.68, amp: 0.1, color: c.rawMain, delay: 0 },
            { base: 0.8, amp: 0.06, color: c.rawAccent, delay: 12 },
          ].map((curve, i) => {
            const drawn = interpolate(frame - curve.delay, [0, fps * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const shift = (frame / fps) * min * 0.02;
            const points = Array.from({ length: 41 }, (_, k) => {
              const x = (k / 40) * width * 1.2 - shift;
              const u = (k + i * 7) / 40;
              const y = height * (curve.base - curve.amp * (Math.sin(u * 7) * 0.5 + Math.sin(u * 13 + 1) * 0.3 + u * 0.8));
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ");
            return (
              <polyline
                key={i}
                points={points}
                pathLength={1}
                fill="none"
                stroke={curve.color}
                strokeWidth={Math.max(1.5, min * 0.003)}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1 1"
                strokeDashoffset={1 - drawn}
                opacity={0.35}
                style={{ filter: `drop-shadow(0 0 ${min * 0.008}px ${curve.color})` }}
              />
            );
          })}
        </svg>
      </>
    );
  },
};

/** Panneaux du fond "glass" : position (fraction de l'image), taille (fraction du plus petit côté), rotation. */
const GLASS_PANELS = [
  { x: 0.14, y: 0.28, w: 0.34, h: 0.46, rot: -10, round: false },
  { x: 0.87, y: 0.22, w: 0.24, h: 0.24, rot: 0, round: true },
  { x: 0.84, y: 0.8, w: 0.42, h: 0.22, rot: 8, round: false },
  { x: 0.18, y: 0.86, w: 0.18, h: 0.18, rot: 0, round: true },
];

/** Cubes du fond "iso" : position, taille (fraction du plus petit côté), couleur d'accent ou principale. */
const ISO_CUBES = [
  { x: 0.13, y: 0.24, s: 0.09, accent: false },
  { x: 0.87, y: 0.2, s: 0.06, accent: true },
  { x: 0.82, y: 0.74, s: 0.11, accent: false },
  { x: 0.2, y: 0.78, s: 0.05, accent: true },
  { x: 0.62, y: 0.12, s: 0.035, accent: false },
];

const SPARKLE ="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0Z";

/** Code générique affiché (à 9 % d'opacité) derrière le template Terminal. */
const CODE = [
  "import { launch } from './app'",
  "",
  "export async function ship(release) {",
  "const build = await compile(release)",
  "if (!build.ok) throw build.error",
  "await deploy(build, { region: 'eu' })",
  "return notify('live')",
  "}",
  "",
  "$ npm run deploy",
  "✓ build completed in 1.2s",
  "✓ 42 tests passed",
  "→ deployed to production",
  "",
  "const users = await db.query(sql`select *`)",
  "for (const user of users) track(user)",
  "git commit -m 'feat: launch day'",
  "",
];

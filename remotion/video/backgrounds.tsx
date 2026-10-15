import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { BackgroundKind, Energy } from "../../config/recipes";
import { displayFont, monoFont } from "./fonts";
import { Cube } from "./cube3d";
import { glitchBurst } from "./glitch-fx";
import { isLight, useBeat } from "./theme";
import { SignatureBackground } from "./signature-backgrounds";
import { CollectionBackground } from "./collection-backgrounds";

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

/** Neige numérique du fond glitch (bruit fin, contrasté). */
const STATIC_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='turbulence' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 2.2 -0.6'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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
  monolith: (c) => <CollectionBackground kind="monolith" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  focus: (c) => <CollectionBackground kind="focus" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  prism: (c) => <CollectionBackground kind="prism" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  papercut: (c) => <CollectionBackground kind="papercut" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  metro: (c) => <CollectionBackground kind="metro" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  "blueprint-draft": (c) => <SignatureBackground kind="blueprint-draft" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  "ocean-tide": (c) => <SignatureBackground kind="ocean-tide" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  "playful-fluid": (c) => <SignatureBackground kind="playful-fluid" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  "corporate-panels": (c) => <SignatureBackground kind="corporate-panels" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  "swiss-rules": (c) => <SignatureBackground kind="swiss-rules" palette={[c.bg, c.rawMain, c.rawAccent]} />,
  "pulse-edge": (c) => <SignatureBackground kind="pulse-edge" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} pulse={c.pulse} />,
  "studio-stage": (c) => <SignatureBackground kind="studio-stage" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  "gold-atelier": (c) => <SignatureBackground kind="gold-atelier" palette={[c.bg, c.rawMain, c.rawAccent]} time={c.t} />,
  blobs: (c) => <Blobs c={c} />,

  // Taches sombres et retenues, bande de balayage RGB lente, et bandes décalées par saccades (toutes les ~2,4 s)
  glitch: (c) => {
    // Sursauts sur le même calendrier que la caméra « glitch » (glitch-fx.ts)
    const glitching = glitchBurst(c.frame, "bg") > 0;
    const noiseStep = Math.floor(c.frame / 2) % 8;
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
        {/* Neige numérique permanente, qui saute toutes les 2 images */}
        <AbsoluteFill style={{ backgroundImage: STATIC_NOISE, backgroundSize: `${c.min * 0.35}px ${c.min * 0.35}px`, backgroundPosition: `${random(`sn-x-${noiseStep}`) * 300}px ${random(`sn-y-${noiseStep}`) * 300}px`, opacity: c.light ? 0.05 : 0.07, mixBlendMode: c.light ? "multiply" : "screen" }} />
        {/* Datamosh : macro-blocs pendant un sursaut */}
        {glitching &&
          Array.from({ length: 7 }, (_, i) => {
            const r = (k: string) => random(`mosh-${k}-${c.frame}-${i}`);
            const s = c.min * (0.05 + r("s") * 0.12);
            return <div key={`mosh-${i}`} style={{ position: "absolute", left: r("x") * c.width, top: r("y") * c.height, width: s * (1 + r("w") * 2.5), height: s * 0.6, background: i % 2 ? c.rawMain : c.rawAccent, opacity: 0.22, mixBlendMode: "screen" }} />;
          })}
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

  // Pulse : piloté par la musique. À chaque temps, une onde de choc part du centre (épaisse puis fine) ;
  // un spectre circulaire de barres réagit au beat autour d'un anneau lumineux ; le cœur flashe sur chaque temps.
  rings: (c) => {
    const { width, height, min, frame, beat, pulse } = c;
    const cx = width / 2;
    const cy = height / 2;
    const reach = Math.hypot(width, height) / 2;
    const beatIndex = Math.floor(frame / Math.max(1, beat));
    const core = min * 0.3;
    const waves = [0, 1, 2, 3, 4].flatMap((k) => {
      const b = beatIndex - k;
      if (b < 0) return [];
      const age = (frame - b * beat) / (beat * 5);
      if (age < 0 || age >= 1) return [];
      const size = (core + Easing.out(Easing.cubic)(age) * (reach * 1.15 - core)) * 2;
      const color = b % 2 ? c.rawAccent : c.rawMain;
      return [{ key: b, size, color, opacity: Math.pow(1 - age, 1.6) * 0.85, thickness: min * (0.002 + 0.014 * Math.pow(1 - age, 2)) }];
    });
    const bars = 72;
    return (
      <>
        <div style={blob(c.main, cx, cy, min * (1.15 + pulse * 0.12), 0.5 + pulse * 0.3)} />
        {waves.map((w) => (
          <div
            key={w.key}
            style={{
              position: "absolute",
              left: cx - w.size / 2,
              top: cy - w.size / 2,
              width: w.size,
              height: w.size,
              borderRadius: "50%",
              border: `${w.thickness}px solid ${w.color}`,
              boxShadow: `0 0 ${min * 0.04}px ${w.color}, inset 0 0 ${min * 0.03}px ${w.color}`,
              opacity: w.opacity,
            }}
          />
        ))}
        {/* Spectre circulaire : chaque barre a sa « fréquence », amplifiée sur le temps fort */}
        {Array.from({ length: bars }, (_, i) => {
          const angle = (i / bars) * 360;
          const level = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.73 + frame * 0.11)) * (0.55 + 0.45 * random(`spectrum-${i}-${beatIndex}`));
          const len = min * (0.012 + 0.11 * level * (0.35 + pulse * 0.65));
          const w = min * 0.007;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: cx - w / 2,
                top: cy - core - len,
                width: w,
                height: len,
                borderRadius: w,
                background: `linear-gradient(0deg, ${c.rawMain}, ${c.rawAccent})`,
                opacity: 0.55,
                transformOrigin: `50% ${core + len}px`,
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
        })}
        <div style={{ position: "absolute", left: cx - core, top: cy - core, width: core * 2, height: core * 2, borderRadius: "50%", border: `${min * 0.004}px solid ${fade(c.rawAccent, 30)}`, boxShadow: `0 0 ${min * (0.03 + pulse * 0.05)}px ${c.rawAccent}` }} />
        <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${fade("#ffffff", 100 - pulse * 14)}, transparent ${min * 0.35}px)` }} />
      </>
    );
  },

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
          // Vrai cube 3D qui tourne lentement sur lui-même (sens et vitesse propres à chaque cube) en flottant
          const spin = t * (14 + i * 5) * (i % 2 ? -1 : 1);
          return (
            <div key={i}>
              <div style={{ position: "absolute", left: cx - s, top: cy + s * 0.85, width: s * 2, height: s * 0.6, borderRadius: "50%", background: "rgb(0 0 0 / 0.14)", transform: `scale(${1 - lift / (min * 0.1)})`, filter: `blur(${s * 0.12}px)` }} />
              <div style={{ position: "absolute", left: cx - s / 2, top: cy - s / 2 - lift, width: s, height: s, perspective: s * 6 }}>
                <Cube size={s} rotateX={-28 + Math.sin(t * 0.5 + i) * 8} rotateY={35 + spin} color={color} />
              </div>
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

  // Pop art : trame de points fine partout, et une trame plus grosse révélée par une tache qui se promène (et respire sur le beat)
  halftone: (c) => {
    const { width, height, min, t, pulse, rawMain, rawAccent } = c;
    const cell = min * 0.045;
    const dots = (color: string, radius: number) => `radial-gradient(circle, ${color} ${radius}px, transparent ${radius + 1}px)`;
    const cx = width * (0.5 + 0.32 * Math.sin(t * 0.35));
    const cy = height * (0.5 + 0.28 * Math.cos(t * 0.27));
    const reveal = min * (0.42 + pulse * 0.05);
    const mask = `radial-gradient(circle ${reveal}px at ${cx}px ${cy}px, black, black 35%, transparent)`;
    return (
      <>
        <div style={blob(c.accent, width * 0.82, height * 0.18, min * 1.1, 0.45)} />
        <AbsoluteFill style={{ backgroundImage: dots(fade(rawMain, c.light ? 70 : 78), cell * 0.12), backgroundSize: `${cell}px ${cell}px` }} />
        <AbsoluteFill
          style={{
            backgroundImage: dots(fade(rawAccent, c.light ? 55 : 60), cell * 0.28),
            backgroundSize: `${cell}px ${cell}px`,
            backgroundPosition: `${cell / 2}px ${cell / 2}px`,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      </>
    );
  },

  // Sport : trois grandes bandes diagonales qui défilent, sur un fin rayé, accélérées par l'énergie
  stripes: (c) => {
    const { width, height, min, t, pulse } = c;
    const span = Math.hypot(width, height) * 1.6;
    const band = min * 0.16;
    const travel = span * 0.5;
    const shift = ((t * min * 0.12) % travel) - travel / 2;
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", width: span, height: span, transform: `rotate(-24deg)` }}>
          <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(90deg, ${fade(c.rawMain, c.light ? 88 : 92)} 0 ${min * 0.004}px, transparent ${min * 0.004}px ${min * 0.05}px)` }} />
          {[c.main, c.accent, c.main].map((color, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: span / 2 + shift + (i - 1) * span * 0.17 - band / 2 + (i === 1 ? band * 0.6 : 0),
                width: i === 1 ? band * 0.45 : band,
                background: color,
                opacity: (i === 1 ? 0.26 : 0.16) + pulse * 0.06,
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
    );
  },

  // Soleil rétro : ciel dégradé, grand disque qui monte lentement, coupé de bandes de plus en plus épaisses vers le bas
  sun: (c) => {
    const { width, height, min, frame, fps, pulse } = c;
    const size = min * 0.78;
    // Le soleil se couche sous le texte (bas du cadre) et remonte à peine : le centre reste libre pour les titres
    const rise = interpolate(frame, [0, fps * 30], [0.05, -0.03], { extrapolateRight: "clamp" });
    const cx = width / 2;
    const cy = height * (height > width ? 0.8 : 0.93) + min * rise;
    // Rayures du soleil : des bandes transparentes de plus en plus épaisses vers le bas, dans le disque lui-même
    const stripes = "linear-gradient(180deg, black 52%, transparent 52% 55%, black 55% 63%, transparent 63% 67.5%, black 67.5% 74%, transparent 74% 80%, black 80% 85%, transparent 85% 92.5%, black 92.5%)";
    return (
      <>
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.bg} 25%, ${fade(c.main, 60)} 100%)` }} />
        <div style={blob(c.accent, cx, cy, size * 2, 0.45 + pulse * 0.12)} />
        <div
          style={{
            position: "absolute",
            left: cx - size / 2,
            top: cy - size / 2,
            width: size,
            height: size,
            borderRadius: "50%",
            background: `linear-gradient(180deg, ${c.rawAccent}, ${c.rawMain})`,
            opacity: c.light ? 0.5 : 0.7,
            maskImage: stripes,
            WebkitMaskImage: stripes,
          }}
        />
      </>
    );
  },

  // Fête : confettis (rectangles et ronds) qui tombent en tournoyant, chacun sa vitesse ; positions tirées au sort de façon stable
  confetti: (c) => {
    const { width, height, min, frame, fps } = c;
    const colors = [c.rawMain, c.rawAccent, c.light ? "#111111" : "#ffffff"];
    return (
      <>
        <div style={blob(c.main, width * 0.5, height * 0.45, min * 1.3, 0.35)} />
        {Array.from({ length: 42 }, (_, i) => {
          const r = (k: string) => random(`confetti-${k}-${i}`);
          const size = min * (0.012 + r("s") * 0.018);
          const speed = height * (0.06 + r("v") * 0.08);
          const fall = height + size * 4;
          const y = ((r("y") * fall + (frame / fps) * speed) % fall) - size * 2;
          const x = width * r("x") + Math.sin((frame / fps) * (0.8 + r("w")) + r("p") * 6.28) * min * 0.02;
          const round = r("shape") > 0.7;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: size,
                height: round ? size : size * 0.45,
                borderRadius: round ? "50%" : size * 0.08,
                background: colors[i % colors.length],
                opacity: 0.75,
                transform: `rotate(${(frame / fps) * (90 + r("r") * 240) * (r("d") > 0.5 ? 1 : -1)}deg) scaleX(${Math.cos((frame / fps) * (2 + r("f") * 3))})`,
              }}
            />
          );
        })}
      </>
    );
  },

  // Océan : quatre vagues pleines superposées dans le bas du cadre, chacune son rythme ; la plus proche respire sur le beat
  waves: (c) => {
    const { width, height, min, t, pulse } = c;
    const layers = [
      { base: 0.58, amp: 0.035, k: 1.6, speed: 0.35, color: fade(c.main, 78) },
      { base: 0.66, amp: 0.04, k: 2.3, speed: -0.45, color: fade(c.accent, 75) },
      { base: 0.75, amp: 0.035, k: 1.9, speed: 0.6, color: fade(c.main, 62) },
      { base: 0.85, amp: 0.03 + pulse * 0.008, k: 2.8, speed: -0.8, color: fade(c.accent, 55) },
    ];
    return (
      <>
        <div style={blob(c.accent, width * 0.75, height * 0.2, min * 1.1, 0.35)} />
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          {layers.map((l, i) => {
            const points = Array.from({ length: 49 }, (_, k) => {
              const x = (k / 48) * width;
              const u = k / 48;
              const y = height * (l.base + l.amp * Math.sin(u * Math.PI * 2 * l.k + t * l.speed * 2 + i) + l.amp * 0.4 * Math.sin(u * Math.PI * 5 - t * l.speed * 3));
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" L");
            return <path key={i} d={`M0,${height} L${points} L${width},${height} Z`} fill={l.color} />;
          })}
        </svg>
      </>
    );
  },

  // Années 70 : éventail de rayons qui tourne lentement autour d'un point sous le cadre, halo chaud au centre
  sunburst: (c) => {
    const { width, height, min, t, pulse } = c;
    const angle = t * 4;
    const rays = `repeating-conic-gradient(from ${angle}deg at 50% 115%, ${fade(c.rawMain, c.light ? 80 : 84)} 0deg 6deg, transparent 6deg 12deg)`;
    return (
      <>
        <AbsoluteFill style={{ background: rays }} />
        <div style={blob(c.accent, width / 2, height * 1.05, min * (1.5 + pulse * 0.08), 0.6)} />
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.bg} 0%, transparent 35%)` }} />
      </>
    );
  },

  // Topographie : courbes de niveau autour de deux sommets, qui ondulent lentement
  topo: (c) => {
    const { width, height, min, t } = c;
    const peaks = [
      { x: width * 0.78, y: height * 0.3, rings: 11, seed: 0 },
      { x: width * 0.18, y: height * 0.82, rings: 8, seed: 3 },
    ];
    const stroke = Math.max(1, min * 0.0016);
    return (
      <>
        <div style={blob(c.main, width * 0.78, height * 0.3, min * 0.9, 0.3)} />
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          {peaks.flatMap((p) =>
            Array.from({ length: p.rings }, (_, k) => {
              const r0 = min * (0.05 + k * 0.055);
              const pts = Array.from({ length: 73 }, (_, j) => {
                const a = (j / 72) * Math.PI * 2;
                const r = r0 * (1 + 0.12 * Math.sin(3 * a + p.seed + k * 0.35 + t * 0.12) + 0.07 * Math.sin(5 * a - p.seed - t * 0.09));
                return `${(p.x + Math.cos(a) * r).toFixed(1)},${(p.y + Math.sin(a) * r * 0.85).toFixed(1)}`;
              }).join(" ");
              return <polygon key={`${p.seed}-${k}`} points={pts} fill="none" stroke={k % 4 === 0 ? c.rawAccent : c.rawMain} strokeWidth={k % 4 === 0 ? stroke * 1.8 : stroke} opacity={k % 4 === 0 ? 0.35 : 0.2} />;
            }),
          )}
        </svg>
      </>
    );
  },

  // Hyperespace : étoiles qui jaillissent du centre en traînées, plus vite en énergie haute
  starfield: (c) => {
    const { width, height, min, t } = c;
    const cx = width / 2;
    const cy = height / 2;
    const reach = Math.hypot(width, height) / 2;
    return (
      <>
        <div style={blob(c.main, cx, cy, min * 0.9, 0.35)} />
        {Array.from({ length: 90 }, (_, i) => {
          const r = (k: string) => random(`star-${k}-${i}`);
          const angle = r("a") * Math.PI * 2;
          // Profondeur 0 → 1 qui boucle : l'étoile part du centre et accélère vers le bord
          const depth = (r("z") + t * (0.12 + r("v") * 0.1)) % 1;
          const dist = Math.pow(depth, 2.2) * reach * 1.1;
          const len = Math.max(min * 0.002, dist * 0.12 * depth);
          const size = Math.max(1, min * 0.0035 * depth + 0.5);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: cx + Math.cos(angle) * dist,
                top: cy + Math.sin(angle) * dist - size / 2,
                width: len,
                height: size,
                borderRadius: size,
                background: `linear-gradient(90deg, transparent, ${i % 5 === 0 ? c.rawAccent : c.light ? c.rawMain : "#ffffff"})`,
                opacity: Math.min(1, depth * 1.6),
                transform: `rotate(${angle}rad) translateX(-${len}px)`,
                transformOrigin: "0 50%",
              }}
            />
          );
        })}
      </>
    );
  },

  // Rétro jeu vidéo : grille de pixels dont quelques cases s'allument à chaque temps musical
  pixels: (c) => {
    const { width, height, min, frame, pulse } = c;
    const cell = min * 0.065;
    const cols = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);
    const beatIndex = Math.floor(frame / Math.max(1, c.beat));
    const lit: ReactNode[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const roll = random(`px-${x}-${y}-${beatIndex}`);
        if (roll < 0.9) continue;
        lit.push(
          <div
            key={`${x}-${y}`}
            style={{ position: "absolute", left: x * cell + cell * 0.08, top: y * cell + cell * 0.08, width: cell * 0.84, height: cell * 0.84, background: roll > 0.97 ? c.rawAccent : c.main, opacity: 0.14 + pulse * 0.22 }}
          />,
        );
      }
    }
    const line = fade(c.rawMain, c.light ? 85 : 88);
    return (
      <>
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: `${cell}px ${cell}px` }} />
        {/* Le centre reste calme : les cases allumées n'y passent jamais derrière les textes */}
        <AbsoluteFill style={{ maskImage: "radial-gradient(ellipse 62% 52% at 50% 50%, transparent 55%, black 100%)", WebkitMaskImage: "radial-gradient(ellipse 62% 52% at 50% 50%, transparent 55%, black 100%)" }}>{lit}</AbsoluteFill>
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

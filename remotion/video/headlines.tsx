import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { sceneHeadlines, type Scene } from "../../lib/projects/scenes";
import type { VideoProps } from "../props";
import { MovableText, TextSceneContext } from "./movable-text";
import { useTitlePaint } from "./titles";
import { luminance, textColorOn, useIsPortrait, useTitleFont, useTitleScale, useUnit } from "./theme";

/**
 * TITRES ENCHAÎNÉS (scene.kind = "headlines") : 2 à 5 gros titres, l'un après l'autre.
 * Chaque titre a la même part de la scène ; la transition en prend environ un tiers, bornée :
 * une scène courte enchaîne donc plus vite. Le dernier titre, point d'orgue, prend la couleur d'accent
 * (ou la principale) si elle reste lisible sur le fond — une marque peut avoir du noir en accent sur un fond sombre.
 * Trois transitions (scene.presentation) :
 * - punch : chaque titre s'écrase à l'écran (zoom arrière, flou, onde de choc) et repousse le précédent
 * - wipe  : une bande de couleur balaie l'écran et emporte un titre pour dévoiler le suivant
 * - roll  : les titres défilent verticalement comme les rouleaux d'une machine à sous
 */

type Props = { scene: Scene; props: VideoProps };
type Style = "punch" | "wipe" | "roll";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeInOut = Easing.inOut(Easing.cubic);

function headlineStyle(scene: Scene, energy: VideoProps["graph"]["energy"]): Style {
  if (scene.presentation === "punch" || scene.presentation === "wipe" || scene.presentation === "roll") return scene.presentation;
  return energy === "high" ? "punch" : energy === "calm" ? "roll" : "wipe";
}

/**
 * Couleurs par défaut des titres : celle du texte, et la mise en avant du dernier (l'accent, sinon la principale,
 * seulement si elle se détache du fond). Partagé avec l'éditeur pour afficher la couleur actuelle de chaque titre.
 */
export function headlineDefaults(palette: VideoProps["palette"]) {
  const contrast = (c: string) => Math.abs(luminance(c) - luminance(palette[0]));
  return { ink: textColorOn(palette[0]), highlight: [palette[2], palette[1]].find((c) => contrast(c) > 0.25) ?? null };
}

export function HeadlinesScene({ scene, props }: Props) {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const u = useUnit();
  const portrait = useIsPortrait();
  const font = useTitleFont();
  const titleScale = useTitleScale();
  const { ink: color, highlight } = headlineDefaults(props.palette);
  const paint = useTitlePaint(color, props.palette);
  const accent = highlight ?? color;

  const lines = sceneHeadlines(scene);
  if (!lines.length) lines.push(scene.title);
  const n = lines.length;
  const slot = durationInFrames / n;
  const t = Math.max(5, Math.min(16, slot * 0.32));
  const style = headlineStyle(scene, props.graph.energy);

  // Une ligne par titre : taille maximale, réduite pour que le plus long tienne dans la largeur
  const longest = Math.max(...lines.map((line) => line.length), 4);
  const size = Math.min(u * (portrait ? 17 : 22) * titleScale, (width * 0.9) / (longest * 0.56));

  // Couleur choisie dans l'éditeur pour ce titre, sinon mise en avant du dernier, sinon celle du template
  const lineColor = (i: number) => scene.lineColors?.[i] ?? (i === n - 1 && n > 1 ? highlight : null);
  const text = (line: string, i: number, extra: CSSProperties = {}) => {
    const c = lineColor(i);
    return (
      <div style={{ ...font, fontSize: size, lineHeight: 1, whiteSpace: "nowrap", textAlign: "center", ...extra }}>
        <span style={c ? { ...paint, color: c, WebkitTextFillColor: c } : paint}>{line}</span>
      </div>
    );
  };

  let stage: ReactNode;
  if (style === "punch") stage = <Punch lines={lines} frame={frame} slot={slot} t={t} u={u} accent={accent} width={width} render={text} />;
  else if (style === "wipe") stage = <Wipe lines={lines} frame={frame} slot={slot} t={t} u={u} band={accent} trail={props.palette[1]} width={width} render={text} />;
  else stage = <Roll lines={lines} frame={frame} slot={slot} t={t} size={size} u={u} render={text} />;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* La couleur unique du titre (textColors.title) forcerait tous les titres : chaque titre a la sienne (lineColors) */}
      <TextSceneContext value={{ ...scene, textColors: { ...scene.textColors, title: undefined } }}>
        <MovableText target="title">
          <div style={{ position: "relative", width: width * 0.92, height: size * 3, display: "grid", placeItems: "center" }}>{stage}</div>
        </MovableText>
      </TextSceneContext>
    </AbsoluteFill>
  );
}

type Render = (line: string, i: number, extra?: CSSProperties) => ReactNode;
type StageProps = { lines: string[]; frame: number; slot: number; t: number; u: number; render: Render };

/** Impact : le titre arrive de très près, flou, et s'écrase net ; le précédent recule et s'efface. Onde de choc à chaque impact. */
function Punch({ lines, frame, slot, t, u, accent, width, render }: StageProps & { accent: string; width: number }) {
  const n = lines.length;
  return (
    <>
      {lines.map((line, i) => {
        const start = i * slot;
        const enter = interpolate(frame - start, [0, t * 0.7], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
        const exit = i < n - 1 ? interpolate(frame - (i + 1) * slot, [-t * 0.35, t * 0.35], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) }) : 0;
        if (frame < start || exit >= 1) return null;
        // Secousse amortie juste après l'impact
        const since = frame - start - t * 0.7;
        const shake = since > 0 ? Math.sin(since * 2.4) * u * 0.7 * Math.max(0, 1 - since / (t * 0.8)) : 0;
        const ring = interpolate(frame - start, [t * 0.55, t * 1.6], [0, 1], clamp);
        return (
          <div key={i} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            {ring > 0 && ring < 1 && (
              <div style={{ position: "absolute", left: "50%", top: "50%", width: width * 0.7 * ring, height: width * 0.7 * ring, marginLeft: (-width * 0.35) * ring, marginTop: (-width * 0.35) * ring, borderRadius: "50%", border: `${Math.max(2, u * 0.5 * (1 - ring))}px solid ${accent}`, opacity: 0.7 * (1 - ring) }} />
            )}
            {render(line, i, {
              opacity: Math.min(1, enter * 1.6) * (1 - exit),
              transform: `translate(${shake}px, ${shake * 0.4}px) scale(${(2.2 - 1.2 * enter) * (1 - 0.4 * exit)})`,
              filter: `blur(${Math.max(0, (1 - enter) * u * 1.4 + exit * u * 0.9)}px)`,
            })}
          </div>
        );
      })}
    </>
  );
}

/** Balayage : une bande d'accent (suivie d'un filet de la couleur principale) traverse l'écran ; le titre change pendant qu'elle le couvre. */
function Wipe({ lines, frame, slot, t, u, band: bandColor, trail, width, render }: StageProps & { band: string; trail: string; width: number }) {
  const n = lines.length;
  const index = Math.min(n - 1, Math.floor(frame / slot));
  const boundary = index * slot;
  // Bande la plus proche : celle qui dévoile ce titre, ou celle qui arrive pour le suivant
  const next = index + 1 < n ? (index + 1) * slot : Infinity;
  const center = next - frame < t / 2 ? next : boundary;
  const p = center === 0 ? interpolate(frame, [0, t / 2], [0.5, 1], clamp) : interpolate(frame, [center - t / 2, center + t / 2], [0, 1], { ...clamp, easing: easeInOut });
  const band = (delay: number, w: number, color: string) => {
    const q = Math.max(0, Math.min(1, p - delay));
    if (q <= 0 || q >= 1) return null;
    return <div style={{ position: "absolute", top: "-60%", bottom: "-60%", left: "50%", width: width * w, marginLeft: -width * w / 2, background: color, transform: `translateX(${(-1.6 + 3.2 * q) * width * 0.75}px) skewX(-14deg)` }} />;
  };
  const reveal = interpolate(frame, [boundary, boundary + t], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <>
      {render(lines[index], index, { transform: `translateX(${(1 - reveal) * u * 6}px)`, letterSpacing: `${(1 - reveal) * 0.08}em` })}
      {band(0.06, 0.08, trail)}
      {band(0, 1.25, bandColor)}
    </>
  );
}

/** Défilement : les titres sont empilés sur un rouleau qui tourne d'un cran à chaque changement (flou de vitesse, voisins estompés). */
function Roll({ lines, frame, slot, t, size, u, render }: StageProps & { size: number }) {
  const n = lines.length;
  const index = Math.min(n - 1, Math.floor(frame / slot));
  const local = frame - index * slot;
  const move = index < n - 1 ? interpolate(local, [slot - t, slot], [0, 1], { ...clamp, easing: easeInOut }) : 0;
  const intro = interpolate(frame, [0, t], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const position = index + move - (1 - intro);
  const speed = Math.sin(Math.PI * move) + (intro < 1 ? Math.sin(Math.PI * intro) : 0);
  const step = size * 1.15;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", maskImage: "linear-gradient(transparent, black 30%, black 70%, transparent)", WebkitMaskImage: "linear-gradient(transparent, black 30%, black 70%, transparent)" }}>
      {lines.map((line, i) => {
        const d = i - position;
        if (Math.abs(d) > 1.6) return null;
        const near = Math.min(1, Math.abs(d));
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: "50%", marginTop: -size / 2, display: "grid", placeItems: "center" }}>
            {render(line, i, {
              opacity: 1 - near * 0.8,
              transform: `translateY(${d * step}px) scale(${1 - near * 0.18}) rotateX(${-d * 28}deg)`,
              filter: `blur(${speed * u * 0.7 + near * u * 0.3}px)`,
            })}
          </div>
        );
      })}
    </div>
  );
}

import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { createElement, useId, type CSSProperties, type ReactNode } from "react";
import { LAYER_ICONS } from "../../config/layer-icons";
import { ease, layerStateAt, layerText, layerVisible, type LayerState, type MotionLayer } from "../../lib/projects/motion-layers";
import type { VideoProps } from "../props";
import { useBodyFont, useTitleFont } from "./theme";

/**
 * Calques animés libres d'une scène (Scene.layers), rendus dans la Sequence de la scène :
 * le temps repart de 0 au début de la scène, comme les images clés.
 */
export function SceneLayers({ layers, props, durationInFrames }: { layers: MotionLayer[]; props: VideoProps; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const duration = durationInFrames / fps;
  const visible = layers.filter((layer) => layerVisible(layer, time, duration));
  if (!visible.length) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    {visible.map((layer) => <Layer key={layer.id} layer={layer} time={time} props={props} />)}
  </AbsoluteFill>;
}

function Layer({ layer, time, props }: { layer: MotionLayer; time: number; props: VideoProps }) {
  const { width, height } = useVideoConfig();
  const titleFont = useTitleFont();
  const bodyFont = useBodyFont();
  const unit = Math.min(width, height);
  const maskId = `k${useId().replace(/[^\w-]/g, "")}`;
  const locale = props.locale ?? props.graph.language ?? "fr";
  const s = layerStateAt(layer, time);
  if (s.opacity <= 0.001) return null;
  const font = layer.font === "heading" ? titleFont : { fontFamily: bodyFont };

  const filters = [
    s.blur > 0 && `blur(${s.blur * unit}px)`,
    layer.glow > 0 && `drop-shadow(0 0 ${layer.glow * unit * 0.04}px ${s.color})`,
    layer.shadow > 0 && `drop-shadow(0 ${layer.shadow * unit * 0.012}px ${layer.shadow * unit * 0.03}px rgb(0 0 0 / ${0.25 + layer.shadow * 0.35}))`,
  ].filter(Boolean).join(" ");
  const clipped = s.clipTop || s.clipRight || s.clipBottom || s.clipLeft;
  const box: CSSProperties = {
    position: "absolute",
    left: s.x * width,
    top: s.y * height,
    width: s.w * width,
    ...(layer.type !== "text" && { height: s.h * height }),
    opacity: s.opacity,
    transform: `translate(-50%, -50%) perspective(${unit * 3}px) rotateX(${s.rotateX}deg) rotateY(${s.rotateY}deg) rotate(${s.rotation}deg) skewX(${s.skewX}deg) scale(${s.scale * s.scaleX}, ${s.scale * s.scaleY})`,
    ...(filters && { filter: filters }),
    ...(clipped && { clipPath: `inset(${s.clipTop * 100}% ${s.clipRight * 100}% ${s.clipBottom * 100}% ${s.clipLeft * 100}%)` }),
    ...(layer.blend !== "normal" && { mixBlendMode: layer.blend }),
  };

  if (layer.type === "text") {
    // Lettres remplies d'une capture ou d'un dégradé (masque en forme de texte)
    const image = layer.src && props.screenUrls.includes(layer.src) ? layer.src : null;
    const textFill: CSSProperties | null = image
      ? { backgroundImage: `url("${image}")`, backgroundSize: "cover", backgroundPosition: "center" }
      : layer.colors ? { backgroundImage: gradientCss(layer) } : null;
    return <div style={{
      ...box, ...font,
      fontSize: layer.fontSize * unit, fontWeight: layer.weight, fontStyle: layer.italic ? "italic" : "normal",
      lineHeight: layer.lineHeight, letterSpacing: `${s.letterSpacing}em`, color: s.color, textAlign: layer.align,
      textTransform: layer.uppercase ? "uppercase" : "none", whiteSpace: "pre-wrap", overflowWrap: "break-word",
      ...(textFill && { ...textFill, color: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text" }),
      ...(layer.stroke && { WebkitTextStroke: `${layer.strokeWidth * unit}px ${layer.stroke}`, ...(!layer.fill && { color: "transparent" }) }),
    }}>{revealText(layer, time, locale)}</div>;
  }

  if (layer.type === "path" || layer.type === "icon") {
    const elements = layer.type === "icon" ? LAYER_ICONS[layer.icon ?? ""] ?? [] : [["path", { d: layer.path ?? "" }] as const];
    const boxW = s.w * width, boxH = s.h * height;
    // Icône : grille 24 × 24 contenue dans la boîte ; tracé libre : grille étirée, trait d'épaisseur constante
    const [, , vbW = 100, vbH = 100] = (layer.viewBox ?? "0 0 100 100").split(" ").map(Number);
    // Épaisseur en unités de la grille : la grille de l’icône est contenue, celle du tracé libre étirée (moyenne des deux axes)
    const gridScale = Math.max(1e-3, layer.type === "icon" ? Math.min(boxW, boxH) / 24 : Math.sqrt((boxW / vbW) * (boxH / vbH)));
    const stroke = layer.strokeWidth * unit;
    const fillColor = layer.fill ? layer.colors?.[0] ?? s.color : "none";
    return <svg style={{ ...box, overflow: "visible" }} viewBox={layer.type === "icon" ? "0 0 24 24" : layer.viewBox} preserveAspectRatio={layer.type === "icon" ? "xMidYMid meet" : "none"}>
      {elements.map(([tag, attributes], i) => createElement(tag, {
        key: i, ...attributes, pathLength: 1, fill: fillColor, fillOpacity: layer.fill ? s.draw : 0,
        stroke: s.color, strokeWidth: stroke / gridScale, strokeLinecap: "round", strokeLinejoin: "round",
        strokeDasharray: "1 1", strokeDashoffset: 1 - s.draw,
      }))}
    </svg>;
  }

  if (layer.type === "particles") return <div style={box}><Particles layer={layer} s={s} time={time} width={width} height={height} unit={unit} /></div>;

  if (layer.knockout && layer.text) {
    // Forme pleine dont le texte est évidé (on voit à travers les lettres)
    const boxW = s.w * width, boxH = s.h * height;
    const shapeFill = layer.colors ? `url(#${maskId}-g)` : s.color;
    return <svg style={box} width={boxW} height={boxH} viewBox={`0 0 ${boxW} ${boxH}`}>
      <defs>
        {layer.colors && <linearGradient id={`${maskId}-g`} gradientTransform={`rotate(${layer.gradientAngle - 90} .5 .5)`}>{layer.colors.map((c, i) => <stop key={i} offset={i / (layer.colors!.length - 1)} stopColor={c} />)}</linearGradient>}
        <mask id={maskId}>
          <rect width={boxW} height={boxH} fill="#fff" />
          <text x={boxW / 2} y={boxH / 2} textAnchor="middle" dominantBaseline="central" fill="#000" style={{ ...font, fontSize: layer.fontSize * unit, fontWeight: layer.weight, letterSpacing: `${s.letterSpacing}em`, textTransform: layer.uppercase ? "uppercase" : "none" }}>{layerText(layer, time, locale)}</text>
        </mask>
      </defs>
      {layer.type === "ellipse"
        ? <ellipse cx={boxW / 2} cy={boxH / 2} rx={boxW / 2} ry={boxH / 2} fill={shapeFill} mask={`url(#${maskId})`} />
        : <rect width={boxW} height={boxH} rx={layer.radius * unit} fill={shapeFill} mask={`url(#${maskId})`} />}
    </svg>;
  }

  if (layer.type === "image" || layer.type === "logo") {
    const src = layer.type === "logo" ? props.logoUrl : layer.src && props.screenUrls.includes(layer.src) ? layer.src : null;
    if (!src) return null;
    return <div style={{ ...box, borderRadius: layer.radius * unit, overflow: "hidden", ...(layer.stroke && { border: `${layer.strokeWidth * unit}px solid ${layer.stroke}` }) }}>
      <Img src={src} style={{ display: "block", width: "100%", height: "100%", objectFit: layer.fit }} />
    </div>;
  }

  const fill = !layer.fill ? "transparent" : layer.colors ? gradientCss(layer) : s.color;
  return <div style={{
    ...box,
    background: fill,
    borderRadius: layer.type === "ellipse" ? "50%" : layer.radius * unit,
    ...(layer.stroke && { border: `${layer.strokeWidth * unit}px solid ${layer.stroke}`, boxSizing: "border-box" }),
  }} />;
}

function gradientCss(layer: MotionLayer) {
  const colors = layer.colors!.join(", ");
  return layer.gradient === "radial" ? `radial-gradient(circle, ${colors})` : `linear-gradient(${layer.gradientAngle}deg, ${colors})`;
}

/** Tirage déterministe dans [0, 1[ : même disposition à chaque image, dans le Player comme sur Lambda. */
function hash(seed: number, i: number, k: number) {
  const x = Math.sin(seed * 127.1 + i * 311.7 + k * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

const STAR = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

/** Particules réparties dans la boîte du calque ; le mouvement dérive uniquement du temps et de la graine. */
function Particles({ layer, s, time, width, height, unit }: { layer: MotionLayer; s: LayerState; time: number; width: number; height: number; unit: number }) {
  const { count, shape, motion, size, speed, seed } = layer.particles!;
  const W = s.w * width, H = s.h * height, R = Math.min(W, H) / 2;
  const colors = layer.colors?.length ? layer.colors : [s.color];
  const t = Math.max(0, time - (layer.start ?? 0)) * speed;
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  return <>{Array.from({ length: count }, (_, i) => {
    const r = (k: number) => hash(seed, i, k);
    const sz = size * unit * (0.5 + r(1));
    let x = 0, y = 0, rot = r(9) * 360, alpha = 1, flip = 1;
    switch (motion) {
      case "rise": case "fall": case "snow": {
        const cycle = (motion === "snow" ? 6 : 3.5) * (0.7 + r(2) * 0.6);
        const p = (t / cycle + r(3)) % 1;
        x = r(4) * W + Math.sin(t * (motion === "snow" ? 0.9 : 1.3) + r(5) * 6.28) * W * (motion === "snow" ? 0.06 : 0.025);
        y = motion === "rise" ? H * (1 - p) : H * p;
        alpha = Math.sin(Math.PI * p);
        break;
      }
      case "float":
        x = r(4) * W + Math.sin(t * 0.7 + r(5) * 6.28) * W * 0.05;
        y = r(6) * H + Math.cos(t * 0.6 + r(7) * 6.28) * H * 0.05;
        alpha = 0.55 + 0.45 * Math.sin(t * 1.1 + r(8) * 6.28);
        break;
      case "burst": {
        const p = clamp01(t / (0.9 + r(2) * 0.6)), e = 1 - (1 - p) ** 3, a = r(3) * Math.PI * 2, d = (0.25 + 0.75 * r(4)) * R * e;
        x = W / 2 + Math.cos(a) * d * (W / (2 * R)); y = H / 2 + Math.sin(a) * d * (H / (2 * R));
        alpha = 1 - p * p; rot += t * 200;
        break;
      }
      case "confetti": {
        const p = t / (1.4 + r(2) * 0.8);
        x = W / 2 + (r(3) - 0.5) * W * 1.1 * p;
        y = H * 0.85 - H * (1.1 + 0.6 * r(4)) * p + H * 1.4 * p * p;
        alpha = y > H * 1.05 ? 0 : 1; rot += t * 360 * (r(5) - 0.5) * 3; flip = Math.cos(t * (4 + r(6) * 6));
        break;
      }
      case "orbit": {
        const a = t * (0.4 + r(2) * 0.8) * (r(8) > 0.5 ? 1 : -1) + r(3) * Math.PI * 2, k = 0.3 + 0.7 * r(4);
        x = W / 2 + Math.cos(a) * (W / 2) * k; y = H / 2 + Math.sin(a) * (H / 2) * k;
        break;
      }
    }
    if (alpha <= 0.01) return null;
    const color = colors[Math.floor(r(10) * colors.length)];
    const w = shape === "spark" ? sz * 3 : sz, h = shape === "spark" ? sz * 0.35 : shape === "confetti" ? sz * 0.55 : sz;
    return <div key={i} style={{
      position: "absolute", left: x, top: y, width: w, height: h, opacity: alpha,
      transform: `translate(-50%, -50%) rotate(${rot}deg) scaleY(${flip})`,
      ...(shape === "ring" ? { border: `${Math.max(1, sz * 0.18)}px solid ${color}`, borderRadius: "50%", boxSizing: "border-box" as const } : { background: color }),
      ...(shape === "circle" && { borderRadius: "50%" }),
      ...(shape === "spark" && { borderRadius: sz, boxShadow: `0 0 ${sz}px ${color}` }),
      ...(shape === "star" && { clipPath: STAR }),
    }} />;
  })}</>;
}

/** Texte découpé en mots / lettres / lignes qui apparaissent l'un après l'autre (compteur compris). */
function revealText(layer: MotionLayer, time: number, locale: string): ReactNode {
  const text = layerText(layer, time, locale);
  if (layer.textReveal === "none") return text;
  const parts = layer.textReveal === "lines" ? text.split(/(\n)/) : layer.textReveal === "words" ? text.split(/(\s+)/) : Array.from(text);
  let index = 0;
  return parts.map((part, i) => {
    if (!part.trim()) return part;
    const p = (time - layer.revealStart - index++ * layer.revealStagger) / layer.revealDuration;
    return <span key={i} style={{ display: "inline-block", whiteSpace: "pre", ...revealStyle(layer.revealEffect, p) }}>{part}</span>;
  });
}

function revealStyle(effect: MotionLayer["revealEffect"], raw: number): CSSProperties {
  const p = ease("out", raw);
  if (raw <= 0) return { opacity: 0 };
  if (raw >= 1) return {};
  switch (effect) {
    case "rise": return { opacity: p, transform: `translateY(${(1 - p) * 0.6}em)` };
    case "fade": return { opacity: p };
    case "pop": return { opacity: Math.min(1, raw * 3), transform: `scale(${0.3 + 0.7 * ease("back", raw)})` };
    case "blur": return { opacity: p, filter: `blur(${(1 - p) * 0.25}em)` };
    case "drop": return { opacity: Math.min(1, raw * 4), transform: `translateY(${-(1 - ease("bounce", raw)) * 0.9}em)` };
    case "slide": return { opacity: p, transform: `translateX(${(1 - p) * 0.8}em)` };
  }
}

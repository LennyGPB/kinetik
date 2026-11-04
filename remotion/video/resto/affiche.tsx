// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import type { RestoFormatId } from "../../../config/formats";
import type { RestoStyleId } from "../../../config/resto-templates";
import { afficheTimeline, type Slide } from "../../../lib/resto/affiche";
import { condensedFont, bodyFont, displayFont } from "../fonts";
import { chalkFont, Chalk, DishPhoto, fineSerif, Music, Slate, Write } from "./plat-du-jour";
import { Erase, Slash } from "./menu-semaine";
import { clamp, fitSize, Logo, splitBalanced, useBeats, type RestoLocale } from "./resto-kit";

/**
 * Affiches animées Resto (happy hour, événement, avis, horaires, présentation) : une suite de planches calées sur la musique.
 * La mise en page des planches est commune ; chaque style apporte sa matière, sa façon de faire apparaître les éléments
 * et sa transition entre planches : Bistrot écrit à la craie et efface à l'éponge, Street fait claquer et tranche l'écran,
 * Chic allume les éléments en fondu doré et passe d'une planche à l'autre dans un flou.
 */

export type AfficheProps = {
  style: RestoStyleId;
  format: RestoFormatId;
  locale: RestoLocale;
  slides: Slide[];
  photoUrl: string | null;
  focus: { x: number; y: number };
  restaurantName: string;
  logoUrl?: string | null;
  musicSrc?: string | null;
  bpm: number;
  beatOffset: number;
};

type Look = "bistrot" | "street" | "chic";
type Skin = {
  look: Look;
  ink: string; accent: string; muted: string; price: string;
  font: { kicker: CSSProperties; title: CSSProperties; value: CSSProperties; body: CSSProperties };
  /** Largeur moyenne d'un caractère (en em) de la police des titres, pour ajuster les tailles */
  charWidth: number;
};

const SKINS: Record<Look, Skin> = {
  bistrot: {
    look: "bistrot", ink: "#f3efe4", accent: "#f5b942", muted: "rgba(243,239,228,0.6)", price: "#ff7347",
    font: { kicker: { fontFamily: chalkFont, fontWeight: 700 }, title: { fontFamily: chalkFont, fontWeight: 700 }, value: { fontFamily: chalkFont, fontWeight: 700 }, body: { fontFamily: chalkFont, fontWeight: 500 } },
    charWidth: 0.44,
  },
  street: {
    look: "street", ink: "#111111", accent: "#ff3b1f", muted: "rgba(17,17,17,0.55)", price: "#ff3b1f",
    font: { kicker: { fontFamily: condensedFont, textTransform: "uppercase" }, title: { fontFamily: condensedFont, textTransform: "uppercase", lineHeight: 0.9 }, value: { fontFamily: condensedFont, textTransform: "uppercase", lineHeight: 0.9 }, body: { fontFamily: displayFont, fontWeight: 700 } },
    charWidth: 0.47,
  },
  chic: {
    look: "chic", ink: "#f3ece0", accent: "#d9b677", muted: "rgba(243,236,224,0.6)", price: "#d9b677",
    font: { kicker: { fontFamily: fineSerif, fontWeight: 500, letterSpacing: "0.42em", textTransform: "uppercase" }, title: { fontFamily: fineSerif, fontStyle: "italic", fontWeight: 300 }, value: { fontFamily: fineSerif, fontWeight: 400 }, body: { fontFamily: fineSerif, fontWeight: 400 } },
    charWidth: 0.4,
  },
};

/** Apparition d'un élément, dans le langage du style. */
function Reveal({ look, p, children, style }: { look: Look; p: number; children: ReactNode; style?: CSSProperties }) {
  if (look === "bistrot") return <Chalk style={{ width: style?.width, alignSelf: style?.alignSelf, maxWidth: style?.maxWidth }}><Write p={p} style={style}>{children}</Write></Chalk>;
  if (look === "street") {
    const k = Easing.out(Easing.back(2.2))(Math.min(1, p * 1.6));
    return <div style={{ ...style, opacity: p > 0 ? 1 : 0, transform: `scale(${1.8 - 0.8 * k})` }}>{children}</div>;
  }
  const k = Easing.out(Easing.exp)(p);
  return <div style={{ ...style, opacity: k, transform: `translateY(${(1 - k) * 18}px)`, filter: `blur(${(1 - k) * 6}px)` }}>{children}</div>;
}

/** Étoiles qui se remplissent de gauche à droite jusqu'à la note. */
function Stars({ value, p, size, on, off }: { value: number; p: number; size: number; on: string; off: string }) {
  const filled = value * p;
  const star = "M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z";
  return (
    <div style={{ display: "flex", gap: size * 0.18 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, filled - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ transform: `scale(${0.85 + 0.15 * Math.min(1, fill * 2)})` }}>
            <path d={star} fill={off} />
            <path d={star} fill={on} style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }} />
          </svg>
        );
      })}
    </div>
  );
}

function Strike({ children, color, p }: { children: ReactNode; color: string; p: number }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span style={{ position: "absolute", left: "-6%", top: "52%", height: "0.09em", width: `${112 * p}%`, background: color, transform: "rotate(-8deg)", transformOrigin: "left" }} />
    </span>
  );
}

/** Photo encadrée dans la matière du style. */
function Framed({ look, url, focus, w, h, tilt = 0, zoom = 1.06 }: { look: Look; url: string; focus: { x: number; y: number }; w: number; h: number; tilt?: number; zoom?: number }) {
  const photo = <div style={{ position: "relative", width: w, height: h, overflow: "hidden" }}><DishPhoto url={url} focus={focus} scale={zoom} filter={look === "street" ? "saturate(1.2) contrast(1.1)" : look === "chic" ? "brightness(0.92) contrast(1.06)" : "saturate(1.08) contrast(1.05) sepia(0.06)"} /></div>;
  if (look === "bistrot") return <div style={{ padding: `${w * 0.035}px ${w * 0.035}px ${w * 0.12}px`, background: "#f7f3ea", boxShadow: "0 18px 40px rgba(0,0,0,0.5)", transform: `rotate(${tilt}deg)` }}>{photo}</div>;
  if (look === "street") return <div style={{ border: `${w * 0.025}px solid #111`, boxShadow: `${w * 0.03}px ${w * 0.03}px 0 #111`, transform: `rotate(${tilt}deg)` }}>{photo}</div>;
  return <div style={{ outline: "2px solid #d9b677", outlineOffset: w * 0.02 }}>{photo}</div>;
}

/** Une planche : mise en page commune, éléments apparus l'un après l'autre (temps local `l`, en temps). */
function SlideView({ slide, skin, l, p }: { slide: Slide; skin: Skin; l: number; p: AfficheProps }) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const tall = height / width > 1.5;
  const look = skin.look;
  const at = (k: number, len = look === "bistrot" ? 0.9 : 0.6) => interpolate(l, [0.15 + k * 0.35, 0.15 + k * 0.35 + len], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const fit = (text: string | string[], base: number, max = 86) => fitSize(Array.isArray(text) ? text : [text], base * u, max * u, skin.charWidth);
  const col: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 2.4 * u, padding: `0 ${7 * u}px`, width: "100%" };
  const kicker = (text: string, k = 0) => <Reveal look={look} p={at(k)} style={{ ...skin.font.kicker, fontSize: (look === "chic" ? 4.4 : look === "street" ? 7 : 8) * u, color: skin.accent, ...(look === "street" && { background: "#111", color: "#ffd60a", padding: `${0.5 * u}px ${2.5 * u}px`, transform: "rotate(-3deg)" }) }}>{text}</Reveal>;
  const titleLines = (text: string, base: number, k: number) => {
    const lines = splitBalanced(text, 3);
    return <Reveal look={look} p={at(k, look === "bistrot" ? 1.3 : 0.7)} style={{ ...skin.font.title, fontSize: fit(lines, base), lineHeight: look === "chic" ? 1.05 : 0.95, color: skin.ink }}>{lines.map((x) => <div key={x}>{x}</div>)}</Reveal>;
  };
  const sub = (text: string, k: number) => <Reveal look={look} p={at(k)} style={{ ...skin.font.body, fontSize: (look === "street" ? 4.6 : 5.6) * u, color: look === "street" ? "#ffd60a" : skin.muted, maxWidth: 82 * u, ...(look === "street" && { background: "#111", padding: `${0.6 * u}px ${2.4 * u}px` }), ...(look === "chic" && { fontStyle: "italic" }) }}>{text}</Reveal>;
  const center = <T,>(node: T) => <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>{node as ReactNode}</AbsoluteFill>;

  switch (slide.kind) {
    case "title": {
      if (slide.photo && p.photoUrl && look === "chic") {
        return (
          <AbsoluteFill>
            <AbsoluteFill style={{ opacity: at(0, 1.2) }}><DishPhoto url={p.photoUrl} focus={p.focus} scale={1.12 - 0.06 * Math.min(1, l / 4)} filter="brightness(0.55) contrast(1.06)" /></AbsoluteFill>
            <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,7,6,0.3), rgba(8,7,6,0.85))" }} />
            {center(<div style={col}>{kicker(slide.kicker, 0.5)}{titleLines(slide.title, 13, 1)}{slide.sub && sub(slide.sub, 2)}</div>)}
          </AbsoluteFill>
        );
      }
      return center(
        <div style={col}>
          {slide.photo && p.photoUrl && <Reveal look={look === "bistrot" ? "street" : look} p={at(0)}><Framed look={look} url={p.photoUrl} focus={p.focus} w={(tall ? 66 : 48) * u} h={(tall ? 50 : 34) * u} tilt={-3} /></Reveal>}
          {kicker(slide.kicker, 0.6)}
          {titleLines(slide.title, slide.photo && p.photoUrl ? 13 : 19, 1.1)}
          {slide.sub && sub(slide.sub, 2.2)}
        </div>,
      );
    }
    case "big":
      return center(
        <div style={col}>
          {kicker(slide.caption)}
          <Reveal look={look} p={at(0.7, 1.1)} style={{ ...skin.font.value, fontSize: fit(valueLines(slide.value), look === "street" ? 22 : 18), lineHeight: 0.95, color: look === "street" ? "#111" : skin.ink, whiteSpace: "nowrap" }}>{valueLines(slide.value).map((x) => <div key={x}>{x}</div>)}</Reveal>
          {slide.sub && sub(slide.sub, 2)}
        </div>,
      );
    case "offers":
      return center(
        <div style={{ ...col, gap: 3.4 * u }}>
          {kicker(slide.title)}
          {slide.badge && <Reveal look={look === "chic" ? "chic" : "street"} p={at(0.6)} style={{ ...skin.font.value, fontSize: 11 * u, color: look === "street" ? "#ffd60a" : skin.price, ...(look === "street" && { background: skin.accent, padding: `${0.4 * u}px ${3 * u}px`, border: `${0.6 * u}px solid #111`, transform: "rotate(-5deg)" }), ...(look === "bistrot" && { border: `${0.6 * u}px solid ${skin.ink}`, borderRadius: "50%", padding: `${1 * u}px ${4 * u}px` }) }}>{slide.badge}</Reveal>}
          <div style={{ display: "flex", flexDirection: "column", gap: 2.6 * u, width: "100%" }}>
            {slide.offers.map((o, i) => (
              <Reveal key={i} look={look} p={at(1.2 + i * 0.6)} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 3 * u, width: "100%", ...(look === "street" && { background: "#111", padding: `${0.6 * u}px ${2.4 * u}px` }) }}>
                <span style={{ ...skin.font.body, fontSize: fit(o.name, 7, 46), color: look === "street" ? "#fff" : skin.ink, textAlign: "left" }}>{o.name}</span>
                <span style={{ display: "flex", alignItems: "baseline", gap: 2.4 * u, flexShrink: 0 }}>
                  {o.old && <span style={{ ...skin.font.body, fontSize: 5.2 * u, color: look === "street" ? "rgba(255,255,255,0.6)" : skin.muted }}><Strike color={skin.price} p={at(1.6 + i * 0.6)}>{o.old}</Strike></span>}
                  {o.now && <span style={{ ...skin.font.value, fontSize: 8.5 * u, color: look === "street" ? "#ffd60a" : skin.price }}>{o.now}</span>}
                </span>
              </Reveal>
            ))}
          </div>
        </div>,
      );
    case "stars":
      return center(
        <div style={col}>
          <Reveal look={look} p={at(0, 1)} style={{ ...skin.font.value, fontSize: 30 * u, lineHeight: 1, color: look === "street" ? "#111" : skin.accent }}>{slide.value}<span style={{ fontSize: 10 * u, opacity: 0.7 }}>/5</span></Reveal>
          <Stars value={slide.stars} p={interpolate(l, [0.8, 2.2], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })} size={11 * u} on={look === "street" ? "#111" : skin.accent} off={look === "street" ? "rgba(17,17,17,0.15)" : "rgba(255,255,255,0.14)"} />
          {slide.caption && sub(slide.caption, 2.2)}
        </div>,
      );
    case "quote": {
      const size = slide.text.length < 60 ? 8 : slide.text.length < 110 ? 6.6 : 5.6;
      return center(
        <div style={{ ...col, gap: 3 * u, ...(look === "street" && { background: "#fff", border: `${0.8 * u}px solid #111`, boxShadow: `${1.4 * u}px ${1.4 * u}px 0 #111`, width: "86%", padding: `${6 * u}px ${5 * u}px`, transform: "rotate(-1.5deg)" }) }}>
          <Reveal look={look === "bistrot" ? "chic" : look} p={at(0)} style={{ ...skin.font.title, fontSize: 26 * u, lineHeight: 0.5, height: 9 * u, color: skin.accent }}>“</Reveal>
          <Reveal look={look === "bistrot" ? "bistrot" : "chic"} p={at(0.4, look === "bistrot" ? 2 : 1.2)} style={{ ...skin.font.body, fontSize: size * u, lineHeight: 1.25, color: look === "street" ? "#111" : skin.ink, ...(look === "chic" && { fontStyle: "italic" }) }}>{slide.text}</Reveal>
          <Stars value={slide.stars} p={interpolate(l, [1.8, 2.8], [0, 1], clamp)} size={6 * u} on={look === "street" ? "#111" : skin.accent} off={look === "street" ? "rgba(17,17,17,0.15)" : "rgba(255,255,255,0.14)"} />
          <Reveal look={look} p={at(3)} style={{ ...skin.font.kicker, fontSize: (look === "chic" ? 3.8 : 5.5) * u, color: look === "street" ? skin.accent : skin.accent }}>— {slide.author}</Reveal>
        </div>,
      );
    }
    case "schedule":
      return center(
        <div style={{ ...col, gap: (tall ? 2.2 : 1.2) * u }}>
          <div style={{ marginBottom: 1.5 * u }}>{kicker(slide.title)}</div>
          {slide.rows.map((r, i) => (
            <Reveal key={i} look={look === "bistrot" ? "bistrot" : look === "street" ? "street" : "chic"} p={at(0.6 + i * 0.28, 0.6)} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 3 * u, width: "100%", paddingBottom: (tall ? 1.2 : 0.6) * u, ...(look === "chic" && { borderBottom: "1px solid rgba(217,182,119,0.35)" }), ...(look === "street" && { background: r.closed ? skin.accent : "#111", padding: `${0.5 * u}px ${2.2 * u}px` }) }}>
              <span style={{ ...skin.font.body, fontSize: (tall ? 6 : 4.6) * u, color: look === "street" ? "#fff" : r.closed ? skin.muted : skin.accent, ...(look === "chic" && { letterSpacing: "0.2em", textTransform: "uppercase", fontSize: (tall ? 3.8 : 3.2) * u }) }}>{r.day}</span>
              <span style={{ ...skin.font.body, fontSize: (r.hours.length > 14 ? (tall ? 4.4 : 3.6) : (tall ? 5.6 : 4.4)) * u, whiteSpace: "nowrap", color: look === "street" ? (r.closed ? "#111" : "#ffd60a") : r.closed ? skin.muted : skin.ink }}>{r.hours}</span>
            </Reveal>
          ))}
        </div>,
      );
    case "lines":
      return center(
        <div style={{ ...col, gap: 3.2 * u }}>
          {kicker(slide.title.length > 24 ? slide.title.slice(0, 24).replace(/\s+\S*$/, "") + "…" : slide.title)}
          {slide.lines.map((line, i) => (
            <Reveal key={i} look={look} p={at(0.7 + i * 0.6, look === "bistrot" ? 1.2 : 0.7)} style={{ ...skin.font.body, fontSize: (line.length < 28 ? 7 : line.length < 60 ? 6.2 : 5.4) * u, lineHeight: 1.25, maxWidth: 84 * u, color: look === "street" ? "#fff" : skin.ink, ...(look === "street" && { background: "#111", padding: `${0.6 * u}px ${2.4 * u}px` }) }}>
              {look === "chic" && slide.lines.length > 1 && <span style={{ color: skin.accent, marginRight: "0.5em" }}>◆</span>}{line}
            </Reveal>
          ))}
        </div>,
      );
    case "photo":
      return center(
        <div style={col}>
          {p.photoUrl && <Reveal look={look === "bistrot" ? "street" : look} p={at(0)}><Framed look={look} url={p.photoUrl} focus={p.focus} w={(tall ? 80 : 60) * u} h={(tall ? 100 : 56) * u} tilt={look === "chic" ? 0 : 2} zoom={1.06 + 0.06 * Math.min(1, l / 4)} /></Reveal>}
          {slide.caption && sub(slide.caption, 1.4)}
        </div>,
      );
    case "cta":
      return center(
        <div style={col}>
          {p.logoUrl && <Reveal look={look === "bistrot" ? "chic" : look} p={at(0)}><Logo url={p.logoUrl} name={p.restaurantName} style={{ maxHeight: 16 * u, maxWidth: 46 * u }} fontStyle={{}} /></Reveal>}
          {titleLines(slide.title, 14, 0.5)}
          {slide.sub && sub(slide.sub, 1.6)}
        </div>,
      );
  }
}

/** Une valeur courte tient sur une ligne ; une longue (date, phrase) se coupe en deux. */
const valueLines = (value: string) => value.length <= 14 ? [value] : splitBalanced(value, 2);

function Backdrop({ look }: { look: Look }) {
  if (look === "bistrot") return <Slate />;
  if (look === "street") return <AbsoluteFill style={{ background: "#ffd60a" }} />;
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #1c1813 0%, #0b0a09 72%)" }} />;
}

export function Affiche(p: AfficheProps) {
  const look: Look = p.style === "street" || p.style === "chic" ? p.style : "bistrot";
  const skin = SKINS[look];
  const { b } = useBeats(p.bpm);
  const tl = afficheTimeline(p.slides, p.style);
  const index = Math.max(0, Math.min(p.slides.length - 1, tl.starts.findLastIndex((s) => b >= s)));
  const l = b - tl.starts[index], len = tl.beats[index], last = index === p.slides.length - 1;
  // Sortie de la planche, dans la transition du style (la dernière reste à l'écran)
  const out = last ? 0 : interpolate(l, [len - (look === "street" ? 0.4 : 0.7), len], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const slide = <SlideView key={index} slide={p.slides[index]} skin={skin} l={l} p={p} />;
  const frames = Math.round((0.3 + tl.total * (60 / p.bpm) + 0.4) * 30);
  return (
    <AbsoluteFill style={{ overflow: "hidden", fontFamily: bodyFont }}>
      <Backdrop look={look} />
      {look === "bistrot" ? <Erase p={out}>{slide}</Erase>
        : look === "chic" ? <AbsoluteFill style={{ opacity: 1 - out, filter: `blur(${out * 10}px)`, transform: `scale(${1 + out * 0.04})` }}>{slide}</AbsoluteFill>
        : slide}
      {look === "street" && tl.starts.slice(1).map((at) => <Slash key={at} b={b} at={at} />)}
      <Music url={p.musicSrc} beatOffset={p.beatOffset} total={frames} />
    </AbsoluteFill>
  );
}

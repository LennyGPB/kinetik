// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, random, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { condensedFont, bodyFont } from "../fonts";
import type { RestoFormatId } from "../../../config/formats";
import { PLAT_DU_JOUR_BEATS as BEATS, platDuJourFrames as framesFor, type RestoStyleId } from "../../../config/resto-templates";
import { RESTO_DIMENSIONS } from "../../props";
import { clamp, fitSize, FPS, LEAD, Logo, restoWords, splitBalanced, src, useBeats, type RestoLocale } from "./resto-kit";
import { Table3D } from "./plat-du-jour-3d";
import { Carte3D } from "./carte-3d";

/**
 * Prototype « Plat du jour » (niche Resto) : 4 temps calés sur le beat.
 * « Aujourd'hui / Plat du jour » → photo en gros plan, zoom lent, vapeur → nom du plat → prix + logo.
 * Trois styles, chacun avec sa signature :
 * - bistrot : la craie écrit sur l'ardoise, un coup d'éponge efface le titre et révèle la photo, le prix est entouré à la craie ;
 * - street : les mots claquent sur chaque temps, des bandes diagonales tranchent l'image, le prix arrive en sticker ;
 * - chic : un filet doré se fend et s'ouvre sur la photo, les lettres s'allument une à une, le prix s'encadre d'un filet.
 */

const latin = { subsets: ["latin" as const] };
export const { fontFamily: chalkFont } = loadCaveat("normal", { weights: ["500", "700"], ...latin });
export const { fontFamily: fineSerif } = loadCormorant("normal", { weights: ["300", "400", "500"], ...latin });
loadCormorant("italic", { weights: ["300", "400"], ...latin });

export type RestoStyle = RestoStyleId;
export type RestoFormat = RestoFormatId;

export type PlatDuJourProps = {
  style: RestoStyle;
  format: RestoFormat;
  photoUrl: string;
  /** Photo détourée (PNG transparent) des styles 3D : le plat seul pour Carte 3D (il sort de la carte), l'assiette redressée en disque pour Table 3D. */
  cutoutUrl?: string | null;
  /** Point d'intérêt de la photo (0 à 1) : garde le plat dans le cadre au recadrage. */
  focus?: { x: number; y: number };
  dishName: string;
  price: string;
  description?: string | null;
  restaurantName: string;
  logoUrl?: string | null;
  musicSrc?: string | null;
  bpm: number;
  /** Instant (s) du premier temps dans le morceau */
  beatOffset: number;
  /** Langue des mots fixes (« Plat du jour » / « Dish of the day ») */
  locale?: RestoLocale;
};

/** Durée totale de chaque style, en temps. */

export function platDuJourFrames(p: Pick<PlatDuJourProps, "style" | "bpm">) {
  return framesFor(p.style, p.bpm);
}

export const calculatePlatDuJourMetadata: CalculateMetadataFunction<PlatDuJourProps> = ({ props }) => ({
  durationInFrames: platDuJourFrames(props),
  fps: FPS,
  ...RESTO_DIMENSIONS[props.format],
});

/* ───────────────────────── Briques partagées ───────────────────────── */

export function DishPhoto({ url, focus, scale, x = 0, y = 0, filter }: { url: string; focus: { x: number; y: number }; scale: number; x?: number; y?: number; filter?: string }) {
  const origin = `${focus.x * 100}% ${focus.y * 100}%`;
  return (
    <Img
      src={src(url)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: origin, transformOrigin: origin, transform: `translate(${x}%, ${y}%) scale(${scale})`, filter }}
    />
  );
}

/**
 * Vapeur : filets fins et allongés qui montent en ondulant et s'étirent en se dissipant.
 * Chaque filet naît et disparaît transparent : aucun retour visible.
 */
export function Steam({ t, cx, cy, spread, strength, size }: { t: number; cx: number; cy: number; spread: number; strength: number; size: number }) {
  if (strength <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {Array.from({ length: 16 }, (_, i) => {
        const period = 2.8 + random(`steam-p-${i}`) * 1.6;
        const phase = random(`steam-ph-${i}`) * period;
        const c = ((t + phase) / period) % 1;
        const base = cx + (random(`steam-x-${i}`) - 0.5) * spread;
        const sway = Math.sin((t + phase) * 1.6 + i * 1.3) * (1.5 + 5 * c);
        const w = size * (0.22 + 0.5 * c) * (0.7 + 0.6 * random(`steam-w-${i}`));
        const h = size * (1.1 + 1.4 * c);
        const opacity = Math.sin(Math.PI * c) ** 2 * strength * (0.35 + 0.35 * random(`steam-o-${i}`));
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: `${base + sway}%`, top: `${cy - c * 26}%`, width: w, height: h, borderRadius: "50%", opacity,
              transform: `translate(-50%, -50%) rotate(${Math.sin((t + phase) * 1.2 + i) * 16}deg) skewX(${Math.sin((t + phase) * 0.9 + i) * 18}deg)`,
              background: "radial-gradient(closest-side, rgba(255,255,255,0.7), rgba(255,255,255,0.22) 45%, rgba(255,255,255,0) 100%)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Révélation de gauche à droite, comme une main qui écrit. */
export function Write({ p, children, style }: { p: number; children: ReactNode; style?: CSSProperties }) {
  const edge = p * 125 - 25;
  const mask = `linear-gradient(90deg, #000 0%, #000 ${edge}%, transparent ${edge + 25}%)`;
  // Marge : les lettres manuscrites débordent de leur boîte, le masque les rognerait
  return <div style={{ padding: "0 0.18em", ...style, maskImage: mask, WebkitMaskImage: mask }}>{children}</div>;
}

export const svgUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

/** Grain de craie : le trait laisse des manques, comme sur une vraie ardoise. */
const CHALK_GRAIN = svgUrl(
  "<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7'/>" +
    "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -2.4 0 0 0 2.15'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
);
const SLATE_GRAIN = svgUrl(
  "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' seed='3'/>" +
    "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
);

export function Chalk({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...style, maskImage: CHALK_GRAIN, WebkitMaskImage: CHALK_GRAIN, maskSize: "260px", WebkitMaskSize: "260px" }}>{children}</div>;
}

/** Fond d'ardoise : gris-vert profond, traces d'effacement et poussière de craie. */
export function Slate() {
  return (
    <AbsoluteFill style={{ background: "#1f2624" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 45% at 30% 30%, rgba(255,255,255,0.07), transparent 70%), radial-gradient(ellipse 60% 40% at 75% 70%, rgba(255,255,255,0.05), transparent 70%), radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />
      <AbsoluteFill style={{ backgroundImage: SLATE_GRAIN, backgroundSize: "400px" }} />
    </AbsoluteFill>
  );
}

export function Music({ url, beatOffset, total }: { url?: string | null; beatOffset: number; total: number }) {
  if (!url) return null;
  const shift = Math.round((beatOffset - LEAD) * FPS);
  const volume = (f: number) => Math.min(1, f / 4, Math.max(0, (total - f) / (FPS * 0.9))) * 0.9;
  if (shift >= 0) return <Audio src={src(url)} trimBefore={shift} volume={volume} />;
  return (
    <Sequence from={-shift}>
      <Audio src={src(url)} volume={(f) => volume(f - shift)} />
    </Sequence>
  );
}

/* ───────────────────────── Bistrot ───────────────────────── */

function Bistrot(p: PlatDuJourProps) {
  const words = restoWords(p.locale);
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const titleSize = fitSize(words.title, 27 * u, 86 * u, 0.44);
  const { b, span, t } = useBeats(p.bpm);
  const focus = p.focus ?? { x: 0.5, y: 0.5 };
  const tall = height / width > 1.5;
  const chalk = "#f3efe4", ochre = "#f5b942", brick = "#ff7347";

  // Coup d'éponge : trois passages en zigzag, du haut vers le bas.
  const wipe = span(3.6, 4.9, Easing.inOut(Easing.quad));
  const zig = "M -15 8 L 115 20 L -15 46 L 115 62 L -15 88 L 115 104";
  const wipeMask = svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none' width='${width}' height='${height}'>` +
      `<path d='${zig}' fill='none' stroke='#000' stroke-width='34' stroke-linecap='round' stroke-linejoin='round' pathLength='1' stroke-dasharray='1 1' stroke-dashoffset='${1 - wipe}'/></svg>`,
  );

  const band = span(7.4, 8.4, Easing.out(Easing.back(1.2)));
  const bandTop = tall ? 63 : 58;
  const lift = -band * (tall ? 13 : 9);
  const zoom = interpolate(b, [3.6, BEATS.bistrot], [1.14, 1.3], clamp);

  const nameLines = splitBalanced(p.dishName, 2);
  const nameSize = fitSize(nameLines, 12.5 * u, 88 * u, 0.43);

  // Cercle de craie autour du prix : un tour et quart, un peu tremblé.
  const circle = span(11.5, 12.7, Easing.inOut(Easing.cubic));
  const circlePath = Array.from({ length: 60 }, (_, i) => {
    const a = -0.4 + (i / 59) * Math.PI * 2.25;
    const r = 1 + 0.05 * Math.sin(a * 3 + 1) + 0.03 * (i / 59);
    return `${i ? "L" : "M"} ${150 + 142 * r * Math.cos(a)} ${50 + 42 * r * Math.sin(a)}`;
  }).join(" ");

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Slate />
      {/* Titre écrit à la craie : il sera effacé par l'éponge */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 6 * u, color: chalk, textAlign: "center" }}>
        <Chalk>
          <Write p={span(0, 1.4, Easing.inOut(Easing.sin))} style={{ fontFamily: chalkFont, fontWeight: 500, fontSize: 13 * u, lineHeight: 1, transform: "rotate(-3deg)" }}>
            {words.today}
          </Write>
          <Write p={span(1, 2.4, Easing.inOut(Easing.sin))} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: titleSize, lineHeight: 0.9, color: ochre, marginTop: 2 * u }}>
            {words.title[0]}
          </Write>
          <Write p={span(1.6, 3, Easing.inOut(Easing.sin))} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: titleSize, lineHeight: 0.9, color: ochre }}>
            {words.title[1]}
          </Write>
          <svg width={62 * u} height={6 * u} viewBox="0 0 100 10" preserveAspectRatio="none" style={{ marginTop: 1 * u }}>
            <path d="M 2 6 Q 30 1 55 5 T 98 4" fill="none" stroke={chalk} strokeWidth={1.4} strokeLinecap="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - span(2.6, 3.4)} opacity={span(2.6, 2.7)} />
          </svg>
        </Chalk>
      </AbsoluteFill>

      {/* Photo révélée par le coup d'éponge */}
      <AbsoluteFill style={{ maskImage: wipeMask, WebkitMaskImage: wipeMask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}>
        <DishPhoto url={p.photoUrl} focus={focus} scale={zoom} y={lift} filter="saturate(1.08) contrast(1.05) sepia(0.06)" />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(20,12,6,0.45) 100%)" }} />
        <Steam t={t} cx={50} cy={(tall ? 48 : 44) + lift} spread={44} strength={span(4.6, 6)} size={20 * u} />
      </AbsoluteFill>

      {/* Bandeau d'ardoise : nom, prix entouré, logo */}
      <div style={{ position: "absolute", left: 0, right: 0, top: `${bandTop}%`, bottom: 0, transform: `translateY(${(1 - band) * 110}%)` }}>
        <div style={{ position: "absolute", inset: 0, borderTop: `${1.4 * u}px solid #7a4e2c`, boxShadow: `0 ${-1.5 * u}px ${4 * u}px rgba(0,0,0,0.45)`, overflow: "hidden" }}>
          <Slate />
        </div>
        <Chalk style={{ position: "absolute", inset: 0, padding: `${5 * u}px ${6 * u}px ${5 * u}px`, display: "flex", flexDirection: "column", color: chalk }}>
          <Write p={span(8.1, 10, Easing.inOut(Easing.sin))} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: nameSize, lineHeight: 0.95 }}>
            {nameLines.map((l) => <div key={l}>{l}</div>)}
          </Write>
          {p.description && (
            <Write p={span(9.6, 11, Easing.inOut(Easing.sin))} style={{ fontFamily: chalkFont, fontWeight: 500, fontSize: 5.6 * u, lineHeight: 1.1, opacity: 0.85, marginTop: 1.5 * u }}>
              {p.description}
            </Write>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {p.price ? <div style={{ position: "relative", padding: `${1.5 * u}px ${5 * u}px` }}>
              <Write p={span(11, 11.9, Easing.inOut(Easing.sin))} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: 15 * u, lineHeight: 1, color: brick }}>
                {p.price}
              </Write>
              <svg viewBox="0 0 300 100" preserveAspectRatio="none" style={{ position: "absolute", inset: `${-1.5 * u}px ${-2 * u}px`, width: `calc(100% + ${4 * u}px)`, height: `calc(100% + ${3 * u}px)`, overflow: "visible" }}>
                <path d={circlePath} fill="none" stroke={chalk} strokeWidth={2.6} strokeLinecap="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - circle} opacity={circle > 0 ? 1 : 0} />
              </svg>
            </div> : <div />}
            <div style={{ opacity: span(12.4, 13.4), transform: `rotate(-4deg) translateY(${(1 - span(12.4, 13.4)) * 2 * u}px)` }}>
              <Logo url={p.logoUrl} name={p.restaurantName} style={{ maxHeight: 14 * u, maxWidth: 34 * u }} fontStyle={{ fontFamily: chalkFont, fontWeight: 700, fontSize: 7.5 * u, color: chalk, borderBottom: `${0.6 * u}px solid ${chalk}`, paddingBottom: 0.4 * u }} />
            </div>
          </div>
        </Chalk>
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── Street ───────────────────────── */

function Street(p: PlatDuJourProps) {
  const words = restoWords(p.locale);
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const { b, span, pulse, t } = useBeats(p.bpm);
  const focus = p.focus ?? { x: 0.5, y: 0.5 };
  const yellow = "#ffd60a", red = "#ff3b1f", ink = "#111111";
  const slam = (at: number) => span(at, at + 0.45, Easing.out(Easing.back(2.2)));
  const word = (at: number, size: number, text: string, color = ink, rot = 0) => {
    const s = slam(at);
    return (
      <div style={{ fontFamily: condensedFont, fontSize: size * u, lineHeight: 0.86, color, opacity: s > 0 ? 1 : 0, transform: `scale(${1.9 - 0.9 * s}) rotate(${rot * (1 - s) + rot * 0.25}deg)`, textTransform: "uppercase" }}>
        {text}
      </div>
    );
  };
  // Secousse sur l'impact de chaque mot, amortie (continue).
  const shake = [1, 1.5, 2, 2.5].reduce((sum, at) => sum + Math.sin((b - at) * 22) * Math.exp(-Math.max(0, b - at) * 9) * (b >= at ? 1 : 0), 0);

  // Bandes diagonales qui tranchent l'image puis se rejoignent.
  const bands = 4, shear = 34, spacing = (100 + shear) / bands;
  const cut = (i: number) => span(4 + i * 0.18, 4.9 + i * 0.18, Easing.inOut(Easing.cubic));
  const bandPoly = (i: number, w: number) => {
    const c = (i + 0.5) * spacing - shear / 2;
    const l = c - w / 2, r = c + w / 2;
    return `polygon(${l + shear / 2}% 0%, ${r + shear / 2}% 0%, ${r - shear / 2}% 100%, ${l - shear / 2}% 100%)`;
  };
  const merged = cut(bands - 1) >= 1;
  const punch = 1.12 + 0.035 * pulse * span(5, 6) + interpolate(b, [5, BEATS.street], [0, 0.1], clamp);
  const photo = (dx: number) => <DishPhoto url={p.photoUrl} focus={focus} scale={punch} x={dx} filter="saturate(1.22) contrast(1.1)" />;

  const ticker = span(5.2, 5.8, Easing.out(Easing.back(1.6)));
  const tickerText = `${words.label} ★ `.repeat(8);
  const nameLines = splitBalanced(p.dishName.toUpperCase(), 3);
  const nameSize = fitSize(nameLines, 17 * u, 84 * u, 0.47);
  const sticker = slam(13);
  const stamp = slam(14.5);
  const tall = height / width > 1.5;

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: yellow }}>
      {/* Titre qui claque mot par mot */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translate(${shake * 1.2 * u}px, ${shake * -0.6 * u}px)` }}>
        <div style={{ background: ink, color: yellow, fontFamily: condensedFont, fontSize: 9 * u, padding: `${0.6 * u}px ${3 * u}px`, transform: `translateX(${(1 - span(0, 0.5, Easing.out(Easing.exp))) * -120}vw) rotate(-3deg)`, marginBottom: 2 * u }}>
          {words.todayCaps}
        </div>
        {word(1, tall ? 38 : 30, words.stack[0], ink, -4)}
        {word(1.5, tall ? 24 : 19, words.stack[1], red, 3)}
        {word(2, tall ? 38 : 30, words.stack[2], ink, -2)}
      </AbsoluteFill>

      {/* Photo : bandes puis plein cadre */}
      {merged ? (
        <AbsoluteFill>{photo(0)}</AbsoluteFill>
      ) : (
        Array.from({ length: bands }, (_, i) => {
          const c = cut(i);
          if (c <= 0) return null;
          return (
            <AbsoluteFill key={i}>
              <AbsoluteFill style={{ clipPath: bandPoly(i, spacing * 1.04 * c + 3 * (1 - c)), background: i % 2 ? ink : red }} />
              <AbsoluteFill style={{ clipPath: bandPoly(i, spacing * 1.04 * c) }}>{photo((1 - c) * (i % 2 ? 6 : -6))}</AbsoluteFill>
            </AbsoluteFill>
          );
        })
      )}
      <Steam t={t} cx={50} cy={46} spread={50} strength={span(5.5, 7) * 0.85} size={20 * u} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)", opacity: span(8.5, 9.5) }} />

      {/* Bandeau défilant */}
      <div style={{ position: "absolute", left: "-10%", right: "-10%", top: `${tall ? 7 : 5}%`, background: yellow, borderTop: `${0.7 * u}px solid ${ink}`, borderBottom: `${0.7 * u}px solid ${ink}`, transform: `translateY(${(1 - ticker) * -30 * u}px) rotate(-3deg)`, overflow: "hidden", whiteSpace: "nowrap" }}>
        <div style={{ fontFamily: condensedFont, fontSize: 6.5 * u, color: ink, padding: `${0.8 * u}px 0`, transform: `translateX(${-((t * 9) % 50)}%)` }}>{tickerText}</div>
      </div>

      {/* Nom du plat, ligne par ligne */}
      <div style={{ position: "absolute", left: 6 * u, right: 6 * u, bottom: `${tall ? 9 : 7}%` }}>
        {nameLines.map((line, i) => {
          const s = span(9 + i * 0.5, 9.45 + i * 0.5, Easing.out(Easing.back(1.8)));
          return (
            <div key={line} style={{ display: "flex", marginTop: 0.8 * u, transform: `translateX(${(1 - s) * 110}vw) skewX(${(1 - s) * -18 - 6}deg)` }}>
              <div style={{ background: i % 2 ? red : ink, color: i % 2 ? ink : "#fff", fontFamily: condensedFont, fontSize: nameSize, lineHeight: 1, padding: `${0.4 * u}px ${2.2 * u}px ${0.8 * u}px` }}>{line}</div>
            </div>
          );
        })}
      </div>

      {/* Prix en sticker (absent si le plat n'a pas de prix) */}
      {p.price && <div style={{ position: "absolute", right: 5 * u, top: `${tall ? 47 : 39}%`, width: 36 * u, height: 36 * u, opacity: sticker > 0 ? 1 : 0, transform: `scale(${sticker}) rotate(${-14 + Math.sin(t * 2.2) * 3}deg)` }}>
        <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: `drop-shadow(${0.8 * u}px ${0.8 * u}px 0 ${ink})` }}>
          <polygon fill={red} stroke={ink} strokeWidth={2.2} points={Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2, r = i % 2 ? 41 : 49; return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`; }).join(" ")} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: condensedFont, fontSize: fitSize([p.price], 11 * u, 26 * u, 0.5), color: yellow, textShadow: `${0.4 * u}px ${0.4 * u}px 0 ${ink}` }}>{p.price}</div>
      </div>}

      {/* Logo tamponné */}
      <div style={{ position: "absolute", left: 6 * u, top: `${tall ? 15 : 14}%`, opacity: stamp > 0 ? 1 : 0, transform: `scale(${1.6 - 0.6 * stamp}) rotate(-6deg)` }}>
        <Logo url={p.logoUrl} name={p.restaurantName} style={{ maxHeight: 13 * u, maxWidth: 36 * u }} fontStyle={{ fontFamily: condensedFont, fontSize: 6 * u, color: yellow, background: ink, padding: `${0.6 * u}px ${2 * u}px`, border: `${0.5 * u}px solid ${yellow}`, textTransform: "uppercase" }} />
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── Chic ───────────────────────── */

function Chic(p: PlatDuJourProps) {
  const words = restoWords(p.locale);
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const { b, span, t } = useBeats(p.bpm);
  const focus = p.focus ?? { x: 0.5, y: 0.5 };
  const gold = "#d9b677", ivory = "#f3ece0";
  const slow = Easing.out(Easing.exp);
  const tall = height / width > 1.5;

  const line = span(0, 1.6, Easing.inOut(Easing.cubic));
  const open = span(3.1, 4.2, Easing.inOut(Easing.poly(4)));
  const zoom = interpolate(b, [3.1, BEATS.chic], [1.22, 1.04], { ...clamp, easing: Easing.out(Easing.quad) });
  const kicker = span(0.5, 2.2, slow);
  const title = span(1.1, 2.9, slow);

  const nameLines = splitBalanced(p.dishName, 2);
  const nameSize = fitSize(nameLines, 11.5 * u, 86 * u, 0.4);
  const nameStart = 6.4;
  const chars = p.dishName.length;
  const frame = span(9, 10.4, Easing.inOut(Easing.cubic));
  let index = 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "radial-gradient(ellipse at 50% 45%, #1c1813 0%, #0b0a09 70%)" }}>
      {/* Titre : il se retire avec l'ouverture de la fente */}
      <AbsoluteFill style={{ color: ivory, textAlign: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "53%", transform: `translateY(${-open * 16 * u}px)`, opacity: kicker * (1 - open) }}>
          <div style={{ fontFamily: fineSerif, fontWeight: 400, fontSize: 4.4 * u, letterSpacing: `${0.62 - 0.24 * kicker}em`, color: gold, paddingLeft: "0.5em" }}>{words.todayCaps}</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: "52%", transform: `translateY(${(1 - title) * 3 * u + open * 16 * u}px)`, opacity: title * (1 - open), filter: `blur(${(1 - title) * 6}px)` }}>
          <div style={{ fontFamily: fineSerif, fontStyle: "italic", fontWeight: 300, fontSize: 15 * u, lineHeight: 1 }}>{words.line}</div>
        </div>
      </AbsoluteFill>

      {/* Photo dans la fente qui s'ouvre */}
      <AbsoluteFill style={{ clipPath: `inset(${(1 - open) * 50}% 0 ${(1 - open) * 50}% 0)` }}>
        <DishPhoto url={p.photoUrl} focus={focus} scale={zoom} filter="brightness(0.9) contrast(1.08) saturate(0.95)" />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 60% at 50% 42%, transparent 35%, rgba(8,7,6,0.75) 100%), linear-gradient(180deg, rgba(8,7,6,0.35) 0%, transparent 25%, transparent 45%, rgba(8,7,6,0.92) 100%)" }} />
        <Steam t={t} cx={50} cy={tall ? 44 : 40} spread={36} strength={span(4.4, 6.5, slow) * 0.6} size={18 * u} />
      </AbsoluteFill>

      {/* Filets dorés : ils naissent au centre puis s'écartent avec la fente */}
      {[-1, 1].map((dir) => (
        <div key={dir} style={{ position: "absolute", left: "50%", top: `${50 + dir * open * 50}%`, width: `${line * 62 + open * 38}%`, height: Math.max(1, 0.22 * u), background: gold, transform: "translate(-50%, -50%)", opacity: 1 - span(3.8, 4.4) }} />
      ))}

      {/* Logo */}
      <div style={{ position: "absolute", left: 0, right: 0, top: `${tall ? 8 : 6}%`, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.2 * u, opacity: span(9.6, 11, slow) }}>
        <div style={{ width: 1.6 * u, height: 1.6 * u, border: `${0.2 * u}px solid ${gold}`, transform: "rotate(45deg)" }} />
        <Logo url={p.logoUrl} name={p.restaurantName.toUpperCase()} style={{ maxHeight: 10 * u, maxWidth: 40 * u }} fontStyle={{ fontFamily: fineSerif, fontWeight: 500, fontSize: 4 * u, letterSpacing: "0.42em", paddingLeft: "0.42em", color: ivory }} />
      </div>

      {/* Nom, lettre par lettre, puis prix encadré */}
      <div style={{ position: "absolute", left: 6 * u, right: 6 * u, bottom: `${tall ? 15 : 11}%`, display: "flex", flexDirection: "column", alignItems: "center", color: ivory, textAlign: "center", textShadow: `0 ${0.3 * u}px ${2.5 * u}px rgba(0,0,0,0.85)` }}>
        <div style={{ fontFamily: fineSerif, fontWeight: 400, fontSize: nameSize, lineHeight: 1.02 }}>
          {nameLines.map((l, li) => (
            <div key={li}>
              {[...l].map((ch, ci) => {
                const at = nameStart + ((index++) / Math.max(1, chars)) * 1.6;
                const s = span(at, at + 0.9, slow);
                return <span key={ci} style={{ display: "inline-block", whiteSpace: "pre", opacity: s, transform: `translateY(${(1 - s) * 1.2 * u}px)`, filter: `blur(${(1 - s) * 4}px)` }}>{ch}</span>;
              })}
            </div>
          ))}
        </div>
        <div style={{ width: `${span(7.6, 9, slow) * 22}%`, height: Math.max(1, 0.2 * u), background: gold, margin: `${2.6 * u}px 0 ${2 * u}px` }} />
        {p.description && <div style={{ fontFamily: fineSerif, fontStyle: "italic", fontWeight: 300, fontSize: 5 * u, lineHeight: 1.2, opacity: span(8, 9.4, slow) * 0.9, marginBottom: 3 * u, maxWidth: 80 * u }}>{p.description}</div>}
        {p.price && <div style={{ position: "relative", padding: `${1.6 * u}px ${5 * u}px` }}>
          {[0, 1].map((side) => (
            <div key={side} style={{ position: "absolute", inset: 0, opacity: frame > 0 ? 1 : 0 }}>
              {/* Deux demi-cadres partent du milieu du haut et se rejoignent en bas */}
              <div style={{ position: "absolute", top: 0, height: Math.max(1, 0.2 * u), background: gold, [side ? "left" : "right"]: "50%", width: `${Math.min(1, frame * 3) * 50}%` }} />
              <div style={{ position: "absolute", top: 0, width: Math.max(1, 0.2 * u), background: gold, [side ? "right" : "left"]: 0, height: `${Math.min(1, Math.max(0, frame * 3 - 1)) * 100}%` }} />
              <div style={{ position: "absolute", bottom: 0, height: Math.max(1, 0.2 * u), background: gold, [side ? "right" : "left"]: 0, width: `${Math.min(1, Math.max(0, frame * 3 - 2)) * 50}%` }} />
            </div>
          ))}
          <div style={{ fontFamily: fineSerif, fontWeight: 400, fontSize: 8 * u, lineHeight: 1, color: gold, letterSpacing: "0.04em", opacity: span(9.5, 10.8, slow) }}>{p.price}</div>
        </div>}
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── Composition ───────────────────────── */

export function PlatDuJour(props: PlatDuJourProps) {
  const total = platDuJourFrames(props);
  const Body = { bistrot: Bistrot, street: Street, chic: Chic, carte3d: Carte3D, table3d: Table3D }[props.style];
  return (
    <AbsoluteFill style={{ fontFamily: bodyFont }}>
      <Body {...props} />
      <Music url={props.musicSrc} beatOffset={props.beatOffset} total={total} />
    </AbsoluteFill>
  );
}

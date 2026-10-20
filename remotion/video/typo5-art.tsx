import type { CSSProperties, ReactNode } from "react";
import { NoiseGrain } from "./noise-art";

// Sans dépendance au moteur vidéo (ni contexte React, ni hook Remotion) : importable par les miniatures rendues côté serveur.
/**
 * Cinq affiches typographiques (docs/TEMPLATES.md) : Hollow, Cursive, Overlap, Bloom, Reflect.
 * Chaque mouvement est continu et toujours dans le même sens (défilement, balayage, émission) : aucun aller-retour.
 * Tailles en cqw / cqh, relatives au conteneur (miniature ou cadre vidéo).
 */
export type Typo5Kind = "hollow" | "cursive" | "overlap" | "bloom" | "reflect";
type Palette = [string, string, string];
const frac = (v: number) => v - Math.floor(v);
const fit = (text: string, width: number, height: number, k = 0.62) => `min(${(width / Math.max(3, [...text].length * k)).toFixed(2)}cqw, ${height}cqh)`;
const nowrap: CSSProperties = { whiteSpace: "nowrap", lineHeight: 1 };

/** Hollow : mot en contour, étiré en hauteur ; au-dessus et au-dessous, des bandes de copies coupées défilent sans fin. */
function Hollow({ text, time, enter, palette: [, , accent], fontFamily }: ArtProps) {
  const word = text.toUpperCase();
  const outline: CSSProperties = { ...nowrap, fontFamily, color: "transparent", WebkitTextStroke: `0.02em ${accent}`, transform: "scaleY(1.75)", display: "block" };
  const size = fit(word, 92, 22, 0.47);
  const strip = (dir: 1 | -1) => {
    const shift = frac(time * 0.22) * 2.1;
    return <div style={{ position: "relative", width: "100%", height: "0.62em", overflow: "hidden", maskImage: `linear-gradient(${dir > 0 ? "0deg" : "180deg"}, black 30%, transparent)`, WebkitMaskImage: `linear-gradient(${dir > 0 ? "0deg" : "180deg"}, black 30%, transparent)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: dir > 0 ? `${-2.1 + shift}em` : `${-shift}em` }}>
        {[0, 1, 2].map((k) => <div key={k} style={{ height: "2.1em", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={outline}>{word}</span></div>)}
      </div>
    </div>;
  };
  return <div style={{ fontSize: size, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.18em", opacity: Math.min(1, enter * 1.4) }}>
    {strip(1)}
    <div style={{ height: "1.8em", display: "flex", alignItems: "center", transform: `scaleY(${0.6 + 0.4 * enter})` }}><span style={outline}>{word}</span></div>
    {strip(-1)}
  </div>;
}

/** Cursive : premier mot en capitales larges à rayures (qui défilent), la suite en écriture manuscrite qui s'écrit par-dessus. */
function Cursive({ text, time, enter, palette: [, main, accent], fontFamily, scriptFamily, subtitle }: ArtProps) {
  // Le dernier mot passe en manuscrit, le reste en capitales à rayures
  const words = text.trim().split(/\s+/), script = words.length > 1 ? words.pop()! : "", first = words.join(" ");
  const stripes: CSSProperties = { color: "transparent", backgroundImage: `repeating-linear-gradient(0deg, ${main} 0 0.035em, transparent 0.035em 0.085em)`, backgroundPosition: `0 ${(time * 0.04) % 0.085}em`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextStroke: `0.006em ${main}` };
  const reveal = Math.min(1, Math.max(0, (enter - 0.25) / 0.75));
  return <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", fontSize: fit(first ?? "", 88, 26, 0.95) }}>
    <span style={{ ...nowrap, ...stripes, fontFamily, fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", opacity: Math.min(1, enter * 1.5) }}>{first}</span>
    {script && <span style={{ ...nowrap, position: "absolute", left: "50%", top: "50%", transform: "translate(-42%, -58%) rotate(-8deg)", fontFamily: scriptFamily, fontSize: `min(1.25em, ${(80 / Math.max(3, [...script].length * 0.38)).toFixed(2)}cqw)`, color: accent, textShadow: `0 0 0.08em color-mix(in srgb, ${accent}, transparent 50%)`, clipPath: `inset(-20% ${(1 - reveal) * 100}% -20% -5%)` }}>{script}</span>}
    {subtitle && <span style={{ ...nowrap, marginTop: "0.18em", fontFamily: scriptFamily, fontSize: "0.24em", color: main, opacity: reveal }}>— {subtitle} —</span>}
  </div>;
}

/** Overlap : deux copies en contour décalées verticalement ; une bande pleine balaie le mot de haut en bas, en continu. */
function Overlap({ text, time, enter, palette: [, main], fontFamily }: ArtProps) {
  const base: CSSProperties = { ...nowrap, fontFamily, fontWeight: 700, letterSpacing: "-0.045em", display: "block" };
  const line = (dy: number, solid: boolean, clip?: string) => <span aria-hidden={!solid} style={{ ...base, position: solid ? "relative" : "absolute", left: 0, right: 0, textAlign: "center", transform: `translateY(${dy}em)`, color: solid ? main : "transparent", WebkitTextStroke: solid ? undefined : `0.018em ${main}`, clipPath: clip }}>{text}</span>;
  // Bande de 34 % de hauteur qui descend de −40 % à 140 % : invisible aux deux extrémités, la boucle ne se voit pas
  const y = -40 + frac(time * 0.32) * 180, band = `inset(${y}% 0 ${Math.max(0, 100 - y - 34)}% 0)`;
  const spread = 0.3 * (0.5 + 0.5 * enter);
  return <div style={{ position: "relative", fontSize: fit(text, 90, 26, 0.58), opacity: Math.min(1, enter * 1.4) }}>
    {line(-spread, false)}{line(spread, false)}
    <div style={{ position: "relative" }}>{line(0, true, band)}</div>
  </div>;
}

/** Bloom : mot flou et lumineux, franges rose et bleue, qui émet vers la droite des traînées qui s'étirent et s'éteignent. */
function Bloom({ text, time, enter, palette: [, main, accent], fontFamily }: ArtProps) {
  const pink = `color-mix(in srgb, ${accent}, #ff7ad9 70%)`;
  const base: CSSProperties = { ...nowrap, fontFamily, fontWeight: 800, letterSpacing: "-0.01em", position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" };
  const trails = [0, 1, 2, 3, 4].map((k) => {
    const age = frac(k / 5 + time * 0.35);
    return <span key={k} aria-hidden style={{ ...base, color: k % 2 ? accent : pink, transform: `translateX(${age * 0.5}em) scaleX(${1 + age * 0.25})`, filter: `blur(${0.06 + age * 0.22}em)`, opacity: 0.45 * Math.sin(Math.PI * age) ** 1.5 * enter }}>{text}</span>;
  });
  const focus = 0.03 + (1 - enter) * 0.3;
  return <div style={{ position: "relative", fontSize: fit(text, 74, 22, 0.95) }}>
    <span style={{ ...nowrap, fontFamily, fontWeight: 800, visibility: "hidden", display: "block" }}>{text}</span>
    {trails}
    <span aria-hidden style={{ ...base, color: accent, transform: "translateX(0.03em)", filter: `blur(${focus * 2}em)`, opacity: 0.8 * enter }}>{text}</span>
    <span aria-hidden style={{ ...base, color: pink, transform: "translateX(-0.03em)", filter: `blur(${focus * 2}em)`, opacity: 0.7 * enter }}>{text}</span>
    <span style={{ ...base, color: main, filter: `blur(${focus}em)`, opacity: Math.min(1, enter * 1.3), textShadow: `0 0 0.15em ${main}` }}>{text}</span>
  </div>;
}

/** Reflect : le mot courbé en perspective et son reflet inversé défilent en sens contraires de part et d'autre d'un point. */
function Reflect({ text, time, enter, palette: [bg, main, accent], fontFamily }: ArtProps) {
  const word = text.toUpperCase();
  // Ligne du haut courbée en perspective ; le reflet est la même ligne retournée autour de la ligne médiane, défilant en sens inverse
  const row = (mirror: boolean) => {
    const shift = frac(time * 0.07) * 100 * (mirror ? 1 : -1) - (mirror ? 100 : 0);
    const fade = "linear-gradient(0deg, transparent 0%, black 45%)";
    return <div style={{ position: "absolute", left: 0, right: 0, height: "38%", bottom: "50%", overflow: "hidden", perspective: "60cqh", maskImage: fade, WebkitMaskImage: fade, transform: mirror ? "scaleY(-1)" : undefined, transformOrigin: "50% 100%" }}>
      <div style={{ position: "absolute", inset: 0, transform: "rotateX(28deg)", transformOrigin: "50% 100%" }}>
        <div style={{ ...nowrap, position: "absolute", bottom: "2%", left: 0, display: "flex", transform: `translateX(${shift}%)`, fontFamily, fontWeight: 800, fontSize: "30cqh", color: main, letterSpacing: "0.02em" }}>
          {[0, 1].map((k) => <span key={k} style={{ display: "inline-block", minWidth: "100cqw", paddingRight: "0.4em" }}>{`${word} ${word} `}</span>)}
        </div>
      </div>
    </div>;
  };
  return <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, enter * 1.4) }}>
    {row(false)}{row(true)}
    <div style={{ position: "absolute", left: "50%", top: "50%", width: "2.6cqmin", height: "2.6cqmin", borderRadius: "50%", background: accent, transform: "translate(-50%, -50%)", boxShadow: `0 0 2cqmin ${accent}` }} />
    <div style={{ position: "absolute", left: "5%", top: "6%", width: "5cqmin", height: "5cqmin", borderRadius: "50%", border: `0.4cqmin solid ${main}`, display: "grid", placeItems: "center", color: bg }}>
      <svg viewBox="0 0 20 20" width="60%" height="60%" aria-hidden><path d="M 5 11 Q 10 16 15 11" fill="none" stroke={main} strokeWidth="2" strokeLinecap="round" /></svg>
    </div>
  </div>;
}

type ArtProps = { text: string; time: number; enter: number; palette: Palette; fontFamily?: string; scriptFamily?: string; subtitle?: string };
const ART: Record<Typo5Kind, (p: ArtProps) => ReactNode> = { hollow: Hollow, cursive: Cursive, overlap: Overlap, bloom: Bloom, reflect: Reflect };

/** Titre de l'affiche `kind`. Reflect remplit son parent (positionné) ; les autres se centrent dans le flux. */
export function Typo5Title({ kind, text, time, enter = 1, palette, fontFamily, scriptFamily = "Allura, cursive", subtitle, style }: { kind: Typo5Kind; text: string; time: number; enter?: number; palette: Palette; fontFamily?: string; scriptFamily?: string; subtitle?: string; style?: CSSProperties }) {
  const Art = ART[kind];
  return <div style={{ position: kind === "reflect" ? "absolute" : "relative", inset: kind === "reflect" ? 0 : undefined, display: "flex", justifyContent: "center", ...style }}>
    <Art text={text} time={Math.max(0, time)} enter={enter} palette={palette} fontFamily={fontFamily} scriptFamily={scriptFamily} subtitle={subtitle} />
  </div>;
}

/** Fond : aplat, halo très doux (Bloom, Cursive) et grain (sauf Hollow, au noir pur comme sur l'affiche). */
export function Typo5Backdrop({ kind, palette: [bg, , accent], time }: { kind: Typo5Kind; palette: Palette; time: number }) {
  const breathe = 0.5 + 0.5 * Math.cos(Math.max(0, time) * Math.PI * 0.5);
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bg }}>
    {(kind === "bloom" || kind === "cursive") && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 55% 35% at 50% 50%, color-mix(in srgb, ${accent}, transparent ${kind === "bloom" ? 82 - breathe * 4 : 92}%), transparent 80%)` }} />}
    {kind !== "hollow" && <NoiseGrain seed={kind.length * 7} opacity={kind === "bloom" || kind === "reflect" ? 0.4 : 0.2} />}
  </div>;
}

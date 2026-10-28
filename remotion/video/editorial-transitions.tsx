import type { CSSProperties } from "react";
import { Easing } from "remotion";
import type { CoverContext } from "./themed-transitions";

/**
 * Transitions signature des templates éditoriaux photo (Column, Aspect, Interval, Memento, Cadran, Rêverie).
 * Aucun aplat plein écran : le décor photo ET la scène font le même geste (découpe, chute, cadrage…) et l'encre du fond
 * (palette[0], posée sous le décor par KinetikVideo) apparaît dans les vides. L'accent ne sert qu'aux filets fins.
 *
 * Une seule fonction de géométrie par transition, appliquée au décor (brick.backdrop) et au contenu (style / exit.style),
 * pour que tout le cadre reste aligné. `k` = part masquée : 0 → image entière, 1 → image disparue.
 */

export type EditorialKind = "newsprint" | "aperture" | "stairs" | "keepsake" | "gallery-frame" | "window";
type Phase = "out" | "in";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const inOut = Easing.inOut(Easing.cubic);
/** Sortie : `t` linéaire, on accélère ; entrée : `t` déjà ralenti par la courbe du template. */
export const masked = (phase: Phase, t: number) => (phase === "out" ? inOut(clamp01(t)) : 1 - clamp01(t));
const pct = (v: number) => `${v.toFixed(3)}%`;
/** Papier du tirage (Memento) : un ivoire chaud, indépendant de la palette (c'est la matière du tirage). */
const PRINT = "#FFF8EC";

/** Région « x + y ≤ a » (a en % : 0 → rien, 200 → tout le cadre). */
function belowDiagonal(a: number) {
  if (a <= 0) return "polygon(0% 0%, 0% 0%, 0% 0%)";
  if (a <= 100) return `polygon(0% 0%, ${pct(a)} 0%, 0% ${pct(a)})`;
  return `polygon(0% 0%, 100% 0%, 100% ${pct(a - 100)}, ${pct(a - 100)} 100%, 0% 100%)`;
}
/** Région « x + y ≥ a ». */
function aboveDiagonal(a: number) {
  if (a >= 200) return "polygon(100% 100%, 100% 100%, 100% 100%)";
  if (a >= 100) return `polygon(100% 100%, 100% ${pct(a - 100)}, ${pct(a - 100)} 100%)`;
  return `polygon(${pct(a)} 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${pct(a)})`;
}

const BANDS = [0, 100 / 3, 200 / 3, 100];
/** Interval : retrait de chaque bande (0 → visible, 1 → effacée), décalé d'une bande à l'autre. */
const stairShift = (k: number, i: number) => clamp01(k * 1.6 - i * 0.3);

/** Géométrie commune au décor et au contenu. */
export function editorialGesture(kind: EditorialKind, phase: Phase, t: number, unit: number): CSSProperties {
  const k = masked(phase, t);
  if (k <= 0) return {};
  const dir = phase === "out" ? -1 : 1;
  switch (kind) {
    // La page se resserre en colonne en remontant ; la suivante s'ouvre depuis la colonne en arrivant du bas
    case "newsprint":
      return { clipPath: `inset(0% ${pct(k * 50)} 0% ${pct(k * 50)})`, transform: `translateY(${dir * k * 5}%)` };
    // Découpe diagonale : le biais du portrait balaie le cadre vers le haut à gauche
    case "aperture":
      return {
        clipPath: phase === "out" ? belowDiagonal(200 * (1 - k)) : aboveDiagonal(200 * k),
        transform: `translate(${dir * k * 3}%, ${dir * k * 3}%)`,
      };
    // Trois bandes s'effacent en escalier vers la gauche, la scène suivante revient en escalier depuis la droite
    case "stairs": {
      const x = [0, 1, 2].map((i) => 100 * (1 - stairShift(k, i)));
      if (phase === "out") return { clipPath: `polygon(0% 0%, ${pct(x[0])} 0%, ${pct(x[0])} ${pct(BANDS[1])}, ${pct(x[1])} ${pct(BANDS[1])}, ${pct(x[1])} ${pct(BANDS[2])}, ${pct(x[2])} ${pct(BANDS[2])}, ${pct(x[2])} 100%, 0% 100%)` };
      const r = x.map((v) => 100 - v);
      return { clipPath: `polygon(${pct(r[2])} 0%, 100% 0%, 100% 100%, ${pct(r[0])} 100%, ${pct(r[0])} ${pct(BANDS[2])}, ${pct(r[1])} ${pct(BANDS[2])}, ${pct(r[1])} ${pct(BANDS[1])}, ${pct(r[2])} ${pct(BANDS[1])})` };
    }
    // Le cadre devient un tirage qui pivote et tombe ; le suivant tombe du haut et se pose
    case "keepsake": {
      const shrink = clamp01(k / 0.4), fall = Easing.in(Easing.quad)(clamp01((k - 0.3) / 0.7));
      const spin = phase === "out" ? -(3 * shrink + 7 * fall) : 3 * shrink + 6 * fall;
      return { transform: `translateY(${(phase === "out" ? 1 : -1) * fall * 118}%) rotate(${spin}deg) scale(${1 - 0.22 * shrink})` };
    }
    // Cadrage : l'image se replie dans un cadre centré ; la suivante s'ouvre depuis ce cadre en se posant
    case "gallery-frame":
      return { clipPath: `inset(${pct(k * 50)} ${pct(k * 50)} round ${(unit * 0.6).toFixed(2)}px)`, transform: `scale(${1 + (phase === "out" ? -0.05 : 0.05) * k})` };
    // Fenêtre : la couleur quitte l'image pendant que la fenêtre se referme vers la droite ; la suivante s'ouvre depuis la gauche et se colore
    case "window":
      return {
        clipPath: phase === "out" ? `inset(0% 0% 0% ${pct(k * 100)})` : `inset(0% ${pct(k * 100)} 0% 0%)`,
        filter: `grayscale(${k.toFixed(3)})`,
        transform: `translateX(${dir * k * 2}%)`,
      };
  }
}

/** Bord du tirage (Memento), posé sur le décor seulement : il suit le même geste que tout le cadre. */
export function keepsakeBorder(phase: Phase, t: number, unit: number): CSSProperties {
  const shrink = clamp01(masked(phase, t) / 0.4);
  if (shrink <= 0) return {};
  return { boxShadow: `0 0 0 ${(unit * 2.4 * shrink).toFixed(2)}px ${PRINT}, 0 ${(unit * 3).toFixed(2)}px ${(unit * 7).toFixed(2)}px rgb(0 0 0 / ${(0.5 * shrink).toFixed(3)})` };
}

const line = (style: CSSProperties): CSSProperties => ({ position: "absolute", pointerEvents: "none", ...style });

/** Filets d'accent qui soulignent le bord de la découpe (aucun aplat). */
export function EditorialRules({ kind, c }: { kind: EditorialKind; c: CoverContext }) {
  const k = c.phase === "out" ? inOut(clamp01(c.p)) : clamp01(c.p);
  if (k <= 0.01 || k >= 0.995) return null;
  const accent = c.palette[2];
  const w = Math.max(1.5, c.unit * 0.22);
  const glow = `0 0 ${(c.unit * 1.2).toFixed(2)}px ${accent}`;
  const fade = Math.min(1, k * 6, (1 - k) * 6);
  switch (kind) {
    case "newsprint": {
      const dy = (c.phase === "out" ? -1 : 1) * k * 5;
      return <div style={line({ inset: 0, transform: `translateY(${dy}%)` })}>
        {[k * 50, 100 - k * 50].map((x, i) => <div key={i} style={line({ left: pct(x), top: 0, bottom: 0, width: w, marginLeft: -w / 2, background: accent, opacity: fade })} />)}
      </div>;
    }
    case "aperture": {
      const a = c.phase === "out" ? 200 * (1 - k) : 200 * k;
      const d = (c.phase === "out" ? -1 : 1) * k * 3;
      return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={line({ inset: 0, width: "100%", height: "100%", overflow: "visible", transform: `translate(${d}%, ${d}%)`, opacity: fade })} aria-hidden>
        <line x1={a} y1={0} x2={0} y2={a} stroke={accent} strokeWidth={w} vectorEffect="non-scaling-stroke" />
      </svg>;
    }
    case "stairs": {
      const x = [0, 1, 2].map((i) => 100 * (1 - stairShift(k, i)));
      // Entrée : la bande du haut suit le retrait de la dernière (voir editorialGesture)
      const edges = c.phase === "out" ? x : [x[2], x[1], x[0]].map((v) => 100 - v);
      return <>{edges.map((v, i) => v > 0.5 && v < 99.5 && <div key={i} style={line({ left: pct(v), top: pct(BANDS[i]), height: pct(100 / 3), width: w, marginLeft: -w / 2, background: accent, boxShadow: glow })} />)}</>;
    }
    case "gallery-frame": {
      // Deux cadres fins décalés en diagonale qui se réalignent sur l'image quand elle s'ouvre
      const off = c.unit * 2.2 * k;
      const box = (dx: number, dy: number, o: number) => line({ left: `calc(${pct(k * 50)} + ${dx}px)`, right: `calc(${pct(k * 50)} - ${dx}px)`, top: `calc(${pct(k * 50)} + ${dy}px)`, bottom: `calc(${pct(k * 50)} - ${dy}px)`, border: `${w}px solid ${accent}`, borderRadius: c.unit * 0.6, opacity: o * fade });
      return <><div style={box(-off, -off, 0.9)} /><div style={box(off, off, 0.5)} /></>;
    }
    case "window": {
      const x = c.phase === "out" ? k * 100 : 100 - k * 100;
      return <div style={line({ left: pct(x), top: 0, bottom: 0, width: w, marginLeft: -w / 2, background: accent, boxShadow: glow, opacity: fade })} />;
    }
    default:
      return null;
  }
}

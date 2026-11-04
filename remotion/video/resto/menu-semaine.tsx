// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from "remotion";
import { menuSemaineFrames } from "../../../config/resto-templates";
import { condensedFont, bodyFont } from "../fonts";
import { chalkFont, Chalk, DishPhoto, fineSerif, Music, Slate, Write } from "./plat-du-jour";
import { clamp, fitSize, Logo, restoWords, splitBalanced, useMenuClock, type MenuSemaineProps } from "./resto-kit";
import { CarteMenu } from "./carte-3d";

/**
 * « Menu de la semaine » : intro (titre et dates) → un temps fixe par jour → signature finale, calé sur la musique.
 * Chaque jour fonctionne avec ou sans photo : sans photo, le plat passe en grande typographie
 * (le pack du lundi doit tourner avec ce qui existe, sans exiger de nouvelles photos).
 * Signatures : Bistrot efface l'ardoise d'un coup d'éponge, Street tranche l'écran de bandes,
 * Chic referme sa fenêtre dorée, Carte retourne une carte par jour puis les déploie en éventail.
 */

export type { MenuDayView, MenuSemaineProps } from "./resto-kit";

/* ───────────────────────── Bistrot : l'ardoise effacée à l'éponge ───────────────────────── */

const CHALK = "#f3efe4", OCHRE = "#f5b942", BRICK = "#ff7347";

/** Effacement de gauche à droite, avec une traînée humide plus claire sur le bord. */
export function Erase({ p, children }: { p: number; children: ReactNode }) {
  if (p <= 0) return <>{children}</>;
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, transparent ${edge}%, #000 ${edge + 15}%)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ maskImage: mask, WebkitMaskImage: mask }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(90deg, transparent ${edge - 6}%, rgba(255,255,255,0.07) ${edge + 4}%, transparent ${edge + 14}%)` }} />
    </AbsoluteFill>
  );
}

function BistrotMenu(p: MenuSemaineProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const tall = height / width > 1.5;
  const words = restoWords(p.locale);
  const { span, tl, index } = useMenuClock(p);
  const write = (a: number, b: number) => span(a, b, Easing.inOut(Easing.sin));
  const titleSize = fitSize(words.menu, 26 * u, 86 * u, 0.44);
  const day = (i: number) => {
    const d = p.days[i], s = tl.dayStart(i), e = s + tl.perDay;
    const photo = Boolean(d.photoUrl);
    const enter = span(s + 0.2, s + 1.1, Easing.out(Easing.back(1.3)));
    const nameLines = splitBalanced(d.name, 2);
    const nameSize = fitSize(nameLines, (photo ? 11 : 15) * u, 86 * u, 0.43);
    const tilt = i % 2 ? 3 : -3;
    return (
      <Erase key={i} p={span(e - 0.75, e, Easing.inOut(Easing.quad))}>
        <AbsoluteFill style={{ alignItems: "center", color: CHALK, textAlign: "center", paddingTop: `${tall ? 9 : 6}%` }}>
          <Chalk style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Write p={write(s + 0.05, s + 0.8)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: 15 * u, lineHeight: 1, color: OCHRE, transform: "rotate(-3deg)" }}>{d.label}</Write>
          </Chalk>
          {photo && (
            <div style={{ marginTop: (tall ? 6 : 3) * u, padding: `${2 * u}px ${2 * u}px ${7 * u}px`, background: "#f7f3ea", boxShadow: `0 ${2 * u}px ${5 * u}px rgba(0,0,0,0.5)`, transform: `translateX(${(1 - enter) * 70 * u}px) rotate(${tilt + (1 - enter) * 12}deg)`, opacity: enter > 0 ? 1 : 0 }}>
              <div style={{ position: "relative", width: (tall ? 70 : 56) * u, height: (tall ? 54 : 40) * u, overflow: "hidden" }}><DishPhoto url={d.photoUrl!} focus={d.focus} scale={1.05 + 0.05 * span(s, e, Easing.linear)} filter="saturate(1.08) contrast(1.05) sepia(0.06)" /></div>
            </div>
          )}
          <Chalk style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", marginTop: (photo ? 5 : tall ? 22 : 14) * u, padding: `0 ${6 * u}px` }}>
            <Write p={write(s + 0.9, s + 2)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: nameSize, lineHeight: 0.98 }}>{nameLines.map((l) => <div key={l}>{l}</div>)}</Write>
            {d.description && <Write p={write(s + 1.6, s + 2.4)} style={{ fontFamily: chalkFont, fontWeight: 500, fontSize: 5.4 * u, opacity: 0.85, marginTop: 1.5 * u }}>{d.description}</Write>}
            {d.price && <Write p={write(s + 1.9, s + 2.6)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: 12 * u, color: BRICK, marginTop: 2.5 * u, borderBottom: `${0.7 * u}px solid ${CHALK}`, paddingBottom: 0.3 * u }}>{d.price}</Write>}
          </Chalk>
        </AbsoluteFill>
      </Erase>
    );
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Slate />
      {index === -1 && (
        <Erase p={span(tl.intro - 0.75, tl.intro, Easing.inOut(Easing.quad))}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: CHALK, textAlign: "center" }}>
            <Chalk style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Write p={write(0, 1.2)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: titleSize, lineHeight: 0.95, color: OCHRE }}>{words.menu[0]}</Write>
              <Write p={write(0.8, 2)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: titleSize * 0.62, lineHeight: 1 }}>{words.menu[1]}</Write>
              {p.dates && <Write p={write(1.8, 2.8)} style={{ fontFamily: chalkFont, fontWeight: 500, fontSize: 6.5 * u, marginTop: 3 * u, opacity: 0.9 }}>{p.dates}</Write>}
            </Chalk>
          </AbsoluteFill>
        </Erase>
      )}
      {index >= 0 && index < p.days.length && day(index)}
      {index === p.days.length && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 4 * u, color: CHALK, textAlign: "center" }}>
          <Chalk style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * u }}>
            <Write p={write(tl.outroStart, tl.outroStart + 1.2)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: fitSize([p.restaurantName], 15 * u, 84 * u, 0.44), lineHeight: 1 }}>{p.restaurantName}</Write>
            <Write p={write(tl.outroStart + 1, tl.outroStart + 2)} style={{ fontFamily: chalkFont, fontWeight: 500, fontSize: 9 * u, color: OCHRE }}>{words.enjoy}</Write>
          </Chalk>
          {p.logoUrl && <div style={{ opacity: span(tl.outroStart + 1.6, tl.outroStart + 2.4) }}><Logo url={p.logoUrl} name={p.restaurantName} style={{ maxHeight: 14 * u, maxWidth: 40 * u }} fontStyle={{}} /></div>}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/* ───────────────────────── Street : bandes diagonales entre les jours ───────────────────────── */

const YELLOW = "#ffd60a", RED = "#ff3b1f", INK = "#111111";

/** Bandes qui traversent l'écran autour d'une frontière ; elles couvrent tout au moment du changement. */
export function Slash({ b, at }: { b: number; at: number }) {
  const k = interpolate(b, [at - 0.45, at + 0.45], [0, 1], clamp);
  if (k <= 0 || k >= 1) return null;
  const eased = Easing.inOut(Easing.cubic)(k);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[RED, INK, YELLOW].map((color, i) => {
        const x = interpolate(eased, [0, 1], [-180 + i * 12, 120 + i * 12]);
        return <AbsoluteFill key={i} style={{ background: color, clipPath: `polygon(${x}% 0%, ${x + 70}% 0%, ${x + 40}% 100%, ${x - 30}% 100%)` }} />;
      })}
    </AbsoluteFill>
  );
}

function StreetMenu(p: MenuSemaineProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const tall = height / width > 1.5;
  const words = restoWords(p.locale);
  const { b, t, span, pulse, tl, index } = useMenuClock(p);
  const slam = (at: number) => span(at, at + 0.45, Easing.out(Easing.back(2.2)));
  const stamp = (s: number, style: CSSProperties, text: string, rot = 0) => {
    const k = slam(s);
    return <div style={{ fontFamily: condensedFont, textTransform: "uppercase", lineHeight: 0.86, opacity: k > 0 ? 1 : 0, transform: `scale(${1.9 - 0.9 * k}) rotate(${rot}deg)`, ...style }}>{text}</div>;
  };
  const boundaries = [tl.intro, ...p.days.map((_, i) => tl.dayStart(i) + tl.perDay)];
  const day = (i: number) => {
    const d = p.days[i], s = tl.dayStart(i), e = s + tl.perDay;
    const photo = Boolean(d.photoUrl);
    const lines = splitBalanced(d.name.toUpperCase(), 3);
    const nameSize = fitSize(lines, (photo ? 14 : 19) * u, 86 * u, 0.47);
    const card = span(s + 0.3, s + 0.9, Easing.out(Easing.back(1.6)));
    return (
      <AbsoluteFill key={i}>
        {/* Numéro du jour en fond, en contour */}
        <div style={{ position: "absolute", right: -4 * u, bottom: `${tall ? 18 : 12}%`, fontFamily: condensedFont, fontSize: 70 * u, lineHeight: 0.8, color: "transparent", WebkitTextStroke: `${0.5 * u}px rgba(17,17,17,0.18)`, transform: `translateY(${(1 - span(s, s + 1)) * 10 * u}px)` }}>{String(i + 1).padStart(2, "0")}</div>
        <div style={{ position: "absolute", left: 6 * u, top: `${tall ? 13 : 12}%` }}>{stamp(s + 0.05, { fontSize: 20 * u, color: INK }, d.label, -4)}</div>
        {photo && (
          <div style={{ position: "absolute", left: "50%", top: `${tall ? 25 : 27}%`, width: (tall ? 80 : 58) * u, height: (tall ? 62 : 38) * u, border: `${1.2 * u}px solid ${INK}`, boxShadow: `${1.6 * u}px ${1.6 * u}px 0 ${INK}`, overflow: "hidden", opacity: card > 0 ? 1 : 0, transform: `translate(-50%, ${(1 - card) * 40 * u}px) rotate(${(i % 2 ? 2.5 : -2.5) + (1 - card) * 8}deg) scale(${1 + 0.015 * pulse})` }}>
            <DishPhoto url={d.photoUrl!} focus={d.focus} scale={1.1 + 0.06 * span(s, e, Easing.linear)} filter="saturate(1.22) contrast(1.1)" />
          </div>
        )}
        <div style={{ position: "absolute", left: 6 * u, right: 6 * u, ...(photo ? { bottom: `${tall ? 10 : 7}%` } : { top: `${tall ? 36 : 34}%` }) }}>
          {lines.map((line, li) => {
            const k = span(s + 0.8 + li * 0.35, s + 1.2 + li * 0.35, Easing.out(Easing.back(1.8)));
            return <div key={line} style={{ display: "flex", marginTop: 0.8 * u, transform: `translateX(${(1 - k) * 110}vw) skewX(${(1 - k) * -18 - 6}deg)` }}><div style={{ background: li % 2 ? RED : INK, color: li % 2 ? INK : "#fff", fontFamily: condensedFont, fontSize: nameSize, lineHeight: 1, padding: `${0.4 * u}px ${2.2 * u}px ${0.8 * u}px` }}>{line}</div></div>;
          })}
          {d.price && <div style={{ display: "inline-block", marginTop: 2.5 * u, background: RED, color: YELLOW, fontFamily: condensedFont, fontSize: 11 * u, padding: `${0.3 * u}px ${2.5 * u}px`, border: `${0.6 * u}px solid ${INK}`, boxShadow: `${0.8 * u}px ${0.8 * u}px 0 ${INK}`, transform: `rotate(-4deg) scale(${slam(s + 1.6)})` }}>{d.price}</div>}
        </div>
      </AbsoluteFill>
    );
  };
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: YELLOW }}>
      {index === -1 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 1 * u }}>
          {stamp(0, { fontSize: (tall ? 34 : 28) * u, color: INK }, words.menuStack[0], -4)}
          {stamp(0.5, { fontSize: (tall ? 18 : 15) * u, color: RED }, words.menuStack[1], 3)}
          {stamp(1, { fontSize: (tall ? 30 : 25) * u, color: INK }, words.menuStack[2], -2)}
          {p.dates && <div style={{ marginTop: 3 * u, background: INK, color: YELLOW, fontFamily: condensedFont, fontSize: 6 * u, padding: `${0.6 * u}px ${3 * u}px`, transform: `translateX(${(1 - span(1.8, 2.3, Easing.out(Easing.exp))) * -120}vw) rotate(-2deg)` }}>{p.dates.toUpperCase()}</div>}
        </AbsoluteFill>
      )}
      {index >= 0 && index < p.days.length && day(index)}
      {index >= 0 && (
        <div style={{ position: "absolute", left: "-10%", right: "-10%", top: `${tall ? 5 : 4}%`, background: INK, transform: "rotate(-3deg)", overflow: "hidden", whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: condensedFont, fontSize: 5.5 * u, color: YELLOW, padding: `${0.8 * u}px 0`, transform: `translateX(${-((t * 8) % 50)}%)` }}>{`${words.menuLabel} ★ `.repeat(8)}</div>
        </div>
      )}
      {index === p.days.length && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 3 * u }}>
          {stamp(tl.outroStart + 0.1, { fontSize: fitSize([p.restaurantName.toUpperCase()], 22 * u, 88 * u, 0.48), color: INK }, p.restaurantName, -3)}
          {stamp(tl.outroStart + 0.8, { fontSize: 9 * u, color: RED }, words.enjoy, 2)}
          {p.logoUrl && <div style={{ transform: `scale(${slam(tl.outroStart + 1.4)})` }}><Logo url={p.logoUrl} name={p.restaurantName} style={{ maxHeight: 14 * u, maxWidth: 40 * u }} fontStyle={{}} /></div>}
        </AbsoluteFill>
      )}
      {boundaries.map((at) => <Slash key={at} b={b} at={at} />)}
    </AbsoluteFill>
  );
}

/* ───────────────────────── Chic : la fenêtre dorée se referme ───────────────────────── */

const GOLD = "#d9b677", IVORY = "#f3ece0";

function ChicMenu(p: MenuSemaineProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const tall = height / width > 1.5;
  const words = restoWords(p.locale);
  const { span, tl, index } = useMenuClock(p);
  const slow = Easing.out(Easing.exp);
  const shadow = `0 ${0.3 * u}px ${2.5 * u}px rgba(0,0,0,0.85)`;
  const day = (i: number) => {
    const d = p.days[i], s = tl.dayStart(i), e = s + tl.perDay;
    const photo = Boolean(d.photoUrl);
    const open = span(s, s + 0.8, Easing.inOut(Easing.poly(4))) * (1 - span(e - 0.55, e, Easing.inOut(Easing.poly(4))));
    const text = span(s + 0.5, s + 1.4, slow) * (1 - span(e - 0.5, e - 0.1, Easing.in(Easing.quad)));
    const lines = splitBalanced(d.name, 2);
    const nameSize = fitSize(lines, (photo ? 9.5 : 12.5) * u, 86 * u, 0.4);
    return (
      <AbsoluteFill key={i} style={{ alignItems: "center", color: IVORY, textAlign: "center", textShadow: shadow }}>
        <div style={{ marginTop: `${tall ? 12 : 7}%`, fontFamily: fineSerif, fontWeight: 500, fontSize: 4.6 * u, letterSpacing: `${0.5 - 0.16 * text}em`, paddingLeft: "0.4em", color: GOLD, opacity: text }}>{d.label.toUpperCase()}</div>
        <div style={{ width: `${22 * open}%`, height: Math.max(1, 0.2 * u), background: GOLD, margin: `${2 * u}px 0` }} />
        {photo && (
          <div style={{ position: "relative", width: (tall ? 76 : 52) * u, height: (tall ? 92 : 50) * u, clipPath: `inset(${(1 - open) * 50}% 0 ${(1 - open) * 50}% 0)`, outline: `${Math.max(1, 0.2 * u)}px solid ${GOLD}`, outlineOffset: 1.2 * u }}>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}><DishPhoto url={d.photoUrl!} focus={d.focus} scale={1.16 - 0.1 * span(s, e, Easing.out(Easing.quad))} filter="brightness(0.92) contrast(1.08) saturate(0.95)" /></div>
          </div>
        )}
        <div style={{ marginTop: (photo ? 5 : tall ? 30 : 18) * u, padding: `0 ${6 * u}px`, opacity: text, transform: `translateY(${(1 - text) * 2 * u}px)` }}>
          <div style={{ fontFamily: fineSerif, fontWeight: 400, fontSize: nameSize, lineHeight: 1.02 }}>{lines.map((l) => <div key={l}>{l}</div>)}</div>
          {d.description && <div style={{ fontFamily: fineSerif, fontStyle: "italic", fontWeight: 300, fontSize: 4.6 * u, marginTop: 1.6 * u, opacity: 0.9 }}>{d.description}</div>}
          {d.price && <div style={{ fontFamily: fineSerif, fontSize: 7 * u, color: GOLD, marginTop: 2.4 * u, letterSpacing: "0.04em" }}>{d.price}</div>}
        </div>
      </AbsoluteFill>
    );
  };
  const intro = span(0, 1.4, slow) * (1 - span(tl.intro - 0.6, tl.intro, Easing.in(Easing.quad)));
  const outro = span(tl.outroStart, tl.outroStart + 1.4, slow);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "radial-gradient(ellipse at 50% 45%, #1c1813 0%, #0b0a09 72%)" }}>
      {index === -1 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: IVORY, textAlign: "center", opacity: intro }}>
          <div style={{ fontFamily: fineSerif, fontWeight: 500, fontSize: 4.4 * u, letterSpacing: "0.5em", paddingLeft: "0.5em", color: GOLD }}>{words.weekCaps}</div>
          <div style={{ width: `${40 * intro}%`, height: Math.max(1, 0.2 * u), background: GOLD, margin: `${2.6 * u}px 0` }} />
          <div style={{ fontFamily: fineSerif, fontStyle: "italic", fontWeight: 300, fontSize: fitSize([words.menuLine], 14 * u, 88 * u, 0.4), lineHeight: 1 }}>{words.menuLine}</div>
          {p.dates && <div style={{ fontFamily: fineSerif, fontSize: 5 * u, color: GOLD, marginTop: 3 * u, opacity: span(1, 2, slow) }}>{p.dates}</div>}
        </AbsoluteFill>
      )}
      {index >= 0 && index < p.days.length && day(index)}
      {index === p.days.length && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 2.4 * u, color: IVORY, opacity: outro }}>
          <div style={{ width: 2 * u, height: 2 * u, border: `${0.2 * u}px solid ${GOLD}`, transform: "rotate(45deg)" }} />
          <Logo url={p.logoUrl} name={p.restaurantName.toUpperCase()} style={{ maxHeight: 16 * u, maxWidth: 50 * u }} fontStyle={{ fontFamily: fineSerif, fontWeight: 500, fontSize: fitSize([p.restaurantName], 6.5 * u, 80 * u, 0.9), letterSpacing: "0.38em", paddingLeft: "0.38em" }} />
          <div style={{ fontFamily: fineSerif, fontStyle: "italic", fontSize: 6 * u, color: GOLD }}>{words.enjoy}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/* ───────────────────────── Composition ───────────────────────── */

export function MenuSemaine(props: MenuSemaineProps) {
  const total = menuSemaineFrames(props.style, props.bpm, props.days.length);
  const Body = { bistrot: BistrotMenu, street: StreetMenu, chic: ChicMenu, carte3d: CarteMenu, table3d: BistrotMenu }[props.style];
  return (
    <AbsoluteFill style={{ fontFamily: bodyFont }}>
      <Body {...props} />
      <Music url={props.musicSrc} beatOffset={props.beatOffset} total={total} />
    </AbsoluteFill>
  );
}

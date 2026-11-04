// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import { AbsoluteFill, Easing, useVideoConfig } from "remotion";
import { formuleMidiFrames } from "../../../config/resto-templates";
import { condensedFont, bodyFont } from "../fonts";
import { chalkFont, Chalk, DishPhoto, fineSerif, Music, Slate, Write } from "./plat-du-jour";
import { Erase, Slash } from "./menu-semaine";
import { fitSize, Logo, restoWords, splitBalanced, useFormulaClock, type FormuleMidiProps } from "./resto-kit";
import { CarteFormule } from "./carte-3d";

export type { FormuleMidiProps, FormulaCourseView } from "./resto-kit";

/**
 * « Formule midi » : les plats s'assemblent un par un (entrée + plat + dessert), puis le prix de la formule tombe.
 * Les plats restent à l'écran : c'est l'addition qui raconte la formule. Photos facultatives.
 * Signatures : Bistrot additionne à la craie, Street empile des tuiles avec des « + », Chic compose une carte dorée,
 * Carte distribue une carte par plat avant la pièce du prix.
 */

/* ───────────────────────── Bistrot : l'addition à la craie ───────────────────────── */

const CHALK = "#f3efe4", OCHRE = "#f5b942", BRICK = "#ff7347";

function BistrotFormula(p: FormuleMidiProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const tall = height / width > 1.5;
  const words = restoWords(p.locale);
  const { span, tl } = useFormulaClock(p);
  const write = (a: number, b: number) => span(a, b, Easing.inOut(Easing.sin));
  const n = p.courses.length;
  const rowH = (tall ? 54 : 50) / n; // % de la hauteur
  const top = tall ? 14 : 12;
  const titleSize = fitSize(words.formula, 26 * u, 86 * u, 0.44);
  return (
    <AbsoluteFill style={{ overflow: "hidden", color: CHALK }}>
      <Slate />
      {/* Titre, effacé à l'éponge quand les plats arrivent */}
      <Erase p={span(tl.intro - 0.7, tl.intro, Easing.inOut(Easing.quad))}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", opacity: tl.intro > 0 ? 1 : 0 }}>
          <Chalk style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Write p={write(0, 1.1)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: titleSize, lineHeight: 0.95, color: OCHRE }}>{words.formula[0]}</Write>
            <Write p={write(0.7, 1.8)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: titleSize * 0.8, lineHeight: 1 }}>{words.formula[1]}</Write>
            {p.availability && <Write p={write(1.5, 2.5)} style={{ fontFamily: chalkFont, fontWeight: 500, fontSize: 6 * u, marginTop: 3 * u, opacity: 0.9 }}>{p.availability}</Write>}
          </Chalk>
        </AbsoluteFill>
      </Erase>
      {/* Les plats s'additionnent ligne après ligne */}
      {p.courses.map((c, i) => {
        const s = tl.courseStart(i);
        const drop = span(s, s + 0.8, Easing.out(Easing.back(1.4)));
        const lines = splitBalanced(c.name, 2);
        const photo = Boolean(c.photoUrl);
        return (
          <div key={i} style={{ position: "absolute", left: 6 * u, right: 6 * u, top: `${top + i * rowH}%`, height: `${rowH}%`, display: "flex", alignItems: "center", gap: 5 * u }}>
            {i > 0 && <Chalk style={{ position: "absolute", left: photo ? (tall ? 20 : 15) * u : "50%", top: (tall ? -4.6 : -3.2) * u, transform: "translateX(-50%)" }}><Write p={write(s - 0.1, s + 0.3)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: 11 * u, color: OCHRE, lineHeight: 1 }}>+</Write></Chalk>}
            {photo && (
              <div style={{ flexShrink: 0, padding: `${1.4 * u}px ${1.4 * u}px ${4.5 * u}px`, background: "#f7f3ea", boxShadow: `0 ${1.5 * u}px ${4 * u}px rgba(0,0,0,0.5)`, opacity: drop > 0 ? 1 : 0, transform: `translateY(${(1 - drop) * -30 * u}px) rotate(${(i % 2 ? 4 : -4) + (1 - drop) * 14}deg)` }}>
                <div style={{ position: "relative", width: (tall ? 30 : 16) * u, height: (tall ? 30 : 16) * u, overflow: "hidden" }}><DishPhoto url={c.photoUrl!} focus={c.focus} scale={1.08} filter="saturate(1.08) contrast(1.05) sepia(0.06)" /></div>
              </div>
            )}
            <Chalk style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: photo ? "flex-start" : "center", textAlign: photo ? "left" : "center" }}>
              <Write p={write(s + 0.2, s + 0.9)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: (tall ? 8 : 5.6) * u, color: OCHRE, lineHeight: 1 }}>{c.label}</Write>
              <Write p={write(s + 0.7, s + 1.8)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: fitSize(lines, (tall ? 10.5 : 7) * u, (photo ? 52 : 84) * u, 0.43), lineHeight: 1 }}>{lines.map((l) => <div key={l}>{l}</div>)}</Write>
            </Chalk>
          </div>
        );
      })}
      {/* Le total */}
      <div style={{ position: "absolute", left: 0, right: 0, top: `${top + n * rowH + 2}%`, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * u }}>
        <svg width={70 * u} height={3 * u} viewBox="0 0 100 4" preserveAspectRatio="none"><path d="M 2 2 Q 50 0.5 98 2.4" fill="none" stroke={CHALK} strokeWidth={0.6} strokeLinecap="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - span(tl.finaleStart, tl.finaleStart + 0.6)} /></svg>
        <Chalk style={{ display: "flex", alignItems: "baseline", gap: 3 * u }}>
          <Write p={write(tl.finaleStart + 0.4, tl.finaleStart + 1)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: 7 * u, color: OCHRE }}>{words.formulaCaps}</Write>
          {p.price && <Write p={write(tl.finaleStart + 0.8, tl.finaleStart + 1.8)} style={{ fontFamily: chalkFont, fontWeight: 700, fontSize: 17 * u, color: BRICK, lineHeight: 1 }}>{p.price}</Write>}
        </Chalk>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: `${tall ? 5 : 4}%`, display: "flex", justifyContent: "center", opacity: span(tl.outroStart, tl.outroStart + 1) }}>
        <Chalk style={{ padding: "0 0.3em" }}><Logo url={p.logoUrl} name={p.restaurantName} style={{ maxHeight: 10 * u, maxWidth: 40 * u }} fontStyle={{ fontFamily: chalkFont, fontWeight: 700, fontSize: 7 * u, color: CHALK }} /></Chalk>
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── Street : les tuiles s'empilent ───────────────────────── */

const YELLOW = "#ffd60a", RED = "#ff3b1f", INK = "#111111";

function StreetFormula(p: FormuleMidiProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const tall = height / width > 1.5;
  const words = restoWords(p.locale);
  const { b, t, span, tl } = useFormulaClock(p);
  const slam = (at: number) => span(at, at + 0.45, Easing.out(Easing.back(2.2)));
  const n = p.courses.length;
  const rowH = (tall ? 50 : 46) / n;
  const top = tall ? 13 : 12;
  const intro = b < tl.intro;
  const price = slam(tl.finaleStart + 0.4);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: YELLOW }}>
      {intro ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 1 * u }}>
          {words.formula.map((w, i) => <div key={w} style={{ fontFamily: condensedFont, textTransform: "uppercase", lineHeight: 0.86, fontSize: fitSize(words.formula, (tall ? 34 : 28) * u, 86 * u, 0.5), color: i ? RED : INK, opacity: slam(i * 0.6) > 0 ? 1 : 0, transform: `scale(${1.9 - 0.9 * slam(i * 0.6)}) rotate(${i ? 3 : -4}deg)` }}>{w}</div>)}
          {p.availability && <div style={{ marginTop: 3 * u, background: INK, color: YELLOW, fontFamily: condensedFont, fontSize: 6 * u, padding: `${0.6 * u}px ${3 * u}px`, transform: `translateX(${(1 - span(1.4, 1.9, Easing.out(Easing.exp))) * -120}vw) rotate(-2deg)` }}>{p.availability.toUpperCase()}</div>}
        </AbsoluteFill>
      ) : (
        <>
          <div style={{ position: "absolute", left: "-10%", right: "-10%", top: `${tall ? 5 : 4}%`, background: INK, transform: "rotate(-3deg)", overflow: "hidden", whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: condensedFont, fontSize: 5.5 * u, color: YELLOW, padding: `${0.8 * u}px 0`, transform: `translateX(${-((t * 8) % 50)}%)` }}>{`${words.formulaCaps} ★ `.repeat(8)}</div>
          </div>
          {p.courses.map((c, i) => {
            const s = tl.courseStart(i), k = slam(s), side = i % 2 ? 1 : -1;
            const lines = splitBalanced(c.name.toUpperCase(), 2);
            const photo = Boolean(c.photoUrl);
            return (
              <div key={i} style={{ position: "absolute", left: 6 * u, right: 6 * u, top: `${top + i * rowH}%`, height: `${rowH}%`, display: "flex", alignItems: "center", gap: 4 * u, flexDirection: i % 2 ? "row-reverse" : "row", opacity: k > 0 ? 1 : 0, transform: `translateX(${(1 - k) * side * 110}vw) rotate(${(1 - k) * side * 8}deg)` }}>
                {photo && <div style={{ position: "relative", flexShrink: 0, width: (tall ? 26 : 15) * u, height: (tall ? 26 : 15) * u, border: `${1 * u}px solid ${INK}`, boxShadow: `${1.2 * u}px ${1.2 * u}px 0 ${INK}`, overflow: "hidden", transform: `rotate(${side * 3}deg)` }}><DishPhoto url={c.photoUrl!} focus={c.focus} scale={1.1} filter="saturate(1.22) contrast(1.1)" /></div>}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: i % 2 && photo ? "flex-end" : "flex-start", gap: 0.8 * u }}>
                  <span style={{ background: RED, color: INK, fontFamily: condensedFont, fontSize: (tall ? 5.5 : 4.2) * u, padding: `0 ${1.6 * u}px`, transform: "rotate(-2deg)" }}>{c.label.toUpperCase()}</span>
                  {lines.map((l) => <span key={l} style={{ background: INK, color: "#fff", fontFamily: condensedFont, fontSize: fitSize(lines, (tall ? 8.5 : 5.8) * u, (photo ? 52 : 84) * u, 0.47), lineHeight: 1.05, padding: `${0.2 * u}px ${1.6 * u}px` }}>{l}</span>)}
                </div>
                {i > 0 && <div style={{ position: "absolute", left: photo ? (i % 2 ? `calc(100% - ${(tall ? 13 : 10) * u}px)` : (tall ? 13 : 10) * u) : "50%", top: -3.8 * u, width: 6.5 * u, height: 6.5 * u, zIndex: 2, borderRadius: "50%", background: RED, border: `${0.6 * u}px solid ${INK}`, display: "grid", placeItems: "center", fontFamily: condensedFont, fontSize: 5.5 * u, color: YELLOW, transform: `translateX(-50%) scale(${slam(s + 0.15)})` }}>+</div>}
              </div>
            );
          })}
          {/* Le prix en gros sticker */}
          <div style={{ position: "absolute", left: "50%", top: `${top + n * rowH + 3}%`, opacity: price > 0 ? 1 : 0, transform: `translateX(-50%) scale(${price}) rotate(${-8 + Math.sin(t * 2.2) * 2}deg)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ background: INK, color: YELLOW, fontFamily: condensedFont, fontSize: 5.5 * u, padding: `${0.3 * u}px ${2 * u}px` }}>{words.formulaCaps}</span>
            {p.price && <span style={{ background: RED, color: YELLOW, fontFamily: condensedFont, fontSize: 16 * u, lineHeight: 1, padding: `${0.6 * u}px ${3 * u}px`, border: `${0.8 * u}px solid ${INK}`, boxShadow: `${1.2 * u}px ${1.2 * u}px 0 ${INK}` }}>{p.price}</span>}
          </div>
          <div style={{ position: "absolute", right: 6 * u, bottom: `${tall ? 4 : 3}%`, transform: `scale(${slam(tl.outroStart)}) rotate(-6deg)` }}>
            <Logo url={p.logoUrl} name={p.restaurantName} style={{ maxHeight: 11 * u, maxWidth: 36 * u }} fontStyle={{ fontFamily: condensedFont, fontSize: 5.5 * u, color: YELLOW, background: INK, padding: `${0.6 * u}px ${2 * u}px`, textTransform: "uppercase" }} />
          </div>
        </>
      )}
      <Slash b={b} at={tl.intro} />
    </AbsoluteFill>
  );
}

/* ───────────────────────── Chic : la carte dorée se compose ───────────────────────── */

const GOLD = "#d9b677", IVORY = "#f3ece0";

function ChicFormula(p: FormuleMidiProps) {
  const { width, height } = useVideoConfig();
  const u = width / 100;
  const tall = height / width > 1.5;
  const words = restoWords(p.locale);
  const { span, tl } = useFormulaClock(p);
  const slow = Easing.out(Easing.exp);
  const intro = span(0, 1.4, slow);
  const lift = span(tl.intro - 0.6, tl.intro + 0.4, Easing.inOut(Easing.cubic));
  const price = span(tl.finaleStart + 0.3, tl.finaleStart + 1.6, slow);
  const frame = span(tl.finaleStart, tl.finaleStart + 1.2, Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "radial-gradient(ellipse at 50% 45%, #1c1813 0%, #0b0a09 72%)", color: IVORY, textAlign: "center" }}>
      {/* L'en-tête monte en haut de la carte quand les plats arrivent */}
      <div style={{ position: "absolute", left: 0, right: 0, top: `${44 - lift * (tall ? 34 : 36)}%`, display: "flex", flexDirection: "column", alignItems: "center", opacity: intro }}>
        <div style={{ fontFamily: fineSerif, fontWeight: 500, fontSize: (4.4 + (1 - lift) * 1.2) * u, letterSpacing: "0.5em", paddingLeft: "0.5em", color: GOLD }}>{words.formulaCaps}</div>
        <div style={{ width: `${30 * intro}%`, height: Math.max(1, 0.2 * u), background: GOLD, margin: `${2 * u}px 0` }} />
        {p.availability && <div style={{ fontFamily: fineSerif, fontStyle: "italic", fontWeight: 300, fontSize: 5 * u }}>{p.availability}</div>}
      </div>
      <div style={{ position: "absolute", left: 9 * u, right: 9 * u, top: `${tall ? 27 : 22}%`, display: "flex", flexDirection: "column", gap: (tall ? 3 : 0.8) * u }}>
        {p.courses.map((c, i) => {
          const s = tl.courseStart(i), k = span(s, s + 1.1, slow);
          const lines = splitBalanced(c.name, 2);
          const ring = (tall ? 20 : 11.5) * u;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: (tall ? 3 : 0.8) * u }}>
              {i > 0 && <div style={{ alignSelf: "center", fontFamily: fineSerif, fontSize: (tall ? 6 : 4.4) * u, lineHeight: 0.6, color: GOLD, opacity: span(s - 0.3, s + 0.4) }}>+</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 5 * u, textAlign: "left", opacity: k, transform: `translateX(${(1 - k) * 4 * u}px)`, filter: `blur(${(1 - k) * 5}px)` }}>
                {/* Médaillon : la photo, ou l'initiale du plat sans photo */}
                <div style={{ position: "relative", flexShrink: 0, width: ring, height: ring, borderRadius: "50%", overflow: "hidden", outline: `${Math.max(1, 0.2 * u)}px solid ${GOLD}`, outlineOffset: 0.8 * u, display: "grid", placeItems: "center", background: "#171411" }}>
                  {c.photoUrl ? <DishPhoto url={c.photoUrl} focus={c.focus} scale={1.1 + 0.05 * span(s, tl.total)} filter="brightness(0.95) contrast(1.06)" /> : <span style={{ fontFamily: fineSerif, fontSize: ring * 0.55, color: GOLD, lineHeight: 1 }}>{c.label.charAt(0)}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: fineSerif, fontWeight: 500, fontSize: 3.4 * u, letterSpacing: "0.4em", color: GOLD }}>{c.label.toUpperCase()}</div>
                  <div style={{ fontFamily: fineSerif, fontSize: fitSize(lines, (tall ? 7.5 : 5.6) * u, 54 * u, 0.4), lineHeight: 1.05, marginTop: 0.8 * u }}>{lines.map((l) => <div key={l}>{l}</div>)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {p.price && (
        <div style={{ position: "absolute", left: "50%", bottom: `${tall ? 11 : 8}%`, transform: "translateX(-50%)", padding: `${(tall ? 1.6 : 1) * u}px ${6 * u}px`, opacity: price }}>
          {[0, 1].map((side) => <div key={side} style={{ position: "absolute", inset: 0, borderTop: `${Math.max(1, 0.2 * u)}px solid ${GOLD}`, borderBottom: `${Math.max(1, 0.2 * u)}px solid ${GOLD}`, clipPath: `inset(0 ${side ? 0 : 50 * (1 - frame)}% 0 ${side ? 50 * (1 - frame) : 0}%)` }} />)}
          <div style={{ fontFamily: fineSerif, fontSize: (tall ? 11 : 8.5) * u, color: GOLD, letterSpacing: "0.04em", lineHeight: 1 }}>{p.price}</div>
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: `${tall ? 5 : 3}%`, display: "flex", justifyContent: "center", opacity: span(tl.outroStart, tl.outroStart + 1.2, slow) }}>
        <Logo url={p.logoUrl} name={p.restaurantName.toUpperCase()} style={{ maxHeight: 9 * u, maxWidth: 40 * u }} fontStyle={{ fontFamily: fineSerif, fontWeight: 500, fontSize: 3.8 * u, letterSpacing: "0.4em", paddingLeft: "0.4em" }} />
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── Composition ───────────────────────── */

export function FormuleMidi(props: FormuleMidiProps) {
  const total = formuleMidiFrames(props.style, props.bpm, props.courses.length);
  const Body = { bistrot: BistrotFormula, street: StreetFormula, chic: ChicFormula, carte3d: CarteFormule, table3d: BistrotFormula }[props.style];
  return (
    <AbsoluteFill style={{ fontFamily: bodyFont }}>
      <Body {...props} />
      <Music url={props.musicSrc} beatOffset={props.beatOffset} total={total} />
    </AbsoluteFill>
  );
}

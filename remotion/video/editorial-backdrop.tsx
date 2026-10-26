import type { CSSProperties, ReactNode } from "react";
import type { EditorialTreatment } from "../../config/editorial-motion";

const CONTACT_CROPS = ["20% 30%", "50% 40%", "80% 30%", "30% 70%", "60% 60%", "85% 80%"];
const CONTACT_PICKS = [1, 3, 5, 0, 4, 2];
/** Crosscut : cadrages des plans A (haut) et B (bas), renouvelés à chaque scène (montage alterné). */
const CROSSCUT_CROPS = [
  { a: "62% 62%", aScale: 1.25, aY: -24, b: "30% 40%", bScale: 1.5 },
  { a: "28% 72%", aScale: 1.45, aY: -30, b: "70% 35%", bScale: 1.3 },
  { a: "75% 45%", aScale: 1.6, aY: -16, b: "45% 60%", bScale: 1.15 },
  { a: "45% 80%", aScale: 1.15, aY: -34, b: "20% 30%", bScale: 1.7 },
];
/** Broadsheet : cadrages de la colonne et de la grande photo du bas, renouvelés à chaque édition (scène). */
const PRESS_CROPS = [
  { column: "center", lower: "center 70%" },
  { column: "25% 40%", lower: "30% 35%" },
  { column: "75% 60%", lower: "75% 55%" },
];
const ARCH_POSITIONS = [
  { left: "50%", shift: "-50%", outline: 1, height: "50%", crop: "center", dot: "50%" },
  { left: "8%", shift: "0%", outline: 1, height: "40%", crop: "30% 50%", dot: "88%" },
  { left: "92%", shift: "-100%", outline: -1, height: "40%", crop: "70% 50%", dot: "12%" },
];


/** Frame-driven motion; the same geometry is used by the static gallery preview. */
export function EditorialBackdrop({ treatment, palette, progress = 0, scene = 0, time = 0, cut = { out: 0, in: 0 }, renderPhoto }: {
  treatment: EditorialTreatment; palette: [string, string, string]; progress?: number;
  /**
   * Coupe de montage autour d'une frontière (Crosscut, transition « ciseaux ») : `out` 0 → 1 pendant que les plans quittent le cadre,
   * `in` 1 → 0 pendant que les plans de la scène suivante entrent.
   */
  cut?: { out: number; in: number };
  /** Temps de la vidéo en secondes (mouvements continus d'une scène à l'autre). */
  time?: number;
  /** Active scene index; Contact, Folio and Lens recompose their geometry on each scene. */
  scene?: number;
  renderPhoto: (style: CSSProperties) => ReactNode;
}) {
  const [bg, , accent] = palette;
  const full: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
  const photo = (extra: CSSProperties = {}) => renderPhoto({ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + progress * 0.045}) translateX(${-progress * 1.2}%)`, ...extra });
  const pick = CONTACT_PICKS[scene % CONTACT_PICKS.length];
  const arch = ARCH_POSITIONS[scene % ARCH_POSITIONS.length];
  if (["contact-sheet", "arch-window"].includes(treatment)) return <div style={{ ...full, background: bg }}>
    {treatment === "contact-sheet" && <>
      <div style={{ position: "absolute", inset: "9% 7% 42% 7%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: "1.6%" }}>
        {CONTACT_CROPS.map((_, i) => {
          const position = CONTACT_CROPS[(i + scene * 2) % CONTACT_CROPS.length];
          return <div key={i} style={{ position: "relative", overflow: "hidden", outline: `1px solid ${accent}33`, opacity: Math.max(0, Math.min(1, progress * 25 - i)) }}>
            {photo({ filter: i === pick ? "none" : "grayscale(1)", opacity: i === pick ? 0.95 : 0.6, objectPosition: position, transformOrigin: position, transform: `scale(${(scene % 2 ? 2.4 : 1.9) + progress * 0.08})` })}
          </div>;
        })}
      </div>
      <div style={{ position: "absolute", left: `${[5, 34, 63][pick % 3]}%`, top: `${pick < 3 ? 7 : 31.5}%`, width: "32%", height: "27%", border: `3px solid ${accent}`, borderRadius: "50%", transform: `rotate(${scene % 2 ? 5 : -6}deg) scale(${Math.max(0, Math.min(1, progress * 6 - 0.6))})` }}/>
      <div style={{ position: "absolute", left: "7%", top: "60%", width: `${18 + progress * 40}%`, height: 2, background: accent }}/>
    </>}
    {treatment === "arch-window" && (() => {
      // Sortie : la fenêtre se referme dans l'axe où elle s'est ouverte (fin de scène, recouvert ou accompagné par la transition)
      const close = Math.max(0, Math.min(1, (progress - 0.93) / 0.07)) ** 2;
      const open = Math.max(0, 100 - progress * 320);
      const clip = scene % 2 ? `inset(0 ${open}% 0 ${close * 100}%)` : `inset(${open}% 0 ${close * 100}% 0)`;
      // Signet : ruban d'accent qui pend du haut de page, côté opposé à l'arche, et oscille doucement
      const ribbonLeft = arch.outline < 0 || arch.left === "50%" ? "12%" : "84%";
      return <>
      <div style={{ position: "absolute", top: 0, left: ribbonLeft, width: "3.2%", height: `${15 + Math.min(1, progress * 4) * 5}%`, background: accent, opacity: 0.9, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%)", transformOrigin: "50% 0", transform: `rotate(${Math.sin(time * 0.9) * 2.5}deg)` }}/>
      {/* Double filet : un second contour plus lointain, décalé dans l'autre sens */}
      <div style={{ position: "absolute", top: "10%", left: arch.left, height: arch.height, aspectRatio: "3 / 4", border: `1px solid ${accent}`, borderRadius: "999px 999px 0 0", opacity: 0.35, transform: `translate(calc(${arch.shift} + ${-arch.outline * (1.5 + progress * 1.2)}%), -4%)` }}/>
      <div style={{ position: "absolute", top: "10%", left: arch.left, height: arch.height, aspectRatio: "3 / 4", border: `1px solid ${accent}`, borderRadius: "999px 999px 0 0", transform: `translate(calc(${arch.shift} + ${arch.outline * (2 + progress * 1.5)}%), -2.5%)` }}/>
      <div style={{ position: "absolute", top: "9%", left: arch.left, height: arch.height, aspectRatio: "3 / 4", overflow: "hidden", borderRadius: "999px 999px 0 0", transform: `translateX(${arch.shift})`, clipPath: clip }}>{photo({ opacity: 0.92, objectPosition: arch.crop, transform: scene % 3 === 1 ? `scale(${1.12 - progress * 0.06}) translateY(${progress * 2}%)` : undefined })}</div>
      {arch.outline < 0 || arch.left !== "50%" ? <div style={{ position: "absolute", top: "33%", left: arch.outline < 0 ? "8%" : "auto", right: arch.outline < 0 ? "auto" : "8%", height: "17%", aspectRatio: "3 / 4", borderRadius: "999px 999px 0 0", background: accent, opacity: 0.85, transform: `translateY(${(1 - Math.min(1, progress * 3)) * 8}%)` }}/> : null}
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "62.5%", height: 1, background: accent, opacity: 0.55, transform: `scaleX(${Math.min(1, 0.3 + progress * 2)})`, transformOrigin: arch.outline < 0 ? "right" : "left" }}/>
      <div style={{ position: "absolute", left: arch.dot, bottom: "6%", height: "0.7%", aspectRatio: "1", borderRadius: "50%", background: accent, transform: "translateX(-50%)" }}/>
    </>;
    })()}

  </div>;
  if (["press-column", "diagonal-diptych"].includes(treatment)) return <div style={{ ...full, background: bg }}>
    {treatment === "press-column" && (() => {
      // Chaque scène est une nouvelle édition : autres cadrages, impression qui se recale, trame de points sur les photos.
      const crop = PRESS_CROPS[scene % PRESS_CROPS.length];
      const ink = palette[1];
      const enter = Math.min(1, progress * 6);
      const leave = Math.max(0, Math.min(1, (progress - 0.93) / 0.07)) ** 2;
      // Repérage d'impression : le calque d'accent est décalé à l'arrivée et au départ, puis se recale
      const misregister = (1 - enter) ** 2 + leave;
      const halftone: CSSProperties = { position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, ${ink} 28%, transparent 31%)`, backgroundSize: "1.1cqmin 1.1cqmin", opacity: 0.16, mixBlendMode: "multiply", pointerEvents: "none" };
      return <div style={{ ...full, containerType: "size" }}>
        <div style={{ ...full, inset: "10% 6% 48% 72%", clipPath: `inset(${Math.max(0, 100 - progress * 500)}% 0 ${leave * 100}%)` }}>
          {photo({ filter: "grayscale(1)", opacity: 0.85, objectPosition: crop.column })}
          <div style={halftone}/>
        </div>
        <div style={{ ...full, inset: "66% 6% 8% 6%", transform: `translateX(${(1 - enter) ** 2 * 6 - leave * 6}%)` }}>
          {misregister > 0.01 && <div style={{ ...full, transform: `translate(${misregister * 1.4}%, ${-misregister * 1.8}%)`, opacity: 0.5 * Math.min(1, misregister * 2), mixBlendMode: "multiply" }}>{photo({ filter: `grayscale(1) sepia(1) saturate(4) hue-rotate(-20deg)`, objectPosition: crop.lower })}</div>}
          {photo({ filter: "grayscale(1)", opacity: 0.8, objectPosition: crop.lower, mixBlendMode: "multiply" })}
          <div style={halftone}/>
        </div>
        <div style={{ position: "absolute", left: "6%", top: "61%", width: `${30 + progress * 58}%`, height: "0.5%", background: accent }}/>
        {/* Filet pointillé de composition qui défile sous le grand filet */}
        <div style={{ position: "absolute", left: "6%", right: "6%", top: "62.6%", height: "0.25%", backgroundImage: `repeating-linear-gradient(90deg, ${ink} 0 1.2cqmin, transparent 1.2cqmin 2.2cqmin)`, backgroundPositionX: `${-time * 3}cqmin`, opacity: 0.45 }}/>
        <div style={{ position: "absolute", top: "10%", left: "67%", bottom: "48%", width: 1, background: accent, transform: `scaleY(${Math.min(1, progress * 4)})`, transformOrigin: "top" }}/>
      </div>;
    })()}
    {treatment === "diagonal-diptych" && (() => {
      // Montage alterné : plan A en haut, plan B en bas, séparés par une bande d'accent en diagonale.
      // Les plans travellent en sens opposés ; à chaque scène, nouveaux cadrages, et couleur / noir et blanc s'échangent.
      // Coupe (« ciseaux ») : les deux plans filent en sens contraires le long de la diagonale et les suivants entrent
      // dans la continuité du geste ; la bande reste en place comme la ligne de coupe (aucun cache plein écran).
      const swap = scene % 2 === 1;
      const crop = CROSSCUT_CROPS[scene % CROSSCUT_CROPS.length];
      const top = "polygon(0 0,100% 0,100% 39%,0 49%)", bottom = "polygon(0 64%,100% 54%,100% 100%,0 100%)", band = "polygon(0 49%,100% 39%,100% 54%,0 64%)";
      const drift = Math.min(1, progress) * 6;
      // Le plan du haut sort à droite et le suivant entre par la gauche ; le plan du bas fait l'inverse
      const shear = cut.out > 0 ? cut.out * 112 : -cut.in * 112;
      const speed = Math.max(Math.sin(Math.PI * Math.min(1, cut.out)), Math.sin(Math.PI * Math.min(1, cut.in)));
      const rush = speed > 0.05 ? `blur(${(speed * 0.9).toFixed(2)}cqmin)` : "";
      // Défilant : bondit en avant à chaque coupe, sans à-coup d'une scène à l'autre (2 crans par frontière)
      const surge = 2 * scene + cut.out - cut.in;
      const ticker = `SCENE ${String(scene + 1).padStart(2, "0")} — TAKE 01 — CUT — `.repeat(8);
      const label = (text: string, style: CSSProperties) => <div style={{ position: "absolute", fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: "2.6cqmin", letterSpacing: "0.12em", color: accent, ...style }}>{text}</div>;
      // Filets de calage parallèles à la bande, tracés de gauche à droite au début de chaque scène
      const draw = Math.min(1, progress * 5);
      const rule = (y0: number, y1: number) => {
        const x = draw * 100, y = y0 + (y1 - y0) * draw;
        return <div style={{ ...full, background: accent, opacity: 0.8, clipPath: `polygon(0 ${y0}%,${x}% ${y}%,${x}% ${y + 0.28}%,0 ${y0 + 0.28}%)` }} />;
      };
      const mark = (style: CSSProperties) => <div style={{ position: "absolute", width: "4cqmin", height: "4cqmin", ...style }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: accent }} /><div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: accent }} />
        <div style={{ position: "absolute", inset: "25%", border: `1px solid ${accent}`, borderRadius: "50%" }} />
      </div>;
      return <div style={{ ...full, containerType: "size" }}>
        <div style={{ ...full, clipPath: top }}><div style={{ ...full, inset: "-4% -12% -44%", transform: `translate(${-drift + shear}%, ${crop.aY}%)`, filter: rush }}>{photo({ filter: swap ? "brightness(1.15) saturate(1.1)" : "grayscale(1) contrast(1.1) brightness(1.25)", objectPosition: crop.a, transform: `scale(${crop.aScale + progress * 0.06})`, transformOrigin: crop.a })}</div></div>
        <div style={{ ...full, clipPath: bottom }}><div style={{ ...full, inset: "-4% -12%", transform: `translateX(${drift - shear}%)`, filter: rush }}>{photo({ filter: swap ? "grayscale(1) contrast(1.1) brightness(1.25)" : "brightness(1.15) saturate(1.1)", objectPosition: crop.b, transform: `scale(${crop.bScale + progress * 0.06})`, transformOrigin: crop.b })}</div></div>
        {/* Voile limité à la gauche du plan A : le titre reste lisible et la photo reste visible */}
        <div style={{ ...full, clipPath: top, background: `linear-gradient(90deg, ${bg}d9, ${bg}80 42%, transparent 72%), linear-gradient(180deg, ${bg}55, transparent 22%)` }} />
        {rule(46.6, 36.6)}{rule(66.1, 56.1)}
        <div style={{ ...full, clipPath: band, background: accent }} />
        {/* Ligne de coupe : un filet clair court sur le bord de la bande au moment de la coupe */}
        {speed > 0.05 && <div style={{ ...full, background: "#ffffff", opacity: speed * 0.85, clipPath: "polygon(0 63.6%,100% 53.6%,100% 54.1%,0 64.1%)" }} />}
        {/* Défilant de clap le long de la bande : avance toujours dans le même sens */}
        <div style={{ ...full, clipPath: band }}>
          <div style={{ position: "absolute", left: "-30%", width: "160%", top: "calc(51.5% - 3cqmin)", height: "6cqmin", display: "flex", alignItems: "center", transform: "rotate(atan2(-10cqh, 100cqw))", transformOrigin: "50% 50%" }}>
            <div style={{ whiteSpace: "nowrap", fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: "3.4cqmin", letterSpacing: "0.16em", color: bg, transform: `translateX(${-((time * 4 + surge * 6) % 50)}%)` }}>{ticker}{ticker}</div>
          </div>
        </div>
        {label(swap ? "B" : "A", { left: "4%", top: "4%" })}{label(swap ? "A" : "B", { right: "4%", bottom: "4%" })}
        {mark({ left: "4%", bottom: "4%" })}{mark({ right: "4%", top: "4%" })}
      </div>;
    })()}
  </div>;
  if (["newsprint", "offset", "shutters", "inlay"].includes(treatment)) {
    return <div style={{ ...full, background: bg }}>
      {treatment === "newsprint" && <>
        <div style={{ ...full, inset: "43% 34% 5% 6%", transform: `translateY(${-progress * 2}%)` }}>{photo({ opacity: 0.7 })}</div>
        <div style={{ ...full, inset: "8% 6% 65% 74%" }}>{photo({ opacity: 0.7, objectPosition: "75% center", filter: "grayscale(1)" })}</div>
        <div style={{ position: "absolute", top: "8%", bottom: "5%", left: "70%", width: 1, background: accent, opacity: 0.5 }} />
        <div style={{ position: "absolute", left: "6%", top: "39%", width: `${30 + progress * 32}%`, height: 2, background: accent }} />
      </>}
      {treatment === "offset" && <>
        <div style={{ ...full, inset: "7% 7% 30% 19%", clipPath: `polygon(0 0,100% 0,100% 72%,${64 + progress * 12}% 100%,0 100%)` }}>{photo({ opacity: 0.65 })}</div>
        <div style={{ ...full, background: `linear-gradient(0deg,${bg} 12%,transparent 68%)` }} />
        <div style={{ position: "absolute", left: "6%", top: "10%", width: "8%", height: `${17 + progress * 8}%`, background: accent }} />
      </>}
      {treatment === "shutters" && <>
        {[0, 1, 2].map((i) => <div key={i} style={{ ...full, top: `${7 + i * 30}%`, bottom: `${67 - i * 30}%`, left: `${i === 1 ? 6 : 36}%`, right: `${i === 1 ? 36 : 6}%`, clipPath: `inset(0 ${Math.max(0, 35 - progress * 70)}% 0 0)` }}>{photo({ opacity: 0.55, filter: "grayscale(1)", objectPosition: `center ${20 + i * 30}%` })}</div>)}
        <div style={{ ...full, background: `linear-gradient(90deg,${bg}aa,transparent)` }} />
      </>}
      {treatment === "inlay" && <>
        <div style={{ ...full, inset: "9% 9% 46% 25%", background: "#EAE1CE", padding: "3% 3% 9%", transform: `rotate(${-8 + progress * 3}deg)` }}>{photo({ opacity: 1 })}</div>
        <div style={{ ...full, inset: "15% 16% 42% 19%", border: `1px solid ${accent}`, opacity: 0.45, transform: "rotate(4deg)", zIndex: -1 }} />
        <div style={{ position: "absolute", left: "7%", bottom: "8%", width: `${20 + progress * 45}%`, height: 1, background: accent }} />
      </>}
    </div>;
  }
  if (["gallery", "ribbon", "color-window", "double-spread", "rust-panel"].includes(treatment)) {
    return <div style={{ ...full, background: bg }}>
      {treatment === "gallery" && <>
        <div style={{ ...full, inset: "12% 15%" }}>{photo({ opacity: 0.55, filter: "grayscale(1)" })}</div>
        {[1, -1].map((side) => <div key={side} style={{ ...full, inset: "10% 13%", border: `1px solid ${accent}`, opacity: 0.55, transform: `translate(${side * (1 - progress) * 2}%,${-side * (1 - progress) * 2}%)` }} />)}
        <div style={{ ...full, background: `linear-gradient(0deg,${bg}cc,transparent)` }} />
      </>}
      {treatment === "ribbon" && <>
        <div style={{ ...full, top: "22%", bottom: "22%", left: `${10 - progress * 10}%`, right: `${progress * 10}%` }}>{photo({ filter: "grayscale(1)", opacity: 0.55, transform: `scale(1.2) translateX(${-progress * 6}%)` })}</div>
        <div style={{ position: "absolute", top: "22%", bottom: "22%", left: `${10 - progress * 10}%`, width: 3, background: accent }} />
        <div style={{ ...full, background: `linear-gradient(90deg,${bg}bb,transparent)` }} />
      </>}
      {treatment === "color-window" && <>
        <div style={full}>{photo({ filter: "grayscale(1)", opacity: 0.4 })}</div>
        <div style={{ ...full, clipPath: `inset(10% ${45 - progress * 25}% 10% ${10 + progress * 25}%)` }}>{photo({ opacity: 0.7 })}</div>
        <div style={{ ...full, background: `linear-gradient(0deg,${bg}dd,${bg}44 55%,${bg}88)` }} />
      </>}
      {treatment === "double-spread" && <>
        <div style={{ ...full, inset: `8% ${18 - progress * 4}% 60% 5%` }}>{photo({ opacity: 0.6 })}</div>
        <div style={{ ...full, inset: `60% 5% 8% ${18 - progress * 4}%` }}>{photo({ opacity: 0.5, objectPosition: "70% center", filter: "grayscale(1)" })}</div>
        <div style={{ position: "absolute", top: "50%", left: "4%", right: "4%", height: 1, background: accent, opacity: 0.2 }} />
      </>}
      {treatment === "rust-panel" && <>
        <div style={{ ...full, inset: "6% 6% 6% 36%" }}>{photo({ filter: "grayscale(1)", opacity: 0.75 })}</div>
        <div style={{ ...full, inset: "32% 0", background: bg, opacity: 0.94, transform: `translateX(${-4 * (1 - progress)}%)` }} />
        <div style={{ position: "absolute", bottom: "15%", left: "7%", width: `${20 + progress * 30}%`, height: 1, background: accent }} />
      </>}
    </div>;
  }
  if (["slit", "masthead", "strips", "diffuse", "panorama"].includes(treatment)) {
    return <div style={{ ...full, background: bg }}>
      {treatment === "slit" && <>
        <div style={{ ...full, inset: `7% ${24 - progress * 10}%`, border: `1px solid ${accent}` }}>{photo({ filter: "grayscale(1)", opacity: 0.6 })}</div>
        <div style={{ ...full, background: `linear-gradient(0deg,${bg}ee,transparent 65%)` }} />
      </>}
      {treatment === "masthead" && <>
        <div style={{ ...full, bottom: "66%" }}>{photo({ filter: "grayscale(1)", opacity: 0.65, objectPosition: "center 30%" })}</div>
        <div style={{ ...full, top: "66%" }}>{photo({ filter: "grayscale(1)", opacity: 0.5, objectPosition: "center 70%", transform: `scale(1.15) translateX(${progress * 3}%)` })}</div>
        {[34, 66].map((top) => <div key={top} style={{ position: "absolute", top: `${top}%`, width: `${60 + progress * 40}%`, height: 3, background: accent }} />)}
      </>}
      {treatment === "strips" && <>
        {[0, 1, 2].map((i) => <div key={i} style={{ ...full, top: `${i === 1 ? 12 : 7}%`, bottom: `${i === 1 ? 7 : 12}%`, left: `${5 + i * 31}%`, right: `${66 - i * 31}%`, transform: `translateY(${(i === 1 ? 1 : -1) * progress * 3}%)` }}>{photo({ opacity: 0.55, objectPosition: `${20 + i * 30}% center`, filter: i === 1 ? "grayscale(1)" : "none" })}</div>)}
        <div style={{ ...full, background: `linear-gradient(0deg,${bg}dd,${bg}44,${bg}66)` }} />
      </>}
      {treatment === "diffuse" && <>
        <div style={{ ...full, inset: "-8%", filter: "blur(24px)" }}>{photo({ opacity: 0.7, transform: `scale(${1.2 + progress * 0.1}) rotate(${progress * 4}deg)` })}</div>
        <div style={{ ...full, background: `radial-gradient(ellipse at ${25 + progress * 45}% 30%,${accent}99,transparent 65%),linear-gradient(0deg,${bg}dd,${bg}33)` }} />
      </>}
      {treatment === "panorama" && <>
        <div style={{ ...full, top: "20%", bottom: "20%" }}>{photo({ opacity: 0.65, transform: `scale(1.1) translateX(${-progress * 4}%)` })}</div>
        <div style={{ ...full, background: `linear-gradient(0deg,${bg}dd,${bg}33 50%,${bg}88)` }} />
        <div style={{ position: "absolute", left: `${5 + progress * 10}%`, right: "5%", bottom: "20%", height: 1, background: accent }} />
      </>}
    </div>;
  }
  // Linea et Slate : partage net et sobre (photo révélée au début de chaque scène, filet fin qui se trace, numéro de scène)
  if (treatment === "linea" || treatment === "slate") {
    const reveal = 1 - (1 - Math.min(1, progress * 5)) ** 3;
    const index = <div style={{ position: "absolute", ...(treatment === "linea" ? { left: "7%", bottom: "7%" } : { right: "6%", top: "61.5%" }), color: accent, fontFamily: "Inter, Arial, sans-serif", fontSize: "1.9cqmin", letterSpacing: "0.12em", fontWeight: 600 }}>{String(scene + 1).padStart(2, "0")}</div>;
    return <div style={{ ...full, background: bg }}>
      {treatment === "linea" ? <>
        <div style={{ ...full, top: "7%", bottom: "7%", left: "47%", right: "7%", clipPath: `inset(${(1 - reveal) * 100}% 0 0 0)` }}>{photo({ filter: "grayscale(1) contrast(1.06)", transform: `scale(${1.08 - progress * 0.05})` })}</div>
        <div style={{ position: "absolute", left: "42%", top: "7%", width: 2, height: `${86 * reveal}%`, background: accent }} />
      </> : <>
        <div style={{ ...full, top: "6%", left: "6%", right: "6%", bottom: "44%", clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)` }}>{photo({ filter: "saturate(.82)", transform: `scale(${1.08 - progress * 0.05})` })}</div>
        <div style={{ position: "absolute", left: "6%", top: "60%", width: `${88 * reveal}%`, height: 2, background: accent }} />
      </>}
      {index}
    </div>;
  }
  return <div style={{ ...full, background: bg }}>
    {treatment === "frames" ? <>
      <div style={{ ...full, inset: "9% 52% 9% 5%", transform: `translateY(${-progress * 2}%)` }}>{photo({ filter: "grayscale(1)", opacity: 0.5 })}</div>
      <div style={{ ...full, inset: "17% 5% 17% 52%", transform: `translateY(${progress * 2}%)` }}>{photo({ opacity: 0.4, objectPosition: "65% center" })}</div>
      <div style={{ ...full, background: "linear-gradient(transparent,rgba(0,0,0,.68))" }} />
    </> : <>
      <div style={{ ...full, ...(treatment === "split" ? { left: "40%" } : {}) }}>{photo({ filter: treatment === "band" || treatment === "split" ? "grayscale(1)" : "none" })}</div>
      <div style={{ ...full, background: treatment === "warm" ? `linear-gradient(125deg,${bg}cc,${bg}66,${accent}44)` : `linear-gradient(90deg,${bg}dd,${bg}55),linear-gradient(0deg,${bg}cc,transparent)` }} />
    </>}
    {treatment === "band" && <div style={{ ...full, top: "27%", bottom: "27%", background: accent, transform: `translateX(${(1 - Math.min(1, progress * 10)) * -3}%)` }} />}
    {treatment === "portrait" && <div style={{ ...full, inset: "4%", border: "1px solid rgba(255,255,255,.5)" }} />}
    {treatment === "split" && <div style={{ position: "absolute", left: "40%", top: "8%", bottom: "8%", width: 2, background: accent, transform: `scaleY(${0.6 + progress * 0.4})` }} />}
    {treatment === "warm" && <div style={{ position: "absolute", bottom: "12%", left: "7%", width: `${30 + progress * 50}%`, height: 1, background: accent }} />}
  </div>;
}

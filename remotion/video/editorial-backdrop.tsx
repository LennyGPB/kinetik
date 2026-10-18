import type { CSSProperties, ReactNode } from "react";
import type { EditorialTreatment } from "../../config/editorial-motion";

const CONTACT_CROPS = ["20% 30%", "50% 40%", "80% 30%", "30% 70%", "60% 60%", "85% 80%"];
const CONTACT_PICKS = [1, 3, 5, 0, 4, 2];
const ARCH_POSITIONS = [
  { left: "50%", shift: "-50%", outline: 1, height: "50%", crop: "center", dot: "50%" },
  { left: "8%", shift: "0%", outline: 1, height: "40%", crop: "30% 50%", dot: "88%" },
  { left: "92%", shift: "-100%", outline: -1, height: "40%", crop: "70% 50%", dot: "12%" },
];
const LENS_SHOTS = [
  { top: 10, size: 42, zoom: 1, focus: "center", turn: 0, spin: 1, mono: false, halo: false },
  { top: 15, size: 30, zoom: 1.8, focus: "50% 32%", turn: 120, spin: -1, mono: true, halo: true },
  { top: 11, size: 38, zoom: 1.35, focus: "30% 60%", turn: 240, spin: 1, mono: true, halo: false },
];

/** Frame-driven motion; the same geometry is used by the static gallery preview. */
export function EditorialBackdrop({ treatment, palette, progress = 0, scene = 0, renderPhoto }: {
  treatment: EditorialTreatment; palette: [string, string, string]; progress?: number;
  /** Active scene index; Contact, Folio and Lens recompose their geometry on each scene. */
  scene?: number;
  renderPhoto: (style: CSSProperties) => ReactNode;
}) {
  const [bg, , accent] = palette;
  const full: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
  const photo = (extra: CSSProperties = {}) => renderPhoto({ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + progress * 0.045}) translateX(${-progress * 1.2}%)`, ...extra });
  const pick = CONTACT_PICKS[scene % CONTACT_PICKS.length];
  const arch = ARCH_POSITIONS[scene % ARCH_POSITIONS.length];
  const lens = LENS_SHOTS[scene % LENS_SHOTS.length];
  if (["contact-sheet", "arch-window", "lens-ring"].includes(treatment)) return <div style={{ ...full, background: bg }}>
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
    {treatment === "arch-window" && <>
      <div style={{ position: "absolute", top: "10%", left: arch.left, height: arch.height, aspectRatio: "3 / 4", border: `1px solid ${accent}`, borderRadius: "999px 999px 0 0", transform: `translate(calc(${arch.shift} + ${arch.outline * (2 + progress * 1.5)}%), -2.5%)` }}/>
      <div style={{ position: "absolute", top: "9%", left: arch.left, height: arch.height, aspectRatio: "3 / 4", overflow: "hidden", borderRadius: "999px 999px 0 0", transform: `translateX(${arch.shift})`, clipPath: scene % 2 ? `inset(0 ${Math.max(0, 100 - progress * 320)}% 0 0)` : `inset(${Math.max(0, 100 - progress * 320)}% 0 0)` }}>{photo({ opacity: 0.92, objectPosition: arch.crop })}</div>
      {arch.outline < 0 || arch.left !== "50%" ? <div style={{ position: "absolute", top: "33%", left: arch.outline < 0 ? "8%" : "auto", right: arch.outline < 0 ? "auto" : "8%", height: "17%", aspectRatio: "3 / 4", borderRadius: "999px 999px 0 0", background: accent, opacity: 0.85, transform: `translateY(${(1 - Math.min(1, progress * 3)) * 8}%)` }}/> : null}
      <div style={{ position: "absolute", left: "8%", right: "8%", top: "62.5%", height: 1, background: accent, opacity: 0.55, transform: `scaleX(${Math.min(1, 0.3 + progress * 2)})`, transformOrigin: arch.outline < 0 ? "right" : "left" }}/>
      <div style={{ position: "absolute", left: arch.dot, bottom: "6%", height: "0.7%", aspectRatio: "1", borderRadius: "50%", background: accent, transform: "translateX(-50%)" }}/>
    </>}
    {treatment === "lens-ring" && <>
      {lens.halo && <div style={{ position: "absolute", top: `${lens.top - 8}%`, left: "50%", height: `${lens.size + 16}%`, aspectRatio: "1", borderRadius: "50%", background: accent, opacity: 0.14, transform: `translateX(-50%) scale(${0.85 + Math.min(1, progress * 3) * 0.15})` }}/>}
      <div style={{ position: "absolute", top: `${lens.top - 4}%`, left: "50%", height: `${lens.size + 8}%`, aspectRatio: "1", transform: `translateX(-50%) rotate(${lens.turn + lens.spin * progress * 40}deg)` }}>
        <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden>
          {Array.from({ length: 60 }, (_, i) => <path key={i} d={`M 100 ${i % 5 ? 4 : 1} V 9`} stroke={accent} strokeWidth={i % 5 ? 0.6 : 1.2} opacity={i % 5 ? 0.45 : 0.9} transform={`rotate(${i * 6} 100 100)`}/>)}
          <circle cx="100" cy="100" r="93" fill="none" stroke={accent} strokeWidth="1.6" pathLength="100" strokeDasharray={`${Math.min(100, progress * 160)} 100`} transform="rotate(-90 100 100)"/>
        </svg>
      </div>
      <div style={{ position: "absolute", top: `${lens.top}%`, left: "50%", height: `${lens.size}%`, aspectRatio: "1", overflow: "hidden", borderRadius: "50%", transform: `translateX(-50%) scale(${0.9 + Math.min(1, progress * 4) * 0.1})` }}>{photo({ opacity: 0.9, filter: lens.mono ? "grayscale(1) contrast(1.1)" : "none", objectPosition: lens.focus, transformOrigin: lens.focus, transform: `scale(${lens.zoom + progress * 0.06})` })}</div>
      <div style={{ position: "absolute", left: "50%", top: "57.5%", width: `${8 + progress * 14}%`, height: 2, background: accent, transform: "translateX(-50%)" }}/>
    </>}
  </div>;
  if (["press-column", "diagonal-diptych", "caption-card"].includes(treatment)) return <div style={{ ...full, background: bg }}>
    {treatment === "press-column" && <>
      <div style={{ ...full, inset: "10% 6% 48% 72%", clipPath: `inset(${Math.max(0, 100 - progress * 500)}% 0 0)` }}>{photo({ filter: "grayscale(1)", opacity: 0.85 })}</div>
      <div style={{ ...full, inset: "66% 6% 8% 6%" }}>{photo({ filter: "grayscale(1)", opacity: 0.8, objectPosition: "center 70%" })}</div>
      <div style={{ position: "absolute", left: "6%", top: "61%", width: `${30 + progress * 58}%`, height: "0.5%", background: accent }}/>
      <div style={{ position: "absolute", top: "10%", left: "67%", bottom: "48%", width: 1, background: accent }}/>
    </>}
    {treatment === "diagonal-diptych" && <>
      <div style={{ ...full, inset: "0 0 61% 20%", clipPath: "polygon(18% 0,100% 0,100% 78%,0 100%)", transform: `translateX(${(1 - Math.min(1, progress * 4)) * 12}%)` }}>{photo({ filter: "grayscale(1)", opacity: 0.7 })}</div>
      <div style={{ ...full, inset: "70% 22% 0 0", clipPath: "polygon(0 18%,100% 0,82% 100%,0 100%)" }}>{photo({ opacity: 0.55, objectPosition: "70% 70%", transform: `scale(1.12) translateX(${progress * 4}%)` })}</div>
      <div style={{ position: "absolute", right: "6%", top: "72%", height: "19%", width: "0.6%", background: accent, transform: "rotate(12deg)" }}/>
    </>}
    {treatment === "caption-card" && <>
      <div style={{ ...full, inset: "9% 8% 43% 21%", clipPath: `inset(0 ${Math.max(0, 100 - progress * 400)}% 0 0)` }}>{photo({ filter: "grayscale(1)", opacity: 0.75 })}</div>
      <div style={{ ...full, inset: "7% 6% 45% 23%", border: `1px solid ${accent}`, transform: `translateY(${progress * 2}%)` }}/>
      <div style={{ position: "absolute", left: "7%", top: "61%", width: `${22 + progress * 30}%`, height: 2, background: accent }}/>
      <div style={{ position: "absolute", right: "8%", bottom: "9%", width: "8%", height: "1%", background: accent }}/>
    </>}
  </div>;
  if (["newsprint", "offset", "duotone", "shutters", "inlay"].includes(treatment)) {
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
      {treatment === "duotone" && <>
        <div style={{ ...full, inset: "0 0 38% 0" }}>{photo({ opacity: 0.8, filter: "sepia(0.8) contrast(1.1)", transform: `scale(${1.08 + progress * 0.06})` })}</div>
        <div style={{ ...full, inset: "0 0 38% 0", background: accent, mixBlendMode: "color", opacity: 0.6 }} />
        <div style={{ position: "absolute", right: "6%", top: "8%", bottom: "8%", width: 2, background: accent }} />
        <div style={{ position: "absolute", left: "7%", top: "65%", width: `${20 + progress * 30}%`, height: 1, background: accent }} />
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

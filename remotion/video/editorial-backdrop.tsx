import type { CSSProperties, ReactNode } from "react";
import type { EditorialTreatment } from "../../config/editorial-motion";

/** Frame-driven motion; the same geometry is used by the static gallery preview. */
export function EditorialBackdrop({ treatment, palette, progress = 0, renderPhoto }: {
  treatment: EditorialTreatment; palette: [string, string, string]; progress?: number;
  renderPhoto: (style: CSSProperties) => ReactNode;
}) {
  const [bg, , accent] = palette;
  const full: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };
  const photo = (extra: CSSProperties = {}) => renderPhoto({ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + progress * 0.045}) translateX(${-progress * 1.2}%)`, ...extra });
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

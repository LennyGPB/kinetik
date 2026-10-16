import type { CSSProperties } from "react";

export type SignatureBackgroundKind = "pulse-edge" | "studio-stage" | "gold-atelier" | "corporate-panels" | "swiss-rules" | "playful-fluid" | "blueprint-draft" | "ocean-tide";

/** Shared by the video renderer and catalogue: decoration stays outside the reading area. */
export function SignatureBackground({ kind, palette, time = 0, pulse = 0 }: {
  kind: SignatureBackgroundKind;
  palette: [string, string, string];
  time?: number;
  pulse?: number;
}) {
  const [bg, main, accent] = palette;
  const fill: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" };
  const tint = (color: string, opacity: number) => `color-mix(in srgb, ${color} ${opacity}%, transparent)`;

  if (kind === "blueprint-draft") return (
    <div style={fill}>
      <div style={{ ...fill, backgroundImage: `linear-gradient(${tint(main, 7)} 1px, transparent 1px), linear-gradient(90deg, ${tint(main, 7)} 1px, transparent 1px)`, backgroundSize: "5% 5%", maskImage: "radial-gradient(ellipse at 40% 50%, transparent 15%, black 85%)" }} />
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ ...fill, width: "100%", height: "100%" }} fill="none" aria-hidden>
        <path d="M60 90V60H90M910 60H940V90M940 910V940H910M90 940H60V910" stroke={main} strokeOpacity=".5" vectorEffect="non-scaling-stroke" />
        <g stroke={accent} strokeOpacity=".38" vectorEffect="non-scaling-stroke">
          <path d="M780 160H900V740H780ZM780 280H900M780 550H900M840 160V740" pathLength="1" strokeDasharray="1" strokeDashoffset={Math.exp(-time * 1.6)} />
          <path d="M760 160H740M760 740H740M750 160V740M745 170L755 150M745 750L755 730M780 780V800M900 780V800M780 790H900" />
        </g>
        <g stroke={main} strokeOpacity=".24" vectorEffect="non-scaling-stroke">
          {Array.from({ length: 19 }, (_, i) => <path key={i} d={`M${100 + i * 40} 60v${i % 5 === 0 ? 12 : 6}M60 ${100 + i * 40}h${i % 5 === 0 ? 12 : 6}`} />)}
          <path d="M100 900H680M100 885V915M680 885V915M110 895L90 905M690 895L670 905" />
        </g>
      </svg>
    </div>
  );

  if (kind === "ocean-tide") return (
    <div style={fill}>
      <div style={{ ...fill, background: `radial-gradient(ellipse at ${25 + Math.sin(time * 0.2) * 8}% -20%, ${tint(accent, 22)}, transparent 65%), linear-gradient(180deg, transparent 35%, ${tint(main, 8)})` }} />
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ ...fill, width: "100%", height: "100%" }} aria-hidden>
        {[0, 1, 2, 3].map((i) => {
          const y = 770 + i * 45;
          const sway = Math.sin(time * 0.4 + i * 1.2) * 28;
          const path = `M-100 ${y} C180 ${y - 100 + sway}, 300 ${y + 100 - sway}, 540 ${y + sway} S880 ${y - 90 - sway}, 1100 ${y + 5} L1100 1100H-100Z`;
          return <path key={i} d={path} fill={i % 2 ? accent : main} fillOpacity={0.045 + i * 0.025} stroke={i % 2 ? accent : main} strokeOpacity={0.12 + i * 0.035} strokeWidth="1" vectorEffect="non-scaling-stroke" />;
        })}
        {[0, 1, 2].map((i) => <path key={i} d={`M${740 + i * 65} -80 Q${600 + Math.sin(time * 0.22 + i) * 35} 110, ${970 + i * 65} 300`} fill="none" stroke={accent} strokeOpacity={0.035 + i * 0.012} strokeWidth="12" />)}
      </svg>
    </div>
  );

  // Style international : grille 12 colonnes qui se trace, grand cercle au trait avec arc rouge en rotation,
  // segment rouge qui balaie le filet du haut, repère qui descend le filet de droite. Tout reste au trait (lisibilité de l'affiche).
  if (kind === "swiss-rules") {
    const ease = (v: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3);
    const loop = (speed: number) => (time * speed) % 1;
    return (
      <div style={{ ...fill, containerType: "size" }}>
        {Array.from({ length: 11 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: `${7 + i * 8}%`, top: 0, bottom: 0, width: 1, background: tint(main, 6), transformOrigin: "top", transform: `scaleY(${ease((time - i * 0.05) / 0.9)})` }} />
        ))}
        <div style={{ position: "absolute", right: "-14cqmin", top: "50%", width: "78cqmin", aspectRatio: "1", transform: `translateY(-50%) scale(${0.9 + 0.1 * ease(time / 1.4)})`, opacity: ease(time / 1.2) }}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible" }} aria-hidden>
            <circle cx="50" cy="50" r="49" fill="none" stroke={main} strokeOpacity=".14" strokeWidth=".25" />
            <circle cx="50" cy="50" r="36" fill="none" stroke={main} strokeOpacity=".09" strokeWidth=".25" strokeDasharray=".8 1.6" />
            <circle cx="50" cy="50" r="49" fill="none" stroke={accent} strokeWidth=".9" pathLength="100" strokeDasharray="14 86" transform={`rotate(${time * 24 - 90} 50 50)`} />
          </svg>
        </div>
        <div style={{ position: "absolute", right: "5%", top: "12%", bottom: "12%", width: 1, background: tint(main, 16) }} />
        <div style={{ position: "absolute", right: "calc(5% - 0.6cqmin)", top: `calc(12% + ${loop(0.07) * 72}%)`, width: "1.3cqmin", height: "4%", background: accent }} />
        <div style={{ position: "absolute", left: "7%", right: "12%", top: "2%", height: 1, background: tint(main, 16) }} />
        <div style={{ position: "absolute", top: "calc(2% - 1px)", height: 3, width: "14%", left: `${7 + loop(0.05) * 67}%`, background: accent }} />
      </div>
    );
  }

  if (kind === "corporate-panels") return (
    <div style={fill}>
      <div style={{ ...fill, background: `radial-gradient(ellipse at 100% 15%, ${tint(main, 22)}, transparent 65%), linear-gradient(120deg, transparent 45%, ${tint(main, 6)})` }} />
      {[0, 1, 2].map((i) => <div key={i} style={{ position: "absolute", left: `${76 + i * 12}%`, top: "-20%", width: "32%", height: "145%", transform: `rotate(18deg) translateX(${Math.sin(time * 0.18 + i * 0.7) * 2}%)`, background: `linear-gradient(90deg, ${tint(main, 7 + i * 5)}, ${tint(bg, 55)} 60%, ${tint(accent, 3)})`, borderLeft: `1px solid ${tint(accent, 16 + i * 5)}`, boxShadow: `-18px 12px 45px ${tint(bg, 30)}` }} />)}
      <div style={{ position: "absolute", left: "8%", top: "8%", width: "6%", height: 2, background: tint(main, 65) }} />
      <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "7%", height: 1, background: `linear-gradient(90deg, ${tint(accent, 20)}, transparent 72%)` }} />
    </div>
  );

  if (kind === "playful-fluid") return (
    <div style={fill}>
      {[
        { x: -10, y: 5, size: 42, color: main, phase: 0 },
        { x: 78, y: 62, size: 46, color: accent, phase: 2 },
        { x: 73, y: -8, size: 24, color: accent, phase: 4 },
        { x: 4, y: 83, size: 22, color: main, phase: 1 },
      ].map((shape, i) => {
        const r = (k: number) => 50 + Math.sin(time * (0.6 + k * 0.08) + shape.phase + k) * 13;
        return <div key={i} style={{ position: "absolute", left: `${shape.x + Math.sin(time * 0.35 + shape.phase) * 3}%`, top: `${shape.y + Math.cos(time * 0.28 + shape.phase) * 3}%`, width: `${shape.size}%`, aspectRatio: "1", borderRadius: `${r(0)}% ${r(1)}% ${r(2)}% ${r(3)}% / ${r(4)}% ${r(5)}% ${r(6)}% ${r(7)}%`, transform: `rotate(${Math.sin(time * 0.25 + shape.phase) * 16}deg) scale(${1 + Math.sin(time * 0.5 + shape.phase) * 0.035})`, background: `radial-gradient(ellipse at 28% 20%, ${tint("#ffffff", 80)}, ${tint(shape.color, 32)} 45%, ${tint(shape.color, 58)})`, border: `1px solid ${tint("#ffffff", 70)}`, boxShadow: `inset 3px 5px 16px ${tint("#ffffff", 45)}, 0 14px 30px -18px ${tint(shape.color, 35)}` }}>
          <div style={{ position: "absolute", left: "20%", top: "12%", width: "30%", height: "12%", borderRadius: "50%", background: `radial-gradient(ellipse, ${tint("#ffffff", 75)}, transparent 70%)`, transform: `rotate(${-25 + Math.sin(time * 0.4 + i) * 8}deg)` }} />
        </div>;
      })}
    </div>
  );

  if (kind === "pulse-edge") return (
    <div style={fill}>
      <div style={{ ...fill, background: `radial-gradient(ellipse at 100% 100%, ${tint(main, 9)}, transparent 48%)` }} />
      {[false, true].map((bottom) => (
        <div key={String(bottom)} style={{ position: "absolute", left: "7%", right: "7%", ...(bottom ? { bottom: "1%" } : { top: "1%" }), height: "1.2%", display: "flex", alignItems: bottom ? "flex-end" : "flex-start", gap: "0.8%" }}>
          {Array.from({ length: 36 }, (_, i) => {
            const level = 0.16 + 0.84 * Math.abs(Math.sin(i * 1.71 + time * 3 + (bottom ? 1.2 : 0))) * (0.45 + pulse * 0.55);
            return <div key={i} style={{ flex: 1, height: `${level * 100}%`, background: main, opacity: 0.3 + level * 0.45 }} />;
          })}
        </div>
      ))}
      <div style={{ position: "absolute", right: "2.5%", top: `${22 + (time * 12) % 50}%`, width: "0.35%", height: "8%", background: main, opacity: 0.6 }} />
    </div>
  );

  // Plateau photo : cyclo, deux boîtes à lumière qui respirent, halo au sol (socle), reflet qui balaie la scène
  if (kind === "studio-stage") return (
    <div style={fill}>
      <div style={{ ...fill, background: `linear-gradient(115deg, ${tint(accent, 6)}, transparent 45%, ${tint(main, 8)})` }} />
      {[{ left: "4%", phase: 0 }, { right: "4%", phase: 1.7 }].map(({ phase, ...side }, i) => (
        <div key={`softbox-${i}`} style={{ position: "absolute", ...side, top: "4%", width: "20%", height: "28%", borderRadius: "1.2em", background: "linear-gradient(180deg, rgb(255 255 255 / .75), rgb(255 255 255 / .35))", boxShadow: "0 0 6em 2em rgb(255 255 255 / .45)", border: `1px solid ${tint(main, 10)}`, opacity: 0.55 + Math.sin(time * 0.5 + phase) * 0.15 }} />
      ))}
      <div style={{ position: "absolute", left: "20%", right: "20%", bottom: "10%", height: "14%", borderRadius: "50%", background: `radial-gradient(closest-side, ${tint(main, 16)}, transparent)` }} />
      <div style={{ position: "absolute", top: "-30%", bottom: "-30%", width: "18%", left: `${-30 + ((time * 0.09) % 1) * 160}%`, transform: "skewX(-18deg)", background: "linear-gradient(90deg, transparent, rgb(255 255 255 / .28), transparent)" }} />
      <div style={{ position: "absolute", right: "-8%", top: "-15%", width: "25%", height: "140%", background: `linear-gradient(90deg, ${tint(main, 3)}, ${tint(main, 14)})`, transform: `skewX(-12deg) translateX(${Math.sin(time * 0.22) * 2}%)`, borderLeft: `1px solid ${tint(main, 14)}` }} />
      <div style={{ position: "absolute", left: "-10%", right: "-10%", bottom: "-16%", height: "30%", borderRadius: "50% 50% 0 0", background: `linear-gradient(${tint(main, 8)}, ${tint(main, 2)})`, borderTop: `1px solid ${tint(main, 12)}` }} />
      <div style={{ position: "absolute", left: "7%", top: "7%", width: "5%", height: "0.25%", background: accent }} />
      <div style={{ position: "absolute", right: "7%", bottom: "7%", width: "5%", height: "0.25%", background: accent }} />
    </div>
  );

  return (
    <div style={fill}>
      <div style={{ ...fill, background: `radial-gradient(ellipse at ${12 + Math.sin(time * 0.18) * 6}% 0%, ${tint(main, 10)}, transparent 48%), radial-gradient(ellipse at 100% 100%, ${tint(main, 6)}, transparent 40%)` }} />
      <div style={{ position: "absolute", inset: "5%", border: `1px solid ${tint(main, 24)}` }} />
      {[false, true].map((right) => <div key={String(right)} style={{ position: "absolute", ...(right ? { right: "5%", bottom: "5%", borderRight: `1px solid ${main}`, borderBottom: `1px solid ${main}` } : { left: "5%", top: "5%", borderLeft: `1px solid ${main}`, borderTop: `1px solid ${main}` }), width: "6%", height: "4%", opacity: 0.65 + Math.sin(time * 0.35) * 0.12 }} />)}
      <div style={{ position: "absolute", left: "15%", right: "15%", top: "5%", height: 1, background: `linear-gradient(90deg, transparent, ${tint(accent, 65)}, transparent)`, transform: `scaleX(${0.6 + Math.sin(time * 0.25) * 0.15})` }} />
      <div style={{ ...fill, background: `linear-gradient(90deg, ${tint(bg, 30)}, transparent 25%, transparent 75%, ${tint(bg, 30)})` }} />
    </div>
  );
}

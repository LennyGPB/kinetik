import type { CSSProperties } from "react";

export const COLLECTION_BACKGROUNDS = ["monolith", "focus", "prism", "papercut", "metro"] as const;
export type CollectionBackgroundKind = (typeof COLLECTION_BACKGROUNDS)[number];

/** Frame-driven motifs shared with gallery thumbnails; the centre stays clear. */
export function CollectionBackground({ kind, palette, time = 2 }: { kind: CollectionBackgroundKind; palette: [string, string, string]; time?: number }) {
  const [bg, main, accent] = palette;
  const fill: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" };
  const tint = (color: string, opacity: number) => `color-mix(in srgb, ${color} ${opacity}%, transparent)`;

  if (kind === "monolith") return <div style={fill}>
    <div style={{ position: "absolute", top: "5%", left: "7%", width: "8%", height: "0.4%", background: main }} />
    <div style={{ position: "absolute", right: "5%", bottom: "5%", width: "1%", height: `${12 + Math.sin(time * 0.4) * 3}%`, background: main }} />
    <div style={{ position: "absolute", left: "7%", right: "10%", bottom: "5%", height: 1, background: tint(main, 15) }} />
  </div>;

  if (kind === "focus") return <div style={fill}>
    <div style={{ ...fill, background: `radial-gradient(ellipse at 50% 45%, ${tint(main, 7)}, transparent 60%)` }} />
    {[0, 1].map((i) => <div key={i} style={{ position: "absolute", width: `${65 + i * 16}%`, aspectRatio: "1", right: `${-38 - i * 8}%`, top: `${-10 + Math.sin(time * 0.15) * 2}%`, borderRadius: "50%", border: `1px solid ${tint(main, 12 - i * 5)}` }} />)}
    <div style={{ position: "absolute", left: "7%", bottom: "7%", width: "3%", height: 2, background: accent }} />
  </div>;

  if (kind === "prism") return <div style={fill}>
    <div style={{ ...fill, background: `radial-gradient(ellipse at 100% 0%, ${tint(main, 16)}, transparent 65%)` }} />
    {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: `${74 + i * 8}%`, top: "-20%", width: "28%", height: "140%", transform: `rotate(${20 + Math.sin(time * 0.2 + i) * 3}deg)`, background: `linear-gradient(100deg, ${tint(i % 2 ? main : accent, 22)}, ${tint(bg, 50)} 55%, ${tint(i % 2 ? accent : main, 10)})`, borderLeft: `1px solid ${tint(i % 2 ? accent : main, 40)}` }} />)}
    <div style={{ position: "absolute", left: "-10%", bottom: "-15%", width: "45%", height: "28%", transform: "rotate(25deg)", background: `linear-gradient(120deg, ${tint(main, 30)}, ${tint(accent, 6)})` }} />
  </div>;

  if (kind === "papercut") return <div style={fill}>
    {[{ x: -16, y: -18, r: -18, color: main }, { x: 83, y: 72, r: 18, color: accent }, { x: 87, y: -10, r: 35, color: main }].map((sheet, i) => <div key={i} style={{ position: "absolute", left: `${sheet.x}%`, top: `${sheet.y + Math.sin(time * 0.25 + i) * 1.5}%`, width: "34%", height: "34%", transform: `rotate(${sheet.r}deg)`, background: sheet.color, boxShadow: `0 10px 20px -10px ${tint("#201c16", 25)}` }}>
      <div style={{ position: "absolute", right: 0, bottom: 0, width: "25%", height: "25%", clipPath: "polygon(100% 0, 100% 100%, 0 100%)", background: `color-mix(in srgb, ${sheet.color}, black 15%)` }} />
    </div>)}
    <div style={{ position: "absolute", left: "6%", right: "6%", bottom: "5%", height: 1, background: tint(accent, 20) }} />
  </div>;

  return <div style={fill}>
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ ...fill, width: "100%", height: "100%" }} fill="none" aria-hidden>
      <path d="M-100 160H520Q590 160 650 100L850 -100" stroke={main} strokeWidth="6" opacity=".7" />
      <path d="M1100 340H940Q890 340 890 390V730Q890 800 820 800H-100" stroke={accent} strokeWidth="6" opacity=".65" />
      <path d="M70 1100V900Q70 860 110 860H580" stroke={main} strokeWidth="3" opacity=".25" />
      {[140, 320, 500].map((x) => <circle key={x} cx={x} cy="160" r="9" fill={bg} stroke={main} strokeWidth="4" />)}
      {[200, 420, 640].map((x) => <circle key={x} cx={x} cy="800" r="9" fill={bg} stroke={accent} strokeWidth="4" />)}
      <circle cx={120 + ((time * 75) % 380)} cy="160" r="6" fill={accent} />
      <circle cx={720 - ((time * 60) % 520)} cy="800" r="6" fill={main} />
    </svg>
  </div>;
}

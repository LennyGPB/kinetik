import { AbsoluteFill } from "remotion";

export type StageCollectionTransition = "satin-pass" | "tidal-wave" | "blueprint-scan" | "solar-sweep" | "arm-exchange";

/** Boundary covers continue the physical gesture across the overlaid text and all aspect ratios. */
export function StageCollectionCover({ kind, amount, accent }: { kind: StageCollectionTransition; amount: number; accent: string }) {
  const p = Math.max(0, Math.min(1, amount));
  if (kind === "satin-pass") return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: "-60% -35%", transform: `translateX(${(1 - p) * -110}%) rotate(-18deg)`, borderRadius: "44% 20% 45% 15%", background: `linear-gradient(105deg, #080B12 8%, #273747 32%, #AFBAC9 41%, #E4EBF4 42%, #445367 48%, #111A27 61%, #040810 88%)`, boxShadow: `18px 12px 60px #0009, inset 2px 0 0 ${accent}` }} />
  </AbsoluteFill>;
  if (kind === "tidal-wave") return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ position: "absolute", top: `${(1 - p) * 125 - p * 20}%`, height: "145%" }}>
      <defs><linearGradient id="tidal-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#91B8C8" /><stop offset="0.04" stopColor="#253E50" /><stop offset="0.2" stopColor="#08131F" /><stop offset="1" stopColor="#04080E" /></linearGradient></defs>
      <path d="M0 80 Q250 -30 500 75 T1000 70 V1000 H0Z" fill="url(#tidal-metal)" />
      <path d="M0 80 Q250 -30 500 75 T1000 70" stroke={accent} strokeWidth="1.5" opacity="0.6" fill="none" />
    </svg>
  </AbsoluteFill>;
  if (kind === "blueprint-scan") return <AbsoluteFill style={{ pointerEvents: "none", clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, background: "#07101A" }}>
    <svg width="100%" height="100%"><defs><pattern id="stage-blueprint-grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="#76C6ED" strokeWidth="0.5" opacity="0.1" /></pattern></defs><rect width="100%" height="100%" fill="url(#stage-blueprint-grid)" /></svg>
    <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${p * 100}% - 2px)`, width: 2, background: accent, boxShadow: `-6px 0 25px ${accent}55` }} />
  </AbsoluteFill>;
  if (kind === "solar-sweep") return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    {["#72522F", "#2F4050", "#B58A50"].map((color, i) => <div key={color} style={{ position: "absolute", inset: "-25%", background: `linear-gradient(105deg, #06080D, ${color} 48%, #111722 50%, #04070C)`, transform: `translateX(${(1 - p) * (145 + i * 18)}%) rotate(${12 - i * 8}deg)`, boxShadow: `-15px 0 35px #0008, inset 1px 0 0 ${accent}` }} />)}
  </AbsoluteFill>;
  return <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
    {[-1, 1].map(side => <div key={side} style={{ position: "absolute", width: "50.2%", height: "100%", left: side < 0 ? 0 : "50%", transform: `translateX(${side * (1 - p) * 102}%)`, background: "linear-gradient(90deg, #101822, #364957 5%, #1A2835 12%, #111B27 88%, #647B8E 99%, #0B111A)", boxShadow: `inset 0 2px 0 ${accent}99`, boxSizing: "border-box" }} />)}
  </AbsoluteFill>;
}

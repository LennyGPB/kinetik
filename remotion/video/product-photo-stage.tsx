import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { product2DTransition } from "../../config/product-2d-transition";
import { displayFont } from "./theme";
import { PreviewTarget } from "./movable-text";

type Props = { style: string; sources: string[]; durations: number[]; palette: readonly string[]; name: string };

export function ProductPhotoStage({ style, sources, durations, palette, name }: Props) {
  const frame = useCurrentFrame(), { width, height, fps } = useVideoConfig();
  const motion = product2DTransition(style, durations, frame, fps);
  const [background, foreground, accent] = palette;
  const vertical = height > width, u = Math.min(width, height) / 1080;
  const floating = style === "product-floating", editorial = style === "product-editorial";
  const float = Math.sin(frame / fps * .9) * (floating ? 12 : 4) * u;
  const { a, b, mix } = motion.screen;
  const same = sources[a] === sources[b];
  const variants = same || a === b ? [{ index: a, incoming: false, opacity: 1 }] : [
    { index: a, incoming: false, opacity: editorial ? 1 : 1 - mix },
    { index: b, incoming: true, opacity: editorial ? 1 : mix },
  ];
  return <AbsoluteFill style={{ backgroundColor: background, overflow: "hidden" }}>
    <div style={{ display: "none" }}>{[...new Set(sources)].map(source => <Img key={source} src={source} />)}</div>
    {floating ? <>
      <div style={{ position: "absolute", width: width * .82, height: width * .82, left: "35%", top: "12%", borderRadius: "50%", background: `radial-gradient(circle at 30% 24%, ${accent}, ${background} 72%)`, opacity: .65, transform: `translate(${motion.decorShift * u}px, ${-float * 1.5}px)` }} />
      <div style={{ position: "absolute", left: "-15%", top: "45%", width: "85%", height: "45%", border: `${2 * u}px solid ${accent}`, borderRadius: "50%", opacity: .25, transform: `perspective(1000px) rotateX(64deg) rotateZ(${-18 + frame / fps * 2}deg)` }} />
    </> : editorial ? <>
      <div style={{ position: "absolute", right: 0, top: 0, width: vertical ? "28%" : "38%", height: "100%", background: foreground, opacity: .95, transform: `translateX(${motion.decorShift * u}px)` }} />
      <div style={{ position: "absolute", top: "31%", left: "-4%", fontFamily: displayFont, fontSize: 240 * u, fontWeight: 800, whiteSpace: "nowrap", opacity: .12, letterSpacing: "-.04em", color: foreground, transform: `translateX(${(-frame / fps * 9 + motion.decorShift) * u}px)` }}>{name.toUpperCase()}</div>
    </> : <>
      <div style={{ position: "absolute", width: "70%", height: "80%", right: "-20%", top: "-20%", borderRadius: "50%", background: accent, opacity: .08, filter: `blur(${60 * u}px)` }} />
      <div style={{ position: "absolute", left: vertical ? "15%" : "48%", top: "73%", width: vertical ? "70%" : "45%", height: "12%", background: `linear-gradient(180deg, ${foreground}18, ${foreground}05)`, borderRadius: "50% / 30%", transform: "perspective(1200px) rotateX(18deg)", boxShadow: `0 ${40 * u}px ${50 * u}px ${-25 * u}px ${foreground}20` }} />
    </>}
    <div style={{ position: "absolute", left: vertical ? "18%" : "51%", top: vertical ? "67%" : "70%", width: vertical ? "64%" : "40%", height: "6%", borderRadius: "50%", background: foreground, opacity: floating ? .12 : .18, filter: `blur(${22 * u}px)`, transform: `translateX(${motion.photo.x * u}px) scale(${motion.photo.scale})` }} />
    <PreviewTarget target="screens"><div style={{ position: "absolute", left: vertical ? "10%" : "47%", top: vertical ? "25%" : "9%", width: vertical ? "80%" : "49%", height: vertical ? "49%" : "73%", transform: `translate(${motion.photo.x * u}px, ${motion.photo.y * u + float}px) rotate(${(editorial ? -6 : 0) + motion.photo.roll}deg) scale(${motion.photo.scale})`, filter: `blur(${motion.photo.blur * u}px) drop-shadow(${12 * u}px ${22 * u}px ${18 * u}px #00000022)` }}>
      {variants.filter(v => v.opacity > 0 && sources[v.index]).map(v => <Img key={v.incoming ? "incoming" : "outgoing"} src={sources[v.index]} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: v.opacity, clipPath: editorial && !same && a !== b ? `inset(0 ${v.incoming ? (1 - mix) * 100 : 0}% 0 ${v.incoming ? 0 : mix * 100}%)` : undefined }} />)}
    </div></PreviewTarget>
  </AbsoluteFill>;
}

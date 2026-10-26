import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { product2DSwap, product2DTransition, product2DTurns, type Photo2DLayer } from "../../config/product-2d-transition";
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
  const swapping = !same && a !== b;
  const swap = product2DSwap(style, mix, b);
  const variants: { index: number; incoming: boolean; layer: Photo2DLayer }[] = swapping
    ? [{ index: a, incoming: false, layer: swap.outgoing }, { index: b, incoming: true, layer: swap.incoming }].sort((l, r) => Number(l.layer.front) - Number(r.layer.front))
    : [{ index: a, incoming: false, layer: { x: 0, y: 0, scale: 1, roll: 0, blur: 0, opacity: 1, clipLeft: 0, clipRight: 0, front: false } }];
  // Intensité du raccord (0 hors transition), avancée continue d'une scène à l'autre
  const arc = a === b ? 0 : Math.sin(mix * Math.PI) ** 2;
  const turns = product2DTurns(motion.screen);
  // Editorial : la bande crème part vers la gauche et traverse le cadre, une nouvelle bande la remplace par la droite
  const bandWidth = vertical ? .28 : .38;
  const pageTurn = editorial && a !== b ? mix : 0;
  return <AbsoluteFill style={{ backgroundColor: background, overflow: "hidden" }}>
    <div style={{ display: "none" }}>{[...new Set(sources)].map(source => <Img key={source} src={source} />)}</div>
    {floating ? <>
      <div style={{ position: "absolute", width: width * .82, height: width * .82, left: "35%", top: "12%", borderRadius: "50%", background: `radial-gradient(circle at 30% 24%, ${accent}, ${background} 72%)`, opacity: .65, transform: `translate(${motion.decorShift * u}px, ${-float * 1.5}px)` }} />
      <div style={{ position: "absolute", left: "-15%", top: "45%", width: "85%", height: "45%", border: `${2 * u}px solid ${accent}`, borderRadius: "50%", opacity: .25 + arc * .45, transform: `perspective(1000px) rotateX(64deg) rotateZ(${-18 + frame / fps * 2 + turns * 55}deg) scale(${1 + arc * .12})` }} />
    </> : editorial ? <>
      {[0, 1].map(k => {
        // k = 0 : bande en place (ou qui part), k = 1 : bande qui arrive pendant le raccord
        if (k === 1 && pageTurn <= 0) return null;
        const shift = k === 0 ? -pageTurn * width : (1 - pageTurn) * (bandWidth + .02) * width;
        return <div key={k} style={{ position: "absolute", right: 0, top: 0, width: `${bandWidth * 100}%`, height: "100%", background: foreground, opacity: .95, transform: `translateX(${shift}px)`, boxShadow: pageTurn > 0 ? `${-30 * u * arc}px 0 ${60 * u}px ${background}55` : undefined }} />;
      })}
      <div style={{ position: "absolute", top: "31%", left: "-4%", fontFamily: displayFont, fontSize: 240 * u, fontWeight: 800, whiteSpace: "nowrap", opacity: .12, letterSpacing: "-.04em", color: foreground, transform: `translateX(${(-frame / fps * 9 + motion.decorShift - turns * 140) * u}px) skewX(${-arc * 14}deg)`, filter: arc > .02 ? `blur(${arc * 5 * u}px)` : undefined }}>{name.toUpperCase()}</div>
    </> : <>
      <div style={{ position: "absolute", width: "70%", height: "80%", right: "-20%", top: "-20%", borderRadius: "50%", background: accent, opacity: .08, filter: `blur(${60 * u}px)` }} />
      <div style={{ position: "absolute", left: vertical ? "15%" : "48%", top: "73%", width: vertical ? "70%" : "45%", height: "12%", background: `linear-gradient(180deg, ${foreground}18, ${foreground}05)`, borderRadius: "50% / 30%", transform: "perspective(1200px) rotateX(18deg)", boxShadow: `0 ${40 * u}px ${50 * u}px ${-25 * u}px ${foreground}20` }} />
    </>}
    {!floating && !editorial && arc > .01 && <div style={{ position: "absolute", top: "-20%", bottom: "-20%", left: `${-45 + mix * 150}%`, width: "32%", transform: "skewX(-16deg)", background: `linear-gradient(90deg, transparent, ${accent}30 35%, #ffffff55 50%, ${accent}30 65%, transparent)`, mixBlendMode: "screen", opacity: arc, pointerEvents: "none" }} />}
    <div style={{ position: "absolute", left: vertical ? "18%" : "51%", top: vertical ? "67%" : "70%", width: vertical ? "64%" : "40%", height: "6%", borderRadius: "50%", background: foreground, opacity: floating ? .12 : .18, filter: `blur(${22 * u}px)`, transform: `translateX(${motion.photo.x * u}px) scale(${motion.photo.scale})` }} />
    <PreviewTarget target="screens"><div style={{ position: "absolute", left: vertical ? "10%" : "47%", top: vertical ? "25%" : "9%", width: vertical ? "80%" : "49%", height: vertical ? "49%" : "73%", transform: `translate(${motion.photo.x * u}px, ${motion.photo.y * u + float}px) rotate(${(editorial ? -6 : 0) + motion.photo.roll}deg) scale(${motion.photo.scale})`, filter: `blur(${motion.photo.blur * u}px) drop-shadow(${12 * u}px ${22 * u}px ${18 * u}px #00000022)` }}>
      {variants.filter(v => v.layer.opacity > 0.001 && sources[v.index]).map(({ index, incoming, layer: l }) => <Img key={incoming ? "incoming" : "outgoing"} src={sources[index]} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: l.opacity, transform: `translate(${l.x * u}px, ${l.y * u}px) rotate(${l.roll}deg) scale(${l.scale})`, filter: l.blur > .05 ? `blur(${l.blur * u}px)` : undefined, clipPath: l.clipLeft || l.clipRight ? `inset(0 ${l.clipRight}% 0 ${l.clipLeft}%)` : undefined }} />)}
    </div></PreviewTarget>
  </AbsoluteFill>;
}

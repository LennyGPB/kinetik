import { SceneLayers } from "./motion-layers";
import { ProductPhotoStage } from "./product-photo-stage";
import type { CSSProperties } from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, getRemotionEnvironment, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getProductCampaign, getProductTemplate, isProduct3D } from "../../config/physical-product";
import { ProductGallery3D } from "./product-gallery-3d";
import { ProductRunway3D } from "./product-runway-3d";
import { ProductCampaign3D } from "./product-campaign-3d";
import { productGalleryMotion, productGalleryTextOpacity } from "../../config/product-gallery-motion";
import { productTransitionWindows } from "../../config/product-signature-motion";
import { durationInFrames, type VideoProps } from "../props";
import type { Scene } from "../../lib/projects/scenes";
import { bodyFont, RecipeContext, useTitleFont, useBodyFont } from "./theme";
import { MovableText, SceneClock, TextSceneContext } from "./movable-text";
import { OverlayLayer } from "./overlays";
import { overlayApplies } from "../../lib/projects/overlays";
import { musicDuckVolume } from "../../lib/projects/voiceover";

/**
 * Entrée / sortie du bloc de texte des univers 2.5D (`s` = entrée lissée 0 → 1, `x` = sortie 1 → 0) :
 * Studio resserre l'approche en sortant du flou, Floating s'élève avec un léger rebond, Editorial se découpe au cutter.
 */
function productTextMotion(style: string, s: number, x: number, u: number): CSSProperties {
  const gone = 1 - x;
  if (style === "product-studio") return { opacity: s * x, filter: s < 1 || gone > 0 ? `blur(${((1 - s) * 10 + gone * 6) * u}px)` : undefined, letterSpacing: `${(1 - s) * .12}em`, transform: `translateY(${-gone * 10 * u}px)` };
  if (style === "product-floating") {
    const rise = Easing.out(Easing.back(1.6))(s);
    return { opacity: Math.min(1, s * 1.6) * x, transform: `translateY(${((1 - rise) * 70 - gone * 50) * u}px) rotate(${(1 - s) * -2}deg)`, filter: gone > 0 ? `blur(${gone * 6 * u}px)` : undefined };
  }
  if (style === "product-editorial") return { clipPath: `inset(-10% ${(1 - s) * 100}% -10% ${gone * 100}%)`, transform: `translateX(${(-(1 - s) * 40 - gone * 60) * u}px)` };
  return {};
}

/** Trois couleurs (fond, texte, accent / liquide) : les trois premières du projet ; moins de trois → palette du template. */
function productPalette(colors: string[] | undefined, fallback: readonly string[]) {
  return colors && colors.length >= 3 ? colors.slice(0, 3) : fallback;
}

/** Real cutouts on separate planes. No fabricated side view or synthetic label. */
function ProductScene({ props, scene, index, frames }: { props: VideoProps; scene: Scene; index: number; frames: number }) {
  const frame = useCurrentFrame(), { width, height, fps } = useVideoConfig();
  const titleFont = useTitleFont(), textFont = useBodyFont();
  const template = getProductTemplate(props.graph.styleId)!;
  const [, foreground] = productPalette(props.graph.colors, template.palette);
  const vertical = height > width, u = Math.min(width, height) / 1080;
  const enter = interpolate(frame, [0, fps * .65], [0, 1], { extrapolateRight: "clamp" });
  const exit = interpolate(frame, [frames - fps * .3, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const smooth = 1 - (1 - enter) ** 4;
  const real3d = isProduct3D(template.id);
  const galleryVisibility = productGalleryTextOpacity(productGalleryMotion(props.graph.scenes.map((item) => item.duration), frame + Math.round(props.graph.scenes.slice(0, index).reduce((sum, item) => sum + item.duration * fps, 0)), fps, props.graph.scenes.map((item) => item.transition), productTransitionWindows(template.id)).transitionStrength);
  const flat = real3d ? undefined : productTextMotion(template.id, smooth, exit, u);
  const titleSize = (vertical ? 67 : 78) * u * Math.min(1, Math.sqrt(48 / Math.max(1, scene.title.length)));
  return <AbsoluteFill style={{ backgroundColor: "transparent", color: foreground, overflow: "hidden", fontFamily: textFont }}>
    <div style={{ position: "absolute", top: vertical ? "8%" : "12%", left: "7%", right: "7%", display: "flex", alignItems: "center", gap: 16 * u, fontSize: 24 * u, opacity: .8 * (real3d ? galleryVisibility : 1) }}>
      {props.logoUrl && <Img src={props.logoUrl} style={{ width: 60 * u, height: 60 * u, objectFit: "contain" }} />}
      <span>{props.appName}</span>
    </div>
    <div style={{ position: "absolute", left: "7%", top: vertical ? "76%" : "34%", width: vertical ? "86%" : "40%", ...(flat && Object.keys(flat).length ? { opacity: galleryVisibility, ...flat, ...(flat.opacity !== undefined && { opacity: (flat.opacity as number) * galleryVisibility }) } : { opacity: smooth * exit * galleryVisibility, transform: `translateY(${(1 - smooth) * 24 * u}px)` }) }}>
      <MovableText target="title"><div style={{ ...titleFont, fontWeight: 700, fontSize: titleSize, lineHeight: 1.05, letterSpacing: "-.035em", overflowWrap: "anywhere", color: scene.textColors?.title ?? foreground }}>{scene.title}</div></MovableText>
      {scene.subtitle && <MovableText target="subtitle"><div style={{ marginTop: 25 * u, fontSize: 28 * u, lineHeight: 1.4, opacity: .8, color: scene.textColors?.subtitle ?? foreground }}>{scene.subtitle}</div></MovableText>}
      {scene.kind === "cta" && props.websiteUrl && <div style={{ marginTop: 22 * u, display: "inline-block", borderBottom: `${2 * u}px solid currentColor`, paddingBottom: 6 * u, fontSize: 22 * u }}>{props.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>}
    </div>
    <div style={{ position: "absolute", bottom: "3%", left: "7%", right: "7%", display: "flex", gap: 8 * u, opacity: galleryVisibility }}>
      {props.graph.scenes.map((item, i) => <div key={item.id} style={{ height: 3 * u, flex: 1, background: foreground, opacity: i <= index ? .7 : .15 }} />)}
    </div>
  </AbsoluteFill>;
}

export function PhysicalProductVideo({ props }: { props: VideoProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = durationInFrames(props.graph);
  const gallery = isProduct3D(props.graph.styleId);
  const template = getProductTemplate(props.graph.styleId)!;
  const palette = productPalette(props.graph.colors, template.palette);
  const campaign = getProductCampaign(template.id);
  const sources = props.graph.scenes.map((scene, index) => scene.screens?.find((url) => props.screenUrls.includes(url)) ?? props.screenUrls[index % Math.max(1, props.screenUrls.length)]).filter((src): src is string => Boolean(src)).map((src) => src.startsWith("/product-demos/") && getRemotionEnvironment().isRendering ? staticFile(src.slice(1)) : src);
  const durations = props.graph.scenes.map((scene) => scene.duration);
  const transitions = props.graph.scenes.map((scene) => scene.transition);
  // Caméra et pose demandées scène par scène (chat)
  const directions = props.graph.scenes.map((scene) => ({ camera: scene.camera, pose: scene.pose }));
  const timeline = productGalleryMotion(durations, frame, fps, transitions, productTransitionWindows(template.id));
  const overlayOpacity = gallery ? productGalleryTextOpacity(timeline.transitionStrength) : 1;
  return <RecipeContext value={{ ...props.recipe, ...(props.graph.fonts && { brandFonts: props.graph.fonts }) }}><AbsoluteFill>
    {!gallery && <TextSceneContext value={props.graph.scenes[timeline.index] ?? null}><ProductPhotoStage style={template.id} sources={sources} durations={durations} palette={palette} name={props.appName} /></TextSceneContext>}
    {gallery && sources.length > 0 && (campaign ? <ProductCampaign3D kind={campaign.kind} sources={sources} durations={durations} palette={palette} bpm={props.graph.bpm} directions={directions} /> : template.id === "product-runway-3d" ? <ProductRunway3D sources={sources} durations={durations} palette={palette} bpm={props.graph.bpm} directions={directions} /> : <ProductGallery3D sources={sources} durations={durations} transitions={transitions} palette={palette} bpm={props.graph.bpm} directions={directions} />)}
    {props.graph.scenes.map((scene, index) => {
      const from = props.graph.scenes.slice(0, index).reduce((sum, item) => sum + item.duration * fps, 0);
      const frames = Math.max(1, Math.round(from + scene.duration * fps) - Math.round(from));
      return <Sequence key={scene.id} from={Math.round(from)} durationInFrames={frames}>{!scene.hideTemplate && <TextSceneContext value={scene}><SceneClock><ProductScene props={props} scene={scene} index={index} frames={frames} /></SceneClock></TextSceneContext>}{scene.layers?.length ? <SceneLayers layers={scene.layers} props={props} durationInFrames={frames} /> : null}{(props.graph.overlays ?? []).filter((layer) => overlayApplies(layer, scene.id)).map((layer) => <AbsoluteFill key={layer.id} style={{ opacity: overlayOpacity }}><OverlayLayer layer={layer} props={props} duration={frames} /></AbsoluteFill>)}</Sequence>;
    })}
    {props.musicSrc && <Audio src={props.musicSrc} trimBefore={Math.round((props.graph.audio?.trimStart ?? 0) * fps)} loop volume={(frame) => (props.graph.audio?.volume ?? 1) * musicDuckVolume(props.graph, frame, fps) * Math.max(0, Math.min(1, props.graph.audio?.fadeIn === false ? 1 : frame / fps, props.graph.audio?.fadeOut === false ? 1 : (total - frame) / (fps * 2)))} />}
    {props.watermark && <div style={{ position: "absolute", right: "4%", top: "3%", padding: "8px 14px", borderRadius: 8, background: "#00000070", color: "white", fontFamily: bodyFont, fontSize: 24 }}>KINETIK</div>}
  </AbsoluteFill></RecipeContext>;
}

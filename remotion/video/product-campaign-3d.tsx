import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { PMREMGenerator, TextureLoader, type Group, type PerspectiveCamera } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ProductCampaignKind } from "../../config/physical-product";
import { productSignatureMotion, productViewOffset, type SceneDirection } from "../../config/product-signature-motion";
import { CordeWhip, GlassSweep, IceShards, RushBlur, SplashSpray } from "./product-signature-fx";
import { FlutedProduct } from "./product-fluted-glass";
import { SplashEnvironment } from "./product-splash-3d";
import { cutoutTexture } from "./product-gallery-3d";
import { IonEnvironment, NocturneEnvironment, SorbetEnvironment, CordeEnvironment } from "./product-campaign-envs";

type Props = { kind: ProductCampaignKind; sources: string[]; durations: number[]; palette: readonly string[]; bpm?: number; directions?: SceneDirection[] };

/** Ion : les trois exemplaires sur un cercle ; le devant est à l'angle 0 (plus grand, plus près). Un cran = 120°. */
function carouselCopy(slot: number, steps: number) {
  const angle = ((slot - steps) * 2 * Math.PI) / 3;
  return { x: 1.33 * Math.sin(angle), z: -0.2 + 0.45 * Math.cos(angle), scale: 0.76 + 0.24 * ((Math.cos(angle) + 0.5) / 1.5) };
}

function CampaignWorld({ kind, sources, durations, palette, bpm, directions }: Props) {
  const frame = useCurrentFrame(), { fps, width, height } = useVideoConfig();
  const { camera, gl } = useThree();
  const photos = useRef<Group>(null);
  // Repère attaché à la caméra : les effets signature (gouttes, corde, verre, glace) traversent l'objectif
  const lens = useRef<Group>(null);
  const loaded = useLoader(TextureLoader, sources);
  const textures = useMemo(() => loaded.map(texture => cutoutTexture(texture.image as HTMLImageElement)), [loaded]);
  const environment = useMemo(() => { const pmrem = new PMREMGenerator(gl); const texture = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose(); return texture; }, [gl]);
  useEffect(() => () => { textures.forEach(texture => texture.dispose()); environment.dispose(); }, [textures, environment]);
  const motion = productSignatureMotion(kind, durations, frame, fps, bpm, directions);
  const same = sources[motion.screen.a] === sources[motion.screen.b];
  const foot = kind === "ion" ? .05 : kind === "sorbet" ? .95 : .55;
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera, distance = motion.camera.distance + (height > width ? .65 : 0);
    cam.position.set(Math.sin(motion.camera.az) * distance, motion.camera.height, Math.cos(motion.camera.az) * distance);
    // Champ de la caméra (effet vertigo, champ élargi en vitesse) : réglé par la focale, à pellicule constante
    cam.setFocalLength(cam.getFilmHeight() / 2 / Math.tan((motion.fov * Math.PI) / 360));
    cam.lookAt(0, motion.look, 0);
    cam.rotateZ(motion.bank);
    cam.setViewOffset(width, height, ...productViewOffset(motion, width, height), width, height);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    photos.current?.children.forEach(photo => { photo.quaternion.copy(cam.quaternion); photo.rotateZ(motion.roll + motion.product.roll + motion.pose.roll); photo.rotateX(motion.pose.tilt); photo.rotateY(motion.pose.turn); });
    if (lens.current) { lens.current.position.copy(cam.position); lens.current.quaternion.copy(cam.quaternion); }
  });
  const copies = kind === "ion" ? [0, 1, 2].map((slot) => carouselCopy(slot, motion.carousel)) : [{ x: 0, z: 0, scale: 1 }];
  const variants = [{ index: motion.screen.a, opacity: same ? 1 : 1 - motion.screen.mix }, { index: motion.screen.b, opacity: same ? 0 : motion.screen.mix }];
  const [base, , accent] = palette, time = frame / fps;
  const burst = motion.burst, swell = burst >= 0 ? Math.sin(Math.PI * burst) : 0;
  const hero = motion.product.scale * motion.pose.scale;
  return <>
    <primitive attach="environment" object={environment} />
    {kind === "splash" && <SplashEnvironment base={base} accent={accent} time={time} whip={whipPhase(burst)} />}
    {kind === "nocturne" && <NocturneEnvironment base={base} accent={accent} time={time} />}
    {kind === "corde" && <CordeEnvironment base={base} accent={accent} time={time} narrow={height > width} swing={motion.rush} />}
    {kind === "sorbet" && <SorbetEnvironment base={base} accent={accent} time={time} narrow={height > width} burst={swell} />}
    {kind === "ion" && <IonEnvironment base={base} accent={accent} time={time} sweep={burst} />}
    <group ref={photos}>{copies.flatMap((copy, copyIndex) => variants.filter(v => v.opacity > .001).map((variant, variantIndex) => {
      const texture = textures[variant.index % textures.length], image = texture.image as { width: number; height: number };
      const aspect = image.width / Math.max(1, image.height), h = (aspect > 1 ? 3 / aspect : 3) * copy.scale;
      return <group key={`${copyIndex}-${variantIndex}`} position={[copy.x, foot + h / 2 * hero + motion.float + motion.product.lift + motion.pose.lift * h, copy.z + variantIndex * .002]} scale={hero}>
        {kind === "nocturne"
          ? <FlutedProduct texture={texture} width={h * aspect} height={h} opacity={variant.opacity} time={time} boost={motion.rush} />
          : <mesh><planeGeometry args={[h * aspect, h]} /><meshBasicMaterial map={texture} transparent={kind !== "splash" || variant.opacity < .999} opacity={variant.opacity} alphaTest={.01} depthWrite={variant.opacity > .99} toneMapped={false} /></mesh>}
      </group>;
    }))}</group>
    <group ref={lens}>
      {burst >= 0 && kind === "splash" && <SplashSpray progress={burst} direction={motion.direction} />}
      {burst >= 0 && kind === "corde" && <CordeWhip progress={burst} direction={motion.direction} />}
      {burst >= 0 && kind === "nocturne" && <GlassSweep progress={burst} direction={motion.direction} color={accent} />}
      {burst >= 0 && kind === "sorbet" && <IceShards progress={burst} direction={motion.direction} />}
    </group>
  </>;
}

/** Accélération du ruban d'eau pendant une transition (phase ajoutée, continue : 0 avant, 1,6 rad après). */
function whipPhase(burst: number) {
  if (burst < 0) return 0;
  return 1.6 * burst * burst * (3 - 2 * burst);
}

export function ProductCampaign3D(props: Props) {
  const { width, height, fps } = useVideoConfig(), base = props.palette[0];
  const frame = useCurrentFrame();
  const motion = productSignatureMotion(props.kind, props.durations, frame, fps, props.bpm, props.directions);
  return <>
    <RushBlur id={`product-rush-${props.kind}`} rush={motion.rush} axis={motion.blur}>
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 32, near: .1, far: 150 }} gl={{ antialias: true, alpha: false }} scene={{ environmentIntensity: props.kind === "nocturne" ? .5 : props.kind === "sorbet" ? .6 : .8 }}><CampaignWorld {...props} /></ThreeCanvas>
    </RushBlur>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: height > width
      ? `${props.kind === "ion" ? `linear-gradient(180deg, ${base}ed, ${base}99 10%, transparent 24%), ` : ""}linear-gradient(0deg, ${base}d9, ${base}66 19%, transparent 34%)`
      : props.kind === "ion"
        ? `linear-gradient(90deg, ${base}f5, ${base}db 38%, ${base}99 56%, transparent 78%)`
        : `linear-gradient(90deg, ${base}e6, ${base}88 26%, transparent 55%)` }} />
  </>;
}

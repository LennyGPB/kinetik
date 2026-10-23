import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { PMREMGenerator, TextureLoader, type Group, type PerspectiveCamera } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ProductCampaignKind } from "../../config/physical-product";
import { productCampaignMotion } from "../../config/product-campaign-motion";
import { FlutedProduct } from "./product-fluted-glass";
import { SplashEnvironment } from "./product-splash-3d";
import { cutoutTexture } from "./product-gallery-3d";
import { IonEnvironment, NocturneEnvironment, SorbetEnvironment, CordeEnvironment } from "./product-campaign-envs";

type Props = { kind: ProductCampaignKind; sources: string[]; durations: number[]; palette: readonly string[] };

function CampaignWorld({ kind, sources, durations, palette }: Props) {
  const frame = useCurrentFrame(), { fps, width, height } = useVideoConfig();
  const { camera, gl } = useThree();
  const photos = useRef<Group>(null);
  const loaded = useLoader(TextureLoader, sources);
  const textures = useMemo(() => loaded.map(texture => cutoutTexture(texture.image as HTMLImageElement)), [loaded]);
  const environment = useMemo(() => { const pmrem = new PMREMGenerator(gl); const texture = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose(); return texture; }, [gl]);
  useEffect(() => () => { textures.forEach(texture => texture.dispose()); environment.dispose(); }, [textures, environment]);
  const motion = productCampaignMotion(kind, durations, frame, fps);
  const same = sources[motion.screen.a] === sources[motion.screen.b];
  const foot = kind === "ion" ? .05 : kind === "sorbet" ? .95 : .55;
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera, distance = motion.camera.distance + (height > width ? .65 : 0);
    cam.position.set(Math.sin(motion.camera.az) * distance, motion.camera.height, Math.cos(motion.camera.az) * distance);
    cam.lookAt(0, foot + 1.5, 0);
    cam.rotateZ(motion.bank);
    cam.setViewOffset(width, height, (height > width ? 0 : -.22) * width, .025 * height, width, height);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    photos.current?.children.forEach(photo => { photo.quaternion.copy(cam.quaternion); photo.rotateZ(motion.roll); });
  }, [camera, width, height, foot, motion.camera.az, motion.camera.distance, motion.camera.height, motion.roll, motion.bank]);
  const copies = kind === "ion" ? [{ x: -1.15, z: -.65, scale: .76 }, { x: 1.15, z: -.65, scale: .76 }, { x: 0, z: .25, scale: 1 }] : [{ x: 0, z: 0, scale: 1 }];
  const variants = [{ index: motion.screen.a, opacity: same ? 1 : 1 - motion.screen.mix }, { index: motion.screen.b, opacity: same ? 0 : motion.screen.mix }];
  const [base, , accent] = palette, time = frame / fps;
  return <>
    <primitive attach="environment" object={environment} />
    {kind === "splash" && <SplashEnvironment base={base} accent={accent} time={time} />}
    {kind === "nocturne" && <NocturneEnvironment base={base} accent={accent} time={time} />}
    {kind === "corde" && <CordeEnvironment base={base} accent={accent} time={time} narrow={height > width} />}
    {kind === "sorbet" && <SorbetEnvironment base={base} accent={accent} time={time} narrow={height > width} />}
    {kind === "ion" && <IonEnvironment base={base} accent={accent} time={time} />}
    <group ref={photos}>{copies.flatMap((copy, copyIndex) => variants.filter(v => v.opacity > .001).map((variant, variantIndex) => {
      const texture = textures[variant.index % textures.length], image = texture.image as { width: number; height: number };
      const aspect = image.width / Math.max(1, image.height), h = (aspect > 1 ? 3 / aspect : 3) * copy.scale;
      return <group key={`${copyIndex}-${variantIndex}`} position={[copy.x, foot + h / 2 + motion.float, copy.z + variantIndex * .002]}>
        {kind === "nocturne" ? <FlutedProduct texture={texture} width={h * aspect} height={h} opacity={variant.opacity} time={time} /> : <mesh><planeGeometry args={[h * aspect, h]} /><meshBasicMaterial map={texture} transparent={kind !== "splash" || variant.opacity < .999} opacity={variant.opacity} alphaTest={.01} depthWrite={variant.opacity > .99} toneMapped={false} /></mesh>}
      </group>;
    }))}</group>
  </>;
}

export function ProductCampaign3D(props: Props) {
  const { width, height } = useVideoConfig(), base = props.palette[0];
  return <>
    <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 32, near: .1, far: 150 }} gl={{ antialias: true, alpha: false }} scene={{ environmentIntensity: props.kind === "nocturne" ? .5 : props.kind === "sorbet" ? .6 : .8 }}><CampaignWorld {...props} /></ThreeCanvas>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: height > width
      ? `${props.kind === "ion" ? `linear-gradient(180deg, ${base}ed, ${base}99 10%, transparent 24%), ` : ""}linear-gradient(0deg, ${base}d9, ${base}66 19%, transparent 34%)`
      : props.kind === "ion"
        ? `linear-gradient(90deg, ${base}f5, ${base}db 38%, ${base}99 56%, transparent 78%)`
        : `linear-gradient(90deg, ${base}e6, ${base}88 26%, transparent 55%)` }} />
  </>;
}

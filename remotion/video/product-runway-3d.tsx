import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { TextureLoader, type Group, type PerspectiveCamera } from "three";
import { runwayStation } from "../../config/product-runway-motion";
import { productSignatureMotion, productViewOffset, type SceneDirection } from "../../config/product-signature-motion";
import { cutoutTexture } from "./product-gallery-3d";
import { LightStreaks, RushBlur } from "./product-signature-fx";
import { StageBackglow, StageCubes, StageDust, StageFloor, StageGrid, StageRings } from "./stage-envs/orbit";

type Props = { sources: string[]; durations: number[]; palette: readonly string[]; bpm?: number; directions?: SceneDirection[] };

/**
 * Stage's mirror, rings, luminous grid and floating fragments, spread across fixed product stations.
 * The camera whips from one station to the next (signature choreography: config/product-signature-motion.ts),
 * with light streaks across the lens; real photographs remain fixed, facing the lens.
 */
function RunwayWorld({ sources, durations, palette, bpm, directions }: Props) {
  const frame = useCurrentFrame(), { fps, width, height } = useVideoConfig();
  const { camera } = useThree();
  const photos = useRef<Group>(null), reflections = useRef<Group>(null), lens = useRef<Group>(null);
  const loaded = useLoader(TextureLoader, sources);
  const textures = useMemo(() => loaded.map(source => cutoutTexture(source.image as HTMLImageElement)), [loaded]);
  useEffect(() => () => textures.forEach(texture => texture.dispose()), [textures]);
  const motion = productSignatureMotion("runway", durations, frame, fps, bpm, directions);
  const [base, , accent] = palette;
  const time = frame / fps, power = Math.min(1, Math.max(0, (frame - 4) / 22));
  const pulse = (.5 + .5 * Math.cos(time * Math.PI * 4)) ** 2;
  const span = Math.max(0, durations.length - 1) * 6;
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const distance = motion.camera.distance + (height > width ? .8 : 0);
    cam.position.set(motion.target.x + Math.sin(motion.camera.az) * distance, motion.camera.height, motion.target.z + Math.cos(motion.camera.az) * distance);
    cam.setFocalLength(cam.getFilmHeight() / 2 / Math.tan((motion.fov * Math.PI) / 360));
    cam.lookAt(motion.target.x, motion.look, motion.target.z);
    cam.rotateZ(motion.bank);
    cam.setViewOffset(width, height, ...productViewOffset(motion, width, height), width, height);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    for (const group of [photos.current, reflections.current]) group?.children.forEach((photo, i) => { photo.quaternion.copy(cam.quaternion); photo.rotateZ(motion.product.roll); if (i === motion.index) { photo.rotateZ(motion.pose.roll); photo.rotateX(motion.pose.tilt); photo.rotateY(motion.pose.turn); } });
    if (lens.current) { lens.current.position.copy(cam.position); lens.current.quaternion.copy(cam.quaternion); }
  });
  const photograph = (index: number) => {
    const texture = textures[index % textures.length], image = texture.image as { width: number; height: number };
    const aspect = image.width / Math.max(1, image.height), h = aspect > 1 ? 3 / aspect : 3;
    const { x, z } = runwayStation(index);
    // Le produit de la station filmée se pose avec un rebond ; les autres restent à leur taille
    const hero = index === motion.index ? motion.product.scale * motion.pose.scale : 1;
    return <mesh key={index} position={[x, .16 + h / 2 * hero + (index === motion.index ? motion.product.lift + motion.pose.lift * h : 0), z]} scale={hero}>
      <planeGeometry args={[h * aspect, h]} /><meshBasicMaterial map={texture} transparent alphaTest={.01} toneMapped={false} />
    </mesh>;
  };
  return <>
    <color attach="background" args={[base]} /><fog attach="fog" args={[base, 11, 36]} />
    <ambientLight intensity={.22} />
    <directionalLight position={[3, 6, 5]} intensity={1.5} />
    <directionalLight position={[-5, 3, -2]} intensity={.45} color={accent} />
    <group position={[span / 2, 0, 0]}>
      <StageFloor base={base} />
      <StageGrid glow={accent} power={power} />
      <StageDust glow={accent} time={time} />
    </group>
    {durations.map((_, index) => {
      const { x, z } = runwayStation(index);
      const weight = motion.screen.a === motion.screen.b ? Number(index === motion.screen.a)
        : index === motion.screen.a ? 1 - motion.screen.mix : index === motion.screen.b ? motion.screen.mix : 0;
      const wave = index === motion.index && motion.local >= 0 && motion.local < 40 ? motion.local / 40 : -1;
      return <group key={index} position={[x, 0, z]}>
        <pointLight position={[0, .08, 2.6]} intensity={5 * power} distance={5} decay={1.6} color={accent} />
        <pointLight position={[0, 1.4, -1.8]} intensity={7 * power} distance={6} decay={1.4} color={accent} />
        {/* Les anneaux de la station d'arrivée s'embrasent au passage de la caméra */}
        <StageBackglow glow={accent} pulse={pulse} power={power * (.3 + .5 * weight + (index === motion.screen.b ? .6 * motion.rush : 0))} ring={1.1} />
        <StageRings glow={accent} pulse={pulse} power={power} wave={wave} ring={1.1} outer={false} />
        {/* Keep every station's fragments behind all product planes, including its neighbours. */}
        <group position={[0, 0, -4]}>
          <StageCubes glow={accent} time={time + index * .7} />
          <StageCubes glow={accent} time={time + index * .7} mirror />
        </group>
      </group>;
    })}
    <group ref={photos}>{durations.map((_, index) => photograph(index))}</group>
    <group scale={[1, -1, 1]}><group ref={reflections}>{durations.map((_, index) => photograph(index))}</group></group>
    <group ref={lens}>{motion.burst >= 0 && <LightStreaks progress={motion.burst} direction={runwayStation(motion.screen.b).x >= runwayStation(motion.screen.a).x ? 1 : -1} color={accent} />}</group>
  </>;
}

export function ProductRunway3D(props: Props) {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const motion = productSignatureMotion("runway", props.durations, frame, fps, props.bpm, props.directions);
  const base = props.palette[0];
  return <>
    <RushBlur id="product-rush-runway" rush={motion.rush} axis={motion.blur}>
      <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 30, near: .1, far: 150 }} gl={{ antialias: true, alpha: false }}><RunwayWorld {...props} /></ThreeCanvas>
    </RushBlur>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: height > width
      ? `linear-gradient(0deg, ${base}d9 0%, ${base}66 18%, transparent 34%)`
      : `linear-gradient(90deg, ${base}cc 0%, ${base}66 28%, transparent 56%)` }} />
  </>;
}

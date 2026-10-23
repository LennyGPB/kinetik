import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { TextureLoader, type Group, type PerspectiveCamera } from "three";
import { productRunwayMotion, runwayStation } from "../../config/product-runway-motion";
import { cutoutTexture } from "./product-gallery-3d";
import { StageBackglow, StageCubes, StageDust, StageFloor, StageGrid, StageRings } from "./stage-envs/orbit";

type Props = { sources: string[]; durations: number[]; palette: readonly string[] };

/** Stage's mirror, rings, luminous grid and floating fragments, spread across fixed product stations.
 * The camera travels through the set; real photographs remain fixed, facing the lens. */
function RunwayWorld({ sources, durations, palette }: Props) {
  const frame = useCurrentFrame(), { fps, width, height } = useVideoConfig();
  const { camera } = useThree();
  const photos = useRef<Group>(null), reflections = useRef<Group>(null);
  const loaded = useLoader(TextureLoader, sources);
  const textures = useMemo(() => loaded.map(source => cutoutTexture(source.image as HTMLImageElement)), [loaded]);
  useEffect(() => () => textures.forEach(texture => texture.dispose()), [textures]);
  const state = productRunwayMotion(durations, frame, fps);
  const [base, , accent] = palette;
  const time = frame / fps, power = Math.min(1, Math.max(0, (frame - 4) / 22));
  const pulse = (.5 + .5 * Math.cos(time * Math.PI * 4)) ** 2;
  const span = Math.max(0, durations.length - 1) * 6;
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.position.set(state.position.x, state.position.y, state.position.z + (height > width ? .8 : 0));
    cam.lookAt(state.target.x, state.target.y, state.target.z);
    cam.setViewOffset(width, height, (height > width ? 0 : -.22) * width, .025 * height, width, height);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    for (const group of [photos.current, reflections.current]) group?.children.forEach(photo => photo.quaternion.copy(cam.quaternion));
  }, [camera, width, height, state.position.x, state.position.y, state.position.z, state.target.x, state.target.y, state.target.z]);
  const photograph = (index: number) => {
    const texture = textures[index % textures.length], image = texture.image as { width: number; height: number };
    const aspect = image.width / Math.max(1, image.height), h = aspect > 1 ? 3 / aspect : 3;
    const { x, z } = runwayStation(index);
    return <mesh key={index} position={[x, .16 + h / 2, z]}>
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
      const weight = state.screen.a === state.screen.b ? Number(index === state.screen.a)
        : index === state.screen.a ? 1 - state.screen.mix : index === state.screen.b ? state.screen.mix : 0;
      const wave = index === state.index && state.local >= 0 && state.local < 40 ? state.local / 40 : -1;
      return <group key={index} position={[x, 0, z]}>
        <pointLight position={[0, .08, 2.6]} intensity={5 * power} distance={5} decay={1.6} color={accent} />
        <pointLight position={[0, 1.4, -1.8]} intensity={7 * power} distance={6} decay={1.4} color={accent} />
        <StageBackglow glow={accent} pulse={pulse} power={power * (.3 + .5 * weight)} ring={1.1} />
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
  </>;
}

export function ProductRunway3D(props: Props) {
  const { width, height } = useVideoConfig();
  const base = props.palette[0];
  return <>
    <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} camera={{ fov: 30, near: .1, far: 150 }} gl={{ antialias: true, alpha: false }}><RunwayWorld {...props} /></ThreeCanvas>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: height > width
      ? `linear-gradient(0deg, ${base}d9 0%, ${base}66 18%, transparent 34%)`
      : `linear-gradient(90deg, ${base}cc 0%, ${base}66 28%, transparent 56%)` }} />
  </>;
}

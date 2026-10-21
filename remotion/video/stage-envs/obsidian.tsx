import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { fbm, hash } from "../stage-kit";

/** Honed volcanic stone, restrained brass details and architectural grazing light. */
export function ObsidianEnvironment({ base, glow, spread, passage }: {
  base: string; glow: string; spread: number; passage: number;
}) {
  const stone = useMemo(() => stoneSurface(), []);
  const edge = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.025), []);
  useEffect(() => () => { stone.dispose(); edge.dispose(); }, [stone, edge]);
  const slide = Math.sin(Math.PI * passage) ** 2;
  return (
    <>
      <color attach="background" args={[base]} />
      <fog attach="fog" args={[base, 13, 38]} />
      <hemisphereLight args={["#B8C4D7", "#151315", 0.6]} />
      <directionalLight position={[-3, 6, 4]} intensity={2.8} color="#F6E9D4" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9}
        shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={0.02} shadow-bias={-0.0002} />
      <directionalLight position={[4, 3, -4]} intensity={2.1} color="#B8C7DF" />
      <pointLight position={[-2.6, 2.5, -1]} intensity={13} color={glow} distance={9} decay={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#17191D" roughness={0.32} metalness={0.48} map={stone} bumpMap={stone} bumpScale={0.012} />
      </mesh>
      {/* Low, chamfered plinth: the screen stays dominant in every format. */}
      <mesh geometry={edge} position={[0, 0.16, 0]} scale={[2.6 * spread, 0.32, 1.65]} castShadow receiveShadow>
        <meshStandardMaterial color="#393B40" map={stone} bumpMap={stone} bumpScale={0.018} roughness={0.48} metalness={0.16} />
      </mesh>
      <mesh geometry={edge} position={[0, 0.035, 0]} scale={[2.63 * spread, 0.018, 1.68]}>
        <meshStandardMaterial color={glow} roughness={0.3} metalness={0.75} />
      </mesh>
      {/* Staggered volumes create a quiet architectural frame behind the device. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (3.25 - slide * 1.3), 0, -3.2 - side * 0.7]} rotation={[0, side * -0.14, 0]}>
          <mesh geometry={edge} position={[0, 3, 0]} scale={[2.1, 6, 0.5]} castShadow receiveShadow>
            <meshStandardMaterial color={side < 0 ? "#303238" : "#22252B"} map={stone} bumpMap={stone} bumpScale={0.025} roughness={0.72} metalness={0.12} />
          </mesh>
          <mesh position={[-side * 0.99, 2.8, 0.26]}>
            <boxGeometry args={[0.018, 5.4, 0.012]} />
            <meshBasicMaterial color={glow} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh geometry={edge} position={[0.9, 2.4, -6.8]} scale={[5.6, 4.8, 0.6]} receiveShadow>
        <meshStandardMaterial color="#24272D" roughness={0.8} map={stone} bumpMap={stone} bumpScale={0.02} />
      </mesh>
    </>
  );
}

/** Fine stone grain and mineral seams; seeded, generated once, no external asset. */
function stoneSurface() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const seam = Math.abs(Math.sin(x * 0.018 + y * 0.009 + fbm(x * 0.012, y * 0.012, 3) * 5));
    const v = 155 + (fbm(x * 0.035, y * 0.035, 4) - 0.5) * 44 + (hash(x, y) - 0.5) * 19 + Math.pow(1 - seam, 22) * 14;
    const i = (y * 512 + x) * 4;
    image.data[i] = v; image.data[i + 1] = v + 1; image.data[i + 2] = v + 3; image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 8;
  return texture;
}

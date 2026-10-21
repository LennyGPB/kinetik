import { useEffect, useMemo } from "react";
import { CanvasTexture, ExtrudeGeometry, RepeatWrapping, Shape, SRGBColorSpace } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { fbm, hash } from "../stage-kit";

/** A pale limestone arcade, real open archways and lateral daylight. */
export function VaultEnvironment({ base, glow, spread, passage }: {
  base: string; glow: string; spread: number; passage: number;
}) {
  const stone = useMemo(() => limestone(), []);
  const arch = useMemo(() => archGeometry(), []);
  const plinth = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.025), []);
  useEffect(() => () => { stone.dispose(); arch.dispose(); plinth.dispose(); }, [stone, arch, plinth]);
  const travel = Math.sin(Math.PI * passage) ** 2;
  return (
    <>
      <color attach="background" args={[base]} />
      <fog attach="fog" args={[base, 18, 58]} />
      <hemisphereLight args={["#F6F3EA", "#B9AC95", 1.2]} />
      <directionalLight position={[-8, 11, 5]} intensity={3.2} color="#FFF2DB" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14}
        shadow-camera-top={15} shadow-camera-bottom={-15} shadow-camera-far={65}
        shadow-normalBias={0.025} shadow-bias={-0.0002} />
      <directionalLight position={[4, 5, -7]} intensity={0.85} color="#DCE6EE" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#D6CCBA" roughness={0.42} metalness={0.06} map={stone} bumpMap={stone} bumpScale={0.008} />
      </mesh>
      {/* Repeated solid arch cross-sections, with open space rather than painted doorways. */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} geometry={arch} position={[0, 0, -2.9 - i * 4.8 + (i === 0 ? travel * 15 : 0)]} scale={[spread, 1, 1]} castShadow receiveShadow>
          <meshStandardMaterial color={i % 2 ? "#ECE3D2" : "#E1D5C0"} map={stone} bumpMap={stone} bumpScale={0.018} roughness={0.83} />
        </mesh>
      ))}
      <mesh geometry={plinth} position={[0, 0.075, 0]} scale={[2.6 * spread, 0.15, 1.65]} castShadow receiveShadow>
        <meshStandardMaterial color="#E9DFCD" map={stone} bumpMap={stone} bumpScale={0.012} roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.055, 0.831]}>
        <boxGeometry args={[2.48 * spread, 0.009, 0.008]} />
        <meshStandardMaterial color={glow} roughness={0.42} metalness={0.5} />
      </mesh>
    </>
  );
}

/** One continuous U-shaped section: two pillars and a semicircular vault. */
function archGeometry() {
  const inner = 2.35, outer = 2.83, spring = 2.15;
  const s = new Shape();
  s.moveTo(-outer, 0); s.lineTo(-outer, spring);
  s.absarc(0, spring, outer, Math.PI, 0, true);
  s.lineTo(outer, 0); s.lineTo(inner, 0); s.lineTo(inner, spring);
  s.absarc(0, spring, inner, 0, Math.PI, false);
  s.lineTo(-inner, 0); s.closePath();
  const geometry = new ExtrudeGeometry(s, { depth: 0.48, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 48 });
  geometry.translate(0, 0, -0.24);
  return geometry;
}

function limestone() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!, image = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const cloud = fbm(x * 0.018, y * 0.018, 4) - 0.5;
    const vein = Math.sin(y * 0.075 + fbm(x * 0.012, y * 0.012, 3) * 9);
    const pore = hash(x * 2, y * 2) > 0.994 ? -23 : 0;
    const v = 225 + cloud * 24 + vein * 2 + (hash(x, y) - 0.5) * 7 + pore;
    const i = (y * 512 + x) * 4;
    image.data[i] = v; image.data[i + 1] = v - 3; image.data[i + 2] = v - 9; image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(0.6, 0.6);
  texture.anisotropy = 8;
  return texture;
}

import { useMemo } from "react";
import { random } from "remotion";
import { AdditiveBlending, BoxGeometry, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, PlaneGeometry, RingGeometry } from "three";
import type { ReactNode } from "react";
import { radialTexture, ringGlowTexture } from "../stage-kit";

/**
 * Univers « orbit » (template Stage) : plateau sombre, sol miroir, anneaux de lumière, grille, cubes et poussière.
 * Le reflet est une copie inversée de l'appareil (`reflection`), vue à travers le sol semi-transparent.
 */
export function OrbitEnvironment({ base, glow, pulse, power, wave, ring, time, reflection }: {
  base: string; glow: string; pulse: number; power: number; wave: number; ring: number; time: number; reflection: ReactNode;
}) {
  return (
    <>
      <color attach="background" args={[base]} />
      <fog attach="fog" args={[base, 11, 30]} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} />
      <directionalLight position={[-5, 3, -2]} intensity={0.45} color={glow} />
      <pointLight position={[0, 0.08, 2.4 * ring]} intensity={5 * power} distance={4 * ring} decay={1.6} color={glow} />
      <pointLight position={[0, 1.4, -1.8]} intensity={7 * power} distance={6} decay={1.4} color={glow} />
      <Backglow glow={glow} pulse={pulse} power={power} ring={ring} />
      <group>{reflection}<Cubes glow={glow} time={time} mirror /></group>
      <Floor base={base} />
      <Grid glow={glow} power={power} />
      <Rings glow={glow} pulse={pulse} power={power} wave={wave} ring={ring} />
      <Cubes glow={glow} time={time} />
      <Dust glow={glow} time={time} />
    </>
  );
}


/** Sol : disque sombre semi-transparent (le reflet transparaît sous l'appareil, de moins en moins vers l'horizon). */
function Floor({ base }: { base: string }) {
  const alpha = useMemo(() => radialTexture([[0, "#c8c8c8"], [0.12, "#dcdcdc"], [0.32, "#f4f4f4"], [0.45, "#e0e0e0"], [0.72, "#000000"], [1, "#000000"]]), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} renderOrder={1}>
      <circleGeometry args={[40, 96]} />
      <meshBasicMaterial color={base} transparent alphaMap={alpha} depthWrite={false} />
    </mesh>
  );
}

/** Grille en perspective, qui s'éteint avec la distance. */
function Grid({ glow, power }: { glow: string; power: number }) {
  const geometry = useMemo(() => {
    const extent = 16, step = 0.8, positions: number[] = [], colors: number[] = [];
    const c = new Color(glow).lerp(new Color("#ffffff"), 0.35);
    const push = (x: number, z: number) => {
      const fade = Math.max(0, 1 - Math.hypot(x, z) / extent) ** 1.6 * 0.22;
      positions.push(x, 0.002, z);
      colors.push(c.r * fade, c.g * fade, c.b * fade);
    };
    // Segments courts : l'atténuation suit la distance le long de chaque ligne
    for (let i = -extent; i <= extent; i += step) {
      for (let j = -extent; j < extent; j += step / 2) {
        push(i, j); push(i, j + step / 2);
        push(j, i); push(j + step / 2, i);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return g;
  }, [glow]);
  return <lineSegments geometry={geometry} renderOrder={2}><lineBasicMaterial vertexColors transparent opacity={power} blending={AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} /></lineSegments>;
}

/** Anneaux de lumière au sol : un cœur net et un halo peint ; une onde court vers l'horizon à chaque frontière. */
function Rings({ glow, pulse, power, wave, ring, outer = true }: { glow: string; pulse: number; power: number; wave: number; ring: number; outer?: boolean }) {
  const halo = useMemo(() => ringGlowTexture(), []);
  const geo = useMemo(() => ({ core: new RingGeometry(0.985, 1.015, 160), halo: new PlaneGeometry(2.6, 2.6) }), []);
  const rings = [
    { r: 1.18 * ring, core: 1, halo: 0.95 + pulse * 0.35 },
    { r: 1.42 * ring, core: 0.35, halo: 0.25 },
    { r: 2.55 * ring, core: 0.55, halo: 0.4 + pulse * 0.15 },
    ...(outer ? [{ r: 7.5, core: 0.32, halo: 0.22 }] : []),
  ];
  if (wave >= 0) {
    const k = 1 - (1 - wave) ** 3;
    rings.push({ r: 1.2 * ring + k * 9, core: (1 - wave) ** 2 * 0.9, halo: (1 - wave) ** 2 * 0.8 });
  }
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
      {rings.map((item, i) => (
        <group key={i} scale={[item.r, item.r, 1]}>
          <mesh geometry={geo.core} renderOrder={3}><meshBasicMaterial color={glow} transparent opacity={Math.min(1, item.core * power)} blending={AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={DoubleSide} /></mesh>
          <mesh geometry={geo.halo} renderOrder={3}><meshBasicMaterial map={halo} color={glow} transparent opacity={Math.min(1, item.halo * power)} blending={AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={DoubleSide} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** The product runway uses Stage's actual visual primitives rather than a separate approximation. */
export { Floor as StageFloor, Grid as StageGrid, Rings as StageRings, Backglow as StageBackglow, Cubes as StageCubes, Dust as StageDust };

/** Lueur derrière l'appareil et voile coloré à l'horizon. */
function Backglow({ glow, pulse, power, ring }: { glow: string; pulse: number; power: number; ring: number }) {
  const soft = useMemo(() => radialTexture([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]), []);
  return (
    <>
      <sprite position={[0, 1.6, -9]} scale={[30, 11, 1]} renderOrder={2}><spriteMaterial map={soft} color={glow} transparent opacity={0.16 * power} blending={AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} /></sprite>
      <sprite position={[0, 1, -1.2]} scale={[3.6 * ring, 3.6 * ring, 1]}><spriteMaterial map={soft} color={glow} transparent opacity={(0.13 + pulse * 0.05) * power} blending={AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} /></sprite>
    </>
  );
}

/** Petits cubes lumineux en suspension, sur les côtés et à l'arrière (jamais entre la caméra et l'appareil). */
function Cubes({ glow, time, mirror }: { glow: string; time: number; mirror?: boolean }) {
  const cubes = useMemo(() => Array.from({ length: 13 }, (_, i) => {
    const angle = (75 + random(`stage-cube-a${i}`) * 210) * Math.PI / 180;
    const radius = 3.2 + random(`stage-cube-r${i}`) * 3.6;
    return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius, y: 0.7 + random(`stage-cube-y${i}`) * 2.8, s: 0.06 + random(`stage-cube-s${i}`) * 0.1, spin: 0.25 + random(`stage-cube-w${i}`) * 0.6, phase: random(`stage-cube-p${i}`) * 6.28 };
  }), []);
  const box = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const sign = mirror ? -1 : 1;
  return (
    <group scale={[1, sign, 1]}>
      {cubes.map((c, i) => (
        <mesh key={i} geometry={box} position={[c.x, c.y + Math.sin(time * 0.7 + c.phase) * 0.12, c.z]} rotation={[time * c.spin + c.phase, time * c.spin * 0.8, c.phase]} scale={c.s}>
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.55} roughness={0.35} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/** Poussière lumineuse qui dérive lentement. */
function Dust({ glow, time }: { glow: string; time: number }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < 180; i++) positions.push((random(`dust-x${i}`) - 0.5) * 18, random(`dust-y${i}`) * 5, (random(`dust-z${i}`) - 0.5) * 18);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  const dot = useMemo(() => radialTexture([[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.4)"], [1, "rgba(255,255,255,0)"]]), []);
  return (
    <points geometry={geometry} position={[0, Math.sin(time * 0.2) * 0.15, 0]} rotation={[0, time * 0.02, 0]}>
      <pointsMaterial map={dot} color={glow} size={0.06} sizeAttenuation transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}


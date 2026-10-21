import { useEffect, useMemo } from "react";
import { AdditiveBlending, DoubleSide } from "three";
import { radialTexture, ringGlowTexture } from "../stage-kit";

/** One architectural light ring, a suspended graphite disc, generous negative space. */
export function HaloEnvironment({ base, glow, spread, ring, time, passage }: {
  base: string; glow: string; spread: number; ring: number; time: number; passage: number;
}) {
  const bloom = useMemo(() => ringGlowTexture(), []);
  const mist = useMemo(() => radialTexture([[0, "rgba(255,255,255,0.14)"], [0.35, "rgba(255,255,255,0.055)"], [1, "rgba(255,255,255,0)"]]), []);
  useEffect(() => () => { bloom.dispose(); mist.dispose(); }, [bloom, mist]);
  const travel = Math.sin(Math.PI * passage) ** 2;
  const radius = 2.05 * ring;
  return (
    <>
      <color attach="background" args={[base]} />
      <fog attach="fog" args={[base, 15, 42]} />
      <hemisphereLight args={["#DAE6FF", "#101827", 0.9]} />
      <directionalLight position={[-3, 5, 5]} intensity={2.5} color="#F1F5FF" />
      <directionalLight position={[3, 2, -4]} intensity={2} color={glow} />
      <pointLight position={[0, 2, -1.6]} intensity={11} color={glow} distance={10} decay={2} />
      <mesh position={[0, -0.035, 0]}>
        <cylinderGeometry args={[1.65 * spread, 1.58 * spread, 0.2, 128]} />
        <meshStandardMaterial color="#242C3D" roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh position={[0, 0.069, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.61 * spread, 128]} />
        <meshStandardMaterial color="#182235" roughness={0.48} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.62 * spread, 0.009, 8, 128]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      {/* The ring approaches during the passage; screen and text remain stable. */}
      <group position={[0, 1.3, -2.1 + travel * 11]} rotation={[0, Math.sin(time * 0.12) * 0.045, 0]} scale={1 + travel * 0.25}>
        <mesh>
          <torusGeometry args={[radius, 0.065, 16, 160]} />
          <meshStandardMaterial color="#8594AD" metalness={0.88} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <torusGeometry args={[radius, 0.021, 10, 160]} />
          <meshBasicMaterial color="#EFF5FF" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.055]}>
          <planeGeometry args={[radius * 2.6, radius * 2.6]} />
          <meshBasicMaterial map={bloom} color={glow} transparent opacity={0.42} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
        </mesh>
      </group>
      {/* A broad pool of light suggests atmosphere without particle clutter. */}
      <mesh position={[0, -0.65, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshBasicMaterial map={mist} color={glow} transparent blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
    </>
  );
}

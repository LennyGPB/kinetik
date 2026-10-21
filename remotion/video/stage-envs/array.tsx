import { useEffect, useMemo } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { SculpturalStudio, StudioPlinth } from "./studio";

/** Machined vertical vanes form a sculptural semicircle; a mechanical wave changes the light. */
export function ArrayEnvironment({ base, glow, spread, time, passage, pulse }: {
  base: string; glow: string; spread: number; time: number; passage: number; pulse: number;
}) {
  const blade = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.04), []);
  useEffect(() => () => blade.dispose(), [blade]);
  return <>
    <SculpturalStudio base={base} glow={glow} />
    <StudioPlinth spread={spread} glow={glow} pulse={pulse} />
    {Array.from({ length: 13 }, (_, i) => {
      const angle = (-82 + i * 164 / 12) * Math.PI / 180;
      const height = 3.1 + Math.cos(angle) * 0.85;
      const local = Math.max(0, Math.min(1, passage * 1.6 - i * 0.05));
      const wave = Math.sin(Math.PI * local) ** 2;
      return <group key={i} position={[Math.sin(angle) * 3.65 * spread, height / 2 - 0.015, -Math.cos(angle) * 3.65 - 0.65]}
        rotation={[0, -angle + Math.sin(time * 0.16 + i * 0.2) * 0.12 + wave * Math.PI * 0.85, 0]}>
        <mesh geometry={blade} scale={[0.63, height, 0.19]}>
          <meshPhysicalMaterial color={i % 2 ? "#485462" : "#333E4C"} metalness={0.92} roughness={0.24} clearcoat={0.35} clearcoatRoughness={0.2} />
        </mesh>
        <mesh position={[0.286, 0, 0.1]}>
          <boxGeometry args={[0.012, height * 0.91, 0.012]} />
          <meshBasicMaterial color={glow} transparent opacity={0.66 + wave * 0.25} toneMapped={false} />
        </mesh>
        <mesh geometry={blade} position={[0, -height / 2 + 0.07, 0]} scale={[0.74, 0.13, 0.42]}>
          <meshStandardMaterial color="#151B24" metalness={0.8} roughness={0.28} />
        </mesh>
      </group>;
    })}
  </>;
}

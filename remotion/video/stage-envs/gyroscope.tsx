import { useEffect, useMemo } from "react";
import { TorusGeometry } from "three";
import { SculpturalStudio, StudioPlinth } from "./studio";

/** Two open metal gimbals revolve around the device; the bottom opening keeps them above the floor. */
export function GyroscopeEnvironment({ base, glow, spread, ring, time, clock, pulse, readable }: {
  base: string; glow: string; spread: number; ring: number; time: number; clock: number; pulse: number; readable: number;
}) {
  const arcs = useMemo(() => [1.85, 2.15].map((r) => ({
    body: new TorusGeometry(r, 0.048, 14, 160, Math.PI * 1.5),
    light: new TorusGeometry(r - 0.014, 0.008, 8, 160, Math.PI * 1.5),
  })), []);
  useEffect(() => () => arcs.forEach((a) => { a.body.dispose(); a.light.dispose(); }), [arcs]);
  return <>
    <SculpturalStudio base={base} glow={glow} />
    <StudioPlinth spread={spread} glow={glow} pulse={pulse} />
    <group position={[0, 1.68 * ring, 0]} scale={[ring * Math.max(1, spread * 0.85), ring, ring]}>
      {arcs.map((a, i) => <group key={i} rotation={[0, (i ? 0.85 : -0.25) + (1 - readable) * (i ? -1 : 1) * (time * 0.07 + clock * Math.PI * (i ? 2 : 3)), 0]}>
        <group rotation={[i ? -0.45 : 0.3, 0, -Math.PI / 4]}>
          <mesh geometry={a.body}>
            <meshPhysicalMaterial color={i ? "#8B9AA9" : "#54697B"} metalness={0.96} roughness={0.2} clearcoat={0.35} />
          </mesh>
          <mesh geometry={a.light} position={[0, 0, 0.035]}>
            <meshBasicMaterial color={glow} transparent opacity={0.78 + pulse * 0.08} toneMapped={false} />
          </mesh>
          {[0, Math.PI * 1.5].map((angle, j) => <mesh key={j} position={[Math.cos(angle) * (i ? 2.15 : 1.85), Math.sin(angle) * (i ? 2.15 : 1.85), 0]}>
            <sphereGeometry args={[0.065, 12, 8]} />
            <meshStandardMaterial color="#D5E4ED" metalness={0.75} roughness={0.2} />
          </mesh>)}
        </group>
      </group>)}
    </group>
  </>;
}

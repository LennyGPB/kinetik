import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferGeometry, Vector3 } from "three";
import { roundedRect } from "../stage-kit";
import { MachinedBlock, PrecisionPlinth, PrecisionStudio, type CollectionEnvironmentProps } from "./collection-kit";

/** A precision scanner: titanium frames, recessed circuit traces and ghosted construction outlines. */
export function BlueprintEnvironment({ base, glow, spread, time, passage }: CollectionEnvironmentProps) {
  const outline = useMemo(() => new BufferGeometry().setFromPoints(roundedRect(3.8, 3.6, 0.2).getPoints(32).map(p => new Vector3(p.x, p.y, 0))), []);
  useEffect(() => () => outline.dispose(), [outline]);
  const scan = Math.sin(time * 0.35) * 0.2 + Math.sin(passage * Math.PI * 2) * 2.4;
  return <PrecisionStudio base={base} glow={glow}>
    <PrecisionPlinth spread={spread} glow={glow} />
    {[0, 1, 2, 3].map(i => <group key={i} position={[0, 1.8, -2.7 - i * 2.4]} scale={[spread, 1, 1]}>
      <lineLoop geometry={outline}><lineBasicMaterial color={glow} transparent opacity={0.65 - i * 0.12} toneMapped={false} /></lineLoop>
      {[-1, 1].map(side => <group key={side}>
        <MachinedBlock size={[0.16, 3.8, 0.25]} position={[side * 2.05, 0, 0]} />
        <MachinedBlock size={[4.25, 0.14, 0.25]} position={[0, side * 1.95, 0]} />
        {[0, 1, 2, 3].map(tick => <mesh key={tick} position={[side * 1.98, -1.2 + tick * 0.8, 0.14]}><boxGeometry args={[0.1, 0.015, 0.01]} /><meshBasicMaterial color="#D8EFFF" toneMapped={false} /></mesh>)}
      </group>)}
    </group>)}
    {[-1, 1].map(side => <group key={side} position={[side * 2.9 * spread, 1.05, -1.8]}>
      <MachinedBlock size={[0.62, 2.1, 0.8]} color="#344858" />
      <mesh position={[0, 0, 0.41]}><planeGeometry args={[0.44, 1.8]} /><meshBasicMaterial color={glow} transparent opacity={0.1} /></mesh>
      <mesh scale={1.08}><boxGeometry args={[0.62, 2.1, 0.8]} /><meshBasicMaterial color={glow} wireframe transparent opacity={0.18} blending={AdditiveBlending} depthWrite={false} /></mesh>
    </group>)}
    <group position={[scan * spread, 1.8, -2.35]}>
      <mesh><boxGeometry args={[0.018, 3.5, 0.018]} /><meshBasicMaterial color="#C4EDFF" toneMapped={false} /></mesh>
      <pointLight color={glow} intensity={4} distance={5} />
    </group>
  </PrecisionStudio>;
}

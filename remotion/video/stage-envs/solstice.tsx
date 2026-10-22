import { DoubleSide } from "three";
import { MachinedBlock, PrecisionPlinth, PrecisionStudio, type CollectionEnvironmentProps } from "./collection-kit";

/** Smoked optical panels in a black studio: amber edge light, titanium frames and specular depth. */
export function SolsticeEnvironment({ base, glow, spread, time, passage }: CollectionEnvironmentProps) {
  const turn = Math.sin(Math.PI * passage) ** 2;
  return <PrecisionStudio base={base} glow={glow}>
    <PrecisionPlinth spread={spread} glow={glow} />
    {[-2, -1, 0, 1, 2].map(i => <group key={i} position={[i * 1.35 * spread, 2.25, -3.7 - Math.abs(i) * 0.35]} rotation={[0, i * -0.22 + Math.sin(time * 0.18 + i * 0.3) * 0.06 + turn * Math.PI * 0.8, 0]}>
      <mesh><boxGeometry args={[1.05, 4.5, 0.08]} /><meshPhysicalMaterial color={i % 2 === 0 ? "#AD7947" : "#526B80"} transparent opacity={0.3} roughness={0.12} metalness={0.4} clearcoat={1} iridescence={0.2} side={DoubleSide} depthWrite={false} /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <MachinedBlock size={[0.055, 4.6, 0.14]} position={[side * 0.56, 0, 0]} color="#74614C" />
        <mesh position={[side * 0.526, 0, 0.075]}><boxGeometry args={[0.012, 4.42, 0.012]} /><meshBasicMaterial color={i % 2 === 0 ? glow : "#BCD7EE"} transparent opacity={0.8} toneMapped={false} /></mesh>
        <MachinedBlock size={[1.15, 0.05, 0.14]} position={[0, side * 2.28, 0]} color="#74614C" />
      </group>)}
      <mesh position={[0, 0, 0.055]}><planeGeometry args={[0.016, 4.3]} /><meshBasicMaterial color={glow} transparent opacity={0.2} toneMapped={false} /></mesh>
    </group>)}
    <pointLight position={[0, 1.5, -2.5]} color={glow} intensity={9} distance={8} />
  </PrecisionStudio>;
}

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { DoubleSide, PlaneGeometry } from "three";
import { PrecisionPlinth, PrecisionStudio, type CollectionEnvironmentProps } from "./collection-kit";

/** Sculptural titanium satin: true deformed geometry gives both faces correct studio reflections. */
export function LoomEnvironment({ base, glow, spread, time, passage }: CollectionEnvironmentProps) {
  const sweep = Math.sin(Math.PI * passage) ** 2;
  return <PrecisionStudio base={base} glow={glow}>
    <PrecisionPlinth spread={spread} glow={glow} />
    {[-1, 1].map(side => <group key={side} position={[side * 0.35 * spread, 1.7, -2.3 + sweep * 7]} rotation={[0, side * 0.2, side * -0.12]} scale={[spread, 1, 1]}>
      <SatinRibbon side={side} time={time} glow={glow} />
    </group>)}
  </PrecisionStudio>;
}

function SatinRibbon({ side, time, glow }: { side: number; time: number; glow: string }) {
  const geometry = useMemo(() => new PlaneGeometry(1, 1, 12, 128), []);
  const surface = useRef(geometry);
  useLayoutEffect(() => {
    const g = surface.current, positions = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const t = uv.getY(i), width = (uv.getX(i) - 0.5) * 0.72;
      const a = -1.02 + t * 4.9;
      const twist = a * 1.15 + Math.sin(time * 0.26 + t * 3) * 0.24;
      const r = 2.2 + width * Math.cos(twist);
      positions.setXYZ(i, side * Math.cos(a) * r, Math.sin(a) * r * 0.87, Math.sin(a * 1.2) * 0.48 + width * Math.sin(twist));
    }
    positions.needsUpdate = true;
    g.computeVertexNormals(); g.computeBoundingSphere();
  }, [time, side]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh geometry={geometry}>
      <meshPhysicalMaterial color="#738190" side={DoubleSide} roughness={0.23} metalness={0.92} clearcoat={0.4} anisotropy={0.8} sheen={0.25} sheenColor={glow} />
    </mesh>
    <pointLight position={[side * 2, 1.2, 0.5]} color={glow} intensity={3} distance={5} />
  </>;
}

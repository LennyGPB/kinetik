import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { hash, SkyDome } from "./stage-kit";
import { CampaignLights } from "./product-campaign-kit";

/** Deterministic sculpted water sheet: a ribbon with ruffled edges and detached spray. */
/** `whip` (radians) : avance supplémentaire du ruban pendant une transition — l'eau fouette le cadre. */
export function SplashEnvironment({ base, accent, time, whip = 0 }: { base: string; accent: string; time: number; whip?: number }) {
  const steps = 180, across = 8;
  const water = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array((steps + 1) * (across + 1) * 3), 3));
    const indices: number[] = [];
    for (let i = 0; i < steps; i++) for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j, b = a + across + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    geometry.setIndex(indices); return geometry;
  }, []);
  const fluid = useRef(water);
  useLayoutEffect(() => {
    const geometry = fluid.current, p = geometry.attributes.position;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, angle = t * Math.PI * 1.87 + time * .13 + whip;
      const taper = Math.sin(Math.PI * t) ** .35;
      const radius = 1.73 + Math.sin(angle * 5 + time * .8) * .12 + Math.sin(angle * 11 - time) * .045;
      for (let j = 0; j <= across; j++) {
        const v = j / across - .5;
        const width = (.32 + Math.sin(angle * 3 - time * .5) * .14) * taper;
        const ruffle = Math.sin(angle * 23 + j * .7 + time * 1.4) * .055 * (Math.abs(v) * 2) ** 2;
        p.setXYZ(i * (across + 1) + j,
          Math.cos(angle) * (radius + v * width * .45),
          1.55 - Math.sin(angle) * .52 + v * width * 2 + ruffle,
          Math.sin(angle) * 1.03 + Math.sin(angle * 7 + time * .6) * .08 + v * width * .55 + Math.sin(angle * 35 + j * 2 + time * .6) * .025);
      }
    }
    p.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  }, [water, time, whip]);
  useEffect(() => () => water.dispose(), [water]);
  return <>
    <color attach="background" args={[base]} />
    <SkyDome top="#737C85" horizon={base} bottom="#E8ECF0" />
    <CampaignLights accent={accent} bright />
    <rectAreaLight position={[-3, 5, 4]} rotation={[-.3, -.6, -.3]} width={.8} height={7} color="#FFFFFF" intensity={9} />
    <rectAreaLight position={[4, 2, 2]} rotation={[0, 1, .4]} width={1} height={6} color="#FFFFFF" intensity={7} />
    <group rotation={[.14, -.12, .34]} position={[-.15, .25, 0]}>
      <mesh geometry={water}><meshPhysicalMaterial color="#E6F1F8" transmission={.97} thickness={.16} ior={1.333} roughness={.045} metalness={0} clearcoat={1} side={DoubleSide} /></mesh>
      {Array.from({ length: 58 }, (_, i) => {
        const angle = hash(i, 3) * Math.PI * 2 + time * (.06 + hash(i, 4) * .025);
        const radius = 1.85 + hash(i, 5) * .72;
        const size = .022 + hash(i, 6) ** 3 * .085;
        return <mesh key={i} position={[Math.cos(angle) * radius, 1.55 - Math.sin(angle) * .55 + (hash(i, 8) - .5) * .8 + Math.sin(time * .6 + i) * .055, Math.sin(angle) * 1.1 + (hash(i, 9) - .5) * .5]} scale={[1, 1.15 + hash(i, 10) * .8, .8]} rotation={[0, 0, angle]}>
          <sphereGeometry args={[size, 12, 10]} /><meshPhysicalMaterial color="#EFF8FF" transmission={1} thickness={.1} ior={1.333} roughness={.035} clearcoat={1} />
        </mesh>;
      })}
    </group>
  </>;
}

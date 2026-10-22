import { useEffect, useMemo, type ReactNode } from "react";
import { AdditiveBlending, BufferGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { radialTexture, roundedRect } from "../stage-kit";
import { SculpturalStudio } from "./studio";

export type CollectionEnvironmentProps = { base: string; glow: string; spread: number; time: number; passage: number };

/** Same optical language as Magnet: restrained ambient light, large softboxes and precise rims. */
export function PrecisionLighting({ base, glow }: { base: string; glow: string }) {
  const soft = useMemo(() => radialTexture([[0, "#ffffff"], [0.3, "rgba(255,255,255,0.2)"], [1, "rgba(255,255,255,0)"]]), []);
  useEffect(() => () => soft.dispose(), [soft]);
  return <>
    <color attach="background" args={[base]} /><fog attach="fog" args={[base, 14, 42]} />
    <hemisphereLight args={["#B8CEE3", "#03060B", 0.36]} />
    <directionalLight position={[-4, 6, 4]} color="#F2F6FA" intensity={1.7} />
    <directionalLight position={[4, 3, -5]} color={glow} intensity={1.5} />
    <rectAreaLight position={[-4, 4, 3]} rotation={[-0.3, -0.7, 0]} width={2.2} height={5} color="#EEF4FF" intensity={6} />
    <rectAreaLight position={[4, 3, 1]} rotation={[-0.1, 1.2, 0]} width={1.5} height={4} color={glow} intensity={5} />
    <sprite position={[0, 1.6, -7]} scale={[20, 8, 1]}><spriteMaterial map={soft} color={glow} transparent opacity={0.13} blending={AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
  </>;
}

export function PrecisionStudio({ base, glow, children }: { base: string; glow: string; children: ReactNode }) {
  return <><SculpturalStudio base={base} glow={glow} />{children}</>;
}

/** Chamfered hardware rather than unshaded primitive blocks. */
export function MachinedBlock({ size, position = [0, 0, 0], color = "#273542", roughness = 0.28 }: {
  size: [number, number, number]; position?: [number, number, number]; color?: string; roughness?: number;
}) {
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.045), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} scale={size}>
    <meshPhysicalMaterial color={color} metalness={0.9} roughness={roughness} clearcoat={0.3} clearcoatRoughness={0.22} />
  </mesh>;
}

export function PrecisionPlinth({ spread, glow, height = 0.18, width = 3.2, depth = 1.9 }: { spread: number; glow: string; height?: number; width?: number; depth?: number }) {
  const edge = useMemo(() => new BufferGeometry().setFromPoints(roundedRect(width - 0.12, depth - 0.12, 0.17).getPoints(32).map(p => new Vector3(p.x, 0, p.y))), [width, depth]);
  useEffect(() => () => edge.dispose(), [edge]);
  return <group scale={[spread, 1, 1]}>
    <MachinedBlock size={[width, height, depth]} position={[0, height / 2, 0]} color="#26313D" />
    <MachinedBlock size={[width - 0.08, 0.025, depth - 0.08]} position={[0, height - 0.015, 0]} color="#101923" roughness={0.36} />
    <lineLoop geometry={edge} position={[0, 0.025, 0]}><lineBasicMaterial color={glow} transparent opacity={0.75} toneMapped={false} /></lineLoop>
  </group>;
}

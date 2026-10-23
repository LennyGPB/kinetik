import { useEffect, useMemo } from "react";
import { CatmullRomCurve3, ExtrudeGeometry, Path, Quaternion, Shape, TubeGeometry, Vector3 } from "three";
import { assemblyArmKinematics, assemblyArmOpening } from "../../../config/assembly-motion";
import { MachinedBlock, PrecisionStudio, type CollectionEnvironmentProps } from "./collection-kit";

/** Two nested articulated arms carry a support; the shared device pose follows the same lift. */
export function AssemblyEnvironment({ base, glow, spread, passage }: CollectionEnvironmentProps) {
  const lift = Math.sin(Math.PI * passage) ** 2;
  return <PrecisionStudio base={base} glow={glow}>
    <MachinedBlock size={[3.8 * spread, 0.3, 2.1]} position={[0, 0.15, 0]} color="#273542" />
    <mesh position={[0, 0.08, 1.055]}><boxGeometry args={[3.5 * spread, 0.012, 0.01]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
    <group position={[0, 0.3 + lift * 0.4, 0]} rotation={[0, lift * 0.16, 0]}>
      <MachinedBlock size={[2.7 * spread, 0.12, 1.5]} position={[0, 0.06, 0]} color="#435361" />
      <mesh position={[0, 0.122, 0]} scale={[spread, 1, 1]}><boxGeometry args={[2.45, 0.005, 1.25]} /><meshStandardMaterial color="#25333B" roughness={0.5} /></mesh>
    </group>
    {[-1, 1].map(side => {
      // The receiving arm is already holding before the other arm releases.
      // Both endpoints return to their idle pose, so seeking across the boundary is continuous.
      const withdraw = assemblyArmOpening(side, passage);
      const targetX = side * 1.28 * spread * Math.cos(lift * 0.16) - 0.6 * Math.sin(lift * 0.16);
      const targetZ = -side * 1.28 * spread * Math.sin(lift * 0.16) - 0.6 * Math.cos(lift * 0.16);
      return <RobotArm key={side} side={side} spread={spread} color={glow} target={[targetX + side * withdraw * 0.35, 0.36 + lift * 0.4 + withdraw * 0.3, targetZ - withdraw * 0.3]} opening={withdraw} />;
    })}
  </PrecisionStudio>;
}

/** Two-link inverse kinematics puts the wrist on the actual tray edge at every frame. */
function RobotArm({ side, spread, color, target, opening }: { side: number; spread: number; color: string; target: [number, number, number]; opening: number }) {
  const { baseX, baseZ, upper, lower, elbow, shoulder, yaw } = assemblyArmKinematics(side, spread, target);
  return <group position={[baseX, 0, baseZ]} rotation={[0, yaw, 0]}>
    <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.4, 0.45, 0.36, 64]} /><meshPhysicalMaterial color="#283845" metalness={0.95} roughness={0.24} clearcoat={0.3} /></mesh>
    <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.445, 0.008, 8, 64]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <mesh position={[0, 0.39, 0]}><cylinderGeometry args={[0.28, 0.34, 0.1, 48]} /><meshStandardMaterial color="#586C7C" metalness={0.95} roughness={0.26} /></mesh>
    {[0, 1, 2, 3].map(i => <Bolt key={i} position={[Math.cos(i * Math.PI / 2 + Math.PI / 4) * 0.33, 0.365, Math.sin(i * Math.PI / 2 + Math.PI / 4) * 0.33]} horizontal />)}
    <Piston start={[-0.18, 0.4, -0.18]} end={[-Math.sin(shoulder) * upper * 0.62, 0.55 + Math.cos(shoulder) * upper * 0.62, -0.18]} />
    <group position={[0, 0.55, 0]} rotation={[0, 0, -shoulder]}>
      <Joint color={color} />
      <ArmLink length={upper} width={0.36} color="#536B7D" accent={color} />
      <ElbowCable length={upper} elbow={elbow} />
      <group position={[0, upper, 0]} rotation={[0, 0, -elbow]}>
        <Joint color={color} radius={0.23} />
        <ArmLink length={lower} width={0.29} color="#718693" accent={color} />
        <group position={[0, lower, 0]} rotation={[0, 0, shoulder + elbow]}><group rotation={[0, -yaw, 0]}>
          <Gripper side={side} opening={opening} color={color} />
        </group></group>
      </group>
    </group>
  </group>;
}

function Joint({ color, radius = 0.25 }: { color: string; radius?: number }) {
  return <group>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius, radius, 0.34, 48]} /><meshPhysicalMaterial color="#263440" metalness={0.95} roughness={0.24} clearcoat={0.3} /></mesh>
    <mesh position={[0, 0, 0.176]}><torusGeometry args={[radius * 0.82, 0.009, 8, 48]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius * 0.52, radius * 0.52, 0.018, 32]} /><meshStandardMaterial color="#728594" metalness={1} roughness={0.3} /></mesh>
    <mesh position={[0, 0, -0.21]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius * 0.73, radius * 0.88, 0.14, 48]} /><meshPhysicalMaterial color="#17232E" metalness={0.85} roughness={0.32} /></mesh>
    {[0, 1, 2, 3, 4, 5].map(i => <Bolt key={i} position={[Math.cos(i * Math.PI / 3) * radius * 0.65, Math.sin(i * Math.PI / 3) * radius * 0.65, 0.193]} size={radius * 0.064} />)}
  </group>;
}

/** Tapered, hollow structural member with chamfered edges and a real through-slot. */
function ArmLink({ length, width, color, accent }: { length: number; width: number; color: string; accent: string }) {
  const geometry = useMemo(() => {
    const h = length - 0.3, w = width / 2;
    const shape = new Shape();
    shape.moveTo(-w + 0.045, -h / 2); shape.lineTo(w - 0.045, -h / 2);
    shape.quadraticCurveTo(w, -h / 2, w, -h / 2 + 0.05);
    shape.lineTo(w * 0.68, h / 2 - 0.05); shape.quadraticCurveTo(w * 0.68, h / 2, w * 0.68 - 0.04, h / 2);
    shape.lineTo(-w * 0.68 + 0.04, h / 2); shape.quadraticCurveTo(-w * 0.68, h / 2, -w * 0.68, h / 2 - 0.05);
    shape.lineTo(-w, -h / 2 + 0.05); shape.quadraticCurveTo(-w, -h / 2, -w + 0.045, -h / 2);
    const slot = new Path(), r = width * 0.13, a = h / 2 - 0.18;
    slot.moveTo(-r, a); slot.absarc(0, a, r, Math.PI, 0, true);
    slot.lineTo(r, -a); slot.absarc(0, -a, r, 0, -Math.PI, true); slot.closePath();
    shape.holes.push(slot);
    const g = new ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, steps: 1, curveSegments: 12 });
    g.translate(0, length / 2, -0.11);
    return g;
  }, [length, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh geometry={geometry}><meshPhysicalMaterial color={color} metalness={0.92} roughness={0.27} clearcoat={0.35} anisotropy={0.6} /></mesh>
    {[-1, 1].map(end => <group key={end} position={[0, length / 2 + end * (length / 2 - 0.23), 0.126]}>
      <Bolt position={[0, 0, 0]} size={0.022} />
      {[-1, 1].map(side => <mesh key={side} position={[side * width * 0.28, 0, 0]}><boxGeometry args={[0.01, 0.09, 0.005]} /><meshBasicMaterial color={accent} transparent opacity={0.65} toneMapped={false} /></mesh>)}
    </group>)}
  </>;
}

function Gripper({ side, opening, color }: { side: number; opening: number; color: string }) {
  return <group>
    <Joint color={color} radius={0.13} />
    <MachinedBlock size={[0.16, 0.28, 0.23]} position={[-side * 0.11, 0, 0]} color="#344858" />
    <mesh position={[-side * 0.11, 0, 0.122]}><boxGeometry args={[0.06, 0.16, 0.01]} /><meshStandardMaterial color="#0C141D" metalness={0.65} roughness={0.4} /></mesh>
    <mesh position={[-side * 0.11, 0, 0.13]}><boxGeometry args={[0.008, 0.1, 0.006]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    {[-1, 1].map(finger => <group key={finger} position={[0, finger * (0.085 + opening * 0.12), 0]}>
      <MachinedBlock size={[0.32, 0.045, 0.19]} position={[-side * 0.295, 0, 0]} color="#8396A3" roughness={0.24} />
      <mesh position={[-side * 0.375, -finger * 0.025, 0]}><boxGeometry args={[0.12, 0.006, 0.15]} /><meshStandardMaterial color="#111820" roughness={0.87} metalness={0.05} /></mesh>
      <Bolt position={[-side * 0.2, 0, 0.104]} size={0.012} />
    </group>)}
  </group>;
}

function Bolt({ position, size = 0.022, horizontal = false }: { position: [number, number, number]; size?: number; horizontal?: boolean }) {
  return <group position={position} rotation={[horizontal ? -Math.PI / 2 : 0, 0, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[size * 1.65, size * 1.65, 0.009, 20]} /><meshStandardMaterial color="#17232E" metalness={0.9} roughness={0.4} /></mesh>
    <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[size, size, 0.012, 6]} /><meshStandardMaterial color="#9AA9B3" metalness={1} roughness={0.3} /></mesh>
  </group>;
}

function Piston({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const a = new Vector3(...start), b = new Vector3(...end), delta = b.clone().sub(a);
  const length = delta.length(), rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
  return <group position={start} quaternion={rotation}>
    <mesh position={[0, length * 0.28, 0]}><cylinderGeometry args={[0.055, 0.065, length * 0.56, 24]} /><meshPhysicalMaterial color="#263744" metalness={0.9} roughness={0.3} /></mesh>
    <mesh position={[0, length * 0.72, 0]}><cylinderGeometry args={[0.025, 0.025, length * 0.56, 24]} /><meshPhysicalMaterial color="#B2C5D1" metalness={1} roughness={0.15} /></mesh>
    {[0.08, 0.52].map(f => <mesh key={f} position={[0, length * f, 0]}><cylinderGeometry args={[0.07, 0.07, 0.045, 24]} /><meshStandardMaterial color="#6E8291" metalness={1} roughness={0.28} /></mesh>)}
  </group>;
}

function ElbowCable({ length, elbow }: { length: number; elbow: number }) {
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3([
    new Vector3(0.12, length - 0.35, -0.21),
    new Vector3(0.32, length - 0.18, -0.31),
    new Vector3(0.35, length + 0.12, -0.3),
    new Vector3(Math.sin(elbow) * 0.35, length + Math.cos(elbow) * 0.35, -0.19),
  ]), 24, 0.022, 8, false), [length, elbow]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color="#111A23" roughness={0.6} metalness={0.25} /></mesh>;
}

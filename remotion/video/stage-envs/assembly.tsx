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
      const withdraw = side < 0
        ? passage > 0.28 && passage < 0.72 ? Math.sin(Math.PI * (passage - 0.28) / 0.44) ** 2 : 0
        : passage < 0.25 ? (1 - passage / 0.25) ** 2 : passage > 0.75 ? ((passage - 0.75) / 0.25) ** 2 : 0;
      const targetX = side * 1.28 * spread * Math.cos(lift * 0.16) - 0.6 * Math.sin(lift * 0.16);
      const targetZ = -side * 1.28 * spread * Math.sin(lift * 0.16) - 0.6 * Math.cos(lift * 0.16);
      return <RobotArm key={side} side={side} spread={spread} color={glow} target={[targetX + side * withdraw * 0.35, 0.36 + lift * 0.4 + withdraw * 0.3, targetZ - withdraw * 0.3]} opening={withdraw} />;
    })}
  </PrecisionStudio>;
}

/** Two-link inverse kinematics puts the wrist on the actual tray edge at every frame. */
function RobotArm({ side, spread, color, target, opening }: { side: number; spread: number; color: string; target: [number, number, number]; opening: number }) {
  const baseX = side * (1.85 * spread + 0.35), baseZ = -1.9;
  const dx = target[0] - baseX, dz = target[2] - baseZ, dy = target[1] - 0.55;
  const horizontal = Math.hypot(dx, dz), length = Math.hypot(horizontal, dy);
  const upper = Math.max(1.35, length * 0.58), lower = upper;
  const elbow = Math.acos(Math.max(-1, Math.min(1, (length * length - upper * upper - lower * lower) / (2 * upper * lower))));
  const shoulder = Math.atan2(horizontal, dy) - Math.atan2(lower * Math.sin(elbow), upper + lower * Math.cos(elbow));
  const yaw = Math.atan2(-dz, dx);
  return <group position={[baseX, 0, baseZ]} rotation={[0, yaw, 0]}>
    <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.4, 0.45, 0.36, 64]} /><meshPhysicalMaterial color="#283845" metalness={0.95} roughness={0.24} clearcoat={0.3} /></mesh>
    <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.445, 0.008, 8, 64]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <group position={[0, 0.55, 0]} rotation={[0, 0, -shoulder]}>
      <Joint color={color} />
      <MachinedBlock size={[0.23, upper, 0.3]} position={[0, upper / 2, 0]} color="#4B6070" />
      <mesh position={[0, upper / 2, 0.155]}><boxGeometry args={[0.035, upper * 0.64, 0.008]} /><meshBasicMaterial color="#0B111A" /></mesh>
      <group position={[0, upper, 0]} rotation={[0, 0, -elbow]}>
        <Joint color={color} />
        <MachinedBlock size={[0.19, lower, 0.25]} position={[0, lower / 2, 0]} color="#6C7E8B" />
        <mesh position={[0, lower / 2, 0.13]}><boxGeometry args={[0.012, lower * 0.6, 0.008]} /><meshBasicMaterial color={color} transparent opacity={0.65} toneMapped={false} /></mesh>
        <group position={[0, lower, 0]} rotation={[0, 0, shoulder + elbow]}><group rotation={[0, -yaw, 0]}>
          <Joint color={color} radius={0.14} />
          {/* Opposed rubber jaws grip the top and bottom of the 0.12-high tray. */}
          {[-1, 1].map(finger => <mesh key={finger} position={[-side * 0.07, finger * (0.085 + opening * 0.12), 0]} castShadow><boxGeometry args={[0.25, 0.045, 0.18]} /><meshStandardMaterial color="#25333B" metalness={0.45} roughness={0.42} /></mesh>)}
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
  </group>;
}

import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferGeometry, CanvasTexture, CircleGeometry, Color, DoubleSide, Float32BufferAttribute, RepeatWrapping, SRGBColorSpace, Vector3, type ShaderMaterial } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { hash, noise, radialTexture, roundedRect } from "../stage-kit";

RectAreaLightUniformsLib.init();

/** Dark machined poles, luminous induction coils and a real reflected magnetic stage. */
export function MagnetEnvironment({ base, glow, spread, passage, pulse, monitor = false }: {
  base: string; glow: string; spread: number; passage: number; pulse: number; monitor?: boolean;
}) {
  const metal = useMemo(() => brushedMetal(), []);
  const block = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.035), []);
  const contact = useMemo(() => radialTexture([[0, "rgba(0,0,0,0.65)"], [0.35, "rgba(0,0,0,0.28)"], [1, "rgba(0,0,0,0)"]]), []);
  const soft = useMemo(() => radialTexture([[0, "#ffffff"], [0.28, "rgba(255,255,255,0.3)"], [1, "rgba(255,255,255,0)"]]), []);
  const coil = useMemo(() => new BufferGeometry().setFromPoints(roundedRect(2.72, 1.24, 0.19).getPoints(20).map((p) => new Vector3(p.x, 0, p.y))), []);
  const grid = useMemo(() => floorGrid(), []);
  const field = useMemo(() => magneticField(monitor ? 3.8 : 2.8), [monitor]);
  const mirror = useMemo(() => {
    const reflector = new Reflector(new CircleGeometry(26, 96), { textureWidth: 1024, textureHeight: 1024, color: 0x242c3b, clipBias: 0.003 });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = -0.29;
    // Fade the real reflection into the studio instead of ending at a hard black horizon.
    const material = reflector.material as ShaderMaterial;
    material.uniforms.floorColor = { value: new Color() };
    material.vertexShader = material.vertexShader.replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 vFloorPosition;")
      .replace("void main() {", "void main() { vFloorPosition = position.xy;");
    material.fragmentShader = material.fragmentShader.replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 vFloorPosition; uniform vec3 floorColor;")
      .replace("gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );", "float strength = exp(-length(vFloorPosition) * 0.2) * 0.6; gl_FragColor = vec4(mix(floorColor, base.rgb * 0.32, strength), 1.0);");
    return reflector;
  }, []);
  ((mirror.material as ShaderMaterial).uniforms.floorColor.value as Color).set(base);
  useEffect(() => () => {
    metal.color.dispose(); metal.roughness.dispose(); block.dispose(); contact.dispose(); soft.dispose();
    coil.dispose(); grid.dispose(); mirror.geometry.dispose(); mirror.dispose();
  }, [metal, block, contact, soft, coil, grid, mirror]);
  useEffect(() => () => field.dispose(), [field]);
  const close = Math.sin(Math.PI * passage) ** 2;
  const light = useMemo(() => new Color(glow).lerp(new Color("#DCEEFF"), 0.25), [glow]);
  return (
    <>
      <color attach="background" args={[base]} />
      <fog attach="fog" args={[base, 10, 30]} />
      <hemisphereLight args={["#A5BEDB", "#060A12", 0.32]} />
      <directionalLight position={[-4, 6, 5]} intensity={1.35} color="#F5F6F8" />
      <directionalLight position={[4, 3, -5]} intensity={1.5} color={glow} />
      <rectAreaLight position={[-3.5, 3.6, 3]} rotation={[-0.4, -0.55, 0]} width={2} height={4} intensity={5} color="#DCE8F7" />
      <rectAreaLight position={[3.8, 2.5, 0.5]} rotation={[0, 1.2, 0]} width={1.3} height={4} intensity={4} color={glow} />
      <pointLight position={[0, 0.35, 0.7]} intensity={7 + pulse * 1.2} distance={5} color={light} decay={2} />
      <pointLight position={[0, 2.8, -1]} intensity={7} distance={6} color={glow} decay={2} />
      <sprite position={[0, 1.5, -5]} scale={[12, 7, 1]}>
        <spriteMaterial map={soft} color={glow} transparent opacity={0.15 + pulse * 0.015} blending={AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
      </sprite>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.296, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color={base} />
      </mesh>
      <primitive object={mirror} />
      <lineSegments geometry={grid} position={[0, -0.28, 0]}>
        <lineBasicMaterial color={glow} vertexColors transparent opacity={0.2} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={field} scale={[spread, 1 - close * 0.45, 1]} position={[0, close * 0.7, 0]}>
        <lineBasicMaterial color={glow} transparent opacity={0.16 + pulse * 0.035} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.284, 0]}>
        <planeGeometry args={[7 * spread, 5]} />
        <meshBasicMaterial map={contact} transparent depthWrite={false} />
      </mesh>
      {[-1, 1].map((pole) => {
        // Desktop displays include a stand: leave their full height clear of the upper pole.
        const y = pole < 0 ? -0.05 + close * 0.73 : 3.17 + (monitor ? 1 : 0) - close * 0.73;
        return (
          <group key={pole} position={[0, y, 0]} rotation={[0, -0.045, 0]}>
            <mesh geometry={block} scale={[3.15 * spread, 0.36, 1.65]}>
              <meshPhysicalMaterial color="#293647" map={metal.color} roughnessMap={metal.roughness} roughness={0.48} metalness={0.9} clearcoat={0.28} clearcoatRoughness={0.3} anisotropy={0.65} />
            </mesh>
            {/* A recessed light line on the facing edge, never a decorative neon field. */}
            <mesh position={[0, pole < 0 ? 0.15 : -0.15, 0.832]}>
              <boxGeometry args={[2.74 * spread, 0.018, 0.008]} />
              <meshBasicMaterial color={light} toneMapped={false} />
            </mesh>
            <mesh position={[0, pole < 0 ? 0.183 : -0.183, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.7 * spread, 1.18]} />
              <meshStandardMaterial color="#090F1A" metalness={0.55} roughness={0.3} side={DoubleSide} />
            </mesh>
            {[1, 0.85, 0.7].map((s, i) => <lineLoop key={i} geometry={coil} position={[0, pole < 0 ? 0.187 : -0.187, 0]} scale={[spread * s, 1, s]}>
              <lineBasicMaterial color={light} transparent opacity={0.72 - i * 0.16 + pulse * 0.08} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
            </lineLoop>)}
            {[-1, 1].map((side) => <mesh key={side} position={[side * 1.39 * spread, 0, 0.834]}>
              <boxGeometry args={[0.055, 0.12, 0.01]} />
              <meshStandardMaterial color="#050B12" roughness={0.5} metalness={0.6} />
            </mesh>)}
          </group>
        );
      })}
    </>
  );
}

/** Faint perspective grid, disappearing before it reaches the edge of the mirror. */
function floorGrid() {
  const positions: number[] = [], colors: number[] = [];
  const push = (x: number, z: number) => {
    const a = Math.max(0, 1 - Math.hypot(x, z) / 13) ** 2;
    positions.push(x, 0, z); colors.push(a, a, a);
  };
  for (let i = -12; i <= 12; i++) for (let j = -12; j < 12; j += 0.5) {
    push(i, j); push(i, j + 0.5); push(j, i); push(j + 0.5, i);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return g;
}

/** Curved induction lines connect the poles at the sides, behind the screen. */
function magneticField(height: number) {
  const positions: number[] = [];
  for (const side of [-1, 1]) for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 48; i++) for (const t of [i / 48, (i + 1) / 48]) {
      positions.push(side * (1.1 + Math.sin(Math.PI * t) * (0.42 + layer * 0.25)), 0.15 + t * height, -0.35 - layer * 0.14);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return g;
}

/** Fine, directional machining lines; generated once and stable at every frame. */
function brushedMetal() {
  const color = document.createElement("canvas"), roughness = document.createElement("canvas");
  color.width = color.height = roughness.width = roughness.height = 512;
  const c = color.getContext("2d")!, r = roughness.getContext("2d")!;
  const ci = c.createImageData(512, 512), ri = r.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const line = hash(1, y) - 0.5;
    const grain = hash(x, y) - 0.5;
    const value = 213 + line * 18 + grain * 5 + (noise(x * 0.008, y * 0.04) - 0.5) * 12;
    const rough = 185 + line * 30 + grain * 8;
    const i = (y * 512 + x) * 4;
    ci.data[i] = value; ci.data[i + 1] = value + 1; ci.data[i + 2] = value + 3; ci.data[i + 3] = 255;
    ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = rough; ri.data[i + 3] = 255;
  }
  c.putImageData(ci, 0, 0); r.putImageData(ri, 0, 0);
  const colorMap = new CanvasTexture(color), roughnessMap = new CanvasTexture(roughness);
  colorMap.colorSpace = SRGBColorSpace;
  for (const texture of [colorMap, roughnessMap]) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, 3);
    texture.anisotropy = 8;
  }
  return { color: colorMap, roughness: roughnessMap };
}

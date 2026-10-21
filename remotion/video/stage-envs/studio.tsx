import { useEffect, useMemo } from "react";
import { AdditiveBlending, CircleGeometry, Color, type ShaderMaterial } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { radialTexture } from "../stage-kit";

RectAreaLightUniformsLib.init();

/** Shared material world for Array and Orbit 3D: controlled studio light and a faded real reflection. */
export function SculpturalStudio({ base, glow }: { base: string; glow: string }) {
  const soft = useMemo(() => radialTexture([[0, "#ffffff"], [0.3, "rgba(255,255,255,0.32)"], [1, "rgba(255,255,255,0)"]]), []);
  const mirror = useMemo(() => {
    const m = new Reflector(new CircleGeometry(30, 96), { textureWidth: 1024, textureHeight: 1024, clipBias: 0.003 });
    m.rotation.x = -Math.PI / 2; m.position.y = -0.04;
    const material = m.material as ShaderMaterial;
    material.uniforms.floorColor = { value: new Color() };
    material.vertexShader = material.vertexShader.replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 vFloorPosition;")
      .replace("void main() {", "void main() { vFloorPosition = position.xy;");
    material.fragmentShader = material.fragmentShader.replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 vFloorPosition; uniform vec3 floorColor;")
      .replace("gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );", "float strength = exp(-length(vFloorPosition) * 0.18) * 0.65; gl_FragColor = vec4(mix(floorColor, base.rgb * 0.38, strength), 1.0);");
    return m;
  }, []);
  ((mirror.material as ShaderMaterial).uniforms.floorColor.value as Color).set(base);
  useEffect(() => () => { soft.dispose(); mirror.geometry.dispose(); mirror.dispose(); }, [soft, mirror]);
  return <>
    <color attach="background" args={[base]} />
    <fog attach="fog" args={[base, 13, 38]} />
    <hemisphereLight args={["#BBCADA", "#08090D", 0.48]} />
    <directionalLight position={[-3, 6, 5]} color="#F5F3ED" intensity={1.6} />
    <directionalLight position={[4, 3, -4]} color={glow} intensity={1.5} />
    <rectAreaLight position={[-4, 3.5, 3]} rotation={[-0.35, -0.8, 0]} width={2.5} height={5} color="#E7EEF6" intensity={5} />
    <rectAreaLight position={[4, 3, 1]} rotation={[-0.15, 1.2, 0]} width={1.7} height={4} color={glow} intensity={5} />
    <pointLight position={[0, 1.2, -2]} color={glow} intensity={7} distance={7} decay={2} />
    <sprite position={[0, 2, -8]} scale={[24, 10, 1]}>
      <spriteMaterial map={soft} color={glow} transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
    </sprite>
    <mesh position={[0, -0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[150, 150]} /><meshBasicMaterial color={base} />
    </mesh>
    <primitive object={mirror} />
  </>;
}

export function StudioPlinth({ spread, glow, pulse }: { spread: number; glow: string; pulse: number }) {
  return <group>
    <mesh position={[0, 0.045, 0]} scale={[spread, 1, 1]}>
      <cylinderGeometry args={[1.55, 1.62, 0.17, 128]} />
      <meshPhysicalMaterial color="#232A34" metalness={0.88} roughness={0.26} clearcoat={0.3} />
    </mesh>
    <mesh position={[0, 0.132, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[spread, 1, 1]}>
      <circleGeometry args={[1.52, 128]} /><meshStandardMaterial color="#18202B" roughness={0.38} metalness={0.6} />
    </mesh>
    <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[spread, 1, 1]}>
      <torusGeometry args={[1.59, 0.009, 8, 128]} />
      <meshBasicMaterial color={glow} transparent opacity={0.65 + pulse * 0.12} toneMapped={false} />
    </mesh>
  </group>;
}

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, PlaneGeometry, type ShaderMaterial } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { PrecisionLighting, PrecisionPlinth, type CollectionEnvironmentProps } from "./collection-kit";

/** A real reflected scene, with deterministic ripples distorting the projected reflection. */
export function TidalEnvironment({ base, glow, spread, time, passage }: CollectionEnvironmentProps) {
  const water = useMemo(() => {
    const reflector = new Reflector(new PlaneGeometry(180, 180), { textureWidth: 1024, textureHeight: 1024, clipBias: 0.003 });
    reflector.rotation.x = -Math.PI / 2;
    const m = reflector.material as ShaderMaterial;
    m.uniforms.waterTime = { value: 0 };
    m.uniforms.waterColor = { value: new Color() };
    m.uniforms.horizonColor = { value: new Color() };
    m.vertexShader = m.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 waterPosition;')
      .replace('void main() {', 'void main() { waterPosition = position.xy;');
    m.fragmentShader = m.fragmentShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 waterPosition;')
      .replace('void main() {', 'uniform float waterTime; uniform vec3 waterColor; uniform vec3 horizonColor;\nvoid main() {')
      .replace('texture2DProj( tDiffuse, vUv )', `texture2DProj( tDiffuse, vUv + vec4(sin(waterPosition.y * 2.0 + waterTime * 1.4) * 0.0012, cos(waterPosition.x * 2.4 - waterTime) * 0.0007, 0.0, 0.0) * vUv.w )`)
      .replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );', 'float ripple = sin(waterPosition.x * 2.8 + waterTime) * cos(waterPosition.y * 3.4 - waterTime * 0.7); float strength = exp(-length(waterPosition) * 0.12) * 0.48; vec3 surface = mix(waterColor, base.rgb * 0.7, strength) + ripple * 0.004 * strength; gl_FragColor = vec4(mix(surface, horizonColor, smoothstep(8.0, 65.0, length(waterPosition))), 1.0);');
    return reflector;
  }, []);
  const waterRef = useRef(water);
  useLayoutEffect(() => {
    const material = waterRef.current.material as ShaderMaterial;
    material.uniforms.waterTime.value = time;
    (material.uniforms.waterColor.value as Color).set(base);
    (material.uniforms.horizonColor.value as Color).set(base);
  }, [water, time, base]);
  useEffect(() => () => { water.geometry.dispose(); water.dispose(); }, [water]);
  return <>
    <PrecisionLighting base={base} glow={glow} />
    <primitive object={water} />
    <PrecisionPlinth spread={spread} glow={glow} height={0.24} width={3.4} />
    {[2.3, 3.5, 5.1].map((radius, i) => <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04 + Math.sin(time * 0.55 + i) * 0.008, 0]} scale={[spread, 1, 1]}>
      <torusGeometry args={[radius, 0.028, 12, 160]} /><meshPhysicalMaterial color="#426875" metalness={1} roughness={0.18} emissive={glow} emissiveIntensity={0.12} clearcoat={1} />
    </mesh>)}
    {Array.from({ length: 7 }, (_, i) => {
      const phase = (i / 7 + time * 0.025) % 1;
      const radius = 1.9 + phase * 7;
      return <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008 + i * 0.0004, 0]}>
        <ringGeometry args={[radius, radius + 0.008, 128]} /><meshBasicMaterial color={glow} transparent opacity={Math.sin(Math.PI * phase) ** 2 * 0.17} depthWrite={false} toneMapped={false} />
      </mesh>;
    })}
    <mesh position={[0, -0.15 + Math.sin(Math.PI * passage) ** 2 * 1.7, 3.5]} rotation={[-Math.PI / 2 + 0.25, 0, 0]} scale={[spread * 2, 1, 1]} visible={passage > 0 && passage < 1}>
      <torusGeometry args={[2.6, 0.09, 16, 128, Math.PI]} />
      <meshPhysicalMaterial color="#7DA9B9" roughness={0.12} metalness={1} clearcoat={1} />
    </mesh>
  </>;
}

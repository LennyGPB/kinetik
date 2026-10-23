import { useEffect, useMemo } from "react";
import { CatmullRomCurve3, Color, PlaneGeometry, TubeGeometry, Vector3, type ShaderMaterial } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { fbm, hash, radialTexture } from "./stage-kit";
import { CampaignLights, Mist, organicTexture } from "./product-campaign-kit";

type EnvProps = { base: string; accent: string; time: number; narrow?: boolean };

export { FlutedGlassEnvironment as NocturneEnvironment } from "./product-fluted-glass";

/** Warm braided-rope campaign; legacy template ID remains compatible with saved projects. */
export function CordeEnvironment({ base, accent, time, narrow = false }: EnvProps) {
  const braid = useMemo(() => organicTexture("rope"), []);
  const glow = useMemo(() => radialTexture([[0, "#FFD596"], [.23, "#F49B43"], [.58, base], [1, "#240703"]]), [base]);
  const ropes = useMemo(() => {
    const spread = narrow ? .69 : 1;
    const paths = [
      [[-6,7,-1],[-2.5,4,-.8],[1.8,1.2,-.8],[5,-1,-1]],
      [[-6,4,-1],[-2,2.8,-1.2],[2,1.5,-1.1],[6,4,-1]],
      [[-6,-1,1],[-1.5,.15,1],[2.1,1.2,1],[3.3,2.8,.3],[2.1,3.8,-1]],
      [[-3,3.6,-1],[-1.9,.9,-.7],[-1.6,-.15,.7],[.5,-.3,1.6],[3,1.5,1.3],[6,3,1]],
      [[-6,-2,1],[-2,-.9,1.4],[1,.2,1.2],[5,2.2,.4]],
    ];
    return paths.map(points => new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(p[0]*spread,p[1],p[2]))),160,.115,16,false));
  }, [narrow]);
  useEffect(() => () => { braid.dispose(); glow.dispose(); ropes.forEach(g => g.dispose()); }, [braid, glow, ropes]);
  return <>
    <color attach="background" args={[base]} /><fog attach="fog" args={[base, 17, 40]} />
    <CampaignLights accent={accent} />
    <mesh position={[0,3,-9]}><planeGeometry args={[35,27]} /><meshBasicMaterial map={glow} toneMapped={false} /></mesh>
    <rectAreaLight position={[1,5,1]} rotation={[-.3,0,.3]} width={3} height={7} intensity={7} color="#FFC273" />
    <group rotation={[0,Math.sin(time*.4)*.035,Math.sin(time*.28)*.025]}>
      {ropes.map((geometry,i) => <mesh key={i} geometry={geometry}><meshPhysicalMaterial map={braid} bumpMap={braid} bumpScale={.018} color="#CE3015" roughness={.59} sheen={.7} sheenColor="#F48339" sheenRoughness={.6} /></mesh>)}
    </group>
  </>;
}

export function SorbetEnvironment({ base, accent, time, narrow = false }: EnvProps) {
  const cube = useMemo(() => {
    const geometry = new RoundedBoxGeometry(1, 1, 1, 5, .055), positions = geometry.attributes.position, normals = geometry.attributes.normal;
    for (let i = 0; i < positions.count; i++) {
      const amount = (fbm(positions.getX(i) * 4 + positions.getY(i), positions.getZ(i) * 4, 3) - .5) * .04;
      positions.setXYZ(i, positions.getX(i) + normals.getX(i) * amount, positions.getY(i) + normals.getY(i) * amount, positions.getZ(i) + normals.getZ(i) * amount);
    }
    geometry.computeVertexNormals(); return geometry;
  }, []);
  const frost = useMemo(() => organicTexture("ice"), []);
  useEffect(() => () => { cube.dispose(); frost.dispose(); }, [cube, frost]);
  return <>
    <color attach="background" args={[base]} /><fog attach="fog" args={[base, 15, 40]} />
    <CampaignLights accent={accent} bright />
    <mesh position={[0, 3, -8]}><planeGeometry args={[35, 24]} /><meshStandardMaterial color={base} roughness={.75} /></mesh>
    {Array.from({ length: 9 }, (_, i) => {
      const side = i % 2 ? 1 : -1, phase = time * (.15 + i * .006) + i;
      const near = i < 2, scale = near ? 1.2 : .55 + hash(i, 1) * .45;
      return <group key={i} position={[(side * (near ? 3.35 : 2 + hash(i, 2) * 1.9) + Math.sin(phase) * .2) * (narrow ? .58 : 1), .3 + hash(i, 4) * 4.5 + Math.sin(phase * .7) * .3, near ? 2.1 : -1.5 - hash(i, 6) * 3]} rotation={[phase * .22, phase * .3, i * .5]} scale={scale}>
        <mesh geometry={cube}><meshPhysicalMaterial color="#E9F8FF" roughness={near ? .23 : .12} metalness={0} transmission={1} thickness={1.2} ior={1.31} clearcoat={1} clearcoatRoughness={.04} bumpMap={frost} bumpScale={.035} /></mesh>
        <mesh geometry={cube} scale={.58}><meshStandardMaterial color="#F0FAFF" roughness={.85} transparent opacity={.17} depthWrite={false} /></mesh>
        {[0, 1, 2].map(bubble => <mesh key={bubble} position={[hash(i, bubble + 20) * .5 - .25, hash(i, bubble + 30) * .5 - .25, hash(i, bubble + 40) * .4 - .2]}><sphereGeometry args={[.025 + hash(i, bubble + 50) * .02, 10, 8]} /><meshPhysicalMaterial color="#FFFFFF" transparent opacity={.22} roughness={.1} depthWrite={false} /></mesh>)}
        {[-1, 1].map(side => <mesh key={side} position={[side * .2, side * .14, .46]} rotation={[0, 0, .7]}><planeGeometry args={[.24, .012]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={.3} depthWrite={false} /></mesh>)}
      </group>;
    })}
  </>;
}

export function IonEnvironment({ base, accent, time }: EnvProps) {
  const floor = useMemo(() => {
    const mirror = new Reflector(new PlaneGeometry(100, 100), { textureWidth: 1024, textureHeight: 1024, clipBias: .003 });
    mirror.rotation.x = -Math.PI / 2;
    const material = mirror.material as ShaderMaterial;
    material.uniforms.floorColor = { value: new Color() };
    material.vertexShader = material.vertexShader.replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 floorPosition;").replace("void main() {", "void main() { floorPosition = position.xy;");
    material.fragmentShader = material.fragmentShader.replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 floorPosition; uniform vec3 floorColor;")
      .replace("gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );", "float k = exp(-length(floorPosition) * 0.13) * 0.8; gl_FragColor = vec4(mix(floorColor, base.rgb * 0.7, k), 1.0);");
    return mirror;
  }, []);
  ((floor.material as ShaderMaterial).uniforms.floorColor.value as Color).set(base);
  useEffect(() => () => { floor.geometry.dispose(); floor.dispose(); }, [floor]);
  return <>
    <color attach="background" args={[base]} /><fog attach="fog" args={[base, 15, 35]} />
    <CampaignLights accent={accent} />
    <primitive object={floor} />
    {[-1, 0, 1].map(i => <group key={i} position={[i * 2.35, 3.1, -3.7 - Math.abs(i) * .25]} rotation={[0, i * -.22, 0]}>
      <mesh><boxGeometry args={[i === 0 ? 2.5 : 1.55, 6.2, .16]} /><meshStandardMaterial color="#151F2A" metalness={.8} roughness={.25} /></mesh>
      <mesh position={[0, 0, .088]}><planeGeometry args={[i === 0 ? 2.35 : 1.4, 5.95]} /><meshBasicMaterial color="#F0F7FF" toneMapped={false} /></mesh>
      <rectAreaLight position={[0, 0, .2]} width={1.5} height={5.8} intensity={4} color={accent} />
    </group>)}
    {[-1, 1].map(side => <mesh key={side} position={[side * 3.65, 3.3, -.4]}><boxGeometry args={[.18, 7, .15]} /><meshBasicMaterial color="#F2F8FF" toneMapped={false} /></mesh>)}
    <Mist time={time} color="#E7F2FF" low opacity={.13} />
  </>;
}

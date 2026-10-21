import { useEffect, useMemo } from "react";
import { BufferGeometry, CircleGeometry, Color, Float32BufferAttribute, Object3D } from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { radialTexture } from "../stage-kit";

/**
 * Univers « shoot » : séance photo produit. Fond infini (cyclorama) à la couleur de fond de la marque, deux boîtes à lumière
 * et un bandeau au plafond hors champ (vraies lumières surfaciques : on les devine aux reflets doux sur le cadre métallique), plateau tournant en acrylique
 * noir avec un vrai reflet (rendu miroir limité au disque). Chaque changement de scène est un flash (transition \`flash\`).
 */

// Lumières surfaciques : tables de calcul à initialiser une fois avant le premier rendu
RectAreaLightUniformsLib.init();

export function ShootEnvironment({ base, glow, yaw, flash, spread = 1 }: { base: string; glow: string; yaw: number; flash: number; spread?: number }) {
  const light = new Color(base).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
  const cyc = useMemo(() => cyclorama(), []);
  const shadow = useMemo(() => radialTexture([[0, "rgba(0,0,0,0.55)"], [0.45, "rgba(0,0,0,0.22)"], [1, "rgba(0,0,0,0)"]]), []);
  const mirror = useMemo(() => {
    const reflector = new Reflector(new CircleGeometry(1.25, 96), { textureWidth: 1024, textureHeight: 1024, color: 0x5c5c60, clipBias: 0.003 });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0.0805;
    return reflector;
  }, []);
  useEffect(() => () => { mirror.geometry.dispose(); mirror.dispose(); }, [mirror]);
  const softboxes = useMemo(() => [[-5.2, 2.9, 1.6], [5.4, 2.6, 0.8]].map(([x, y, z]) => {
    const o = new Object3D();
    o.position.set(x, y, z);
    o.lookAt(0, 1, 0);
    return { position: [x, y, z] as [number, number, number], rotation: [o.rotation.x, o.rotation.y, o.rotation.z] as [number, number, number] };
  }), []);
  const boost = 1 + flash * 1.6;
  return (
    <>
      <color attach="background" args={[base]} />
      <ambientLight intensity={(light ? 0.55 : 0.25) * boost} />
      <hemisphereLight args={["#ffffff", base, 0.35 * boost]} />
      <directionalLight position={[2, 6, 5]} intensity={0.6 * boost} />
      {softboxes.map((box, i) => (
        <group key={i} position={box.position} rotation={box.rotation}>
          <rectAreaLight width={2.2} height={3} intensity={(i === 0 ? 7 : 5) * boost} color="#ffffff" />
        </group>
      ))}
      {/* Bandeau lumineux au plafond (hors champ) : la ligne de reflet sur le dessus de l'appareil */}
      <rectAreaLight position={[0, 5.5, 1.2]} rotation={[-Math.PI / 2, 0, 0]} width={5} height={1.2} intensity={4 * boost} />
      <pointLight position={[0, 0.6, -1.6]} intensity={1.2} distance={4} color={glow} />
      <mesh geometry={cyc} receiveShadow><meshStandardMaterial color={base} roughness={0.95} metalness={0} /></mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4.6 * spread, 4.6 * spread]} /><meshBasicMaterial map={shadow} transparent depthWrite={false} /></mesh>
      {/* Plateau tournant : socle noir, dessus miroir (élargi pour plusieurs appareils) */}
      <group scale={[spread, 1, spread]}>
      <group rotation={[0, yaw, 0]}>
        <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[1.3, 1.34, 0.08, 96]} /><meshStandardMaterial color="#141416" metalness={0.4} roughness={0.3} /></mesh>
        <mesh position={[0, 0.0802, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.25, 1.3, 96]} /><meshStandardMaterial color="#2a2a2e" metalness={0.8} roughness={0.25} /></mesh>
      </group>
      <primitive object={mirror} />
      </group>
    </>
  );
}

/** Fond infini : sol, gorge arrondie puis mur, d'un seul tenant (aucun angle visible). */
function cyclorama() {
  const profile: [number, number][] = [];
  profile.push([18, 0], [-3, 0]);
  for (let i = 1; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    profile.push([-3 - Math.sin(a) * 3.5, 3.5 - Math.cos(a) * 3.5]);
  }
  profile.push([-6.5, 30]);
  const positions: number[] = [];
  const half = 30;
  for (let i = 0; i < profile.length - 1; i++) {
    const [z0, y0] = profile[i], [z1, y1] = profile[i + 1];
    positions.push(-half, y0, z0, half, y0, z0, half, y1, z1, -half, y0, z0, half, y1, z1, -half, y1, z1);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

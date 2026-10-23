import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CanvasTexture, PCFShadowMap, SRGBColorSpace, TextureLoader, type Mesh, type PerspectiveCamera } from "three";
import { productGalleryMotion } from "../../config/product-gallery-motion";

type Props = { sources: string[]; durations: number[]; transitions: string[]; palette: readonly string[] };

function stoneGrain() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const pixels = context.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) {
    const value = 145 + Math.floor((Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1) * 22);
    pixels.data.set([value, value, value, 255], i * 4);
  }
  context.putImageData(pixels, 0, 0);
  return new CanvasTexture(canvas);
}

export function cutoutTexture(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext("2d")!;
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] > 24) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right >= left && bottom >= top) {
    canvas.width = right - left + 1; canvas.height = bottom - top + 1;
    context.drawImage(image, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  }
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Real architectural geometry; the photo stays camera-facing so no invented side is revealed. */
function GalleryWorld({ sources, palette, durations, transitions }: Props) {
  const frame = useCurrentFrame(), { fps, width, height } = useVideoConfig();
  const { camera } = useThree();
  const photoA = useRef<Mesh>(null), photoB = useRef<Mesh>(null);
  const loaded = useLoader(TextureLoader, sources);
  const textures = useMemo(() => loaded.map((source) => cutoutTexture(source.image as HTMLImageElement)), [loaded]);
  const stone = useMemo(() => stoneGrain(), []);
  useEffect(() => () => { textures.forEach((texture) => texture.dispose()); }, [textures]);
  useEffect(() => () => stone.dispose(), [stone]);
  const motion = productGalleryMotion(durations, frame, fps, transitions);
  const samePhoto = sources[motion.screen.a] === sources[motion.screen.b];
  const photographs = [{ texture: textures[motion.screen.a % textures.length], ref: photoA, opacity: samePhoto ? 1 : 1 - motion.screen.mix }, { texture: textures[motion.screen.b % textures.length], ref: photoB, opacity: samePhoto ? 0 : motion.screen.mix }];
  const time = frame / fps;
  const [background, , accent] = palette;
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const portrait = height > width;
    const distance = motion.camera.distance + (portrait ? .4 : 0);
    cam.position.set(Math.sin(motion.camera.az) * distance, motion.camera.height, Math.cos(motion.camera.az) * distance);
    cam.lookAt(0, 2, 0);
    cam.setViewOffset(width, height, (portrait ? 0 : -.22) * width, .025 * height, width, height);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    for (const photo of [photoA.current, photoB.current]) if (photo) photo.quaternion.copy(cam.quaternion);
  }, [camera, width, height, motion.camera.az, motion.camera.distance, motion.camera.height]);
  return <>
    <color attach="background" args={[background]} />
    <fog attach="fog" args={[background, 12, 26]} />
    <ambientLight intensity={.55} />
    <spotLight position={[3 + Math.sin(time * .3) * .8, 7, 4]} intensity={115} angle={.48} penumbra={.8} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-.0003} />
    <spotLight position={[-4, 6, -1]} color={accent} intensity={70} angle={.6} penumbra={.9} />
    <pointLight position={[-4, 4, -1]} color={accent} intensity={32} />
    <pointLight position={[1, 2, 4]} color="#D6E8FF" intensity={14} />
    <pointLight position={[Math.sin(time * .22) * .8, 4, 12]} color="#DDE7EE" intensity={35} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 80]} /><meshStandardMaterial color={background} roughness={.32} metalness={.35} roughnessMap={stone} /></mesh>
    <mesh position={[0, .065, 0]} receiveShadow castShadow><cylinderGeometry args={[1.83, 1.92, .13, 96]} /><meshStandardMaterial color="#17222B" roughness={.65} metalness={.2} bumpMap={stone} bumpScale={.018} /></mesh>
    <group>
      <mesh position={[0, .27, 0]} receiveShadow castShadow><cylinderGeometry args={[1.52, 1.62, .34, 96]} /><meshStandardMaterial color="#263039" roughness={.5} metalness={.35} bumpMap={stone} bumpScale={.025} /></mesh>
      <mesh position={[0, .451, 0]}><cylinderGeometry args={[1.52, 1.52, .018, 96]} /><meshStandardMaterial color={accent} roughness={.26} metalness={.85} /></mesh>
      <mesh position={[0, .47, 0]} receiveShadow><cylinderGeometry args={[1.46, 1.46, .035, 96]} /><meshStandardMaterial color="#141D25" roughness={.55} metalness={.3} /></mesh>
    </group>
    {/* Recessed light channels trace the two levels of the plinth. */}
    {[{ radius: 1.87, y: .09 }, { radius: 1.56, y: .30 }].map(({ radius, y }) => <group key={radius}>
      <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, .045, 12, 120]} /><meshStandardMaterial color="#080F15" metalness={.8} roughness={.3} /></mesh>
      <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius + .014, .018, 12, 120]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={3} toneMapped={false} /></mesh>
    </group>)}
    <pointLight position={[0, .22, 1.65]} color={accent} intensity={7} distance={3.5} decay={2} />
    {[-1, 1].map(side => <pointLight key={side} position={[side * 1.5, .2, -.6]} color={accent} intensity={4} distance={2.5} decay={2} />)}
    <group>
      {/* Deep portal with a dark housing, metallic edges and an inset luminous ribbon. */}
      <mesh position={[0, 1.55, -1.35]} castShadow receiveShadow><torusGeometry args={[2.2, .15, 20, 120, Math.PI]} /><meshStandardMaterial color="#202B34" metalness={.8} roughness={.28} /></mesh>
      {[2.08, 2.32].map(radius => <mesh key={radius} position={[0, 1.55, -1.23]} castShadow><torusGeometry args={[radius, .023, 12, 120, Math.PI]} /><meshStandardMaterial color={accent} metalness={.9} roughness={.2} /></mesh>)}
      <mesh position={[0, 1.55, -1.19]}><torusGeometry args={[2.2, .025, 12, 120, Math.PI]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.6} toneMapped={false} /></mesh>
      {[-1, 1].map((side) => <group key={side}>
        <mesh position={[side * 2.2, .8, -1.35]} castShadow receiveShadow><boxGeometry args={[.3, 1.55, .3]} /><meshStandardMaterial color="#202B34" metalness={.8} roughness={.28} /></mesh>
        <mesh position={[side * 2.2, .8, -1.19]}><boxGeometry args={[.045, 1.55, .018]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.6} toneMapped={false} /></mesh>
        <mesh position={[side * 2.2, .12, -1.35]} castShadow><cylinderGeometry args={[.26, .32, .24, 32]} /><meshStandardMaterial color="#263039" metalness={.75} roughness={.3} /></mesh>
      </group>)}
      {/* A second offset rib gives the arch depth during the camera orbit. */}
      <mesh position={[0, 1.55, -1.85]} castShadow><torusGeometry args={[2.43, .045, 12, 120, Math.PI]} /><meshStandardMaterial color={accent} metalness={.85} roughness={.3} /></mesh>
      {Array.from({length: 9}, (_, index) => {
        const angle = (index + .5) * Math.PI / 9;
        return <mesh key={index} position={[Math.cos(angle) * 2.32, 1.55 + Math.sin(angle) * 2.32, -1.6]} rotation={[0, 0, angle - Math.PI / 2]} castShadow><boxGeometry args={[.045, .13, .48]} /><meshStandardMaterial color="#34414A" metalness={.8} roughness={.3} /></mesh>;
      })}
    </group>
    {/* Fixed foreground ribs establish depth as the camera travels past them. */}
    {[-1, 1].map(side => <group key={`wing-${side}`} position={[side * 3.5, 0, 1.6]} rotation={[0, side * .25, 0]}>
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow><boxGeometry args={[.12, 5, .55]} /><meshStandardMaterial color="#263039" metalness={.85} roughness={.27} /></mesh>
      <mesh position={[-side * .065, 2.5, .23]}><boxGeometry args={[.018, 4.8, .035]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.4} toneMapped={false} /></mesh>
    </group>)}
    {photographs.map(({ texture, ref, opacity }, index) => {
      const image = texture.image as { width: number; height: number };
      const aspect = image.width / Math.max(1, image.height);
      const photoHeight = aspect > 1 ? 3 / aspect : 3;
      return <mesh key={index} ref={ref} position={[0, .5 + photoHeight / 2, .03 + index * .002]} visible={opacity > .0001} castShadow={opacity >= .5} renderOrder={index + 1}>
        <planeGeometry args={[photoHeight * aspect, photoHeight]} />
        <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} alphaTest={.005} toneMapped={false} />
      </mesh>;
    })}
    {Array.from({ length: 17 }, (_, index) => <mesh key={index} position={[(index - 8) * .66, 3, -3.8 + Math.abs(index - 8) * .055]} rotation={[0, -.12, 0]} castShadow receiveShadow><boxGeometry args={[.42, 6, .32]} /><meshStandardMaterial color={index % 4 === 0 ? "#293139" : "#141D25"} roughness={.7} metalness={.25} bumpMap={stone} bumpScale={.015} /></mesh>)}
    {[-1, 1].map((side) => <group key={side} position={[side * 3.3, 0, -.5]}><mesh position={[0, 1.65, 0]} rotation={[0, side * .18, 0]} castShadow><boxGeometry args={[.45, 3.3, .8]} /><meshStandardMaterial color="#29333A" roughness={.6} bumpMap={stone} bumpScale={.02} /></mesh><mesh position={[side * -.235, 1.65, .25]}><boxGeometry args={[.015, 2.8, .035]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} /></mesh></group>)}
  </>;
}

export function ProductGallery3D(props: Props) {
  const { width, height } = useVideoConfig();
  return <ThreeCanvas width={width} height={height} style={{ position: "absolute", inset: 0 }} shadows={{ type: PCFShadowMap }} camera={{ fov: 36, near: .1, far: 100, position: [0, 3, 9] }} gl={{ antialias: true, alpha: false }}><GalleryWorld {...props} /></ThreeCanvas>;
}

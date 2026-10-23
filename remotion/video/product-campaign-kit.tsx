import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { fbm, hash, radialTexture } from "./stage-kit";

RectAreaLightUniformsLib.init();

/** Seeded organic materials, authored for these scenes rather than photographed reference assets. */
export function organicTexture(kind: "rope" | "satin" | "ice") {
  const size = 512, canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!, image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const noise = kind === "ice" ? fbm(x * .035, y * .035, 4) : 0, grain = hash(x, y);
    const u = x / size * Math.PI * 2, t = y / size * Math.PI * 2;
    // Opposing helical yarns form a seamless diamond weave around each rope.
    const yarnA = Math.pow(.5 + .5*Math.cos(u*8+t*6), 3);
    const yarnB = Math.pow(.5 + .5*Math.cos(u*8-t*6), 3);
    const v = kind === "rope" ? 80 + Math.max(yarnA,yarnB)*120 + grain*22
      : kind === "satin" ? 165 + Math.sin(x*2.3)*12 + Math.sin(y*2.1)*8 + grain*18
      : 210 + noise*25 + grain*12;
    const i = (y * size + x) * 4;
    image.data[i] = v; image.data[i + 1] = kind === "rope" ? v * .55 : v; image.data[i + 2] = kind === "rope" ? v * .18 : v; image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(kind === "rope" ? 12 : 4, kind === "rope" ? 1 : 4);
  return texture;
}

export function Mist({ time, color = "#E9EFF2", low = false, opacity = .09 }: { time: number; color?: string; low?: boolean; opacity?: number }) {
  const cloud = useMemo(() => radialTexture([[0, "rgba(255,255,255,0.65)"], [.35, "rgba(255,255,255,0.22)"], [1, "rgba(255,255,255,0)"]]), []);
  useEffect(() => () => cloud.dispose(), [cloud]);
  return <>{Array.from({ length: 7 }, (_, i) => <sprite key={i} position={[-5 + i * 1.6 + Math.sin(time * .18 + i) * .7, low ? .22 + Math.sin(i) * .1 : .6 + i * .34, low ? .8 - i * .35 : -2.5 - (i % 3)]} scale={[5 + i % 3, low ? 1.1 : 2.4, 1]}>
    <spriteMaterial map={cloud} color={color} transparent opacity={opacity} depthWrite={false} fog={false} />
  </sprite>)}</>;
}

export function CampaignLights({ accent, bright = false }: { accent: string; bright?: boolean }) {
  return <>
    <hemisphereLight args={["#ECF2F6", "#151B20", bright ? 1.7 : .45]} />
    <directionalLight position={[-4, 7, 5]} intensity={bright ? 2 : 1.2} color="#F8F5F0" />
    <rectAreaLight position={[-4, 4, 3]} rotation={[-.3, -.8, 0]} width={3} height={6} intensity={bright ? 4 : 6} color="#F4F7FF" />
    <rectAreaLight position={[4, 3, 0]} rotation={[-.1, 1.2, 0]} width={2} height={5} intensity={4} color={accent} />
  </>;
}

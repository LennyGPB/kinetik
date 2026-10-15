import type { CSSProperties } from "react";

/**
 * Cube en vraie 3D CSS (6 faces, preserve-3d), éclairé par le haut : dessus clair, faces latérales de plus en plus sombres.
 * Le parent doit fournir la perspective. Utilisé par le fond « iso » et l'effet « depth ».
 */
export function Cube({ size, rotateX, rotateY, rotateZ = 0, color, style }: { size: number; rotateX: number; rotateY: number; rotateZ?: number; color: string; style?: CSSProperties }) {
  const half = size / 2;
  const shade = (percent: number) => (percent >= 0 ? `color-mix(in oklab, ${color}, white ${percent}%)` : `color-mix(in oklab, ${color}, black ${-percent}%)`);
  const faces: [string, string][] = [
    [`translateZ(${half}px)`, shade(0)],
    [`rotateY(180deg) translateZ(${half}px)`, shade(-40)],
    [`rotateY(90deg) translateZ(${half}px)`, shade(-22)],
    [`rotateY(-90deg) translateZ(${half}px)`, shade(-10)],
    [`rotateX(90deg) translateZ(${half}px)`, shade(38)],
    [`rotateX(-90deg) translateZ(${half}px)`, shade(-45)],
  ];
  return (
    <div style={{ position: "absolute", width: size, height: size, transformStyle: "preserve-3d", transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`, ...style }}>
      {faces.map(([transform, background], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            background,
            transform,
            backfaceVisibility: "hidden",
            boxShadow: `inset 0 0 0 ${Math.max(1, size * 0.012)}px rgb(255 255 255 / 0.18)`,
            borderRadius: size * 0.06,
          }}
        />
      ))}
    </div>
  );
}

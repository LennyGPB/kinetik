export const DEVICE_MOCKUP_IDS = ["none", "iphone-pro", "iphone-classic", "galaxy-ultra", "galaxy", "macbook-pro", "macbook-air", "imac", "pc-laptop", "pc-monitor"] as const;
export type DeviceMockup = (typeof DEVICE_MOCKUP_IDS)[number];
export type DeviceSpec = { id: DeviceMockup; name: string; family: "iPhone" | "Samsung" | "Mac" | "PC"; kind: "phone" | "laptop" | "monitor"; ratio: number; color: string; radius: number; camera?: "island" | "notch" | "hole"; screen: { x: number; y: number; w: number; h: number } };
export const DEVICE_MOCKUPS: DeviceSpec[] = [
  { id: "iphone-pro", name: "iPhone Pro · Titane", family: "iPhone", kind: "phone", ratio: 0.49, color: "#77716a", radius: 0.15, camera: "island", screen: { x: .035, y: .017, w: .93, h: .966 } },
  { id: "iphone-classic", name: "iPhone · Minuit", family: "iPhone", kind: "phone", ratio: .49, color: "#333b46", radius: .15, camera: "notch", screen: { x: .045, y: .022, w: .91, h: .956 } },
  { id: "galaxy-ultra", name: "Galaxy Ultra · Titane", family: "Samsung", kind: "phone", ratio: .47, color: "#8a8980", radius: .045, camera: "hole", screen: { x: .027, y: .014, w: .946, h: .972 } },
  { id: "galaxy", name: "Galaxy · Graphite", family: "Samsung", kind: "phone", ratio: .48, color: "#50535a", radius: .12, camera: "hole", screen: { x: .035, y: .017, w: .93, h: .966 } },
  { id: "macbook-pro", name: "MacBook Pro · Noir sidéral", family: "Mac", kind: "laptop", ratio: 1.52, color: "#44464a", radius: .025, camera: "notch", screen: { x: .07, y: .027, w: .86, h: .84 } },
  { id: "macbook-air", name: "MacBook Air · Argent", family: "Mac", kind: "laptop", ratio: 1.57, color: "#b8bcc2", radius: .025, camera: "notch", screen: { x: .065, y: .025, w: .87, h: .85 } },
  { id: "imac", name: "iMac · Argent", family: "Mac", kind: "monitor", ratio: 1.36, color: "#b9bdc1", radius: .02, screen: { x: .025, y: .025, w: .95, h: .70 } },
  { id: "pc-laptop", name: "Surface Book · Platine", family: "PC", kind: "laptop", ratio: 2100 / 1250, color: "#b9bdc1", radius: .014, screen: { x: 323 / 2100, y: 119 / 1250, w: 1456 / 2100, h: 973 / 1250 } },
  { id: "pc-monitor", name: "PC écran · Noir", family: "PC", kind: "monitor", ratio: 1.43, color: "#2c3037", radius: .012, screen: { x: .018, y: .02, w: .964, h: .745 } },
];
export function deviceSpec(id?: string | null) { return DEVICE_MOCKUPS.find((device) => device.id === id); }

/** Geometry shared by rendering, focus animations and pointer targeting. Content is always contained. */
export function deviceGeometry(id: string, maxW: number, maxH: number, sourceRatio: number) {
  const spec = deviceSpec(id)!;
  const w = Math.min(maxW, maxH * spec.ratio), h = w / spec.ratio;
  const viewport = { x: spec.screen.x * w, y: spec.screen.y * h, w: spec.screen.w * w, h: spec.screen.h * h };
  const contentW = Math.min(viewport.w, viewport.h * sourceRatio), contentH = contentW / sourceRatio;
  return { w, h, viewport, screen: { x: viewport.x + (viewport.w - contentW) / 2, y: viewport.y + (viewport.h - contentH) / 2, w: contentW, h: contentH } };
}

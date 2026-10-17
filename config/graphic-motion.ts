export const GRAPHIC_MOTION = {
  anvil: { kind: "anvil", headline: "BUILT TO HIT HARD." },
  tessera: { kind: "tessera", headline: "PIECE IT TOGETHER." },
  suture: { kind: "suture", headline: "CONNECT THE UNEXPECTED." },
  ratchet: { kind: "ratchet", headline: "SET THINGS IN MOTION." },
  interlock: { kind: "interlock", headline: "MAKE IT CLICK." },
  torque: { kind: "torque", headline: "SHIFT THE MOMENTUM." },
  cadence: { kind: "cadence", headline: "FIND YOUR RHYTHM." },
  "vector-beat": { kind: "vector-beat", headline: "MOVE WITH PURPOSE." },
  blackout: { kind: "blackout", headline: "LESS NOISE. MORE IMPACT." },
  voltage: { kind: "voltage", headline: "TURN UP THE SIGNAL." },
} as const;
export type GraphicMotionKind = keyof typeof GRAPHIC_MOTION;
export function getGraphicMotion(id?: string) {
  return id && Object.hasOwn(GRAPHIC_MOTION, id) ? GRAPHIC_MOTION[id as GraphicMotionKind] : undefined;
}

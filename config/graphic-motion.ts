export const GRAPHIC_MOTION = {
  spill: { kind: "spill", headline: "SPILL" },
  veil: { kind: "veil", headline: "veil" },
  fanout: { kind: "fanout", headline: "FANOUT" },
  blocktype: { kind: "blocktype", headline: "BLOCK" },
  positive: { kind: "positive", headline: "POSITIVE" },
  helix: { kind: "helix", headline: "HELIX" },
  power: { kind: "power", headline: "POWER" },
  spectra: { kind: "spectra", headline: "SPECTRA" },
  batch: { kind: "batch", headline: "BATCH" },
  turn: { kind: "turn", headline: "TURN" },
  anvil: { kind: "anvil", headline: "BUILT TO HIT HARD." },
  tessera: { kind: "tessera", headline: "PIECE IT TOGETHER." },
  suture: { kind: "suture", headline: "CONNECT THE UNEXPECTED." },
  ratchet: { kind: "ratchet", headline: "SET THINGS IN MOTION." },
  interlock: { kind: "interlock", headline: "glow" },
  torque: { kind: "torque", headline: "SHIFT THE MOMENTUM." },
  cadence: { kind: "cadence", headline: "FIND YOUR RHYTHM." },
  flux: { kind: "flux", headline: "FOCUS" },
  optic: { kind: "optic", headline: "MAKE SOME NOISE" },
  lens: { kind: "lens", headline: "Create" },
  carousel: { kind: "carousel", headline: "ENTER THE VOID" },
  offprint: { kind: "offprint", headline: "SENSE" },
  patina: { kind: "patina", headline: "HOLO" },
  gloss: { kind: "gloss", headline: "GLOSS" },
  "vector-beat": { kind: "vector-beat", headline: "MOVE WITH PURPOSE." },
  blackout: { kind: "blackout", headline: "LESS NOISE. MORE IMPACT." },
  voltage: { kind: "voltage", headline: "TURN UP THE SIGNAL." },
  sticker: { kind: "sticker", headline: "GLOW UP" },
} as const;
export type GraphicMotionKind = keyof typeof GRAPHIC_MOTION;
export function getGraphicMotion(id?: string) {
  return id && Object.hasOwn(GRAPHIC_MOTION, id) ? GRAPHIC_MOTION[id as GraphicMotionKind] : undefined;
}

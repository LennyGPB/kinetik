/** Musical clock shared by animation layers; phaseFrames is local to the sequence. */
export function musicalClock(frame: number, fps: number, bpm: number, phaseFrames = 0) {
  const beatFrames = fps * 60 / (bpm > 0 ? bpm : 120);
  const rawPosition = (frame - phaseFrames) / beatFrames;
  const nearest = Math.round(rawPosition);
  const position = Math.abs(rawPosition - nearest) < 1e-9 ? nearest : rawPosition;
  const phase = position - Math.floor(position);
  return { position, phase, pulse: Math.pow(1 - phase, 4) };
}

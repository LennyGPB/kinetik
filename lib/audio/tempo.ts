/**
 * Détection du tempo d'un morceau, dans le navigateur (Web Audio API, aucune dépendance).
 * Appelée à l'upload d'une musique ; le résultat (BPM + position du premier temps) est enregistré
 * avec le fichier et cale les coupes et pulsations de la vidéo sur la musique.
 *
 * Méthode : enveloppe d'énergie (pas de 10 ms) → force des attaques (hausses d'énergie)
 * → autocorrélation sur 70–180 BPM (renforcée par les multiples du temps)
 * → affinage : tempo (au 1/20 de BPM) et phase cherchés ensemble, pour que la grille ne dérive pas sur toute la vidéo.
 */

export type Tempo = { bpm: number; beatOffset: number };

const SAMPLE_RATE = 11025;
/** Pas d'analyse : 110 échantillons ≈ 10 ms. La durée exacte compte (une erreur de 0,2 % décale la grille sur 30 s). */
const HOP = 110;
const HOP_SECONDS = HOP / SAMPLE_RATE;
/** Portion analysée : 60 s à partir de 5 s (évite les intros silencieuses, garde l'analyse rapide). */
const ANALYSIS_START = 5;
const ANALYSIS_LENGTH = 60;
const MIN_BPM = 70;
const MAX_BPM = 180;

export async function detectTempo(file: Blob): Promise<Tempo | null> {
  try {
    const decoder = new AudioContext();
    const decoded = await decoder.decodeAudioData(await file.arrayBuffer());
    await decoder.close();

    const start = decoded.duration > ANALYSIS_START + 20 ? ANALYSIS_START : 0;
    const length = Math.min(ANALYSIS_LENGTH, decoded.duration - start);
    if (length < 6) return null;

    // Mono, rééchantillonné, filtré (on garde surtout la rythmique : grosse caisse, basse)
    const offline = new OfflineAudioContext(1, Math.ceil(length * SAMPLE_RATE), SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    const lowpass = offline.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 220;
    source.connect(lowpass).connect(offline.destination);
    source.start(0, start, length);
    const samples = (await offline.startRendering()).getChannelData(0);

    return detectTempoFromSamples(samples, start);
  } catch {
    return null; // Format non décodable par le navigateur : la vidéo garde 120 BPM
  }
}

/** Analyze mono samples filtered at 220 Hz and resampled to 11025 Hz. */
export function detectTempoFromSamples(samples: Float32Array, start = 0): Tempo | null {
  if (samples.length < 6 * SAMPLE_RATE) return null;
  const onsets = onsetStrength(samples);
  const period = bestPeriod(onsets);
  if (!period) return null;
  let coarse = 60 / (period * HOP_SECONDS);
  // Ramène dans une plage « dansante » (un morceau à 170 BPM se compte souvent à 85)
  while (coarse < 80) coarse *= 2;
  while (coarse > 165) coarse /= 2;

  // Affinage : la grille (tempo + phase) qui tombe le mieux sur les attaques de tout l'extrait
  const fits: { bpm: number; score: number }[] = [];
  for (let candidate = coarse - 2; candidate <= coarse + 2; candidate += 0.05) fits.push({ bpm: candidate, score: bestPhase(onsets, 60 / candidate / HOP_SECONDS).score });
  // Plusieurs tempos voisins collent « aussi bien » (tolérance d'une trame) : on prend le centre de cette plage
  const top = Math.max(...fits.map((f) => f.score));
  const near = fits.filter((f) => f.score >= top * 0.985);
  const refined = near.reduce((sum, f) => sum + f.bpm, 0) / near.length;
  const bpm = Math.abs(refined - Math.round(refined)) < 0.15 ? Math.round(refined) : Math.round(refined * 100) / 100;
  const beatSeconds = 60 / bpm;
  const phase = bestPhase(onsets, beatSeconds / HOP_SECONDS).phase * HOP_SECONDS;
  // Position du premier temps dans le morceau entier (l'analyse commençait à `start`)
  const beatOffset = Math.round(((((start + phase) % beatSeconds) + beatSeconds) % beatSeconds) * 1000) / 1000;
  return { bpm, beatOffset };
}

/** Hausses d'énergie d'une trame à l'autre, moyenne locale retirée (les passages forts ne dominent pas). */
function onsetStrength(samples: Float32Array) {
  const hop = HOP;
  const frames = Math.floor(samples.length / hop);
  const energy = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) sum += samples[j] * samples[j];
    energy[i] = Math.sqrt(sum / hop);
  }
  const flux = new Float32Array(frames);
  for (let i = 1; i < frames; i++) flux[i] = Math.max(0, energy[i] - energy[i - 1]);
  const window = Math.round(0.5 / HOP_SECONDS); // 0,5 s
  const out = new Float32Array(frames);
  let running = 0;
  for (let i = 0; i < frames; i++) {
    running += flux[i] - (i >= window ? flux[i - window] : 0);
    out[i] = Math.max(0, flux[i] - running / Math.min(i + 1, window));
  }
  return out;
}

function autocorrelation(onsets: Float32Array, lag: number) {
  const whole = Math.floor(lag);
  const frac = lag - whole;
  let sum = 0;
  for (let i = 0; i + whole + 1 < onsets.length; i++) sum += onsets[i] * (onsets[i + whole] * (1 - frac) + onsets[i + whole + 1] * frac);
  return sum;
}

/** Période (en trames) la plus régulière ; les multiples (2 et 4 temps) confirment le bon candidat. */
function bestPeriod(onsets: Float32Array) {
  const minLag = 60 / MAX_BPM / HOP_SECONDS;
  const maxLag = 60 / MIN_BPM / HOP_SECONDS;
  let best = 0;
  let bestScore = 0;
  for (let lag = minLag; lag <= maxLag; lag += 0.1) {
    const score = autocorrelation(onsets, lag) + 0.5 * autocorrelation(onsets, lag * 2) + 0.25 * autocorrelation(onsets, lag * 4);
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  return best || null;
}

/** Décalage (en trames) qui aligne le mieux une grille de temps sur les attaques, et le score obtenu. */
function bestPhase(onsets: Float32Array, period: number) {
  let best = { phase: 0, score: -1 };
  for (let phase = 0; phase < period; phase += 0.25) {
    let score = 0;
    // Une attaque peut tomber à cheval sur deux trames : on prend la plus forte des deux
    for (let t = phase; t < onsets.length - 1; t += period) score += Math.max(onsets[Math.floor(t)], onsets[Math.ceil(t)]);
    if (score > best.score) best = { phase, score };
  }
  return best;
}

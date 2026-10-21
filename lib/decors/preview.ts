import type { DecorId } from '../../config/decors';
import { buildVideoProps } from '../projects/video-props';

export function decorPreview({ decorId, src, duration, width, height, fit, audio, locale }: {
  decorId: DecorId; src: string; duration: number; width: number; height: number;
  fit: 'contain' | 'cover'; audio: boolean; locale: 'fr' | 'en';
}) {
  return buildVideoProps({ appName: 'Décor', format: 'LANDSCAPE', styleId: null, colors: [], logoUrl: null, screenUrls: [], screenRatios: [], websiteUrl: null, musicSrc: null, locale }, {
    schema: 1, energy: 'calm', logoEmphasis: false, bpm: 120, musicTrackId: null,
    recording: { src, duration, width, height, decorId, decorFit: fit, originalAudio: audio, background: '#09080c', padding: 0, radius: 0, frame: 'none', zooms: [] },
    scenes: [{ id: 'decor', kind: 'screens', title: '', duration, transition: 'fade' }],
  }, false);
}

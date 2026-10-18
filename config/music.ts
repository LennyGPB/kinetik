import tracks from "./music-library.json";

/** Local audio library. Tempo and beat phase are estimated from the audio files. */
export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  mood: string;
  bpm: number;
  beatOffset: number;
  /** Duration in seconds. */
  length: number;
  src: string;
};

export const MUSIC_LIBRARY: MusicTrack[] = tracks;

export function getTrack(id: string | null | undefined) {
  return MUSIC_LIBRARY.find((track) => track.id === id);
}

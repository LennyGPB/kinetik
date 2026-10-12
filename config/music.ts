/**
 * Bibliothèque musicale MOCKÉE. `src` et `bpm` réels viendront de l'analyse audio.
 */
export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  mood: string;
  bpm: number;
  /** Durée en secondes */
  length: number;
  src?: string;
};

export const MUSIC_LIBRARY: MusicTrack[] = [
  { id: "launch-day", title: "Launch Day", artist: "Kinetik Audio", mood: "Énergique", bpm: 128, length: 92 },
  { id: "soft-focus", title: "Soft Focus", artist: "Kinetik Audio", mood: "Élégant", bpm: 96, length: 118 },
  { id: "hyperdrive", title: "Hyperdrive", artist: "Kinetik Audio", mood: "Intense", bpm: 140, length: 75 },
  { id: "daylight", title: "Daylight", artist: "Kinetik Audio", mood: "Optimiste", bpm: 110, length: 104 },
  { id: "night-shift", title: "Night Shift", artist: "Kinetik Audio", mood: "Lo-fi", bpm: 84, length: 131 },
  { id: "pulse", title: "Pulse", artist: "Kinetik Audio", mood: "Tech", bpm: 122, length: 88 },
];

export function getTrack(id: string | null | undefined) {
  return MUSIC_LIBRARY.find((t) => t.id === id);
}

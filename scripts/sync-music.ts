import { syncMusicLibrary } from "./music-library";

syncMusicLibrary().catch((error) => { console.error(error); process.exitCode = 1; });

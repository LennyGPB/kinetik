# Bibliothèque musicale

Dépose les fichiers dans `public/music/`. Formats pris en charge : MP3, M4A,
WAV, OGG, AAC, FLAC et OPUS. Le nom du fichier devient le titre affiché.

`npm run dev` analyse les fichiers au démarrage puis surveille les ajouts,
remplacements et suppressions. Le catalogue est rechargé par Next.js sans
redémarrage. Après installation de cette automatisation, relance une fois le
serveur de développement pour activer la surveillance.

L'analyse calcule la durée, le tempo et le décalage des beats avec le même
algorithme que l'import audio. Les résultats sont des estimations ; si aucun
tempo ne peut être détecté, le script signale un repli à 120 BPM.
Le cache `.cache/music-library.json` évite de réanalyser les fichiers inchangés.

Le catalogue `config/music-library.json` est généré automatiquement : ne pas le
modifier à la main. Un fichier illisible fait échouer le scan et conserve le
dernier catalogue valide ; le build échoue plutôt que de publier un catalogue
incomplet.

`npm run music:sync` lance un scan manuel. `npm run build` lance ce scan
automatiquement avant compilation. En production, les ajouts passent donc
par un nouveau build/déploiement ; le serveur publié ne surveille pas le dossier.

## Vérification de la synchronisation

Les pulsations et les fonds graphiques partagent une horloge musicale calculée
avec le BPM, le décalage détecté et le début audio coupé. Les coupes franches
(`cut`) sont recalées sur cette grille ; les autres transitions conservent leur
chorégraphie. La grille est une estimation régulière, pas une liste de tous les
beats réels : un tempo variable ou une détection ambiguë peut produire un décalage.

- `node --import tsx --test lib/audio/beat.test.ts` vérifie la détection sur des
  signaux connus, le décalage audio, les horloges locales et les coupes de chaque
  morceau du catalogue.
- `node --import tsx scripts/review-beat-sync.ts [identifiant]` rend un extrait
  Anvil de neuf secondes avec le vrai son et un début coupé de 1,3 seconde,
  dans `out/beat-sync/`. Par défaut, le morceau est `countless`.

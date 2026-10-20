# Voix off ElevenLabs

L’éditeur motion propose une fenêtre dédiée **Voix off**, séparée de **Musique** : activer la piste, choisir une voix,
écrire le texte de chaque scène ou proposer un script avec Claude, puis générer
les segments. Chaque opération réussie crée une version. Volume et baisse de la
musique sont indépendants des réglages musicaux. Une scène peut rester silencieuse.
La fenêtre large regroupe les réglages à gauche, les scripts et leurs statuts à
droite, et les actions d’enregistrement et génération dans une barre fixe en bas.

Le formulaire motion propose aussi la sélection de la voix à l’étape **Musique
et voix off**. Le choix est conservé pendant la création et le panneau voix off
s’ouvre dans l’éditeur pour valider le script et le coût avant tout appel TTS.
L’option **Adapter la durée des scènes à la voix** allonge explicitement les scènes
trop courtes après génération, dans la limite de 20 s chacune. Le bouton gratuit
d’adaptation répare aussi les segments déjà générés, sans nouvel appel ElevenLabs.

## Configuration

Variables serveur (dans `.env` en local et chez l’hébergeur en production) :

```dotenv
ELEVENLABS_API_KEY=
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
# Facultatif : liste de voix autorisées, séparées par des virgules.
ELEVENLABS_VOICE_IDS=
ELEVENLABS_DAILY_CHARACTERS=50000
```

La clé requiert Text to Speech (Access) et Voices (Read). Aucun appel ElevenLabs
n’est effectué depuis le navigateur. Les exemples de voix sont lus depuis les
URL de préécoute du fournisseur. En production, Redis est nécessaire aux quotas
stricts, comme pour les autres services payants de Kinetik.

Le modèle doit prendre en charge l’endpoint TTS avec timestamps et la sortie
`pcm_24000`. Le serveur emballe le PCM mono 16 bits dans un WAV 24 kHz : sa durée
réelle inclut les silences, contrairement au dernier timestamp de transcription.
Les fichiers utilisent le stockage privé existant (local ou R2). Les permissions
de partage et la préparation des médias pour Lambda incluent cette piste.

## Synchronisation et versions

`SceneGraph.voiceover` contient les réglages, les textes et les références audio
immuables. Aucun changement de schéma Prisma n’est nécessaire. Le rendu utilise
les mêmes frontières de scènes que les animations, coupes sur les beats comprises.
Une voix devenue trop longue ou obsolète est signalée et l’export est bloqué tant
que la piste est active. On peut raccourcir le texte, allonger explicitement la
scène (20 secondes maximum) ou désactiver la voix. Les anciens projets restent
sans voix par défaut.

Les modifications visuelles conservent la voix. Changer la copie d’une scène,
le script, la voix ou la langue demande une régénération. La traduction inclut
le script. Les déclinaisons de format réutilisent les fichiers ; une déclinaison
courte retire les clips et conserve un script modifiable à adapter. Restaurer
une version restaure sa voix.

## Crédits et reprises

Tarif initial centralisé dans `config/credits.ts` : 1 crédit pour proposer le
script, 1 crédit par tranche de 200 caractères par scène pour l’audio. Les écoutes,
réglages et réutilisations ne déclenchent aucun appel TTS. Le coût est affiché
avant chaque opération. Le tarif reste ajustable dans cette configuration.

Les segments sont générés séquentiellement et sauvegardés individuellement : un
échec ne supprime pas les segments déjà réussis. Une clé de requête et un reçu
durable dans le ledger empêchent de débiter deux fois une même opération après
une réponse perdue. Les erreurs sont remboursées ; les interruptions du serveur
sont récupérées après 10 minutes à la génération suivante du compte ou par le
cron quotidien existant, y compris lorsque Stripe est désactivé.

Après modification du moteur, redéployer le site Remotion avec
`npm run video:deploy` pour que les exports Lambda utilisent la nouvelle piste.

## Vérification

```sh
node --import tsx --conditions=react-server --test lib/projects/voiceover.test.ts lib/services/elevenlabs.test.ts
```

Les tests fournisseur simulent les réponses HTTP et ne consomment pas de crédits
ElevenLabs. La qualité vocale finale se vérifie avec une génération réelle depuis
un projet : voix française puis anglaise, écoute dans le lecteur, partage et MP4.

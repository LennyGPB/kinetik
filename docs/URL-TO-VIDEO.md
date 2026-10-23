# URL → vidéo

Deux entrées dans `/create` : URL vers vidéo et création manuelle. Le lien direct du nouveau parcours est `/fr/create?flow=url` (ou `/en/create?flow=url`). Les deux utilisent les mêmes projets, composition Remotion, éditeur et exports.

## Parcours

Le formulaire URL est découpé en cinq étapes : **site et son → template → message → marque et visuels → génération**. Une seule décision principale par écran ; les polices, accroches et détails d’extraction sont accessibles à la demande. Les textes du brief s’agrandissent avec leur contenu, sans masquer la fin dans de petits champs défilants.

L’étape 1 permet d’importer une musique facultative avec le composant d’upload audio existant. L’étape 2 propose le choix IA ou le catalogue de templates habituel ; l’analyse du site se poursuit pendant ce choix. En mode IA, les trois propositions ont des templates distincts. En mode manuel, le template choisi s’applique aux trois propositions, avec des accroches différentes. Ces préférences sont conservées dans l’analyse et restaurées après rechargement.

1. Analyse incluse et limitée par compte : Chromium headless, desktop et mobile ×2, nettoyage des principaux bandeaux/widgets, captures de sections, home et jusqu’à deux pages de menu pertinentes.
2. Recherche du logo dans le header, apple-touch-icon, manifest, OG et favicon ; priorité à la source, puis à la résolution. Les images importées sont rasterisées. Palette issue des styles calculés et du logo ; variables CSS et polices observées sont aussi transmises au modèle.
3. Détection App Store / Google Play. iOS utilise iTunes Lookup, avec lecture de la page en secours lorsque les captures sont absentes. Android utilise les images de captures exposées dans le DOM public de la fiche. Une source bloquée conserve les assets du site et produit un avertissement.
4. Analyse vision + texte → brief Zod : produit, cible, trois bénéfices, ton, trois hooks, trois styles et typographie. Aucun chiffre ni témoignage inventé.
5. Validation et correction : logo, palette, polices, screens, texte, accroches, styles, durée et format. Le brand kit actif peut être enregistré ; les kits antérieurs sont conservés. Le brief et les screens sont visibles dans `/brand-kit`.
6. Trois projets vidéo générés en parallèle. Tarif : `3 × CREDIT_COSTS.generation` (30 crédits actuellement), affiché avant lancement ; export séparé. Un échec est remboursé individuellement. Le choix ouvre l’éditeur habituel.

## Installation

Appliquer la migration additive avant de lancer cette version contre une base existante :

```sh
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
```

La migration ajoute `BrandKit.sourceUrl`, `BrandKit.brief` et `UrlVideoAnalysis`. Elle ne supprime aucune donnée. Les analyses sont privées au compte et supprimées en cascade avec celui-ci.

Configuration existante : `ANTHROPIC_API_KEY`, stockage local ou R2 et Chromium (`@sparticuz/chromium` sur Linux, Chrome/Edge en local, ou `CAPTURE_CHROME_PATH`). Option : `URL_VIDEO_MODEL_ID`, sinon `PITCH_MODEL_ID`, sinon le modèle Sonnet par défaut du projet. Les générations utilisent le service IA existant et ses quotas de tentatives/tokens.

## Reprise et facturation

L’URL de la page conserve l’identifiant d’analyse. Les résultats, la fiche validée et les identifiants des trois projets sont enregistrés en base. Le verrou du lot empêche les doubles requêtes ; chaque débit est atomique avec la création du projet et son rattachement au lot. Le verrou et le reçu d’exécution de l’éditeur empêchent un second appel IA en ouvrant un projet pendant sa génération.

Un lot démarré est immuable. Une nouvelle requête reprend uniquement les emplacements encore absents, sans régénérer ni refacturer ceux déjà créés. Les propositions interrompues depuis plus de six minutes sont marquées en échec et remboursées à la récupération des résultats. Une génération en échec peut ensuite être relancée depuis l’éditeur selon le parcours existant.

Les appels d’analyse émettent des événements NDJSON réels, avec heartbeat. Un rechargement après analyse retrouve les résultats via `?flow=url&analysis=...`. Les corrections locales ne sont figées qu’au lancement du lot.

Les captures et les textes extraits sont enregistrés avant l’appel IA. Si celui-ci échoue, le lien d’analyse permet de reprendre uniquement la création du brief, y compris après un rechargement. Les erreurs de fournisseur, de délai, de schéma et de stockage ont des messages distincts ; les logs ne contiennent ni contenu de source ni réponse brute du fournisseur. Les erreurs temporaires du fournisseur peuvent être retentées une fois dans un délai total de 90 secondes.

## Limites explicites

- Certains sites bloquent les navigateurs automatisés ou exigent une connexion ; l’utilisateur peut créer manuellement ou compléter les médias.
- La capture de section repose sur le DOM et les titres : ce n’est pas une segmentation visuelle universelle. Les animations du site sont figées pour obtenir des images stables.
- Les stores peuvent omettre les screenshots ou modifier leur DOM. Les captures du site servent de repli et l’interface affiche les avertissements.
- Une musique importée à la première étape est ajoutée comme asset audio aux trois projets et son tempo détecté sert au montage. Sans fichier, les propositions commencent sans musique ; elle peut être ajoutée dans l’éditeur. Les fichiers audio d’un autre compte et les choix de templates invalides sont refusés côté serveur.

Tests ciblés :

```sh
node --import tsx --conditions=react-server --test lib/url-video/url-video.test.ts lib/capture/colors.test.ts lib/capture/public-url.test.ts lib/pitch/download.test.ts lib/pitch/analyze-route.test.ts lib/projects/generation.test.ts
```

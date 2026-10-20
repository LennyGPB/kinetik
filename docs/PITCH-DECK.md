# Pitch deck → motion

Depuis **Créer → Motion → Pitch deck to video**, importer un PDF ou coller un lien
public vers un PDF ou un site. Choisir 30, 60, 90 ou 120 secondes, le public
(investisseurs, clients ou réseaux) et le format 16:9, 9:16 ou carré.

## Parcours

1. L’analyse lit le PDF avec Claude, texte et visuels compris. Pour un site,
   Kinetik utilise son navigateur de capture existant, le texte de la page et
   jusqu’à trois captures. Les téléchargements et les redirections HTTP sont
   limités aux adresses publiques avec résolution DNS figée.
2. Une synthèse de 5 à 8 scènes est proposée, avec références et citations du
   document, palette, polices détectées et éventuelles substitutions.
3. L’utilisateur vérifie les faits, corrige les textes et la narration, ajuste la
   marque et consulte l’aperçu avant création. Aucun chiffre absent ne doit être
   inventé pour remplir le storyboard. Une source insuffisante est refusée et
   l’analyse remboursée.
4. Les scènes utilisent les compteurs, mockups et animations typographiques du
   moteur. Les nouveaux graphiques à barres et courbes sont dessinés à partir
   de valeurs structurées, avec animation progressive.
5. La voix off est facultative. Le script vient de l’analyse, sans deuxième
   appel Claude. ElevenLabs génère chaque scène séparément ; ses timestamps
   servent aux sous-titres. Les segments réussis sont conservés en cas d’échec.

Le bouton Voix off de l’éditeur permet de reprendre les segments, activer ou
désactiver les sous-titres et ajuster les durées. L’adaptation automatique des
scènes respecte le plafond global de 120 secondes du pitch. Si une voix dépasse
encore, son texte doit être raccourci. Les modifications manuelles et l’export
utilisent ensuite le parcours motion existant.

## Marque et assets

PDF.js lit les PDF non chiffrés, limite à **20 pages et 10 Mo** et relève les noms
des polices intégrées sur les huit premières pages. Claude rapproche ces noms
et les indices visuels des polices disponibles dans Kinetik. La note de
correspondance est visible ; une police propriétaire absente n’est pas copiée
ni présentée comme une correspondance exacte.

Les zones de logo et de captures produit identifiées dans le PDF sont rendues
en PNG et stockées dans le stockage privé existant. Les captures du site sont
recadrées selon le même principe. Le PDF original est traité en mémoire et
n’est pas conservé. Les logos restent en `contain`. Le lecteur public reçoit
les scènes et médias nécessaires, sans le plan d’analyse privé, ses citations
de travail ni les compteurs de tokens.

La palette du pitch respecte directement l’ordre fond / texte / accent du
document. L’aperçu et l’export partagent `buildVideoProps`; les effets de fond
du template ne remplacent pas la marque extraite.

## Crédits Kinetik

Configuration dans `config/credits.ts` :

- Analyse de la source et script : **15 crédits**.
- Création du motion à partir du plan validé : **5 crédits**.
- Voix facultative : tarif existant, **1 crédit par tranche de 100 caractères
  et par scène**.
- Export MP4 : tarif existant, distinct et annoncé dans l’éditeur.

Chaque coût est présenté avant son opération. Les UUID de requête, le projet
et les transactions atomiques évitent les doubles débits. Les échecs d’analyse
sont remboursés ; les analyses interrompues sont récupérées après dix minutes
par le cron existant. Les protections commerciales et les plafonds techniques
(fréquence, tokens, taille de source) sont indépendants.

## Configuration et déploiement

```dotenv
PITCH_MODEL_ID=claude-sonnet-5-5
PITCH_DAILY_TOKENS=1000000
```

Réutilise `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, le stockage local/R2 et
Redis. Aucun changement de schéma Prisma : le brouillon d’analyse et le plan
validé vivent dans `ProjectVersion.scenes.pitch`, les médias dans `Asset`.
Le type interne de projet est `MOTION` avec `videoType=pitch-deck`.

Le déploiement web installe PDF.js et son moteur Canvas natif. Les fichiers
worker, fontes standard, CMaps et WASM sont inclus dans le tracing de la route
d’analyse. Redéployer aussi le site Remotion (`npm run video:deploy`) pour que
les exports Lambda connaissent les graphiques et les sous-titres.

## Coût fournisseur estimé

Tarifs consultés le 20 octobre 2026, en USD :

- Claude Sonnet 5.5 : 2 $ / million de tokens d’entrée et 10 $ / million en sortie.
  [Tarifs Claude](https://platform.claude.com/docs/en/about-claude/pricing).
- ElevenLabs Multilingual v2 : 0,08 $ / 1 000 caractères.
  [Tarifs API ElevenLabs](https://elevenlabs.io/pricing/api).
- AWS : dépend des GB-secondes, du nombre de fonctions et des médias.
  [Tarifs Lambda](https://aws.amazon.com/lambda/pricing/).

Formule Claude : `inputTokens × 2 / 1 000 000 + outputTokens × 10 / 1 000 000`.
Les tokens consommés sont enregistrés dans les métadonnées du projet.
Un test réel sur un PDF synthétique de six pages a consommé **11 217 tokens
d’entrée et 5 334 de sortie**, soit **0,075774 $** avec ces tarifs. Ce test
mesure l’analyse seule ; il ne représente pas un tarif forfaitaire par deck.

Pour un deck habituel de 10–20 pages, une génération et un export 1080p, prévoir
approximativement :

| Durée | Analyse + voix + rendu + petite marge de stockage |
| --- | --- |
| 30 s | 0,15–0,35 $ |
| 60 s | 0,18–0,45 $ |
| 90 s | 0,22–0,55 $ |
| 120 s | 0,25–0,65 $ |

Ces fourchettes sont des estimations, hors abonnements fixes, licence Remotion,
taxes, modifications supplémentaires et tentatives échouées. Elles supposent
un deck sous le plafond de 100 000 tokens d’entrée et un script court. Un modèle
plus cher ou des régénérations répétées changent directement le coût. Mesurer
les premiers exports Lambda réels avant de figer la marge commerciale.

## Vérification

```sh
node --import tsx --conditions=react-server --test lib/pitch/*.test.ts
node --import tsx scripts/review-pitch.ts
# Facultatif : un appel Claude facturé, sur un deck synthétique uniquement.
node --env-file=.env --import tsx --conditions=react-server scripts/check-pitch-source.ts
```

Les tests ordinaires couvrent PDF, polices, recadrage, durée, validation,
propriété des requêtes, double débit, remboursement, graphiques, confidentialité
du partage et timestamps de sous-titres. Le script de revue rend les graphiques
en paysage, portrait et carré dans `out/pitch-review/`.

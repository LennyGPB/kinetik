# Décors vidéo

## Parcours

Disponible dans **Templates → Décors** et **Créer → Décors**. L’utilisateur choisit une photo et une vidéo MP4/MOV H.264 (1 à 120 secondes, 30 Mo maximum). Le décor reste illustré par sa vignette tant que l’utilisateur n’a pas cliqué sur « Générer l’aperçu · 5 crédits ». Le fichier est alors envoyé et vérifié par le serveur (propriétaire, conteneur, codec, durée et dimensions), puis le paiement est débité avant de renvoyer le média et d’ouvrir le projet. L’éditeur permet de changer le décor, le cadrage et la conservation du son, puis de partager ou d’exporter avec le circuit existant.

Les six photos fournies sont classées PC. Les filtres Téléphone, Tablette et Hybride sont présents avec un état vide ; aucun décor supplémentaire n’est inventé.

## Préparation des photos

`node scripts/prepare-decors.mjs` conserve les originaux, extrait les quatre coins de l’écran vert et prépare les calques WebP avec transparence ainsi que les vignettes. La géométrie est enregistrée dans `config/decor-geometry.json`. Vérifier visuellement les coins avant d’ajouter une nouvelle photo : la détection suppose un seul écran vert, sans obstruction. Le catalogue et les proportions physiques des écrans sont définis dans `config/decors.ts`.

Le lecteur et l’export utilisent la même homographie CSS dans `remotion/video/decor.tsx`. L’image du décor recouvre les bords de la vidéo ; le reste de la photo conserve ses couleurs. « Vidéo entière » conserve le contenu avec des bandes si nécessaire ; « Remplir l’écran » recadre sans étirer la vidéo. L’export d’un autre format conserve toute la photo, avec des bandes autour du décor.

## Crédits

- Déblocage de l’aperçu : **5 crédits**, après vérification du fichier ; la création du projet exige la preuve de ce paiement côté serveur.
- Premier export : **2 crédits jusqu’à 30 secondes**, **4 crédits au-delà**, selon `CREDIT_COSTS.decor`.
- Réexport : remise existante de 50 %, arrondie au supérieur (1 ou 2 crédits).
- Modifications manuelles du décor et du cadrage : gratuites. Le paiement d’un import réussi est réutilisé si la création du projet doit être retentée dans le même écran.
- Échec de rendu : remboursement par le circuit d’export existant.
- Les limites de qualité et le filigrane du forfait restent appliqués.

Le total aperçu + premier export est donc de 7 ou 9 crédits. Ce tarif est un prix produit, et non une mesure du coût AWS. Aucun appel d’IA n’est nécessaire.

Pour valider la marge, mesurer sur Lambda un export de 30 s puis de 120 s, en SD et HD, et relever le coût effectif retourné par Remotion. Ajouter le stockage, les transferts et la licence Remotion ; ne pas déduire le coût AWS du temps d’un rendu local. Documentation : https://www.remotion.dev/docs/lambda/estimateprice

Le paiement de 5 crédits ne débloque pas une démo d’écran classique (10 crédits) : la preuve du paiement reste exigée à sa création et le serveur refuse la conversion d’un projet décor en démo d’écran.

## Mise en service

Le moteur Remotion déployé est une copie du code : **redéployer le site vidéo avant d’utiliser les exports Décors en production** avec `npm run video:deploy`, puis vérifier que `REMOTION_SERVE_URL` pointe sur le déploiement actualisé. Un ancien déploiement ne connaît pas le nouveau rendu. Aucun changement de schéma Prisma n’est nécessaire : le décor vit dans le graphe versionné du projet, avec `videoType: "decor"`.

## Vérifications

Tests : `node --import tsx --conditions=react-server --test lib/decors/decors.test.ts lib/decors/actions.test.ts lib/recordings/recordings.test.ts`.

Les six projections et un export H.264 local de cinq secondes ont été rendus. Le parcours authentifié complet et le coût réel Lambda doivent être vérifiés dans un environnement de déploiement configuré.

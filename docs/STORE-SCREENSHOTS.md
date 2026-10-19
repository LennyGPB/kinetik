# Captures App Store & Google Play

Nouveau type de contenu (`Project.kind = "STORE"`) : les images d'une fiche store. Accessible depuis « Créer » (bouton et `/create?kind=store`) et depuis l'onglet « Captures store » de la page Templates.

## Parcours

1. Formulaire : nom de l'app, description, captures d'écran (8 max), icône, style (20 templates), couleurs. Les captures remplissent les téléphones dans l'ordre ; sans capture, des écrans d'exemple sont dessinés.
2. Génération : l'IA écrit un titre court par capture et la bannière Play (`lib/store/ai.ts`). Mises en page, écrans et couleurs ne passent jamais par l'IA.
3. Éditeur : aperçu iPhone / Android / bannière, ajout d'une capture parmi 4 mises en page (ouverture, un téléphone, deux téléphones, liste d'atouts), remplacement d'un écran directement depuis le téléphone, captures Android différentes en option (sinon Android reprend celles de l'iPhone).
4. Export : ZIP `iPhone/` (1320 × 2868, la taille 6,9" exigée par Apple) et `Android/` (1080 × 1920 + `feature-graphic_1024x500.png`). PNG aplatis, sans transparence.

## Technique

- `config/store-templates.ts` : tailles, styles, mises en page.
- `lib/store/document.ts` : schéma versionné (dans `ProjectVersion.scenes`), démos, remappage des écrans.
- `lib/store/svg.ts` : rendu unique pour l'aperçu et l'export (sharp). Téléphones dessinés en code (iPhone avec Dynamic Island, Galaxy avec caméra perforée), textes vectorisés avec les polices embarquées.
- `lib/store/actions.ts` : création, enregistrement, modification IA, export. Mêmes garanties que les posts : identifiant de requête idempotent, débit puis remboursement en cas d'échec, verrou par projet ; les opérations interrompues sont remboursées à l'ouverture (`lib/store/queries.ts`).
- Les exports réutilisent la table `PostExport` (`format = "store"`, fichiers dans l'ordre iPhone…, Android…, bannière). Téléchargement : `/api/store/exports/[id]`.

Crédits (`config/credits.ts`, `store`) : génération 3 + 1 par capture, modification IA 1, export 1 par capture (iPhone + Android, bannière offerte), réexport à moitié prix.

Aucune migration de base de données. Pas de lien de partage public pour ce type de contenu.

## Collection de 10 directions supplémentaires

Vault (arche architecturale), Signal (affiche diagonale), Exhibit (passe-partout de galerie), Satellite (orbites), Ledger (carnet structuré), Dune (courbes panoramiques), Conduit (connexions techniques), Atelier (papiers superposés), Facet (plans pliés) et Solstice (horizon solaire).

Le catalogue est dans `config/store-collection.ts`, les décors proportionnels dans `lib/store/collection-background.ts` et les cadrages des appareils dans `collectionDevice` du moteur SVG. Chaque direction couvre iPhone, Android, bannières, ouverture, écran simple, duo et liste d’atouts. Les titres, captures, couleurs et polices restent modifiables. Dune calcule ses courbes dans un espace commun pour raccorder les pages voisines.

Tests : `node --import tsx --test lib/store/store.test.ts` (tailles exactes et opacité pour chaque style et mise en page, sécurité des textes et URLs, remappage, coûts, ZIP).

# Photos et polices des templates

Les photos servent uniquement aux aperçus de démonstration. Les projets et exports utilisent les images importées par l’utilisateur ; une zone vide affiche « PHOTO ». Le rendu final ne télécharge pas de photos ni de polices externes.

## Photos

Assets locaux dans `public/post-demos/`, sous [licence Pexels](https://www.pexels.com/license/). Aucun nom de membre ou témoignage réel n’est associé à ces images.

- Équipe : https://www.pexels.com/photo/people-walking-at-the-office-8134186/
- Lac : https://www.pexels.com/photo/calm-body-of-lake-between-mountains-346529/
- Ville : https://www.pexels.com/photo/aerial-view-of-illuminated-skyscrapers-in-a-city-at-night-26612666/
- Portraits : photos Pexels 220453, 774909, 2379004, 1239291, 614810 et 415829. Les URLs d’origine sont conservées dans `scripts/prepare-post-assets.mjs`.
- Collection campagne : espace de travail 2047905, intérieur 1571460, désert 1001435, fleurs 931177 et [tissu orange 4862867](https://www.pexels.com/photo/rippled-orange-cloth-4862867/).

## Polices

Anton, Archivo Black et Instrument Serif (romain et italique), provenant du dépôt Google Fonts, sous SIL Open Font License. Les fichiers et leurs licences sont dans `public/post-fonts/`.

`scripts/prepare-post-assets.mjs` utilise OpenType.js uniquement pendant la préparation pour convertir les glyphes latins en tracés SVG (`lib/posts/fonts/`). Les titres ont ainsi le même dessin dans le navigateur et dans les exports, sans dépendre des polices installées sur le serveur.

## Remplacement et cadrage

- Portrait, Nomad, District et Manifest : remplacement direct de la photo depuis la page sélectionnée.
- Team Board : six emplacements, chacun avec portrait, nom et rôle ; sélection d’un média importé ou remplacement direct.
- Images : remplir le cadre ou conserver l’image entière, position horizontale/verticale, zoom et traitement couleur/noir et blanc.
- Portrait, Nomad, District et Manifest : assombrissement pour préserver la lisibilité.
- Réorganisation/suppression d’un média : les références des pages et des membres sont recalculées par URL.
- District : alternance photo / page claire et courbe continue pour les carrousels de 5 pages maximum.

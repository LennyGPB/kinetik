# Calques et propositions du chat

Le moteur Remotion lit `SceneGraph.overlays`. Les anciennes versions sans calques
gardent leur rendu. Le même graph sert à l’aperçu, au partage et à l’export.

## Calques disponibles

- `logo` : le logo du projet, conservé sans déformation.
- `image` : une capture du projet, identifiée par son index `screen`.
- `text` et `badge` : texte, couleur, taille ; fond pour le badge.

Chaque calque a un identifiant, une position centrale normalisée `x/y`, une largeur
proportionnelle au plus petit côté, une opacité, une rotation et une animation
`none/fade/slide/zoom`. `sceneIds: null` cible toutes les scènes ; une liste cible
des scènes précises. `start/end` limitent la visibilité en secondes dans chaque
scène. Les entrées animées recommencent à chaque scène ; `none` garde le logo fixe
pendant les transitions. Les calques restent sous le filigrane Kinetik.

Le moteur limite les calques à 16, borne les valeurs et n’accepte que les médias du
projet. Aucun chargement d’image externe demandé par le modèle n’est autorisé.
Une édition de scène découpe la portée d’un calque global pour préserver son rendu
sur les autres scènes.

## Édition

Le bouton **Calques** ouvre un aperçu avec ajout, suppression, position, taille,
opacité, texte, couleurs, animation et sélection des scènes. L’édition manuelle
est gratuite et crée une version uniquement après **Appliquer**.

Le schéma et le prompt du chat exposent les mêmes calques. Exemple :
« Ajoute mon logo en petit en haut à droite sur toutes les scènes ».
Cette commande précise possède aussi un chemin déterministe avant l’appel IA,
avec ou sans clé configurée. Une portée globale explicite prime sur la scène
sélectionnée. Les demandes créatives ou combinées passent toujours par l’IA.
Pour rester sous la limite de complexité de la grammaire de l’API, le tableau de
calques est sérialisé dans un champ texte du schéma de sortie, puis parsé, validé
avec Zod et borné côté serveur.
Sans clé IA, le mode de démonstration reconnaît ce cas pour le logo ; il ne simule
pas l’ensemble des demandes libres.

## Validation des propositions

`sendEditRequest` prépare désormais un graph proposé sans créer de version.
L’éditeur montre ce graph et permet de comparer avec l’original, appliquer ou
annuler. Le crédit rémunère la demande au chat, même si l’aperçu est annulé ; la
validation ne débite aucun crédit supplémentaire.

La proposition est signée côté serveur avec une clé liée à la session, expire
après 20 minutes et inclut la version de départ. La confirmation revérifie la
propriété du projet. Une transaction sérialisable refuse de remplacer une version
qui a changé depuis ; le message d’origine rend les confirmations idempotentes.
La proposition reste dans l’état du navigateur : recharger abandonne l’aperçu,
sans modifier la version enregistrée. Les messages du chat restent dans l’historique.

## Mise en production

Le code du moteur a changé : redéployer la composition avec `npm run video:deploy`
avant d’utiliser les calques dans les exports Lambda. Aucune migration de base
n’est nécessaire.

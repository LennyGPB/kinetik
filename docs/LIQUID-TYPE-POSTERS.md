# Spill et Veil

Deux templates motion issus des références de lettres liquides et de reflets violets. Mode : Experience. Dessins natifs SVG, éditables et partagés entre miniature et vidéo ; aucune image de référence incorporée.

| Template | Parti pris | Mouvement pendant la scène | Transition signature |
| --- | --- | --- | --- |
| Spill (`spill`) | Lettres claires sur un plan incliné, fond charbon, longues coulures effilées qui se perdent dans le noir | Les coulures changent lentement de longueur et oscillent, avec un faible mouvement du plan typographique | `gravity-pull` : les coulures descendent jusqu'à couvrir le cadre, puis le libèrent |
| Veil (`veil`) | Mot sombre en minuscules sur fond clair, reflet violet à travers les lettres, plis sombres flous au premier plan | Le reflet traverse doucement le mot et les plis se déplacent en continu | `violet-fold` : deux plis montent au premier plan et révèlent la scène suivante en redescendant |

Un mot court par titre, deux au maximum ; sous-titre bref. Le nom du template apparaît dans les miniatures et toutes les scènes de démonstration. Démo complète : intro, logo monogramme, feature typographique, mockups téléphone suivant la recette, navigateur et CTA. Dans les projets, les captures et le logo restent ceux de l'utilisateur.

Les polices de marque restent prioritaires lorsque l’option de polices de marque est activée. Spill utilise Anton par défaut ; Veil utilise Unbounded. Les palettes restent éditables : monochrome intentionnel pour Spill ; accent violet personnalisable pour Veil. Les mouvements dérivent uniquement du temps de la frame, sans animation CSS, flash ni tirage aléatoire.

`spill-art.tsx` et `veil-art.tsx` sont purs et compatibles avec les miniatures côté serveur. `spill.tsx` et `veil.tsx` délèguent l'intégration au layout commun. Les plis de Veil sont un calque `VeilForeground` partagé par le fond de la vidéo et la miniature : ils suivent le cadre réel et leurs tracés se prolongent au-delà du bord inférieur, où ils restent recadrés, indépendamment du titre carré. Veil applique un seul filtre SVG de flou à ces deux formes ; aucun flou de tout le cadre ou contexte de verre. `PosterWord` conserve les minuscules de Veil via `preserveCase`, sans changer les autres templates.

Les transitions sont inscrites dans le schéma, le moteur, le prompt IA et les dictionnaires FR/EN. Entrée : 24 frames ; sortie : 22 frames à 30 fps. Les couvertures cachent le cadre entier aux frontières.

Spill se distingue de Melt par son plan projeté, sa matière monochrome et sa transition verticale ; de Holo par ses coulures, sa police condensée et sa courbe ; de Positive par son absence de miroir, sa perspective et son mouvement liquide. Veil se distingue de Void par son fond clair, son reflet et sa transition ; de Holo par sa typographie en minuscules, ses formes floues et sa composition ; de Gloss par sa matière mate, son premier plan et son tempo lent.

Vérification : `node --import tsx scripts/review-type-posters.ts spill veil` pour les trois formats et les mockups ; ajouter `--fluidity` pour 51 frames consécutives autour des transitions. Les tests d'intégration contrôlent la création, les scènes de démonstration et la présence d'un mouvement après l'arrivée pour les dix templates. TypeScript, lint et build complètent les contrôles.

Les exports cloud nécessitent un redéploiement Remotion séparé. Aucun déploiement ni migration de base de données effectué ici.

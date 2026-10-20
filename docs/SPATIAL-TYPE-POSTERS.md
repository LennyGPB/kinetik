# Fanout, Block, Positive et Helix

Extension de la collection typographique, inspirée des quatre références fournies. Mode : Experience. Noir et blanc intentionnel ; les couleurs et polices de marque restent personnalisables. Les objets et textes sont centrés dans les trois formats.

| Nom / identifiant | Géométrie partagée avec la miniature | Signature de mouvement |
| --- | --- | --- |
| Fanout / `fanout` | Deux lignes de caractères condensés, cintrées et resserrées autour d'une charnière ; tailles en perspective | Les lignes se replient en éventail, couvrent tout le cadre puis se déploient |
| Block / `blocktype` | Un cube typographique avec trois faces isométriques, sans déformation des proportions selon le ratio | Le cube pivote et vient remplir le cadre avant de révéler le suivant |
| Positive / `positive` | Quatre répétitions métalliques et leur reflet inversé autour d'un horizon sombre | Le miroir se referme sur l'horizon, puis s'ouvre sur la scène suivante |
| Helix / `helix` | Lettres géantes enroulées en colonne, échos de mots, grain imprimé déterministe et deux anneaux elliptiques | Le ruban se bobine jusqu'à couvrir le cadre puis se débobine |

## Contrat de contenu

Les miniatures et toutes les scènes de démonstration affichent le **nom du template**, jamais les textes factuels des références. Dans un projet réel, la recette demande un mot court par titre, deux au maximum, et un sous-titre bref. Pas de noms d'institutions, dates ou promesses inventées.

Comme les autres templates, les démos comprennent intro, logo monogramme, feature, mockups téléphone, mockup navigateur et CTA. Les téléphones suivent la mise en scène propre à la recette ; le navigateur est seul en hero. Les scènes utilisent les écrans de démonstration natifs lorsqu'aucune capture n'est fournie.

Helix privilégie la silhouette enroulée : ses grandes lettres sont volontairement plus difficiles à lire. Les deux petits échos du mot complet permettent d'identifier le nom.

Les titres utilisent Anton par défaut et respectent les polices du brand kit. `MovableText` conserve déplacement, taille et durée de visibilité du texte dans l'éditeur. Les CTA utilisent un accent uni et un texte contrasté.

## Architecture

Chaque template possède un fichier `<nom>-art.tsx` pur et un fichier `<nom>.tsx` pour son intégration au rendu. `type-poster-art-registry.ts` partage les huit dessins de la collection entre Remotion et les miniatures côté serveur, sans contexte ni hooks dans les dessins. `type-poster-layout.tsx` fournit les hooks, le texte déplaçable et les polices de marque. `config/type-posters.ts` définit les noms et les placements communs.

Les transitions `fan-fold`, `block-pivot`, `mirror-horizon` et `helix-wind` sont enregistrées dans le moteur, le schéma, le prompt IA et les libellés FR/EN. Leurs entrées durent 22 frames, leurs sorties 20 frames à 30 fps. Leur progression géométrique reçoit une seule courbe cubique pour éviter la double accélération de la révélation. Le fond reste couvert aux frontières.

Le grain de Helix est un motif SVG fixe ; pas de filtre de bruit ni de hasard par frame. Les anneaux dérivent lentement et continûment. Aucun des quatre templates ne charge l'image de référence ou une texture externe.

Après l'arrivée, Fanout continue d'articuler ses lettres en vague, Block oscille comme un objet rigide, Positive anime ses reflets et la profondeur de ses répétitions, et Helix fait varier doucement la torsion de son ruban. Les amplitudes sont bornées ; aucune boucle ne revient brutalement à son point de départ. `--ambient` dans le script de revue rend trois moments après l'arrivée dans chaque format.

## Diversité

- Fanout diffère de Turn par ses caractères cintrés, sa composition à deux lignes et sa fermeture en éventail ; de Torque par la géométrie des lettres, la matière monochrome et la transition ; de Kinetic Typo par sa perspective locale, son motif et son tempo.
- Block diffère de 3D Flat par son objet entièrement typographique, sa matière et sa transition ; de Gold Rush par sa typographie condensée, sa construction en faces et son pivot ; de Batch par sa géométrie spatiale, ses lettres et sa courbe.
- Positive diffère de Batch par son reflet inversé, son métal et sa fermeture sur l'horizon ; de Power par son rythme, sa matière et sa structure ; de Spectra par le monochrome, le miroir et la transition.
- Helix diffère de Turn par le grain, les anneaux et la bobine verticale ; de Holo par sa typographie condensée, sa matière imprimée et sa transition ; d'Orbit par son ruban, ses mots en perspective et son tempo.

## Vérifier

`node --import tsx scripts/review-type-posters.ts fanout blocktype positive helix` : entrées, poses, transitions et fins dans les trois formats, noms des démos, diagnostics du navigateur et contrôles des templates existants.

Ajouter `--fluidity` pour mesurer 51 frames consécutives autour de chaque frontière. Les lettres fines sont suréchantillonnées avant comparaison afin de ne pas confondre aliasing et saut de mouvement. Captures et mesures dans `out/type-posters/`.

Tests d'intégration : `node --import tsx --test lib/projects/type-posters.test.ts`. TypeScript, lint du code source et build de production complètent la vérification.

Le bundle cloud n'est pas déployé par cette modification. Les exports Lambda doivent être mis à jour séparément avec `npm run video:deploy`, après autorisation. Aucune migration de base de données.

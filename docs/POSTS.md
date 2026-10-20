# Posts Instagram et carrousels

Les projets `kind = POST` partagent les comptes, les assets, les versions, les liens de partage et le ledger des projets motion. Les anciens projets conservent `kind = MOTION` par défaut. La migration `20261016180000_instagram_posts` est additive.

## Parcours

- `/create?kind=post&style=post-orbit` : formulaire avec brand kit, brief, médias, format et 1 à 5 images.
- `/project/[id]` : éditeur spécialisé selon le type de projet.
- Templates et dashboard : filtre motion / posts. Les carrousels font partie des posts.
- Éditeur : textes, compositions, images, couleurs, typographie, position du texte, ajout, duplication, suppression et réorganisation des pages. Enregistrement manuel gratuit et versions avec contrôle de concurrence.
- `Orbit` et `Paper Trail` prolongent leur décor dans un espace horizontal commun. La vue d’ensemble juxtapose les pages sans gouttière. Les informations importantes restent à l’intérieur de chaque page.
- Collection professionnelle : `Swiss` (grille et accent vert), `Ledger` (colonnes éditoriales), `Frame` (captures sur bleu nuit), `Outline` (ligne continue) et `Continuum` (courbe panoramique). Les deux derniers sont liés.
- Collection photo : `Portrait` (photo plein cadre et serif italique), `Team Board` (six portraits avec noms/rôles), `Nomad` (panneau dépoli), `District` (photo monochrome et carrousel contrasté) et `Manifest` (affiche rouge/noir/crème). Les photos sont remplaçables et disposent de réglages de cadrage. Les photos de démonstration sont réservées aux aperçus.
- Collection campagne : `Afterhours`, `Daybook`, `Muse`, `Ritual`, `Dune`, `Still`, `Diptych`, `Ember`, `Chromatic` et `Atelier`. Photos remplaçables, compositions distinctes, mélange de serif et de sans serif ; `Ritual`, `Dune` et `Chromatic` possèdent un élément continu entre les pages.
- `Signal`, `Studio` et `Paper Trail` sont retirés du catalogue et des créations. Leur rendu reste disponible pour éditer/exporter les projets existants et restaurer leurs anciennes versions. Le catalogue compte 43 templates actifs.
- Formats : carré 1080 × 1080, feed 1080 × 1350 et story 1080 × 1920.

## Crédits

Source unique : `config/credits.ts`. Pour N images (1 à 5) :

| Opération | Coût |
| --- | --- |
| Génération | 3 + N |
| Modification IA de l’ensemble | 1 |
| Édition manuelle, restauration, duplication | 0 |
| Premier export | N |
| Exports suivants du même projet | ceil(N / 2) |

Seul un export réussi déclenche le tarif réduit. Le calcul utilise le nombre d’images de la version enregistrée, jamais le prix fourni par le client. PNG et JPG ont le même tarif. Une copie est un nouveau projet et repart au plein tarif d’export.

Les débits utilisent le ledger existant (abonnement d’abord, puis packs), avec transaction atomique pour réserver une génération ou un export. Les requêtes de création, IA et export ont des identifiants d’opération pour éviter les doubles débits. Les échecs sont remboursés ; les opérations interrompues depuis plus de trois minutes sont récupérées à l’ouverture de l’éditeur.

## Rendu et IA

`lib/posts/svg.ts` produit le même SVG déterministe pour l’aperçu et l’export. Les textes et attributs sont échappés. Les exports rasterisent les médias privés en PNG embarqués avant le rendu Sharp : pas d’accès à des URLs externes. Les captures classiques restent entières. Les templates photographiques proposent un cadrage réglable, toujours sans déformation. Voir aussi [POST-ASSETS.md](POST-ASSETS.md).

Les exports sont stockés dans le stockage privé existant et suivis par `PostExport`. Le téléchargement authentifié `/api/posts/exports/[id]` fournit un ZIP avec `01.png`, `02.png`, etc. Les téléchargements d’un export existant sont gratuits. Le filigrane suit le plan ; les formats statiques sont exportés à leur résolution native, indépendamment des qualités vidéo SD/HD.

L’IA réutilise la configuration Anthropic et les garde-fous de budget. Elle rédige/modifie les textes à partir du brief sans inventer de chiffres ou témoignages. Sans clé Anthropic, la création utilise un brouillon local explicite ; les modifications IA échouent avec remboursement. Les médias sont communs aux versions, comme dans le motion : restaurer une version restaure la composition et les textes, pas les anciens fichiers.

## Vérifications

`node --import tsx --conditions=react-server --test lib/posts/*.test.ts lib/credits/*.test.ts lib/storage/access.test.ts lib/i18n/i18n.test.ts`

Les tests vérifient les prix et arrondis, la validation, les accès, les doubles requêtes, les remboursements, les raccords des décors, les dimensions de rendu et le ZIP. `out/posts-preview.png` est une planche de contrôle générée par les tests de rendu.

- Nouvelle série : Folio, Aperture, Index, Traverse et Nocturne, avec photos remplaçables. Traverse et Nocturne prolongent un élément graphique entre les pages.
- Galerie : miniatures seules, aperçu immédiat au survol ou au focus clavier, détails au clic. Les posts font défiler leurs pages et les vidéos sont muettes. La préférence de réduction des animations désactive la lecture automatique.

- Verve, Aura, Contact, Sienna et Tidal : cinq compositions photo. Sienna et Tidal proposent un carrousel lié.

- Ligne, Vellum, Edition, Ascend, Persona, Chroma, Canopy, Sculpt, Tempo and Verso add ten editable photographic layouts. Ligne, Chroma and Verso include cross-page graphics.

- Riptide, Acid, Brush, Moderno et Bleed (`lib/posts/campaign-svg.ts`) : drop mode lime (panneau déchiré, titre vertical, code-barres), affiche vert acide (carte noire, photo teintée), photo et coup de pinceau violet (damier, texte circulaire), feed moderne orange (serif, mot en italique, une page sur deux en aplat orange), bannière à mot géant qui déborde du cadre. Les titres d’exemple n’inventent ni prix ni pourcentage.

- Refonte : `Orbit` (`lib/posts/orbit-svg.ts`, orbite lumineuse continue sur tout le carrousel, une planète par page, ciel étoilé, titre en grotesque large) et `Frame` (`lib/posts/frame-svg.ts`, capture entière dans une fenêtre d’app en verre sur halos colorés, interface esquissée sans capture). `Kinetik Launch` reprend la landing : grille, halo violet, badge, bouton et maquette qui alterne moniteur / téléphone / post carré. `Brush` gagne un pinceau texturé, un cercle tracé autour du mot en accent et une note scotchée. Couleurs plus vives pour `Kinetik Guide` et `Ligne`.
- `Focal` : affiche rouge, photo fondue en silhouette, bande nette sur le regard, mot géant (début gras, fin légère) et texte justifié façon poème.

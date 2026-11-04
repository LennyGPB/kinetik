# Niche Resto

Contenus prêts à poster pour les restaurateurs : plat du jour aujourd'hui, puis menu de la semaine, formule midi, pack du lundi, écran TV.
Vocabulaire du métier dans l'interface (« plat », « carte », « prix »), jamais « template », « scène » ni « export ».

## Accès

`config/features.ts` → `resto: false` : la niche n'est visible que des admins (`lib/resto/access.ts`, `canUseResto`).
Entrée admin : lien « Resto · Plat du jour » sous le carrousel de `/create`, ou directement `/create?kind=dish`.

## Données

- **Restaurant, carte, plats, photos** (`prisma/schema.prisma`, migration `20261103120000_resto_foundation`) : pas encore utilisés par les écrans.
  Un plat garde son origine (`source` : saisi ou lu sur la carte) et `verified` : un plat lu sur une carte n'apparaît dans aucun contenu tant qu'il n'est pas confirmé.
- **Règles** (`lib/resto/model.ts`) : `parsePrice` lit les prix comme sur une carte et renvoie `null` plutôt que de deviner ; horaires et fermetures validés.

## Templates

- **Plat du jour** (`/create?kind=dish`, `videoType: resto-plat-du-jour`) : 5 styles.
- **Menu de la semaine** (`/create?kind=week`, `videoType: resto-menu-semaine`) : 2 à 7 jours, un plat par jour, photo facultative (sans photo, le plat passe en grande typographie : le pack du lundi doit tourner sans nouvelles photos), dates de la semaine facultatives. Styles Bistrot, Street, Chic, Carte (paquet de cartes, éventail final). Durée : intro + un temps fixe par jour + signature (`MENU_SEMAINE_BEATS`). Rendu : `remotion/video/resto/menu-semaine.tsx`, `CarteMenu` dans `carte-3d.tsx`.

- **Formule midi** (`/create?kind=lunch`, `videoType: resto-formule-midi`) : 2 ou 3 plats (entrée, plat, dessert, dans cet ordre), photo facultative par plat, prix de la formule et horaires facultatifs. Les plats s'assemblent un par un puis le prix tombe (`FORMULE_MIDI_BEATS`). Rendu : `remotion/video/resto/formule-midi.tsx`, `CarteFormule` dans `carte-3d.tsx` (pièce dorée du prix).

- **Affiches animées du pack du lundi** : happy hour / promo (`?kind=happyhour`), événement (`event`), avis client (`reviews`), horaires / fermeture (`hours`), présentation du resto (`intro`). Un moteur commun : `lib/resto/affiche.ts` découpe chaque contenu en planches (titre, grosse info, offres, étoiles, avis, horaires, liste, photo, appel final) ; `remotion/video/resto/affiche.tsx` les dessine en 3 styles (Bistrot, Street, Chic ; pas de 3D). Ajouter un template = une fonction dans `afficheSlides` + ses champs dans `components/resto/affiche-form.tsx`. Les avis et notes sont recopiés par le restaurateur, jamais inventés.

`RestoContent` est une union par `template` (`lib/resto/content.ts`) ; les photos d'un menu sont les fichiers du projet, référencés par index (`MenuDay.photo`).
Éditeur : `editor-shell.tsx` (coquille commune) + réglages par template (`resto-editor.tsx`, `menu-editor.tsx`).

## Un contenu Resto = un projet

Un plat du jour est un `Project` (`kind: "MOTION"`, `videoType: "resto-plat-du-jour"`) : tableau de bord, partage, versions et téléchargements fonctionnent comme pour les autres vidéos.

- La version contient `SceneGraph.resto` (`lib/resto/content.ts`) : style, format, plat, prix, nom du resto, point de cadrage.
  `restoGraph()` ajoute une seule scène dont la durée est celle du plat du jour : durée, coût et rendus existants marchent sans cas particulier.
- La photo et le logo sont des fichiers du projet (`Asset` SCREEN / LOGO) : c'est ce qui les rend lisibles par la page de partage.
- **Format** : le 4:5 n'existe pas dans le format des projets (il aurait fallu adapter une vingtaine d'écrans existants).
  Le projet reste `PORTRAIT` ; le vrai format (9:16 ou 4:5) est dans la version, et `videoDimensions()` (`remotion/props.ts`) donne la taille de la composition.
- Création gratuite (aucune IA) ; seul le téléchargement débite, au tarif d'export habituel (×2 pour Carte et Table, `isRestoPremium3d`).

## IA (phase 2)

- **Photos** (`lib/resto/vision.ts` `analyzeDishPhoto`, action `lib/resto/photo-actions.ts`) : Claude repère le plat (cadre → point de cadrage), devine son nom (proposé, modifiable) et l'assiette si elle est entière. `lib/resto/enhance.ts` corrige la lumière (« monde gris » partiel), floute le fond autour du plat (ellipse adoucie) et redresse l'assiette en disque pour Table 3D (refusé si l'assiette sort du cadre). Le disque est la 2e photo du projet (`PlatDuJourContent.disc`). Sans IA, la photo est quand même améliorée. Environ 1 centime par photo.
- **Carte** (`readMenu`, route `app/api/resto/menu`, page `/resto/carte`) : photos, PDF ou texte. L'IA recopie, sans traduire ni compléter ; un prix est recopié tel qu'écrit puis lu par `parsePrice` (illisible = vide). Les lignes difficiles sont « à vérifier » et restent hors des contenus (`Dish.verified`). Enregistrement dans les tables Restaurant (`lib/resto/carte.ts`) : **la migration doit être appliquée**, sinon la page l'indique et les créations marchent sans carte.
- **Association** (`lib/resto/match.ts`) : un plat reconnu sur une photo et présent sur la carte reprend le nom, le prix et la description de la carte. Sélecteur « Choisir dans ma carte » dans toutes les créations et éditeurs.
- Modèle : `claude-opus-5-5` (surcharge possible avec `RESTO_VISION_MODEL_ID`), sortie structurée, repli automatique en cas de refus (`fallbacks: "default"`), budget IA partagé (`lib/security/ai-guard.ts`).

## Rendu

`remotion/video/KinetikVideo.tsx` aiguille `graph.resto` vers `resto/resto-video.tsx`, puis `resto/plat-du-jour.tsx`.
Styles (`config/resto-templates.ts`) : Bistrot, Street, Chic, Carte (3D) et Table (3D, seulement si le contour de l'assiette a été repéré : phase 2).
Durée en temps musicaux par style (`PLAT_DU_JOUR_BEATS`), musique propre à chaque style.
**Langue** : les mots fixes des vidéos (« Plat du jour » / « Dish of the day », bandeau, carte…) viennent de `restoWords()` (`resto/resto-kit.tsx`), selon `RestoContent.language` : la langue du site au moment de la création (pas de choix proposé) ; le prix suit la même langue.

**Textures dessinées en 3D** : toujours `resto/canvas-texture.ts` (chargement en suspension). Une texture posée après coup
n'apparaît pas sur la première image d'un rendu qui ne commence pas à 0 (image fixe, tronçon Lambda) : la scène n'est redessinée qu'au changement d'image.

## Écrans

- Création : `components/resto/plat-du-jour-create.tsx`, en 5 étapes (photo avec point de cadrage → nom et prix → description → restaurant → style avec vignettes et format avec schémas). L'aperçu suit chaque changement dès l'étape 2. Briques partagées avec l'éditeur : `components/resto/resto-form.tsx`.
- Éditeur : `components/resto/resto-editor.tsx`, choisi par `app/[locale]/(editor)/project/[id]/page.tsx` quand la version a `resto`.
  Téléchargement via `ExportDialog` en mode `singleFormat`.

## Offre et accueil (phase 3)

- **Plan `RESTO`** (`config/pricing.ts`) : 39 € HT/mois, 31 € HT/mois en annuel (−20 %, proposé par défaut, « Populaire »), 270 crédits/mois au prix unitaire du Starter, 1080p, sans filigrane. Tant que `legalConfig.vatExempt` est vrai, aucune TVA : le prix payé est 39 € (mention art. 293 B). Sinon `restoVatFactor()` ajoute 20 % partout (Stripe, offre, CGV).
- Hors de la page Tarifs (`PAID_PLANS`) ; présent dans Stripe et les CGV (`SUBSCRIPTION_PLANS`). Lookup keys `kinetik_resto_month|year`, absentes du changement d'offre du portail : un abonné Starter/Pro passe à Resto par un remplacement direct, au prorata, après confirmation et acceptation des CGV dans l'app (`startCheckout` → `switch_confirm`). Paiement refusé : l'offre actuelle reste (`pending_if_incomplete`).
- Le webhook existant attribue les crédits (rien de spécifique à Resto).
- **Coûts fixes** (`lib/resto/allowance.ts`, appliqués dans `startExport`) : plat du jour 8 crédits, pack 30 (phase 4). Re-téléchargement gratuit 24 h. Vidéos de bienvenue (`Project.brief = "resto-welcome"`, posé côté serveur uniquement) : premier téléchargement offert. Les crédits des packs prévus d'ici la fin de la tranche (un par semaine, le jour choisi) sont mis de côté : un plat du jour ne peut pas les entamer. Comptes non Resto : tarif habituel.
- **Écrans** : `/resto/offre` (abonnement), `/resto/bienvenue` (accueil en 9 écrans, attente du webhook au retour de Stripe), `/resto` (« Il te reste X packs et Y plats du jour », vidéos offertes, raccourcis). L'accueil est réservé aux abonnés Resto (et admins), une seule fois par compte.
- Migration `20261104120000_resto_plan` : valeur `RESTO` de l'enum `Plan` + réglages du pack sur `Restaurant` (`packContents`, `networks`, `packDay`, `packEnabled`, `onboardedAt`). Additive, non appliquée.
- Stripe : relancer `scripts/stripe-setup.ts` pour créer le produit et les 2 prix Resto.

## Pack de la semaine (phase 4)

- **Préparation** (`lib/resto/pack.ts`) : dans le cron quotidien existant (6 h UTC ≈ 7 h à Paris), pour les restaurants dont c'est le jour. Un pack manqué (premier pack, cron trop long) se prépare à la visite de `/resto` (`after()`). Une ligne `RestoPack` par restaurant et par jour, au plus un pack par 7 jours (changer de jour ne crée pas un second pack). Reprise sûre : identifiants de projets déterministes.
- **Composition** (`lib/resto/pack-builder.ts`, testé) : menu de la semaine = un plat principal confirmé par jour ouvert (horaires et fermetures), en rotation (`Dish.lastFeaturedAt`, plats phares d'abord) ; formule midi = entrée/plat/dessert selon les noms de catégories, prix de formule repris de la dernière formule sinon absent ; horaires = horaires du restaurant, ou la fermeture à venir ; présentation/avis/happy hour/événement = le dernier contenu du restaurateur remis au style du moment, sinon « crée-en un une fois ». Les photos viennent des plats du jour précédents (même nom). Rien n'est inventé.
- **Légendes** (`lib/resto/captions.ts`) : Claude n'a que les faits du contenu ; légende simple sans IA.
- **Validation** (`/resto/pack/[id]`, `validatePack`) : garder / retirer / corriger, un seul débit de 30 crédits dans la même transaction que le passage à VALIDATED ; contenus retirés supprimés ; plats gardés passent en fin de rotation. Les contenus d'un pack se téléchargent sans débit une fois validé, et pas avant.
- **Jamais sauté en silence** : fermé toute la semaine ou rien à préparer → pack SKIPPED affiché dans l'espace, sans débit ; contenus impossibles listés avec la raison.
- **Recharge automatique** (`lib/resto/topup.ts`, case à cocher dans `/resto/reglages`, désactivée par défaut) : à la validation si le solde manque, facture Stripe du pack de 100 crédits payée hors session avec la carte de l'abonnement, une fois par pack ; facture annulée si le paiement échoue.
- Migration `20261104180000_resto_pack` : table `RestoPack`, `Project.restoPackId`, `Restaurant.locale` et `autoTopUp`. **Elle touche la table des projets : à appliquer avant de déployer ce code, sinon toutes les pages de projets échouent.**

## Plat du jour express (phase 5)

- `/resto/plat` (abonnés accueillis ; le raccourci « Plat du jour » de l'espace y mène) : une photo → analyse IA + recherche du plat sur la carte (nom, prix, description repris tels quels) → restaurant, logo, style et dernier format viennent de l'accueil → « Créer » ouvre l'éditeur avec le téléchargement (`?express=1`).
- Légendes partout : encart « Légende » sous l'aperçu de chaque contenu Resto (`CaptionCard`, `generateRestoCaption`), gardée dans la version (`SceneGraph.restoCaption`) ; une nouvelle version repart sans légende. Écrite tout de suite en express ; celles du pack y sont recopiées.

## Page publique (phase 7)

- `/restaurants` : accroche + 2 démos animées en typographie (aucune photo de tiers), bénéfices, étapes, contenu du pack, prix (depuis `config/pricing.ts`), questions, appel final. Boutons → inscription puis `/resto/offre`.
- Tant que `features.resto` est faux : réservée aux admins et non indexée. Lien « Pour les restaurants » dans le pied de page une fois publiée.

## Import Google (phase 8)

- Premier écran de l'accueil : « Trouver mon restaurant sur Google » (`lib/resto/places.ts`, API Places « New » : recherche texte puis fiche). Pré-remplit nom, adresse, cuisine, horaires (`hoursFromGoogle`, testé), téléphone et site ; le restaurateur vérifie chaque écran.
- Conditions Google : seul `placeId` est gardé tel quel ; le reste devient les informations du restaurateur après vérification. Avis et photos Google ne sont pas importés (pas de réutilisation dans des vidéos).
- Variable `GOOGLE_PLACES_API_KEY` (facultative : sans elle, la recherche est masquée). Recherches réservées aux abonnés Resto et admins, limitées (chaque appel est facturé par Google).

## Avant d'ouvrir à des utilisateurs

1. `npm run video:deploy` : sans redéploiement du site Remotion, un export Lambda d'un plat du jour sortirait avec l'ancien moteur.
2. Appliquer les migrations (`npx prisma migrate deploy`) : `resto_foundation`, `resto_plan` puis `resto_pack`, avant toute mise en ligne du code de la phase 3 (les pages lisent les nouvelles colonnes).
3. Lancer le script Stripe (produit Resto), puis tester un abonnement en mode test : paiement → accueil → 3 vidéos → téléchargement offert.

Tests : `npm run test:resto`. Prototypes Studio : compositions `PlatDuJour-*` (`remotion/Root.tsx`), photos de test dans `public/resto-demos/` (licences tierces, dossier ignoré par git).

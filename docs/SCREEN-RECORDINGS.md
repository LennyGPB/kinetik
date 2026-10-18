# Démos d’écran

Entrée : `/create?kind=recording` (FR et EN). Chaque import réussi coûte `CREDIT_COSTS.recordingImport` (10 crédits), affichés avant l’envoi, et est débité avant accès à l’aperçu. Un fichier invalide ou un stockage échoué n’est pas débité. Les réglages et la validation finale n’ajoutent aucun débit. Les exports gardent le tarif motion existant, affiché avant rendu. La création vérifie le reçu du fichier dans le registre de crédits ; les finalisations R2 concurrentes sont verrouillées pour éviter une double facturation du même envoi.

La création suit quatre étapes : import et analyse automatiques, ajustement des zooms uniquement, mise en scène et format, puis nom et musique avec choix du son original. L’aperçu reste visible après l’import. La timeline est réservée à l’étape des zooms ; un clic sur un bloc sélectionne son panneau de réglages. Un seul panneau de zoom est déployé à la fois. Les réglages sont conservés lors des retours entre étapes. Le projet est enregistré à la validation finale avec le composant de bouton animé de l’application.

Le choix ou le dépôt d’un fichier le sélectionne seulement. Le bouton « Commencer la création » affiche le coût et déclenche l’upload validé et facturé, puis l’analyse locale. Le solde confirmé est immédiatement diffusé aux compteurs de la sidebar et du menu mobile, avec rafraîchissement serveur. Tant que la page reste ouverte, une analyse échouée ou annulée après un import payé peut être reprise avec le même fichier sans nouveau débit.

## Fonctionnement

- Capture MP4/MOV H.264 de 1 à 120 secondes, 30 Mio maximum. Les conteneurs et codecs sont vérifiés côté serveur ; WebM et HEVC ne sont pas pris en charge dans cette version.
- Analyse locale de quatre images par seconde à basse résolution, avec mémoire bornée. Les changements sont regroupés par interaction et comparés avant/après stabilisation. Le zoom anticipe la première réponse visible et reste sur son résultat. Les défilements, changements de page, petites traces de curseur et effets transitoires sont écartés. Le grossissement dépend de la taille de la zone modifiée. Cela reste une heuristique visuelle, sans détection certaine des clics. Aucune image n’est transmise à un service IA.
- Le curseur fait partie de la capture et reste inchangé. Les halos de clic sont retirés de l’interface et du rendu : les zones de changements visuels ne permettent pas de localiser le curseur de manière fiable. Les anciens champs de clic restent acceptés pour la compatibilité des projets mais sont ignorés par le moteur. Une future capture instrumentée pourra fournir les vrais événements.
- Les changements répartis entre formulaire et aperçu sont distingués des vraies coupures et du défilement. Une action compacte peut guider le cadrage même si sa réponse modifie un aperçu éloigné. Les actions rapides peuvent avoir des plans d’une seconde ; les mises à jour répétées de la même zone restent regroupées. Les petites modifications limitées aux bords du cadre sont ignorées pour éviter de zoomer sur les notifications du navigateur.
- Zooms réglables (horaires, cible, intensité), fond, marge, arrondi, cadre, audio d’origine et musique de bibliothèque. Les zooms ne doivent pas se chevaucher. La caméra est calculée à chaque frame et reste dans les limites de l’image.
- Chaque zoom propose un mouvement 3D optionnel du mockup entier : inclinaison gauche, droite, vers le haut ou orbite légère. Sans choix, le mockup reste à plat. Les rotations suivent l’enveloppe du zoom, restent entre 8 et 12 degrés et reviennent à zéro à la fin. Le choix est sauvegardé dans les versions et utilisé dans l’aperçu comme dans l’export. Le placement direct d’une cible reste effectué sur une vue temporairement dézoomée et à plat.
- Les nouveaux zooms automatiques et manuels reçoivent une animation 3D par défaut, alternée entre les six variantes disponibles. Un bouton à côté du choix de cible retire ou réactive toutes les animations. Dans la session courante, la réactivation restaure les choix précédents ; sans choix mémorisés, elle applique les variantes par défaut. Le sélecteur individuel se trouve au-dessus des horaires. Les projets existants ne sont pas modifiés automatiquement.
- Dans l’éditeur, « Recalculer les zooms » réanalyse la vidéo existante sans nouvel upload. Les propositions restent non enregistrées jusqu’à validation avec « Enregistrer ». Une annulation ou un échec d’analyse préserve les réglages précédents.
- Projet motion existant avec `videoType=screen-recording`, média `SCREEN` vidéo, et `SceneGraph.recording`. Aucun changement du schéma Prisma. Les réglages ont leur éditeur dédié, leurs versions et un contrôle de concurrence. Les exports multi-formats et le partage réutilisent les services existants.

## Stockage et déploiement

En développement sans R2 : upload multipart borné vers le stockage local.

Avec R2 : le navigateur envoie le fichier directement via une URL PUT signée valable cinq minutes. La route de finalisation vérifie le conteneur et le codec, applique les quotas existants, puis déplace logiquement la vidéo vers un nom définitif. Les objets temporaires `USER/video/pending-*.mp4` sont supprimés après finalisation ; ils restent inclus dans le quota et la suppression du compte si l’envoi est abandonné. Des budgets journaliers bornent aussi les réservations temporaires. Un nettoyage périodique des objets `pending-` anciens peut libérer les uploads abandonnés (attendre au moins une heure pour laisser expirer les signatures).

La configuration CORS du bucket privé doit autoriser l’origine de l’application, la méthode `PUT` et l’en-tête `Content-Type`. Aucun accès public au bucket n’est nécessaire. Un échec CORS est affiché comme un échec d’import, sans repli silencieux vers un gros body HTTP.

Le rendu Lambda utilise une URL GET privée signée d’une heure pour la vidéo. Les autres médias conservent leur pipeline actuel. Redéployer le site Remotion après les modifications du moteur (`npm run video:deploy`). Les identifiants et la fonction Lambda existants restent nécessaires à un vrai MP4 ; sans eux, le mécanisme historique simule les exports.

## Vérification

`node --import tsx --conditions=react-server --test lib/recordings/recordings.test.ts lib/recordings/motion-analysis.test.ts lib/storage/r2.test.ts lib/storage/access.test.ts`

Les tests couvrent les limites de caméra, l’analyse visuelle, les contraintes temporelles, la validation du conteneur/codec et les permissions du lecteur partagé. Avant mise en production, vérifier une capture réelle avec audio sur les navigateurs ciblés, le CORS R2 et un export Lambda après redéploiement.

Une vidéo H.264 synthétique de cinq secondes a aussi été rendue localement par Remotion en MP4, avec inspection des images paysage et portrait. Cela valide le décodage de la source et la caméra dans le moteur ; le parcours connecté et le rendu AWS nécessitent encore une vérification dans l’environnement de déploiement.

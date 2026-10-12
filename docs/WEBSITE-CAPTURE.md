# Captures depuis un lien public

Création : saisir une URL valide à l’étape 1 déclenche une analyse desktop après 1,2 seconde sans modification. Les captures sont proposées à l’étape 2, non sélectionnées par défaut ; la palette est proposée à l’étape 3 avec « Utiliser ces couleurs ». Les résultats sont conservés dans l’assistant et mis en cache par URL pour éviter une nouvelle capture en revenant en arrière. Modifier ou effacer le lien masque les anciennes propositions, sans supprimer les médias ou couleurs déjà choisis. Une erreur n’empêche pas de continuer manuellement.

Éditeur : Médias → Screens → Capturer depuis un lien. Choisir Desktop ou Mobile, lancer la capture et sélectionner les résultats avant de les ajouter. La limite reste de huit screens. Dans l’éditeur, enregistrer les médias pour appliquer le changement au projet.

Les couleurs sont lues dans les styles calculés des éléments visibles, y compris les dégradés et la couleur de thème. Un canvas convertit les syntaxes CSS en hexadécimal. Les accents des boutons/liens sont prioritaires ; les teintes proches sont regroupées, avec cinq propositions au maximum. Il s’agit d’une palette suggérée, pas d’une charte garantie. Aucun logo n’est extrait.

Le service capture la page indiquée, à trois positions au maximum : début, environ un écran plus bas, puis deux écrans plus bas. Une page courte produit moins de captures. Il ne parcourt pas automatiquement les autres pages du site. Les images sont des PNG stockés comme les uploads existants, avec leurs dimensions, utilisables par le moteur vidéo et le cadrage de découpe.

Le navigateur est isolé des sessions de l’utilisateur. Les sites nécessitant une connexion, bloquant les navigateurs automatisés ou affichant une bannière peuvent produire des résultats incomplets. Aucune connexion ni acceptation automatique des cookies n’est effectuée ; l’import manuel reste disponible. Les images présentées mais non ajoutées suivent le même cycle de stockage que les uploads abandonnés.

## Exécution

- `puppeteer-core` pilote Chromium. Windows détecte Chrome ou Edge ; macOS détecte Chrome. `CAPTURE_CHROME_PATH` permet d’indiquer un autre exécutable.
- Linux utilise le binaire de `@sparticuz/chromium`. Le déploiement doit inclure son dossier `bin` (traçage configuré dans Next), permettre le lancement d’un processus navigateur et disposer des ressources nécessaires. Aucun compte de service tiers n’est requis.
- `/api/capture` exige une session et une requête de même origine. Limites en mémoire : cinq appels par utilisateur sur dix minutes, un appel simultané par utilisateur et deux par instance. Comme le limiteur existant, elles nécessitent un stockage distribué en cas de déploiement multi-instance.
- Le délai global du navigateur est de 45 secondes ; la route annonce 60 secondes à l’hébergeur. Les réponses ne sont pas mises en cache.
- Le trafic web du navigateur traverse un proxy local qui valide chaque destination, refuse les adresses privées/réservées et connecte directement l’IP publique validée pour éviter une seconde résolution DNS. Les redirections et sous-ressources passent aussi par ce proxy. IPv6 n’est pas pris en charge. Les requêtes navigateur autres que GET/HEAD sont bloquées. Limites : 250 connexions/requêtes proxy et 40 Mio reçus par capture.

## Vérification

`node --import tsx --test lib/capture/public-url.test.ts` vérifie les URL, les adresses réservées et le refus d’un accès loopback via le proxy. Une capture réelle desktop et mobile a également été vérifiée avec les dimensions des PNG. Le service de capture est indépendant du bundle Remotion : il ne nécessite pas `video:deploy`.

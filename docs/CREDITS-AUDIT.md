# Audit des offres et crédits — 13 octobre 2026

## Conclusion

Le fonctionnement des crédits a été renforcé et testé sur PostgreSQL. Les quantités et prix commerciaux restent inchangés. **Les 200/600 crédits ne peuvent pas encore être validés comme rentables : la modification à 1 crédit avec Opus est le point prioritaire à revoir.** Les coûts AWS réels par export et les consommations Claude représentatives restent à mesurer.

## Offres présentes dans le code

| Offre | Mensuel | Annuel, équivalent mensuel | Paiement annuel total | Crédits |
|---|---:|---:|---:|---:|
| Free | 0 € | — | — | 30 une seule fois à l'inscription |
| Starter | 19 € | 15 € | 180 € | 200 par mois |
| Pro | 49 € | 39 € | 468 € | 600 par mois |

Un crédit rapporte, avant taxes et frais : Starter 0,095 € au mensuel / 0,075 € à l'annuel ; Pro environ 0,0817 € / 0,065 €. Packs : 100 pour 12 € (0,12 €/crédit), 300 pour 30 € (0,10 €), 1 000 pour 89 € (0,089 €). Les packs et le bonus gratuit n'expirent pas. Le bonus et le plan Free partagent maintenant une seule constante.

Une génération coûte 10 crédits, une édition 1, un export HD de 30 secondes ou moins 5, un export plus long ou UHD 10. Sans édition, Starter permet donc 13 générations + exports HD courts et Pro 40. Avec 10 éditions par vidéo, ce sont 8 et 24 vidéos complètes HD courtes ; une vidéo avec 10 éditions et un export UHD coûte 30 crédits, soit 20 vidéos sur Pro. Ces chiffres sont des capacités théoriques à partir des crédits, soumises aux quotas techniques et aux droits du plan.

## Coûts et risque de marge

Le service utilise `claude-opus-5-5`. Le tarif standard vérifié est de **4 USD/million de tokens d'entrée et 20 USD/million en sortie**. [Source Anthropic](https://platform.claude.com/docs/en/models/opus-5-5/overview)

Exemples arithmétiques, **pas des consommations mesurées de l'app** :

| Entrée / sortie par appel | Coût Claude seul |
|---|---:|
| 4 000 / 1 000 tokens | 0,036 USD |
| 8 000 / 2 000 tokens | 0,072 USD |
| 24 000 / 8 000 tokens | 0,256 USD |

Le dernier scénario correspond aux limites configurées, avec une estimation d'entrée qui peut différer de l'usage réel. Six cents éditions à ce niveau représentent 153,60 USD de Claude, face à 39 € mensuels équivalents sur Pro annuel. Ce n'est pas une estimation de facture habituelle et USD/EUR ne sont pas convertis ici ; c'est un signal que le tarif ne couvre pas tous les usages autorisés. Les quotas techniques sont des protections anti-abus, pas une preuve de rentabilité. Les crédits remboursés commercialement peuvent également provoquer des appels facturés sans consommation nette de crédits.

Les logs `[ai-usage]` distinguent maintenant `generation` et `edit`, avec modèle, tokens d'entrée et de sortie, sans contenu ni secret. Avant de figer les offres, relever les coûts médians et élevés sur des projets représentatifs : peu/beaucoup de captures, 15/30/60 secondes, demandes simples/complexes, historiques longs, refus et réponses sans modification.

Pour les exports, mesurer les rendus HD et UHD via Remotion/AWS ; la 4K peut coûter davantage en calcul. Prévoir également stockage R2, hébergement, Redis, frais de paiement et taxes selon la configuration commerciale. [Estimation Lambda](https://www.remotion.dev/docs/lambda/estimateprice)

La page Remotion annonce une licence gratuite pour les particuliers et organisations jusqu'à 3 personnes, sous conditions. La licence Company pour les organisations plus grandes inclut une tarification d'automatisation à 0,01 USD/rendu avec minimum de 100 USD/mois : ne pas ajouter ce minimum systématiquement au budget d'un développeur solo, mais vérifier les conditions lorsque l'organisation évolue. [Tarifs Remotion](https://www.remotion.dev/docs/license/pricing)

## Recommandation commerciale

1. Conserver les prix et quantités actuels comme hypothèses, sans les modifier automatiquement pendant cet audit.
2. Revoir en priorité le chat à 1 crédit : comparer un modèle moins cher pour les éditions et/ou un coût en crédits plus élevé. Une hausse à 3–5 crédits est une hypothèse à chiffrer, pas une garantie de marge dans le pire cas. Tester la qualité avant de changer de modèle.
3. Définir une marge cible après coûts variables, puis calculer le nombre de crédits vendables avec les mesures réelles. Ne pas attribuer aux quotas de sécurité le rôle d'assurer cette marge.
4. Garder des crédits mensuels non cumulables pour les abonnements et des packs permanents. Pour l'annuel, facturer 180/468 € une fois tout en distribuant 200/600 crédits chaque mois, sans verser douze mois de crédits immédiatement. Les montants annuels sont calculés depuis les prix provisoires actuels.

## Corrections techniques effectuées

- Les crédits expirés sont exclus du solde disponible immédiatement, même si aucun job n'a encore écrit la ligne d'expiration. Le calcul admin suit la même règle.
- Les débits consomment les lots d'abonnement par échéance puis les packs, en conservant l'échéance sur chaque partie du débit.
- Un remboursement doit correspondre à un débit réel et à son montant total. Il restaure les sources et échéances d'origine ; un remboursement après expiration ne crée pas de crédits permanents. Une référence canonique évite de rembourser deux fois en présentant alternativement l'identifiant du débit ou sa référence métier.
- Les attributions avec référence sont idempotentes sous verrou PostgreSQL. Une référence rejouée avec un montant ou une échéance différente est refusée. Les achats et attributions d'abonnement nécessitent une référence ; les nouveaux crédits d'abonnement nécessitent une échéance.
- Montants négatifs, fractions, NaN et infinis sont refusés pour les attributions. Un débit nul reste une lecture du solde ; les débits négatifs ou non entiers sont refusés.
- `renewSubscriptionCredits` constitue le contrat interne pour une période mensuelle déjà payée : montant tiré du plan serveur, attribution et mise à jour du plan atomiques, rejeu sans double attribution, chevauchement de périodes refusé. `accessEndsAt` peut conserver une échéance d'accès annuelle distincte de l'expiration mensuelle des crédits. **Cette fonction ne vérifie pas un paiement Stripe et n'est pas exposée au client.**
- Aucun prix ni nombre de crédits d'abonnement n'a été changé. Aucune migration de schéma et aucune modification des transactions existantes n'ont été nécessaires.

## Tests réalisés

```powershell
npm.cmd run test:credits
npm.cmd run test:credits:postgres
```

Les tests PostgreSQL utilisent `TEST_DATABASE_URL` si disponible ; sinon la connexion directe configurée ou dérivée de la base existante. Ils créent un schéma aléatoire `credits_test_*`, y appliquent les migrations et y exécutent tous les scénarios. Le `search_path` est limité à ce schéma ; les tables de l'application ne sont pas utilisées. Le schéma et ses données sont supprimés dans le nettoyage final. En cas d'arrêt brutal du processus, un schéma temporaire peut subsister et devra être nettoyé après vérification de son nom. Les secrets ne sont pas affichés.

Les 12 scénarios réels couvrent : bonus, achats simultanés/rejoués, première période Starter, allocation mensuelle Pro avec accès annuel, dépenses mixtes, expiration sans job, renouvellement et expiration idempotente, remboursements mixtes avec références alternatives, remboursement tardif, débits concurrents, valeurs invalides et rollback d'une opération métier échouée. Les tests unitaires complètent les cas historiques sans échéance sur les débits et les limites d'export.

Aucun paiement Stripe, appel Claude ou rendu Lambda n'a été déclenché. Ces tests ne valident pas les webhooks Stripe : le paiement est encore un stub.

## À définir et tester pendant l'intégration Stripe

- Vérification des signatures et association serveur du client Stripe au compte. Références uniques de paiement et journal d'événements traité une seule fois, y compris avec plusieurs livraisons concurrentes et dans le désordre.
- Attribution seulement après confirmation de paiement ; aucun versement sur un paiement échoué ou une simple redirection de retour Checkout.
- Pour l'annuel : calendrier mensuel fiable fondé sur le paiement annuel vérifié, ancrage des dates (31 du mois, février, fuseau), reprise après retard et distinction entre échéance d'accès et échéance des crédits.
- Annulation : accès maintenu jusqu'au terme payé, aucun prochain versement après ce terme, puis mise à jour du plan ; packs conservés.
- Upgrade/downgrade : décider de la date d'effet, du prorata et du traitement des crédits restants. Les périodes qui se chevauchent sont volontairement refusées par le contrat actuel tant que cette règle n'est pas définie.
- Remboursements monétaires, litiges et rétrofacturations : définir la reprise des crédits et le comportement si ces crédits ont déjà été dépensés. Ne pas confondre ces cas avec le remboursement d'un appel IA échoué.
- Les éventuels anciens crédits `SUBSCRIPTION` sans échéance demandent un examen : la compatibilité conserve ces lots historiques, mais interdit d'en créer de nouveaux sans date.

Le replay du ledger est adapté au volume actuel. Avec un historique important, prévoir des lots/allocations indexés ou des snapshots vérifiables, sans perdre les invariants d'expiration et de concurrence.

# Protections contre les abus

Les valeurs ci-dessous sont actives par défaut, sans modifier le `.env` existant.

## Claude et crédits

- 100 tentatives Claude au maximum sur 24 heures pour toute l'application (`AI_GLOBAL_DAILY_CALLS`).
- Comptes gratuits : 6 tentatives/heure, 12/24 heures, génération et chat cumulés. Comptes payants : 30/heure, 200/24 heures.
- Les tentatives et réservations de tokens ne sont jamais restituées, même lors d'un remboursement commercial, d'une panne ou d'une réponse hors sujet.
- Budget global conservateur de 1 000 000 tokens réservés sur 24 heures (`AI_GLOBAL_DAILY_TOKENS`). Avant l'inférence, le compteur de tokens Anthropic doit réussir ; le contexte est limité à 24 000 tokens. La réservation couvre l'entrée estimée majorée de 10 %, une marge de 1 024 tokens et les 8 000 tokens de sortie possibles. Une réservation échouée empêche l'inférence. Les réservations ne sont pas remboursées, donc le budget peut bloquer avant que la consommation réelle atteigne ce plafond.
- Timeout d'inférence : 90 secondes ; compteur de tokens : 15 secondes. Aucun retry automatique ni fallback vers un autre modèle. Les images envoyées à Claude sont converties en PNG, limitées à 1 280 × 1 280 pixels et 25 millions de pixels en entrée.
- `AI_ENABLED=false` coupe les appels payants. Les réglages manuels fonctionnent toujours.
- Les débits et remboursements sont sérialisés par un verrou de ligne PostgreSQL sur l'utilisateur. Les références de remboursement sont uniques par opération côté application.
- Une génération possède un reçu durable, lié à son débit, enregistré dans le ledger avec un montant nul. Il est masqué dans l'historique client. Ce reçu empêche le rejeu du même appel après un crash, sans migration. Après trois minutes, un appel de suivi marque une tentative interrompue comme échouée et la rembourse une seule fois ; la relance produit un nouveau débit et reste soumise aux quotas.
- Le verrou de génération reste détenu jusqu'à la sauvegarde du résultat. Les éditions de chat sont limitées à une opération simultanée par compte.

Les logs `[ai-usage]` indiquent uniquement modèle et consommation en tokens, sans prompt, image ou secret. Ils ne constituent pas un historique comptable durable. Les erreurs d'édition et de génération ne journalisent pas la réponse brute du fournisseur.

## Redis et déploiement

Redis est obligatoire en production pour inscriptions, captures, uploads, générations, éditions et exports. En panne ou absent, ces opérations sont refusées ; les lectures et opérations non payantes peuvent conserver leur protection locale. Le développement sans Redis conserve un backend mémoire ; si Redis est configuré mais indisponible, les opérations sensibles sont également refusées en développement.

Utiliser une base Redis dédiée avec persistance et sans éviction des compteurs. Réinitialiser Redis remet les quotas globaux à zéro. Configurer un **plafond monétaire mensuel dans le workspace Anthropic**, avec une clé dédiée à l'application et des alertes : un plafond de tokens ne garantit pas un montant en euros, notamment si la tarification ou le modèle change. Ces paramètres fournisseur ne sont pas configurables depuis ce dépôt.

Sur Vercel, l'adresse IP vient uniquement de `x-vercel-forwarded-for`. Ailleurs, définir `TRUSTED_IP_HEADER` sur l'en-tête garanti par le proxy. Celui-ci doit l'écraser et l'origine ne doit pas être accessible directement. Sans en-tête fiable en production, toutes les requêtes partagent la clé `unknown` : protection restrictive, sans possibilité de contourner les limites en inventant des en-têtes d'un autre hébergeur.

## Inscriptions et fichiers

- 30 inscriptions/24 heures pour toute l'application, en plus des quotas par IP et des contrôles de formulaire existants. Le compte et son bonus sont créés ensemble.
- Upload multipart plafonné pendant la lecture à 20 Mio + 64 Kio, même sans `Content-Length`. Taille fichier : 8 Mio/image, 20 Mio/audio.
- Contrôle d'origine sur l'upload. Vérification des formats réels des images et des signatures audio courantes ; extension et MIME stockés dérivés du contenu. Ce contrôle n'est pas une analyse antivirus ni une validation complète des codecs audio.
- Stockage limité à 512 Mio par compte, fichiers non attachés compris. 2 Gio de nouvelles écritures/24 heures pour toute l'application, captures incluses. Les écritures d'un même compte sont sérialisées. R2 est utilisé dès que ses quatre variables sont configurées ; voir `R2.md`.
- Captures Chrome et demandes d'exports Lambda : 100/24 heures chacune pour toute l'application, en plus des quotas par compte. Ces quotas ne sont pas remboursés après un échec.
- En-têtes globaux : anti-iframe, `nosniff`, politique de référent et restrictions caméra/micro/géolocalisation. CSP limitée à `frame-ancestors`, `base-uri` et `object-src` pour préserver le lecteur et les scripts actuels ; une CSP complète nécessite une validation dédiée.

## Limites restantes

La possession de l'email n'est pas vérifiée et aucun challenge anti-bot externe n'est branché. Les plafonds globaux limitent l'impact des comptes multiples, mais ne remplacent pas ces contrôles. Un service d'envoi d'emails et les clés d'un fournisseur de challenge seront nécessaires pour les ajouter.

Les médias nécessitent maintenant une session propriétaire ou un token valide du projet partagé. Les réponses ne sont pas mises en cache ; désactiver le partage bloque les nouvelles lectures, sans pouvoir révoquer des copies déjà téléchargées. R2 fournit le stockage partagé entre instances. Le nettoyage des fichiers orphelins et un plafond global permanent de stockage restent à ajouter ; les plafonds actuels limitent la taille par compte et les écritures quotidiennes globales.

Les avis npm identifiés dans l'audit initial autour des dépendances Prisma demandent une mise à jour compatible et un examen de leur exploitabilité. Aucun downgrade majeur ni `audit fix --force` n'est appliqué automatiquement.

## Validation

`node --import tsx --conditions=react-server --test lib/security/ai-guard.test.ts lib/security/redis-failure.test.ts lib/security/upload.test.ts lib/credits/ledger.test.ts lib/storage/storage.test.ts`

Les tests de ledger utilisent un adaptateur transactionnel simulant l'attente sur les verrous. Ils vérifient les invariants métier sous concurrence ; ils ne remplacent pas un test d'intégration PostgreSQL, un test Redis réel ou une vérification des en-têtes reçus derrière le proxy de production. Aucun test ne consomme de tokens Claude.

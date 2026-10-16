# Kinetik

**Posts Instagram et carrousels** : formulaire `/create?kind=post`, éditeur dédié, 1 à 5 images,
templates classiques ou liés, exports PNG/JPG et crédits partagés. Voir [docs/POSTS.md](docs/POSTS.md).

SaaS de génération de vidéos de motion design (lancement produit, présentation d'app) par IA.
**Phase 1 : design + front.** Auth, base de données et ledger de crédits sont réels ; génération IA, rendu vidéo, paiement et analyse audio sont mockés derrière des interfaces prêtes à brancher.

Stack : Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Prisma 7 (Postgres / Neon), Remotion, Motion.

## Démarrer

```bash
npm install            # génère aussi le client Prisma (postinstall)
cp .env.example .env
npx prisma migrate dev # applique les migrations sur la base de DATABASE_URL
npm run db:seed        # compte démo : demo@kinetik.app / kinetik-demo
npm run dev
```

Scripts utiles : `npm run typecheck`, `npm run lint`, `npm run db:studio`.

## Français et anglais

- Routes localisées avec `next-intl` : `/en` et `/fr`. L’anglais est la langue par défaut et la cible `x-default` du référencement.
- Sans choix explicite, `Accept-Language` détermine la langue ; le sélecteur FR/EN conserve le choix dans `KINETIK_LOCALE` pendant un an.
- Les liens internes gardent la langue et le sélecteur conserve la page, la recherche et l’ancre.
- Traductions : `lib/i18n/dictionaries/fr.ts`, `copy-fr.json` et `en.json`. Les clés et les paramètres `{name}`, `{count}`, etc. doivent rester identiques dans les deux langues.
- Composants : `useDictionary()` ; fonctions serveur : `await getServerDictionary()`. Ne pas capturer une traduction au niveau global d’un module de composant.
- Les nouvelles vidéos enregistrent leur langue dans `Project.locale` et `SceneGraph.language`. La génération, les démonstrations et les exports utilisent cette langue.
- Changer la langue de l’interface ne réécrit pas les contenus des projets existants. Le bouton Traduction de l’éditeur crée une version traduite lorsque souhaité.
- Les vidéos MP4 françaises de la landing sont conservées ; la version anglaise utilise une démonstration Kinetik animée en anglais.
- Vérification : `node --import tsx --conditions=react-server --test lib/i18n/i18n.test.ts`.

## Vidéo (Remotion)

La composition vit dans `remotion/` (imports **relatifs** uniquement : ce dossier est aussi bundlé par Remotion).
Elle lit le JSON des scènes (`lib/projects/scenes.ts`) et sert à la fois pour l'aperçu de l'éditeur (`@remotion/player`) et pour le rendu MP4.

```bash
npm run video:studio   # aperçu interactif avec les props de démo (remotion/Root.tsx)
npm run video:render   # rendu local → out/kinetik.mp4 (bloqué sous Windows : ffmpeg)
npm run video:deploy-function   # crée la fonction Remotion Lambda (une fois par version de Remotion)
npm run video:deploy            # (re)déploie le site Remotion : À FAIRE après chaque modif de remotion/ ou config/
```

**Export MP4** : Remotion Lambda (AWS, `lib/services/render.ts`). Variables `REMOTION_*` dans `.env` (voir `.env.example`) ;
sans elles, l'export est simulé. Les fichiers uploadés sont intégrés aux props (data URI) car AWS ne peut pas lire
le stockage local ; le MP4 reste privé sur S3 et se télécharge via un lien signé valable 24 h. Échec = remboursement automatique.
Un compte AWS neuf est limité à 10 Lambdas simultanées (`REMOTION_MAX_LAMBDAS`, 8 par défaut) : demander une hausse du quota
« Concurrent executions » dans AWS Service Quotas pour des rendus plus rapides, puis reporter ce quota dans `REMOTION_CONCURRENCY`
(10 par défaut). Un export dans les trois formats lance trois rendus en même temps, qui se partagent ce quota.

Logo et screens sont toujours affichés en `object-fit: contain` (jamais recadrés ni déformés).
Pour un rendu hors navigateur, rendre les URLs absolues avec `absolutize()` (`remotion/props.ts`).

**Templates** : chaque template est une *recette* (`config/recipes.ts`) qui assemble des *briques* du moteur
(fond, typo, animation de titre, transitions, effets, mise en scène des screens).
Créer un template, ajouter une brique, comprendre le rôle de Claude : voir **[docs/TEMPLATES.md](docs/TEMPLATES.md)**.

## Organisation

```text
app/
  (marketing)/          landing (statique)
  (auth)/               /login, /register
  (app)/                dashboard, create, brand-kit, credits, settings (shell sidebar / onglets mobile)
  (editor)/project/[id] éditeur plein écran
  api/uploads/          upload + lecture des fichiers (driver de stockage local)
components/             UI par domaine (landing, auth, app, create, editor, pricing, ui…)
config/                 ⚙️ valeurs modifiables : credits.ts, pricing.ts, recipes.ts (rendu des templates), styles.ts, music.ts, formats.ts, fonts.ts
docs/TEMPLATES.md       recettes et briques du moteur vidéo
lib/
  auth/                 sessions, hash scrypt, DAL, actions, providers OAuth (UI seulement)
  credits/ledger.ts     ledger de crédits (débits atomiques, abonnement vs packs)
  projects/             requêtes, actions serveur, format JSON des scènes
  services/             🔌 mocks à remplacer : ai.ts, render.ts, billing.ts
  storage/              driver de stockage (local → Cloudflare R2)
  i18n/                 dictionnaire FR typé (ajouter en.ts pour l'anglais)
prisma/                 schéma, migrations, seed
proxy.ts                redirection optimiste des routes protégées
```

## Éditeur : montage, partage, déclinaisons

| Fonction | Où | Notes |
| --- | --- | --- |
| Réglages rapides (animation, polices, mockups) | `lib/projects/settings.ts`, `components/editor/quick-settings.tsx` | Gratuits, sans Claude, une version par changement |
| Montage de la frise (durée, ordre, suppression, textes) | `lib/projects/timeline.ts`, `components/editor/scene-timeline.tsx`, `player.tsx` | Le serveur rejoue les modifications (`editTimeline`) |
| Polices du brand kit | `remotion/video/brand-fonts.ts`, `SceneGraph.fonts` | Appliquées d'office à la génération si un brand kit existe ; réversible |
| Lien de partage | `setShareLink`, `app/(share)/share/[token]` | Jeton aléatoire, lecture seule de la dernière version, non indexé |
| Déclinaisons | `lib/projects/variants.ts`, `createVariants` | Autres formats + version courte 15 s = nouveaux projets (gratuit) |
| Mise en avant d'un screen (zoom / découpe) | `remotion/video/focus.tsx`, `Scene.focus`, `components/editor/focus-editor.tsx` | Claude la propose (il voit les screens numérotés) ; l'utilisateur trace le cadre à la main |
| Transition par scène | `TimelineEdit` « transition », barre d'outils de la scène | Celles du template proposées en premier |
| Médias dans l'éditeur | `updateProjectMedia`, `components/editor/media-dialog.tsx` | Logo, screens (ordre), musique ; communs à toutes les versions |
| Changer de template / couleurs | `changeStyle`, `components/editor/style-dialog.tsx`, `SceneGraph.styleId/colors` | Versionné (une ancienne version ramène son style) ; transitions adaptées au nouveau template |
| Captures par scène, ajout / duplication de scènes | `TimelineEdit` « screens », « add », « duplicate » (`lib/projects/timeline.ts`) | 2 à 12 scènes, 1,5 s minimum ; l'id d'une scène ajoutée vient du client pour que le serveur rejoue la même suite |
| Musique : réglages + tempo | `SceneGraph.audio`, `lib/audio/tempo.ts`, `beatGrid()` | BPM et premier temps détectés dans le navigateur à l'upload ; volume, départ, fondus |

## Ce qui est mocké et où le brancher

| Fonctionnalité | Fichier | À faire |
| --- | --- | --- |
| Génération / modifs IA | ✅ `lib/services/ai.ts` (Claude Opus 5.5, structured outputs) | Branché. Sans `ANTHROPIC_API_KEY`, repli sur `ai-mock.ts` |
| Rendu MP4 | ✅ `lib/services/render.ts` (Remotion Lambda) | Branché (suivi par polling). Plus tard : webhook, stockage R2 public au lieu des data URI |
| Stockage | `lib/storage/index.ts` | Driver R2 implémentant `StorageDriver` |
| Paiement | `lib/services/billing.ts` | Checkout Stripe + webhook → `grantCredits` |
| OAuth Google / Discord | `lib/auth/providers.ts` | Routes `/api/auth/[provider]` (+ callback), passer `enabled: true` |
| Analyse audio / lecture | `config/music.ts`, étape Musique | BPM réel + lecture audio |
| Extraction depuis l'URL du site | étape « Ton app » | Récupérer logo et couleurs |
| Vidéos de démo | `components/media/video-placeholder.tsx` | Passer `src` (ou `previewSrc` dans `config/styles.ts`) |

## Crédits

Coûts dans `config/credits.ts` (génération 10, modif 1, export 5 ou 10). Le solde est la somme des lignes `CreditTransaction` ; les débits consomment d'abord les crédits d'abonnement (qui expirent), puis ceux des packs. Prix et plans **provisoires** dans `config/pricing.ts`.

## Thème

Tokens CSS dans `app/globals.css` (`:root` / `[data-theme="dark"]`), exposés à Tailwind via `@theme`. Le thème est appliqué avant le premier paint par un script inline (`components/theme/theme-provider.tsx`).

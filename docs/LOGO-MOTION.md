# Signature (logo motion) — expérimentation

Nom affiché : « Signature ». Dans le code, la feature garde ses identifiants `logo-*` / `logoMotion` : ils sont enregistrés dans les projets existants.

Le parcours Motion propose désormais un choix avant la première étape : Motion design (parcours existant) ou Signature (texte animé).

Quinze modèles. Sculpt (relief et rotation), Slice (bandes et inversion) et Elastic (déformation) animent le mot entier (`remotion/video/logo-word.tsx`). Les douze autres animent chaque lettre séparément (`remotion/video/logo-word-glyphs.tsx`, via `outlineGlyphs`) : Rise, Trace, Wipe, Focus, Flip, Stack, Decode, Drop, Mosaic, Coil, Impact, Neon. Chaque valeur dépend uniquement du temps : l’intro se termine avant 1,5 s (instant des miniatures), un second temps fort arrive à 55 % de la durée. L'utilisateur saisit son texte, choisit son format, une durée de 4/6/8 secondes et éventuellement les couleurs et la musique. L'aperçu et l'export utilisent le même composant Remotion et des lettres vectorielles.

La création conserve le texte exact, sans appel IA. Elle coûte les 10 crédits habituels de création ; l'export conserve sa tarification existante. Le débit et le projet sont enregistrés dans la même transaction. Un identifiant de requête empêche de facturer deux fois une nouvelle tentative.

Le projet s'ouvre dans l'éditeur existant. Son texte et son animation restent modifiables. Les modèles sont enregistrés séparément des modèles du parcours classique. Aucune migration de base de données n'est nécessaire. Déployer l'application et le site Remotion pour mettre aussi les exports à jour.

Dans la page Templates, les signatures ont leur propre onglet (Motion · Signature · Posts) ; ils n’apparaissent pas dans le choix de style du parcours Motion classique.

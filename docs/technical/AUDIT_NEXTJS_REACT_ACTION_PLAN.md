# Plan d’action — Audit Next.js / API / React (suivi)

Ce document consolide les constats des audits **phase 1** (qualité globale Next.js, sécurité, perf, tests) et **phase 2** (matrice des routes API + qualité des composants React). Il sert de **backlog traçable** : cocher les cases au fil des PR / merges.

**Dernière mise à jour :** 2026-05-09 (Epic F — F.1/F.2, F.3 mesures à planifier)  
**Statuts :** `[ ]` à faire · `[~]` en cours · `[x]` terminé

---

## Comment utiliser ce plan

1. Traiter de préférence par **ordre de priorité** (P0 → P3), sauf dépendance indiquée.
2. Une **étape = une PR** idéalement (ou un groupe cohérent), pour faciliter la review.
3. Après chaque lot : `npm run check` (et smoke optionnel `npm run smoke:web` pour les changements sensibles).
4. Référencer ce fichier dans les PR concernées (`Voir docs/technical/AUDIT_NEXTJS_REACT_ACTION_PLAN.md`).

---

## Légende des priorités

| Niveau | Signification |
|--------|----------------|
| **P0** | Sécurité ou incohérence critique avec les règles projet / risque élevé |
| **P1** | Fiabilité, cohérence, conformité forte ; à faire rapidement après P0 |
| **P2** | Qualité maintenabilité, perf, DX ; planifiable par sprints |
| **P3** | Amélioration continue, dette technique non bloquante |

---

## Synthèse des epics

| Epic | Description | Priorité max |
|------|-------------|--------------|
| A | Sécurité API : CSRF (`validateOrigin`), compléments rate limiting | ~~P0~~ **traité (2026-05-09)** |
| B | En-têtes `Cache-Control` sur réponses sensibles | ~~P0 / P1~~ **traité (2026-05-09)** |
| C | `export const runtime = "nodejs"` sur routes concernées | ~~P1~~ **traité (2026-05-09)** |
| D | Cohérence des rôles (`resolveRole`, `hasAnyRole`, `USER_ROLES`) | ~~P1~~ **traité (2026-05-09)** |
| E | Toolchain : ESLint vs build, config Next (`next.config.ts`) | ~~P2~~ **traité (2026-05-09)** |
| F | Stratégie rendu : réduction du `force-dynamic` global si pertinent | ~~P2~~ **F.1–F.2 traités (2026-05-09)** ; F.3 mesures à faire |
| G | Qualité React : découpage, couche API client, patterns | P2 |
| H | Accessibilité (a11y) ciblée | P3 |
| I | Tests automatisés (API, hooks critiques, composants clés) | P2 |
| J | Dette packages & observabilité (logs, dépendances) | P2 / P3 |

---

## Epic A — Sécurité API (CSRF & rate limiting)

**Objectif :** Aligner les mutations exposées au navigateur avec la politique documentée (`validateOrigin` sur POST/PATCH/DELETE/PUT côté cookie), et renforcer les surfaces sensibles.

### A.1 Inventaire et décision par route (prérequis)

- [x] **A.1.1** Lister toutes les routes `app/api/**/route.ts` avec méthodes mutantes (POST, PUT, PATCH, DELETE).
- [x] **A.1.2** Pour chaque route, classer : (1) appel navigateur same-origin attendu, (2) webhook / signature externe, (3) flux anonyme contrôlé (ex. email), (4) autre.
- [x] **A.1.3** Produire une petite table « route → décision CSRF » dans `docs/SECURITY.md` (ou annexe) pour figer les exceptions **N/A**.

### A.2 Implémenter ou documenter `validateOrigin`

**Routes identifiées comme mutations « cookie » sans `validateOrigin` à traiter (audit phase 2) :**

- [x] **A.2.1** `session` — `POST` (création session) — `validateOrigin` ajouté ; pas d’exception documentée (même politique que les autres mutations navigateur).
- [x] **A.2.2** `discord/send-message` — `POST`
- [x] **A.2.3** `discord/update-custom-message` — `POST`
- [x] **A.2.4** `discord/availability-polls/create` — `POST`
- [x] **A.2.5** `discord/availability-polls/[pollId]/close` — `POST`
- [x] **A.2.6** `admin/discord-availability-config` — `POST` (GET à traiter en epic B pour cache)
- [x] **A.2.7** Revérifier toute route ajoutée depuis l’audit — grep `export async function POST` sans `validateOrigin` après corrections.

**Critères d’acceptation :** Aucune mutation same-origin par cookie ne reste sans garde **sans** entrée documentée dans la doc sécurité ; en dev, `APP_URL` / `NEXT_PUBLIC_APP_URL` cohérents pour ne pas casser les flux.

### A.3 Rate limiting

- [x] **A.3.1** Lister les endpoints à risque brute-force ou abus (auth, session, sync, Discord proxy, etc.).
- [x] **A.3.2** Uniformiser l’usage de `checkRateLimit` (ou stratégie équivalente) sur les routes retenues ; clés de limite stables (ex. par IP + uid selon le cas).  
  _Helpers :_ `src/lib/auth/rate-limit-http.ts`, `src/lib/auth/request-ip.ts` ; `session/firebase-token` aligné sur `enforceRateLimit`.
- [x] **A.3.3** Vérifier la cohérence avec `docs/SECURITY.md` et les réponses HTTP `429`.

---

## Epic B — En-têtes `Cache-Control` (données sensibles)

**Objectif :** `no-store` (et dérivés) sur les réponses JSON sensibles, conformément aux règles projet.

### B.1 Helper réutilisable (optionnel mais recommandé)

- [x] **B.1.1** `src/lib/http/cache-headers.ts` : `applyNoStoreHeaders`, `jsonNoStore`.
- [x] **B.1.2** `withAuth` utilise `applyNoStoreHeaders` / `jsonNoStore` ; routes API migrées vers `jsonNoStore` (remplace `NextResponse.json`).

### B.2 Routes à corriger ou vérifier (audit)

- [x] **B.2.1** `admin/discord-availability-config` — `GET` / `POST` via `jsonNoStore`.
- [x] **B.2.2** `brulage/validate` — `jsonNoStore`.
- [x] **B.2.3** `coach/request` — `jsonNoStore`.
- [x] **B.2.4** Toutes les routes `discord/**/route.ts` passées en revue — `jsonNoStore`.
- [x] **B.2.5** Passage systématique sur `src/app/api/**/route.ts` (sauf `session` : cookies + `applyNoStoreHeaders`).
- [x] **B.2.6** `openapi` — `jsonNoStore` ; politique documentée dans `docs/SECURITY.md` (homogénéité, contenu toujours public).

**Critère d’acceptation :** Plus de `NextResponse.json` nu dans `app/api` sauf `session/route.ts` (cookies) ; ou passage par `withAuth`.

---

## Epic C — `runtime = "nodejs"` explicite

**Objectif :** Toutes les routes utilisant Firebase Admin, Node crypto, Firestore, etc. déclarent `export const runtime = "nodejs";` (règles `.cursorrules`).

### C.1 Routes signalées sans export explicite (audit phase 2)

- [x] **C.1.1** `admin/sync-status`
- [x] **C.1.2** `admin/users` (+ sous-routes si besoin)
- [x] **C.1.3** `admin/users/coach-request`
- [x] **C.1.4** `admin/users/set-role`
- [x] **C.1.5** `brulage/validate`
- [x] **C.1.6** `coach/request`
- [x] **C.1.7** `discord/link-license`
- [x] **C.1.8** `discord/members`
- [x] **C.1.9** `discord/send-message`
- [x] **C.1.10** `discord/update-custom-message`
- [x] **C.1.11** `fftt/players`
- [x] **C.1.12** `openapi` — Node.js explicite (cohérence avec les autres handlers App Router)
- [x] **C.1.13** `teams/[teamId]/discord-channel`
- [x] **C.1.14** `teams/[teamId]/location`
- [x] **C.1.15** `teams/matches`

- [ ] **C.2** Script ou checklist CI : optionnel — grep pour `firebase-admin` / `getFirestore` dans `route.ts` sans `runtime` (non fait ; tous les `route.ts` ont désormais `runtime`).

---

## Epic D — Cohérence des rôles (serveur & client)

**Objectif :** Éviter les comparaisons magiques `"admin"`, `"coach"` ; utiliser `resolveRole`, `hasAnyRole`, `USER_ROLES`.

- [x] **D.1** Revue des routes API : les comparaisons magiques restantes étaient surtout Discord + fallback session.
- [x] **D.2** `discord/send-message`, `discord/update-custom-message` : `resolveRole` + `hasAnyRole([ADMIN, COACH])`. `session/verify` : fallback rôle avec `USER_ROLES.PLAYER`.
- [x] **D.3** `useAuth` : `isAdmin` / `isCoach` / `isPlayer` via `USER_ROLES`.
- [x] **D.4** `AuthGuard` : carte `fallbackByRole` indexée par `USER_ROLES.*` (pas de changement des pages ; middleware/API déjà sur les mêmes littéraux).

---

## Epic E — Toolchain & configuration Next

### E.1 ESLint et build

- [x] **E.1.1** `eslint.ignoreDuringBuilds: false` ; politique documentée dans `docs/QUALITY_GATES.md`.
- [x] **E.1.2** `npm run check` vert (ESLint pendant `next build`).

### E.2 `next.config.ts`

- [x] **E.2.1** Bloc `env` avec fallbacks Firebase **supprimé** ; injection standard Next depuis `process.env` ; `.env.example` + `SECURITY.md` mis à jour.
- [x] **E.2.2** `productionBrowserSourceMaps: false` par défaut (réduit l’exposition du source client) ; commentaire dans `next.config.ts` pour réactivation ponctuelle / Sentry.
- [x] **E.2.3** Commentaires à jour sur `output: "standalone"` (App Hosting / image autonome) et `generateBuildId` (invalidation cache entre builds).

---

## Epic F — Rendu & performance (App Router)

**Objectif :** Ne pas sur-optimiser prématurément ; récupérer du cache Next là où c’est safe.

- [x] **F.1** Cartographier les segments qui **peuvent** être statiques ou partiellement mis en cache (pages publiques, assets).  
  _Constat :_ après `next build`, la majorité des routes `app/` sont en **○ Static** ; les routes `app/api/**` restent **ƒ Dynamic**. Pages utilisant `useSearchParams` : `login`, `reset-password`, `auth/verify-email` — isolées dans des client components enveloppés par `<Suspense>` dans le `page.tsx` serveur pour permettre le prérendu.
- [x] **F.2** Retrait de `export const dynamic = "force-dynamic"` et de `export const runtime = "nodejs"` du **layout racine** (`src/app/layout.tsx`). Ajustements Suspense côté auth pour éviter l’erreur de build « `useSearchParams` should be wrapped in a suspense boundary ».
- [ ] **F.3** Mesurer (Lighthouse / Web Vitals) avant/après sur 1–2 pages représentatives (ex. `/`, `/login`) une fois un baseline prod ou préprod disponible.

---

## Epic G — Qualité des composants React

### G.1 Découpage des « god components »

**Top 10 des fichiers les plus volumineux** (`src/**/*.ts`, `src/**/*.tsx`, mesure `wc -l`, mise à jour **2026-05-10**) :

| # | Lignes | Chemin (relatif à `src/`) |
|---|--------|---------------------------|
| 1 | 1429 | `app/compositions/_containers/CompositionsPageContainer.tsx` |
| 2 | 1266 | `lib/discord/poll-interactions.ts` |
| 3 | 1266 | `app/admin/page.tsx` |
| 4 | 1249 | `lib/shared/team-matches-sync.ts` |
| 5 | 1177 | `app/demo-theme/page.tsx` |
| 6 | 1097 | `app/joueurs/page.tsx` |
| 7 | 1062 | `app/compositions/_containers/DefaultCompositionsContainer.tsx` |
| 8 | 1015 | `app/disponibilites/page.tsx` |
| 9 | 846 | `components/disponibilites/DiscordPollManager.tsx` |
| 10 | 790 | `app/equipes/page.tsx` |

_Note :_ `team-matches-sync` inclut encore `TeamMatchesSyncService` ; les types/convertisseurs/sous-flux extraits sont dans `team-matches-sync-types.ts`, `team-matches-sync-fftt-converters.ts`, `team-matches-sync-journee.ts` et `team-matches-sync-save.ts`.

_Référence pour régénérer :_ `find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \| xargs -0 wc -l \| grep -v total \| sort -rn \| head -10`

**Fichiers volumineux historiques** (repérages anciens, composants démo ou retirés ; gardés pour contexte) :  
`AdvancedSettings`, `DiscordPollManager`, `NotificationCenter`, `SystemMaintenance`, `ThemeManager`, `ReportsManager`, `UserManagement`, `DataExportImport`, `AuditLogs`, `AppSettings`, `NotificationManager`, `GlobalStats`, `BackupRestore`, etc.

Pour chaque fichier (traiter par ordre métier / douleur) :

- [x] **G.1.1** `AdvancedSettings` — composant supprimé (non utilisé dans l’application)
- [x] **G.1.2** `DiscordPollManager` — extraction en modules (`discord-poll-manager/types|constants|utils`)
- [x] **G.1.3** `NotificationCenter` / `NotificationManager` — `NotificationCenter` supprimé (non utilisé) ; `NotificationManager` déjà factorisé
- [x] **G.1.4** `ThemeManager` — composant supprimé (non utilisé dans l’application)
- [x] **G.1.5** `ReportsManager` — composant supprimé (non utilisé dans l’application)
- [x] **G.1.6** `UserManagement` — composant supprimé (non utilisé dans l’application)
- [x] **G.1.7** `DataExportImport` — composant supprimé (non utilisé dans l’application)
- [x] **G.1.8** `AuditLogs` — composant supprimé (non utilisé dans l’application)
- [x] **G.1.9** `AppSettings` — composant supprimé (non utilisé dans l’application)
- [x] **G.1.10** `SystemMaintenance` — composant supprimé (non utilisé dans l’application)
- [~] **G.1.11** Autres fichiers > ~500 lignes restants (grep `wc -l`)  
  _Avancement :_ `DiscordPollManager` est conservé et découpé en modules dédiés (`components/disponibilites/discord-poll-manager/*`). `team-matches-sync.ts` : modules extraits (`team-matches-sync-types.ts`, `team-matches-sync-fftt-converters.ts`, `team-matches-sync-journee.ts`). `disponibilites/page.tsx` : calcul de dates Discord (`lib/availability/discord-poll-dates.ts`), carte filtres (`DisponibilitesFiltersCard`), onglets (`DisponibilitesAvailabilityTabs`). `AdvancedSettings`, `NotificationCenter`, `ReportsManager`, `SystemMaintenance`, `NotificationManager`, `ThemeManager`, `DataExportImport`, `AuditLogs`, `AppSettings`, `UserManagement`, `BackupRestore` et `GlobalStats` ont été retirés car non branchés dans l’app.

**Critère :** Fichier principal < ~400 lignes **ou** justification inline (composant purement présentationnel sans logique).

### G.2 Couche API client & hooks

- [ ] **G.2.1** Créer des modules `lib/api/*.ts` ou hooks `useXxx` pour centraliser `fetch` vers `/api/...`, erreurs typées, et `credentials: "include"` si nécessaire.
- [ ] **G.2.2** Migrer progressivement les plus gros consommateurs (admin, discord, compositions).

### G.3 Patterns React

- [ ] **G.3.1** Politique `React.FC` : soit migration vers fonctions `(props: Props) => JSX`, soit statu quo documenté.
- [ ] **G.3.2** `React.memo` : l’utiliser seulement après profilage ou sur listes lourdes identifiées.

---

## Epic H — Accessibilité (a11y)

- [ ] **H.1** Audit rapide des dialogs MUI (focus, escape, titres `aria-labelledby`).
- [ ] **H.2** Accordion / onglets custom (compositions, équipes) — roles et clavier.
- [ ] **H.3** Formulaires : labels explicites, messages d’erreur annoncés (où pertinent).

---

## Epic I — Tests

- [ ] **I.1** Tests d’intégration route handlers critiques : `session`, `admin/users`, `brulage/validate`, `discord` proxy (mocks).
- [ ] **I.2** Tests `middleware.ts` (redirects, rôles) si faisable avec `@edge-runtime` ou tests unitaires des fonctions extraites.
- [ ] **I.3** Tests RTL pour 2–3 flux UI critiques (login masqué par middleware — choisir composants isolables).
- [ ] **I.4** Vérifier que `coverageThreshold` Jest reste tenable ou ajuster avec justification dans `jest.config.js`.

---

## Epic J — Dette & observabilité

### J.1 Dépendances

- [ ] **J.1.1** Plan de migration **`react-beautiful-dnd`** vers une lib maintenue (ex. `@hello-pangea/dnd` ou Pragmatic drag-and-drop) — spike + estimation.

### J.2 Logs

- [ ] **J.2.1** Passer les `console.log` / `console.error` des `route.ts` en logs conditionnels (`NODE_ENV`, `DEBUG`) conformément aux règles projet.
- [ ] **J.2.2** Éviter données sensibles dans les logs (emails, tokens).

---

## Epic K — Documentation & gouvernance

- [ ] **K.1** Mettre à jour `docs/SECURITY.md` avec : CSRF, exceptions, rate limits, cache.
- [ ] **K.2** Si pertinent, ajouter une section dans `.cursorrules` ou `docs/QUALITY_GATES.md` pointant vers ce plan **ou** vers la doc sécurité consolidée.
- [ ] **K.3** Clôturer ce document : quand toutes les cases P0–P2 sont cochées, archiver ou créer `AUDIT_NEXTJS_REACT_ACTION_PLAN_ARCHIVE.md` avec date de fin.

---

## Vérification finale (gate de clôture audit)

- [ ] **V.1** `npm run check` vert sur `main` (ou branche release).
- [ ] **V.2** `npm run smoke:web` OK si disponible.
- [ ] **V.3** Revue manuelle : tableau des routes API à jour (optionnel : export OpenAPI régénéré / vérifié).
- [ ] **V.4** Revue sécurité rapide (CSRF + cache + rôles) par un second dev.

---

## Historique des mises à jour (changelog du plan)

| Date | Auteur | Changement |
|------|--------|------------|
| 2026-05-09 | — | Création initiale à partir des audits phase 1 et 2 |
| 2026-05-09 | — | Epic A complété : CSRF sur routes listées, rate limiting session / Discord / admin sync / discord config, doc `SECURITY.md`, helpers HTTP |
| 2026-05-09 | — | Epic B complété : `lib/http/cache-headers`, `withAuth` + toutes les routes `app/api` en `jsonNoStore` / `applyNoStoreHeaders`, doc `SECURITY.md` |
| 2026-05-09 | — | Epic C complété : `export const runtime = "nodejs"` sur les 14 routes restantes ; tous les `app/api/**/route.ts` ont l’export |
| 2026-05-09 | — | Epic D complété : rôles Discord API + session/verify + `useAuth` + `AuthGuard` alignés sur `USER_ROLES` / helpers |
| 2026-05-09 | — | Epic E complété : ESLint dans `next build`, retrait fallbacks Firebase dans next.config, source maps prod désactivées, doc QUALITY_GATES + SECURITY |
| 2026-05-09 | — | Epic F — F.1/F.2 : retrait `force-dynamic` / `runtime` du layout racine ; `LoginContent`, `ResetPasswordContent`, `VerifyEmailContent` + Suspense sur les pages correspondantes ; build statique OK pour les segments concernés |
| 2026-05-09 | — | Epic G (lot 1) : `GlobalStats` découpé en sous-composants (`global-stats/*`) sans changement fonctionnel |
| 2026-05-09 | — | Epic G (lot 2) : `BackupRestore` découpé en modules (`backup-restore/*`) pour isoler table, dialogs, types et utilitaires |
| 2026-05-09 | — | Epic G (lot 3) : `UserManagement` découpé en modules (`user-management/*`) pour isoler table utilisateurs, formulaires, permissions, constantes et types |
| 2026-05-09 | — | Epic G (lot 4) : `DataExportImport` factorisé en types/constantes/utilitaires (`data-export-import/*`) avec composant principal recentré |
| 2026-05-09 | — | Epic G (lot 5) : `AuditLogs` factorisé en types/constantes/utilitaires (`audit-logs/*`) avec composant principal simplifié |
| 2026-05-09 | — | Epic G (lot 6) : `AppSettings` factorisé en types/constantes/utilitaires (`app-settings/*`) avec composants et actions simplifiés |
| 2026-05-09 | — | Epic G (lot 7) : `NotificationManager` factorisé en types/constantes/utilitaires (`notification-manager/*`) avec composant principal simplifié |
| 2026-05-09 | — | Epic G (lot 8) : `ThemeManager` factorisé en types/constantes/utilitaires (`theme-manager/*`) avec composant principal simplifié |
| 2026-05-09 | — | Epic G (lot 9) : `DiscordPollManager` factorisé en modules (`disponibilites/discord-poll-manager/*`) pour centraliser types/constantes/utilitaires |
| 2026-05-09 | — | Epic G (lot 10) : `DiscordPollManager` simplifié (extraction du composant `MentionSuggestions` et mutualisation de la logique d’autocomplete des mentions) |
| 2026-05-09 | — | Epic G (cleanup) : suppression des composants non utilisés `AdvancedSettings`, `NotificationCenter`, `ReportsManager`, `SystemMaintenance` |
| 2026-05-09 | — | Epic G (cleanup 2) : suppression des composants non utilisés `NotificationManager`, `ThemeManager`, `DataExportImport`, `AuditLogs`, `AppSettings` et de leurs modules associés |
| 2026-05-09 | — | Epic G (cleanup 3) : suppression des composants non utilisés `UserManagement`, `BackupRestore`, `GlobalStats`, `TeamManager`, `MatchHistoryManager`, `BurnoutRulesManager` et des modules associés |
| 2026-05-09 | — | Epic G (lot 11) : extraction des dialogs `CreatePollDialog` / `ClosePollDialog` pour alléger `DiscordPollManager` |
| 2026-05-09 | — | Epic G (lot 12) : extraction de `MentionMessageField` pour mutualiser l’édition + autocomplete des mentions dans `DiscordPollManager` |
| 2026-05-09 | — | Epic G (lot 13) : `validators/index.ts` découpé en modules (`validators/types`, `team-utils`, `burnout-utils`, `paris-rules`) avec API publique conservée |
| 2026-05-09 | — | Epic G (lot 14) : `api/discord/interactions/route.ts` découpé en modules (`types`, `signature`, `command-handlers`, `component-handlers`) avec flux API conservé |
| 2026-05-09 | — | Epic G (lot 15) : `lib/discord/poll-interactions.ts` allégé via extraction `poll-interactions-types` et `poll-interactions-helpers` (sélection, lookup joueur, état poll, patch message éphémère) |
| 2026-05-09 | — | Epic G (lot 16) : `CompositionsPageContainer` allégé via extraction de `MentionSuggestions` (`components/compositions`) et des helpers de formatage (`lib/compositions/display-formatters`) |
| 2026-05-09 | — | Epic G (lot 17) : extraction du formatage de message Discord de `CompositionsPageContainer` vers `lib/compositions/discord-message` (`buildDiscordMatchInfo`) |
| 2026-05-09 | — | Epic G (lot 18) : extraction du flux d’envoi Discord depuis `CompositionsPageContainer` vers `lib/compositions/discord-send` (`sendDiscordMessage`, `buildSentStatusUpdate`) |
| 2026-05-09 | — | Epic G (lot 19) : extraction de la persistance/debounce des messages personnalisés depuis `CompositionsPageContainer` vers `lib/compositions/custom-message` (`persistCustomMessage`, `scheduleDebouncedTeamSave`) |
| 2026-05-09 | — | Epic G (lot 20) : extraction de la logique d’autocomplete des mentions depuis `CompositionsPageContainer` vers `lib/compositions/mention-autocomplete` (`computeMentionAutocompleteState`, `filterMentionMembers`, `isMentionNavigationKey`) |
| 2026-05-09 | — | Epic G (lot 21) : extraction de l’UI/événements du champ message personnalisé (`CustomMessageField`) + mutualisation de `onBlur` via callback partagé dans `CompositionsPageContainer` |
| 2026-05-09 | — | Epic G (lot 22) : extraction de la carte message Discord (`DiscordMatchMessageCard`) pour supprimer la duplication masculin/féminin dans `CompositionsPageContainer` |
| 2026-05-09 | — | Epic G (lot 23) : mutualisation de `renderPlayerIndicators` dans `CompositionsPageContainer` (règles chips/brûlage/disponibilité/Discord partagées entre onglets) |
| 2026-05-09 | — | Epic G (lot 24) : mutualisation de `additionalHeader` de `TeamCompositionCard` via `renderTeamCardHeader` dans `CompositionsPageContainer` |
| 2026-05-09 | — | Epic G (lot 25) : extraction d’un renderer de ligne équipe `renderTeamRow` dans `CompositionsPageContainer` pour supprimer la duplication complète des blocs masculin/féminin |
| 2026-05-09 | — | Epic G (lot 26) : extraction des métriques `CompositionsSummary` (`discordMessagesSent/Total`) via `useMemo` dédiés pour éviter le calcul dupliqué inline |
| 2026-05-09 | — | Epic G (lot 27) : extraction du rendu d’un joueur disponible vers `components/compositions/AvailablePlayerListItem` pour alléger le `renderPlayerItem` inline |
| 2026-05-09 | — | Epic G (lot 28) : extraction de la génération des options de journée vers `journeeMenuOptions` (`useMemo`) pour simplifier le `Select` |
| 2026-05-09 | — | Epic G (lot 29) : mutualisation du contenu des onglets équipes via `renderTeamsTabContent` pour factoriser états vides + mapping des lignes |
| 2026-05-09 | — | Epic G (lot 30) : extraction du bloc filtres (`épreuve/phase/journée`) vers `components/compositions/CompositionsFiltersCard` |
| 2026-05-09 | — | Epic G (lot 31) : extraction du bloc d’état vide de sélection vers `components/compositions/SelectionPromptCard` |
| 2026-05-09 | — | Epic G (lot 32) : extraction de l’en-tête de page vers `components/compositions/CompositionsHeader` |
| 2026-05-09 | — | Epic G (lot 33) : extraction de la barre d’actions vers `components/compositions/CompositionsActionsBar` |
| 2026-05-09 | — | Epic G (lot 34) : stabilisation des derniers inlines via callbacks/derivations dédiés (`renderAvailablePlayerItem`, équipes masculines affichées, garde de rendu principal) |
| 2026-05-09 | — | Epic G (lot 35) : extraction du bloc `CompositionsSummary + TabPanel` vers `components/compositions/CompositionsSummaryTabs` |
| 2026-05-09 | — | Epic G (lot 36) : extraction du workspace principal (TeamPicker + layout panneaux) vers `components/compositions/CompositionsWorkspace` |
| 2026-05-09 | — | Epic G (lot 37) : extraction du panneau joueurs disponibles vers `components/compositions/AvailablePlayersSection` |
| 2026-05-09 | — | Epic G (lot 38) : extraction du flux dialog de renvoi Discord vers `components/compositions/dialogs/CompositionsResendDialog` + callbacks dédiés |
| 2026-05-09 | — | Epic G (lot 39) : extraction des opérations batch reset/copie des compositions vers `lib/compositions/composition-batch-operations` |
| 2026-05-09 | — | Epic G (lot 40) : extraction du rendu d’une ligne équipe (carte + indicateurs + panneau Discord) vers `components/compositions/TeamCompositionRow` |
| 2026-05-09 | — | Epic G (lot 41) : extraction de la logique d’assignation drag/drop + suppression joueur vers `hooks/useCompositionAssignments` |
| 2026-05-09 | — | Epic G (lot 42) : extraction de la synchro realtime disponibilités/compositions + joueurs disponibles vers `hooks/useCompositionsRealtimeSync` |
| 2026-05-09 | — | Epic G (lot 43) : extraction des chargements statiques (`locations`, `discord channels`) et des defaults vers `hooks/useCompositionsStaticData` et `hooks/useDefaultCompositions` |
| 2026-05-09 | — | Epic G (lot 44) : mutualisation de `DefaultCompositionsContainer` avec les briques partagées (`useDefaultCompositions`, `AvailablePlayerListItem` + chips d’éligibilité optionnels) |
| 2026-05-09 | — | Epic G (lot 45) : extraction de la logique métier d’assignation/suppression + drag&drop des compos par défaut vers `hooks/useDefaultCompositionAssignments` |
| 2026-05-09 | — | Epic G (lot 46) : extraction du moteur de filtres joueurs (source par onglet + critères recherche/champs/Discord) vers `lib/players/player-filters` pour mutualiser `getFilteredCountForTab` et `filterPlayers` |
| 2026-05-10 | — | Epic G (lot 47) : mutualisation du recalcul des listes filtrées de `joueurs/page.tsx` via `recomputeFilteredPlayersFromLists` (post-update / post-toggle participation) pour supprimer la duplication |
| 2026-05-10 | — | Epic G (lot 48) : extraction du flux CRUD/dialogs joueurs (check licence, create/edit/update/delete, états d’action/formulaire) vers `hooks/useJoueursCrud` |
| 2026-05-10 | — | Epic G (lot 49) : mutualisation du toggle fauteuil dans `joueurs/page.tsx` via `handleToggleWheelchair` (suppression de 3 blocs dupliqués de mise à jour optimiste + rollback) |
| 2026-05-10 | — | Epic G (lot 50) : mutualisation des tableaux “sans licence” + “temporaires” via `components/players/PlayersBasicTable` (colonnes/actions configurables) |
| 2026-05-10 | — | Epic G (lot 51) : extraction du tableau “joueurs actifs” (incluant colonnes de brûlage) vers `components/players/PlayersActiveTable` pour réduire la duplication inter-onglets |
| 2026-05-10 | — | Epic G (lot 52) : extraction de l’autocomplete de mentions Discord des dialogs joueur vers `components/players/DiscordMentionsAutocomplete` pour supprimer la duplication create/edit |
| 2026-05-10 | — | Epic G (lot 53) : mutualisation des deux sections de configuration Discord admin (Paris/Équipes) via `components/admin/DiscordAvailabilitySection` (channel + mention autocomplete partagés) |
| 2026-05-10 | — | Epic G (lot 54) : extraction des cartes de synchronisation FFTT (joueurs/équipes/matchs) vers `components/admin/SyncOperationCard` pour factoriser métriques/statut/action |
| 2026-05-10 | — | Epic G (lot 55) : extraction du tableau “Tous les utilisateurs” vers `components/admin/UsersManagementTable` (avatar, rôle éditable, statuts email/demande coach) |
| 2026-05-10 | — | Epic G (lot 56) : extraction du bloc “Demandes de droits coach” vers `components/admin/CoachRequestsSection` ; `admin/page.tsx` descend sous 1500 lignes |
| 2026-05-10 | — | Docs : actualisation du **top 10** des plus gros fichiers `.ts` / `.tsx` sous `src/` (section Epic G.1, mesure `wc -l`) |
| 2026-05-10 | — | Epic G (lot 57) : extraction des types (`team-matches-sync-types.ts`) et convertisseurs FFTT (`team-matches-sync-fftt-converters.ts`) depuis `lib/shared/team-matches-sync.ts` ; ré-exports inchangés depuis le fichier principal |
| 2026-05-10 | — | Epic G (lot 58) : extraction du helper de calcul des dates de sondage Discord depuis `disponibilites/page.tsx` vers `lib/availability/discord-poll-dates.ts` |
| 2026-05-10 | — | Epic G (lot 59) : extraction du recalcul des journées (`recalculateJourneesByDate`) depuis `lib/shared/team-matches-sync.ts` vers `lib/shared/team-matches-sync-journee.ts` |
| 2026-05-10 | — | Epic G (lot 60) : extraction depuis `disponibilites/page.tsx` vers `DisponibilitesFiltersCard` + `DisponibilitesAvailabilityTabs` ; mise à jour du top 10 |
| 2026-05-10 | — | Epic G (lot 61) : extraction de `PlayerList` hors `disponibilites/page.tsx` vers `components/disponibilites/PlayerAvailabilityList` (incluant `isPlayerRegistered`) |
| 2026-05-10 | — | Epic G (lot 62) : extraction du flux de sauvegarde Firestore des matchs depuis `lib/shared/team-matches-sync.ts` vers `lib/shared/team-matches-sync-save.ts` |
| 2026-05-10 | — | Epic G (lot 63) : extraction de la logique de confirmation reset/apply defaults de `CompositionsPageContainer.tsx` vers `hooks/useCompositionsConfirmationDialog` (suppression du double appel `onConfirm`) |
| 2026-05-10 | — | Epic G (lot 64) : extraction de la section de gestion des lieux d’`admin/page.tsx` vers `components/admin/LocationsManagementSection` ; mise à jour du top 10 |
| 2026-05-10 | — | Epic G (lot 65) : extraction du flux d’enrichissement joueurs SQY (`extractClubIdFromLien`, `enrichSQYPlayersFromClub`) de `lib/shared/team-matches-sync.ts` vers `lib/shared/team-matches-sync-enrichment.ts` |

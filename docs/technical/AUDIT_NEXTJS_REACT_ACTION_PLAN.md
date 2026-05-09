# Plan d’action — Audit Next.js / API / React (suivi)

Ce document consolide les constats des audits **phase 1** (qualité globale Next.js, sécurité, perf, tests) et **phase 2** (matrice des routes API + qualité des composants React). Il sert de **backlog traçable** : cocher les cases au fil des PR / merges.

**Dernière mise à jour :** 2026-05-09 (Epic B)  
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
| C | `export const runtime = "nodejs"` sur routes concernées | P1 |
| D | Cohérence des rôles (`resolveRole`, `hasAnyRole`, `USER_ROLES`) | P1 |
| E | Toolchain : ESLint vs build, config Next (`next.config.ts`) | P2 |
| F | Stratégie rendu : réduction du `force-dynamic` global si pertinent | P2 |
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

- [ ] **C.1.1** `admin/sync-status`
- [ ] **C.1.2** `admin/users` (+ sous-routes si besoin)
- [ ] **C.1.3** `admin/users/coach-request`
- [ ] **C.1.4** `admin/users/set-role`
- [ ] **C.1.5** `brulage/validate`
- [ ] **C.1.6** `coach/request`
- [ ] **C.1.7** `discord/link-license`
- [ ] **C.1.8** `discord/members`
- [ ] **C.1.9** `discord/send-message`
- [ ] **C.1.10** `discord/update-custom-message`
- [ ] **C.1.11** `fftt/players`
- [ ] **C.1.12** `openapi` (si reste sur Node — sinon documenter)
- [ ] **C.1.13** `teams/[teamId]/discord-channel`
- [ ] **C.1.14** `teams/[teamId]/location`
- [ ] **C.1.15** `teams/matches`

- [ ] **C.2** Script ou checklist CI : optionnel — grep pour `firebase-admin` / `getFirestore` dans `route.ts` sans `runtime` (à discuter).

---

## Epic D — Cohérence des rôles (serveur & client)

**Objectif :** Éviter les comparaisons magiques `"admin"`, `"coach"` ; utiliser `resolveRole`, `hasAnyRole`, `USER_ROLES`.

- [ ] **D.1** Passer en revue **toutes** les routes API qui lisent `decoded.role` ou équivalent.
- [ ] **D.2** Corriger les fichiers identifiés (ex. `discord/send-message`, `discord/update-custom-message`, autres grep `role !==` / `===`).
- [ ] **D.3** Côté client : `useAuth` (`isAdmin`, `isCoach`, etc.) — aligner sur les constantes / types partagés si possible.
- [ ] **D.4** Vérifier alignement **AuthGuard** (`allowedRoles`) vs routes API pour les pages modifiées (règle projet).

---

## Epic E — Toolchain & configuration Next

### E.1 ESLint et build

- [ ] **E.1.1** Décider : `eslint.ignoreDuringBuilds: false` dans `next.config.ts` **ou** politique explicite « le build CI utilise `npm run check` » — documenter dans `docs/QUALITY_GATES.md`.
- [ ] **E.1.2** Si passage à `false`, corriger toutes les erreurs ESLint bloquantes puis valider `npm run check`.

### E.2 `next.config.ts`

- [ ] **E.2.1** **Fallbacks Firebase** : retirer ou isoler les valeurs par défaut ; utiliser variables d’environnement obligatoires en CI / App Hosting ; documenter pour dev local.
- [ ] **E.2.2** **`productionBrowserSourceMaps`** : décision produit / sécurité — garder, désactiver, ou activer seulement sur branches / sentry ; documenter.
- [ ] **E.2.3** Commentaire sur `generateBuildId` / `standalone` : vérifier qu’ils restent justifiés avec la stratégie de déploiement actuelle.

---

## Epic F — Rendu & performance (App Router)

**Objectif :** Ne pas sur-optimiser prématurément ; récupérer du cache Next là où c’est safe.

- [ ] **F.1** Cartographier les segments qui **peuvent** être statiques ou partiellement mis en cache (pages publiques, assets).
- [ ] **F.2** Envisager de retirer `export const dynamic = "force-dynamic"` du **layout racine** si possible, et le pousser sur les segments qui posent problème (MUI/Firebase).
- [ ] **F.3** Mesurer (Lighthouse / Web Vitals) avant/après sur 1–2 pages représentatives.

---

## Epic G — Qualité des composants React

### G.1 Découpage des « god components »

**Fichiers volumineux repérés (ordre de grandeur 800–1600+ lignes) :**  
`AdvancedSettings`, `DiscordPollManager`, `NotificationCenter`, `SystemMaintenance`, `ThemeManager`, `ReportsManager`, `UserManagement`, `DataExportImport`, `AuditLogs`, `AppSettings`, `NotificationManager`, `GlobalStats`, `BackupRestore`, etc.

Pour chaque fichier (traiter par ordre métier / douleur) :

- [ ] **G.1.1** `AdvancedSettings` — extraire sous-composants + hooks
- [ ] **G.1.2** `DiscordPollManager` — idem
- [ ] **G.1.3** `NotificationCenter` / `NotificationManager` — mutualiser logique commune si duplication
- [ ] **G.1.4** `ThemeManager`
- [ ] **G.1.5** `ReportsManager`
- [ ] **G.1.6** `UserManagement`
- [ ] **G.1.7** `DataExportImport`
- [ ] **G.1.8** `AuditLogs`
- [ ] **G.1.9** `AppSettings`
- [ ] **G.1.10** `SystemMaintenance`
- [ ] **G.1.11** Autres fichiers > ~500 lignes restants (grep `wc -l`)

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

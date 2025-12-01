# Audit des routes API - Répertoires vides et utilisation

## Date de l'audit
2024-12-19

## Résumé

- **30 routes API** trouvées
- **2 répertoires vides** identifiés
- **Toutes les routes sont utilisées** (directement ou indirectement)

---

## Répertoires vides

### 1. `admin/check-match/[rencontreId]/`
**Chemin complet** : `src/app/api/admin/check-match/[rencontreId]/`

**Statut** : ❌ Répertoire vide (pas de `route.ts`)

**Action recommandée** : 
- Si cette route est prévue pour le futur, laisser le répertoire en place
- Si elle n'est plus nécessaire, supprimer le répertoire

**Note** : Le répertoire parent `admin/check-match/` existe mais ne contient que le sous-répertoire dynamique vide.

---

### 2. `admin/health/`
**Chemin complet** : `src/app/api/admin/health/`

**Statut** : ❌ Répertoire vide (pas de `route.ts`)

**Action recommandée** : 
- Supprimer ce répertoire car il y a déjà une route `/api/health` à la racine
- La route `/api/health` est utilisée pour les health checks généraux

---

## Routes API et leur utilisation

### Routes utilisées directement via `fetch()`

#### Authentification
- ✅ `/api/session` - Utilisé dans `login/page.tsx`, `useAuth.tsx`
- ✅ `/api/session/verify` - Utilisé dans `useAuth.tsx`
- ✅ `/api/session/firebase-token` - Utilisé dans `FirebaseAuthRestorer.tsx`
- ✅ `/api/auth/send-verification` - Utilisé dans `login/page.tsx`, `signup/page.tsx`, `resend-verification/page.tsx`
- ✅ `/api/auth/send-password-reset` - Utilisé dans `reset/page.tsx`

#### Admin
- ✅ `/api/admin/sync-status` - Utilisé dans `admin/page.tsx`
- ✅ `/api/admin/sync-players` - Utilisé dans `admin/page.tsx`
- ✅ `/api/admin/sync-teams` - Utilisé dans `admin/page.tsx`
- ✅ `/api/admin/sync-team-matches` - Utilisé dans `admin/page.tsx`
- ✅ `/api/admin/users` - Utilisé dans `admin/page.tsx`
- ✅ `/api/admin/users/coach-request` - Utilisé dans `admin/page.tsx`
- ✅ `/api/admin/users/set-role` - Utilisé dans `admin/page.tsx`
- ✅ `/api/admin/locations` - Utilisé dans `admin/page.tsx`, `equipes/page.tsx`, `compositions/page.tsx`

#### Teams
- ✅ `/api/teams` - Utilisé dans `useTeams.ts`, `useEquipesWithMatchesTest.ts`
- ✅ `/api/teams/matches` - Utilisé dans `useEquipesWithMatches.ts`
- ✅ `/api/teams/[teamId]/matches` - Utilisé dans `useTeamMatches.ts`
- ✅ `/api/teams/[teamId]/discord-channel` - Utilisé dans `equipes/page.tsx`
- ✅ `/api/teams/[teamId]/location` - Utilisé dans `equipes/page.tsx`

#### Discord
- ✅ `/api/discord/channels` - Utilisé dans `equipes/page.tsx`, `compositions/page.tsx`
- ✅ `/api/discord/members` - Utilisé dans `joueurs/page.tsx`, `compositions/page.tsx`, `compositions/defaults/page.tsx`
- ✅ `/api/discord/send-message` - Utilisé dans `compositions/page.tsx`
- ✅ `/api/discord/check-message-sent` - Utilisé dans `compositions/page.tsx`
- ✅ `/api/discord/update-custom-message` - Utilisé dans `compositions/page.tsx`
- ✅ `/api/discord/interactions` - **Webhook Discord** (appelé par Discord, pas par le frontend)
- ✅ `/api/discord/link-license` - **Webhook Discord** (appelé par Discord via webhook)

#### Autres
- ✅ `/api/coach/request` - Utilisé dans `joueur/page.tsx`
- ✅ `/api/fftt/players` - Utilisé dans `useFFTTPlayers.ts`
- ✅ `/api/players` - Utilisé dans `usePlayers.ts`
- ✅ `/api/openapi` - Utilisé dans `swagger/page.tsx` (SwaggerUI)
- ✅ `/api/health` - Route de health check (peut être appelée par des outils de monitoring)

### Routes utilisées indirectement

#### Brûlage
- ❌ `/api/brulage/validate` - **SUPPRIMÉE** (non utilisée dans le frontend, validation faite côté client)

---

## Routes webhook (appelées par des services externes)

Ces routes ne sont pas appelées par le frontend mais par des services externes :

1. **`/api/discord/interactions`**
   - Appelée par Discord pour les interactions (slash commands, etc.)
   - Authentification via signature Ed25519
   - **Ne pas supprimer**

2. **`/api/discord/link-license`**
   - Appelée par Discord via webhook pour lier un compte Discord à une licence
   - Authentification via secret partagé (`DISCORD_WEBHOOK_SECRET`)
   - **Ne pas supprimer**

---

## Recommandations

### Répertoires à supprimer

1. **`admin/health/`** - Dupliqué avec `/api/health`
   ```bash
   rm -rf src/app/api/admin/health
   ```

2. **`admin/check-match/[rencontreId]/`** - Répertoire vide, pas de route définie
   ```bash
   rm -rf src/app/api/admin/check-match
   ```
   **⚠️ Attention** : Vérifier avant de supprimer si cette route est prévue pour le futur

### Routes supprimées

1. **`/api/brulage/validate`**
   - ❌ Supprimée car non utilisée dans le frontend
   - La validation est faite côté client dans `src/lib/compositions/validation.ts`
   - Le service `BrulageService` reste disponible pour les tests si nécessaire

---

## Statistiques

- **Total routes** : 29 (30 - 1 supprimée)
- **Routes utilisées directement** : 28
- **Routes webhook (externes)** : 2
- **Routes supprimées** : 1 (`/api/brulage/validate`)
- **Répertoires vides** : 2

---

## Actions à prendre

### Immédiat
1. ✅ Supprimer `admin/health/` (dupliqué)
2. ⚠️ Vérifier `admin/check-match/[rencontreId]/` avant suppression

### Supprimé
1. ✅ `/api/brulage/validate` - **Supprimée** (non utilisée, validation côté client)

---

## Notes

- ✅ Toutes les routes principales sont bien utilisées
- ✅ Les routes webhook Discord sont correctement configurées
- ✅ La documentation OpenAPI est à jour
- ✅ La route `/api/brulage/validate` est utilisée dans les tests
- ⚠️ 2 répertoires vides identifiés (à supprimer après validation)


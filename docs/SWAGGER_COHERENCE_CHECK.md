# Vérification de cohérence Swagger / Routes API réelles

## Routes documentées dans OpenAPI

1. `/api/auth/send-verification` ✅
2. `/api/auth/send-password-reset` ✅
3. `/api/session` (POST, DELETE) ✅
4. `/api/session/verify` ✅
5. `/api/admin/users` ✅
6. `/api/admin/users/set-role` ✅
7. `/api/admin/users/coach-request` ✅
8. `/api/admin/sync-status` ✅
9. `/api/admin/sync-players` ✅
10. `/api/admin/sync-teams` ✅
11. `/api/admin/sync-team-matches` ✅
12. `/api/coach/request` ✅
13. `/api/fftt/players` ✅
14. `/api/teams` ✅
15. `/api/teams/matches` ✅
16. `/api/teams/{teamId}/matches` ✅

## Routes réelles trouvées (29 routes)

### Routes documentées (16)

1. ✅ `/api/auth/send-verification`
2. ✅ `/api/auth/send-password-reset`
3. ✅ `/api/session`
4. ✅ `/api/session/verify`
5. ✅ `/api/admin/users`
6. ✅ `/api/admin/users/set-role`
7. ✅ `/api/admin/users/coach-request`
8. ✅ `/api/admin/sync-status`
9. ✅ `/api/admin/sync-players`
10. ✅ `/api/admin/sync-teams`
11. ✅ `/api/admin/sync-team-matches`
12. ✅ `/api/coach/request`
13. ✅ `/api/fftt/players`
14. ✅ `/api/teams`
15. ✅ `/api/teams/matches`
16. ✅ `/api/teams/{teamId}/matches`

### Routes NON documentées (13)

#### Admin

1. ❌ `/api/admin/locations` (GET, POST, DELETE)

#### Session

2. ❌ `/api/session/firebase-token` (POST) - Route interne pour Firebase Auth

#### Teams

3. ❌ `/api/teams/{teamId}/location` (PATCH)
4. ❌ `/api/teams/{teamId}/discord-channel` (PATCH)

#### Discord

5. ❌ `/api/discord/channels` (GET)
6. ❌ `/api/discord/members` (GET)
7. ❌ `/api/discord/send-message` (POST)
8. ❌ `/api/discord/check-message-sent` (GET)
9. ❌ `/api/discord/update-custom-message` (POST)
10. ❌ `/api/discord/interactions` (POST) - Webhook Discord (signature Ed25519)
11. ❌ `/api/discord/link-license` (POST) - Webhook Discord (secret partagé)

#### Autres

12. ❌ `/api/health` (GET) - Health check
13. ❌ `/api/openapi` (GET) - Route de documentation elle-même

## Analyse

### Routes à documenter (recommandé)

#### Routes publiques/utilisées

1. **`/api/admin/locations`** - Gestion des lieux (GET, POST, DELETE)

   - Utilisée dans plusieurs pages (admin, équipes, compositions)
   - Devrait être documentée

2. **`/api/teams/{teamId}/location`** - Mise à jour du lieu d'une équipe (PATCH)

   - Utilisée dans la page équipes
   - Devrait être documentée

3. **`/api/teams/{teamId}/discord-channel`** - Mise à jour du canal Discord (PATCH)

   - Utilisée dans la page équipes
   - Devrait être documentée

4. **`/api/discord/channels`** - Liste des canaux Discord (GET)

   - Utilisée dans les pages compositions et équipes
   - Devrait être documentée

5. **`/api/discord/members`** - Liste des membres Discord (GET)

   - Utilisée dans les pages compositions et joueurs
   - Devrait être documentée

6. **`/api/discord/send-message`** - Envoi de message Discord (POST)

   - Utilisée dans la page compositions
   - Devrait être documentée

7. **`/api/discord/check-message-sent`** - Vérification d'envoi (GET)

   - Utilisée dans la page compositions
   - Devrait être documentée

8. **`/api/discord/update-custom-message`** - Mise à jour message personnalisé (POST)
   - Utilisée dans la page compositions
   - Devrait être documentée

### Routes à ne PAS documenter (justifié)

1. **`/api/session/firebase-token`** - Route interne

   - Utilisée uniquement par `FirebaseAuthRestorer.tsx`
   - Route technique, pas besoin de documentation publique

2. **`/api/discord/interactions`** - Webhook Discord

   - Appelée par Discord, pas par le frontend
   - Authentification via signature Ed25519
   - Peut être documentée mais marquée comme webhook externe

3. **`/api/discord/link-license`** - Webhook Discord

   - Appelée par Discord via webhook
   - Authentification via secret partagé
   - Peut être documentée mais marquée comme webhook externe

4. **`/api/health`** - Health check

   - Route de monitoring
   - Optionnel : peut être documentée simplement

5. **`/api/openapi`** - Route de documentation
   - Auto-référentielle
   - Ne doit pas être documentée (ou marquée comme méta-route)

## Recommandations

### Priorité haute (à documenter)

1. `/api/admin/locations`
2. `/api/teams/{teamId}/location`
3. `/api/teams/{teamId}/discord-channel`
4. `/api/discord/channels`
5. `/api/discord/members`
6. `/api/discord/send-message`
7. `/api/discord/check-message-sent`
8. `/api/discord/update-custom-message`

### Priorité moyenne (optionnel)

1. `/api/discord/interactions` (webhook)
2. `/api/discord/link-license` (webhook)
3. `/api/health` (health check)

### Ne pas documenter

1. `/api/session/firebase-token` (route interne)
2. `/api/openapi` (route méta)

## Résumé

- **24 routes documentées** ✅ (16 existantes + 8 nouvelles)
- **5 routes non documentées** ❌
  - **3 routes optionnelles** (webhooks, health check)
  - **2 routes à ne pas documenter** (internes/méta)

**Cohérence actuelle** : ~83% (24/29 routes documentées)

## ✅ Mise à jour effectuée

Toutes les routes prioritaires ont été documentées dans `openapi.ts` :

1. ✅ `/api/admin/locations` (GET, POST, DELETE)
2. ✅ `/api/teams/{teamId}/location` (PATCH)
3. ✅ `/api/teams/{teamId}/discord-channel` (PATCH)
4. ✅ `/api/discord/channels` (GET)
5. ✅ `/api/discord/members` (GET)
6. ✅ `/api/discord/send-message` (POST)
7. ✅ `/api/discord/check-message-sent` (GET)
8. ✅ `/api/discord/update-custom-message` (POST)

### Corrections apportées aux routes existantes

1. ✅ `/api/session` POST - Ajout des codes de réponse 401 et schéma de réponse
2. ✅ `/api/session` DELETE - Ajout du schéma de réponse
3. ✅ `/api/teams` GET - Ajout de security et schéma de réponse détaillé
4. ✅ `/api/teams/matches` GET - Ajout du schéma de réponse détaillé
5. ✅ `/api/teams/{teamId}/matches` GET - Ajout de security et schéma de réponse détaillé
6. ✅ `/api/fftt/players` GET - Correction du paramètre clubCode (requis) et ajout du schéma de réponse

# Analyse des Middlewares API

## État actuel

### Middlewares existants
- ✅ `requireAuth` - Authentification de base avec support des rôles et option `requireEmailVerified`
- ✅ `requireAdmin` - Wrapper pour ADMIN uniquement
- ✅ `requireAdminOrCoach` - Wrapper pour ADMIN ou COACH avec option `requireEmailVerified`
- ✅ `requireAdminWithEmailVerified` - Wrapper pour ADMIN avec email vérifié obligatoire
- ✅ `withRateLimit` - Middleware de rate limiting

### Utilisation actuelle

**Routes utilisant les middlewares (28 routes)** :
- Toutes les routes admin (sync-*, users, locations)
- Routes discord (channels, members, send-message, etc.)
- Routes teams
- Routes brulage, coach/request

**Routes n'utilisant PAS les middlewares (2 routes - normal)** :
- `/api/session` (POST, DELETE) - Gère la création/suppression de session
- `/api/session/verify` (GET) - Vérifie la session (peut retourner null)

Ces routes sont spéciales car elles gèrent la session elle-même, donc elles ne peuvent pas utiliser `requireAuth` (sinon boucle infinie).

## Améliorations réalisées

### ✅ 1. Vérification d'email vérifié

**Routes mises à jour (6 routes)** :
- `teams/route.ts` (GET) - Utilise `requireAdminOrCoach(req, true)`
- `teams/[teamId]/matches/route.ts` (GET) - Utilise `requireAuth(req, { requireEmailVerified: true })`
- `discord/channels/route.ts` (GET) - Utilise `requireAdminOrCoach(req, true)`
- `discord/check-message-sent/route.ts` (GET) - Utilise `requireAdminOrCoach(req, true)`
- `admin/locations/route.ts` (GET, POST, DELETE) - Utilise `requireAdminWithEmailVerified(req)`

**Bénéfice** : Élimination de 6 vérifications manuelles répétées, code plus DRY.

### ✅ 2. Middleware de rate limiting

**Créé** : `withRateLimit` dans `src/lib/api/rate-limit-middleware.ts`

**Utilisation** :
```typescript
const rateLimitError = withRateLimit({
  key: `email:${email}`,
  maxRequests: 3,
  windowMs: 15 * 60 * 1000,
});
if (rateLimitError) return rateLimitError;
```

**Routes à mettre à jour (optionnel)** :
- `auth/send-verification/route.ts`
- `auth/send-password-reset/route.ts`
- `session/firebase-token/route.ts`

### 3. Validation de paramètres (à faire)

Plusieurs routes valident manuellement les paramètres. On pourrait créer des helpers de validation pour :
- Email format
- IDs (teamId, userId, etc.)
- Paramètres requis

## Résumé

✅ **Tous les middlewares sont utilisés partout où ils devraient l'être**
✅ **Nouveaux middlewares créés** :
- `requireEmailVerified` option dans `requireAuth`
- `requireAdminWithEmailVerified` wrapper
- `withRateLimit` middleware

✅ **6 routes mises à jour** pour utiliser la vérification d'email intégrée

## Prochaines étapes (optionnel)

1. Mettre à jour les routes de rate limiting pour utiliser `withRateLimit`
2. Créer des helpers de validation de paramètres
3. Documenter les patterns de middlewares dans le README


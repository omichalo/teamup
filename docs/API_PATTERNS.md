# Patterns API - Documentation

Ce document décrit les patterns et conventions pour le développement des routes API dans ce projet.

## Table des matières

1. [Structure standard d'une route API](#structure-standard-dune-route-api)
2. [Middlewares d'authentification](#middlewares-dauthentification)
3. [Helpers de validation](#helpers-de-validation)
4. [Helpers de réponse](#helpers-de-réponse)
5. [Rate limiting](#rate-limiting)
6. [Gestion d'erreurs](#gestion-derreurs)

## Structure standard d'une route API

Toutes les routes API doivent suivre cette structure :

```typescript
import type { NextRequest } from "next/server";
import { requireAdminOrCoach } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { validateEmail, validateId, validateRequiredFields } from "@/lib/api/validation-helpers";
import { withRateLimit } from "@/lib/api/rate-limit-middleware";

export const runtime = "nodejs"; // Si nécessaire (modules Node.js, Firebase Admin, etc.)

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification
    const auth = await requireAdminOrCoach(req, true); // requireEmailVerified = true
    if (auth instanceof Response) return auth;

    // 2. Validation des paramètres
    const { email, teamId, name } = await req.json();
    const emailError = validateEmail(email);
    if (emailError) return emailError;
    
    const idError = validateId(teamId, "teamId");
    if (idError) return idError;

    // Ou pour plusieurs champs :
    const fieldsError = validateRequiredFields({ name, description });
    if (fieldsError) return fieldsError;

    // 3. Rate limiting (si nécessaire pour routes publiques/sensibles)
    const rateLimitError = withRateLimit({
      key: `action:${auth.uid}`,
      maxRequests: 10,
      windowMs: 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    // 4. Logique métier
    // ...

    // 5. Réponse
    return createSecureResponse({ success: true, data }, 200);
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/example",
      defaultMessage: "Erreur lors de l'opération",
    });
  }
}
```

## Middlewares d'authentification

### `requireAuth(req, options?)`

Authentification de base avec support des rôles et options avancées.

**Options disponibles** :
- `allowedRoles?: UserRole[]` - Rôles autorisés
- `requireEmailVerified?: boolean` - Exiger un email vérifié (défaut: false)
- `validateCSRF?: boolean` - Valider l'origine (défaut: true pour mutations)
- `authErrorMessage?: string` - Message d'erreur personnalisé
- `authorizationErrorMessage?: string` - Message d'autorisation personnalisé

**Exemple** :
```typescript
const auth = await requireAuth(req, {
  allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.COACH],
  requireEmailVerified: true,
});
if (auth instanceof Response) return auth;
// auth.decoded, auth.role, auth.uid sont disponibles
```

### `requireAdmin(req)`

Wrapper pour routes nécessitant uniquement ADMIN.

**Exemple** :
```typescript
const auth = await requireAdmin(req);
if (auth instanceof Response) return auth;
```

### `requireAdminOrCoach(req, requireEmailVerified?)`

Wrapper pour routes nécessitant ADMIN ou COACH.

**Exemple** :
```typescript
const auth = await requireAdminOrCoach(req, true); // requireEmailVerified = true
if (auth instanceof Response) return auth;
```

### `requireAdminWithEmailVerified(req)`

Wrapper pour routes nécessitant ADMIN avec email vérifié obligatoire.

**Exemple** :
```typescript
const auth = await requireAdminWithEmailVerified(req);
if (auth instanceof Response) return auth;
```

## Helpers de validation

Tous les helpers de validation retournent `null` si valide, ou une `NextResponse` avec erreur 400 si invalide.

### `validateEmail(email, fieldName?)`

Valide qu'un email est présent et au bon format.

**Exemple** :
```typescript
const emailError = validateEmail(email);
if (emailError) return emailError;
```

### `validateId(id, fieldName)`

Valide qu'un ID est présent et au bon format (alphanumérique, tirets, underscores).

**Exemple** :
```typescript
const idError = validateId(teamId, "teamId");
if (idError) return idError;
```

### `validateRequired(value, fieldName)`

Valide qu'une valeur est présente (non null, non undefined, non vide si string).

**Exemple** :
```typescript
const nameError = validateRequired(name, "name");
if (nameError) return nameError;
```

### `validateRequiredFields(fields)`

Valide plusieurs champs requis en une seule fois.

**Exemple** :
```typescript
const fieldsError = validateRequiredFields({
  name,
  description,
  category,
});
if (fieldsError) return fieldsError;
```

### `validatePositiveInteger(value, fieldName)`

Valide qu'un nombre est un entier positif.

**Exemple** :
```typescript
const numberError = validatePositiveInteger(journee, "journee");
if (numberError) return numberError;
```

## Helpers de réponse

### `createSecureResponse(data, status)`

Crée une réponse sécurisée avec headers Cache-Control automatiques.

**Headers ajoutés automatiquement** :
- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

**Exemple** :
```typescript
return createSecureResponse({ success: true, data }, 200);
```

### `createErrorResponse(message, status, details?)`

Crée une réponse d'erreur standardisée.

**Exemple** :
```typescript
return createErrorResponse("Ressource non trouvée", 404, "L'équipe demandée n'existe pas");
```

## Rate limiting

### `withRateLimit(options)`

Middleware de rate limiting. Retourne `null` si autorisé, ou une `NextResponse` avec erreur 429 si limité.

**Options** :
- `key: string` - Clé unique pour identifier la limite (ex: `email:${email}`, `uid:${uid}`)
- `maxRequests: number` - Nombre maximum de requêtes autorisées
- `windowMs: number` - Fenêtre de temps en millisecondes
- `errorMessage?: string` - Message d'erreur personnalisé

**Exemple** :
```typescript
const rateLimitError = withRateLimit({
  key: `email:${email}`,
  maxRequests: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
  errorMessage: "Veuillez patienter avant de renvoyer un email.",
});
if (rateLimitError) return rateLimitError;
```

## Gestion d'erreurs

### `handleApiError(error, options)`

Gère les erreurs de manière standardisée et retourne une réponse HTTP appropriée.

**Options** :
- `context?: string` - Contexte de l'erreur (nom de la route, action, etc.)
- `defaultMessage?: string` - Message d'erreur générique à afficher
- `includeDetails?: boolean` - Si true, inclut les détails de l'erreur (déconseillé en production)
- `defaultStatus?: number` - Status HTTP par défaut pour les erreurs non gérées (défaut: 500)

**Exemple** :
```typescript
try {
  // ... logique ...
} catch (error) {
  return handleApiError(error, {
    context: "app/api/example",
    defaultMessage: "Erreur lors de l'opération",
  });
}
```

## Bonnes pratiques

1. **Toujours utiliser les middlewares** : Ne jamais utiliser `adminAuth.verifySessionCookie()` directement (sauf routes spéciales comme `/api/session`)

2. **Toujours valider les entrées** : Utiliser les helpers de validation pour tous les paramètres utilisateur

3. **Toujours utiliser les helpers de réponse** : Utiliser `createSecureResponse()` pour les réponses sensibles, `createErrorResponse()` pour les erreurs

4. **Toujours gérer les erreurs** : Utiliser `handleApiError()` dans tous les blocs catch

5. **Rate limiting** : Appliquer le rate limiting sur toutes les routes sensibles (envoi d'emails, authentification, etc.)

6. **Runtime Node.js** : Toujours spécifier `export const runtime = "nodejs";` pour les routes utilisant Firebase Admin ou modules Node.js


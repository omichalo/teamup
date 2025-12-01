# Guide de refactorisation des routes API

Ce document montre comment utiliser les nouveaux helpers pour réduire les duplications dans les routes API.

## Helpers disponibles

1. **`src/lib/api/auth-middleware.ts`** - Authentification et autorisation
2. **`src/lib/api/error-handler.ts`** - Gestion d'erreurs standardisée
3. **`src/lib/api/response-utils.ts`** - Headers de sécurité
4. **`src/lib/api/rate-limit-middleware.ts`** - Rate limiting

## Exemple de refactorisation

### Avant (40+ lignes de code répétitif)

```typescript
export async function POST(req: NextRequest) {
  try {
    // Valider l'origine de la requête pour prévenir les attaques CSRF
    if (!validateOrigin(req)) {
      return NextResponse.json(
        {
          error: "Invalid origin",
          message: "Requête non autorisée",
        },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        {
          error: "Token d'authentification requis",
          message: "Cette API nécessite une authentification valide",
        },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
      return NextResponse.json(
        {
          error: "Accès refusé",
          message: "Cette opération est réservée aux administrateurs",
        },
        { status: 403 }
      );
    }

    // Logique métier ici
    const result = await doSomething();

    const res = NextResponse.json(result, { status: 200 });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[app/api/...] Erreur:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'opération",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### Après (10-15 lignes avec les helpers)

```typescript
import { requireAdmin } from "@/lib/api/auth-middleware";
import { handleApiError, createSuccessResponse } from "@/lib/api/error-handler";
import { createSecureResponse } from "@/lib/api/response-utils";

export async function POST(req: NextRequest) {
  try {
    // Authentification et vérification de rôle en une ligne
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) {
      return auth; // Erreur d'authentification/autorisation
    }

    // Logique métier ici
    const result = await doSomething();

    // Réponse sécurisée avec headers automatiques
    return createSecureResponse(result, 200);
  } catch (error) {
    return handleApiError(error, { context: "app/api/..." });
  }
}
```

## Cas d'usage spécifiques

### 1. Route nécessitant ADMIN uniquement

```typescript
import { requireAdmin } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError } from "@/lib/api/error-handler";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    // Votre logique ici
    return createSecureResponse({ success: true });
  } catch (error) {
    return handleApiError(error, { context: "app/api/admin/..." });
  }
}
```

### 2. Route nécessitant ADMIN ou COACH

```typescript
import { requireAdminOrCoach } from "@/lib/api/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrCoach(req);
    if (auth instanceof NextResponse) return auth;

    // auth.uid, auth.role, auth.decoded disponibles
    return createSecureResponse({ data: "..." });
  } catch (error) {
    return handleApiError(error, { context: "app/api/..." });
  }
}
```

### 3. Route avec rôles personnalisés

```typescript
import { requireAuth } from "@/lib/api/auth-middleware";
import { USER_ROLES } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, {
      allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.COACH],
      validateCSRF: true, // Par défaut true pour POST
    });
    if (auth instanceof NextResponse) return auth;

    // Votre logique ici
    return createSecureResponse({ success: true });
  } catch (error) {
    return handleApiError(error, { context: "app/api/..." });
  }
}
```

### 4. Route avec rate limiting

```typescript
import { requireAuth } from "@/lib/api/auth-middleware";
import { withRateLimit } from "@/lib/api/rate-limit-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError } from "@/lib/api/error-handler";

async function handler(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    // Utiliser auth.uid pour le rate limiting
    const result = await doSomething();
    return createSecureResponse(result);
  } catch (error) {
    return handleApiError(error, { context: "app/api/..." });
  }
}

// Wrapper avec rate limiting
export const POST = withRateLimit(
  {
    identifier: "email:user@example.com", // À adapter selon le contexte
    maxRequests: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  handler
);
```

### 5. Route sans authentification (mais avec validation CSRF)

```typescript
import { requireAuth } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";

export async function POST(req: NextRequest) {
  try {
    // Validation CSRF uniquement, pas d'authentification
    const auth = await requireAuth(req, {
      allowedRoles: undefined, // Pas de vérification de rôle
      validateCSRF: true,
    });
    if (auth instanceof NextResponse) return auth;

    // Logique publique mais protégée CSRF
    return createSecureResponse({ success: true });
  } catch (error) {
    return handleApiError(error, { context: "app/api/..." });
  }
}
```

## Migration progressive

1. **Commencer par les nouvelles routes** - Utilisez les helpers dès le départ
2. **Refactoriser route par route** - Ne pas tout faire d'un coup
3. **Tester après chaque refactorisation** - S'assurer que le comportement est identique
4. **Supprimer le code dupliqué** - Une fois la migration complète

## Avantages

- ✅ **Réduction de code** : De ~40 lignes à ~10-15 lignes par route
- ✅ **Cohérence** : Toutes les routes utilisent les mêmes patterns
- ✅ **Maintenabilité** : Modifications centralisées dans les helpers
- ✅ **Sécurité** : Headers de sécurité appliqués automatiquement
- ✅ **Type-safety** : TypeScript strict avec types bien définis

## Notes importantes

- Les helpers gèrent automatiquement les headers de sécurité pour les routes sensibles
- La validation CSRF est activée par défaut pour les mutations (POST, PATCH, DELETE, PUT)
- Les erreurs sont loggées automatiquement avec le contexte
- Les détails d'erreur ne sont exposés qu'en développement


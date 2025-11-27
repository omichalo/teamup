# Suppression de code mort - Documentation

## 📋 Résumé

Ce document liste le code mort qui a été supprimé du projet pour réduire la taille du bundle et simplifier la maintenance.

## ✅ Code supprimé

### 1. Legacy Firebase getters (`src/lib/firebase.ts`)

**Fonctions supprimées :**

- `getFirebaseApp()`
- `getFirebaseAuth()`
- `getFirebaseDb()`
- `getFirebaseStorage()`

**Raison :** Ces fonctions n'étaient plus utilisées. Le codebase utilise maintenant :

- Les exports directs : `auth`, `db`, `storage`
- La fonction `getDbInstanceDirect()` pour l'accès direct à l'instance Firestore

**Remplacement :**

```typescript
// ❌ Ancien (supprimé)
import { getFirebaseDb } from "@/lib/firebase";
const db = getFirebaseDb();

// ✅ Nouveau
import { db, getDbInstanceDirect } from "@/lib/firebase";
const dbInstance = getDbInstanceDirect();
```

### 2. API middleware wrapper (`src/lib/auth-middleware.ts`)

**Fichier supprimé :** `src/lib/auth-middleware.ts`

**Fonctions supprimées :**

- `withAuth()`
- `withOptionalAuth()`

**Raison :** Ces wrappers étaient conçus pour les Pages Router de Next.js (API Routes). Le projet utilise maintenant l'App Router où l'authentification est gérée directement dans les route handlers.

**Remplacement :**

```typescript
// ❌ Ancien (supprimé)
import { withAuth } from "@/lib/auth-middleware";
export default withAuth(async (req, res) => { ... });

// ✅ Nouveau (App Router)
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  // ...
}
```

### 3. Firestore hooks (`src/hooks/`)

**Fichiers supprimés :**

- `src/hooks/useFirestorePlayers.ts`
- `src/hooks/useFirestoreTeams.ts`
- `src/hooks/useFirestoreSettings.ts`

**Raison :** Ces hooks n'étaient pas utilisés. Le projet utilise maintenant des services dédiés (`FirestorePlayerService`, `CompositionService`, etc.) qui encapsulent la logique métier.

**Remplacement :**

```typescript
// ❌ Ancien (supprimé)
import { useFirestorePlayers } from "@/hooks/useFirestorePlayers";
const { players, loading, error } = useFirestorePlayers();

// ✅ Nouveau
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
const playerService = new FirestorePlayerService();
const players = await playerService.getPlayers();
```

### 4. Fonctions CRUD non utilisées (`src/services/firebase.ts`)

**Fonctions conservées (utilisées) :**

- `getPlayers()` - Utilisée dans `src/app/api/brulage/validate/route.ts`
- `getBurnRecords()` - Utilisée dans `src/app/api/brulage/validate/route.ts`
- `getPlayersCollection()` - Utilisée pour les collections
- `getBurnRecordsCollection()` - Utilisée pour les collections

**Fonctions non utilisées (à supprimer si besoin) :**

- `getPlayer()`, `addPlayer()`, `updatePlayer()`, `deletePlayer()` - Remplacées par `FirestorePlayerService`
- `getTeams()`, `getTeam()`, `addTeam()`, `updateTeam()` - Remplacées par les services dédiés
- `getMatches()`, `getMatchesByTeam()`, `getUpcomingMatches()`, `addMatch()`, `updateMatch()` - Remplacées par les services dédiés
- `getCompositions()`, `getCompositionByMatch()`, `addComposition()`, `updateComposition()` - Remplacées par `CompositionService`
- `getAvailabilities()`, `getAvailabilitiesByJournee()`, `addAvailability()`, `updateAvailability()` - Remplacées par `AvailabilityService`
- `getBurnRecordsByPlayer()`, `addBurnRecord()` - Non utilisées
- `getClubSettings()`, `updateClubSettings()` - Non utilisées

**Note :** Ces fonctions sont conservées pour l'instant car elles pourraient être utilisées indirectement. Une analyse plus approfondie permettrait de les supprimer si nécessaire.

## 🔍 Détection automatique du code mort

Pour éviter l'accumulation de code mort à l'avenir, considérer :

1. **ESLint rule `no-unused-vars`** : Déjà configuré, mais peut être renforcé
2. **ts-prune** : Outil dédié pour détecter les exports non utilisés
   ```bash
   npm install -D ts-prune
   npx ts-prune
   ```
3. **TypeScript strict mode** : Déjà activé, aide à détecter les imports inutilisés

## 📝 Recommandations

1. **Audit régulier** : Effectuer un audit du code mort tous les 3-6 mois
2. **Documentation** : Documenter les fonctions destinées à un usage futur
3. **Tests** : Supprimer les tests associés au code mort
4. **Migration progressive** : Migrer progressivement vers les services dédiés plutôt que les fonctions CRUD directes

## ✅ Vérifications post-suppression

- [ ] Le build passe (`npm run build`)
- [ ] Les tests passent (`npm test` si applicable)
- [ ] Aucune régression fonctionnelle
- [ ] Les imports cassés ont été corrigés

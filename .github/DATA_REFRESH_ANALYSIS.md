# Analyse des consultations de données - Recommandations

## État actuel

### Pattern actuel : Lecture unique au montage

Toutes les pages utilisent actuellement :
- `getDoc` / `getDocs` (lecture unique)
- `useEffect` avec chargement au montage uniquement
- ❌ **Aucun `onSnapshot`** (écoute en temps réel)
- ⚠️ **Peu de boutons de rafraîchissement** (seulement admin et quelques composants avec `window.location.reload()`)

### Pages analysées

1. **`src/app/joueurs/page.tsx`**
   - Charge : joueurs, équipes, membres Discord
   - Pattern : `useEffect` → `playerService.getAllPlayers()`
   - ❌ Pas de rafraîchissement

2. **`src/app/disponibilites/page.tsx`**
   - Charge : joueurs, disponibilités, compositions
   - Pattern : `useEffect` → chargement au changement de journée/phase
   - ❌ Pas de rafraîchissement
   - ⚠️ **Candidat idéal pour onSnapshot** (données collaboratives)

3. **`src/app/compositions/page.tsx`**
   - Charge : joueurs, équipes, disponibilités, compositions, Discord
   - Pattern : `useEffect` → chargement au montage
   - ❌ Pas de rafraîchissement
   - ⚠️ **Candidat idéal pour onSnapshot** (données collaboratives)

4. **`src/app/admin/page.tsx`**
   - Charge : statut sync, utilisateurs, lieux
   - Pattern : `useEffect` → chargement au montage
   - ✅ **A des boutons de rafraîchissement** pour les syncs

5. **`src/app/equipes/page.tsx`**
   - Charge : équipes avec matchs (via `useEquipesWithMatches`)
   - Pattern : `useEffect` → chargement au montage
   - ❌ Pas de rafraîchissement
   - ⚠️ **Candidat pour bouton refresh** (après sync FFTT)

6. **`src/app/compositions/defaults/page.tsx`**
   - Charge : joueurs, équipes, compositions par défaut
   - Pattern : `useEffect` → chargement au montage
   - ❌ Pas de rafraîchissement

---

## Recommandations

### 🔴 Priorité 1 : onSnapshot pour données collaboratives

#### 1. Disponibilités (`src/app/disponibilites/page.tsx`)

**Pourquoi** : Les disponibilités peuvent être modifiées par plusieurs utilisateurs simultanément. Un onSnapshot permettrait de voir les réponses en temps réel.

**Impact** : ⭐⭐⭐⭐⭐ (Très élevé - collaboration critique)

**Implémentation** :
```typescript
// Dans AvailabilityService
subscribeToAvailability(
  journee: number,
  phase: "aller" | "retour",
  championshipType: "masculin" | "feminin",
  callback: (availability: DayAvailability | null) => void
): () => void {
  const docId = this.getDocumentId(journee, phase, championshipType);
  const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        journee: data.journee,
        phase: data.phase,
        championshipType: data.championshipType,
        players: data.players || {},
        // ...
      });
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
}
```

**Bénéfices** :
- ✅ Voir les réponses en temps réel
- ✅ Pas besoin de rafraîchir manuellement
- ✅ Meilleure expérience collaborative
- ✅ Évite les conflits de données

#### 2. Compositions (`src/app/compositions/page.tsx`)

**Pourquoi** : Les compositions peuvent être modifiées par plusieurs coachs/admin simultanément. Un onSnapshot permettrait de voir les changements en temps réel.

**Impact** : ⭐⭐⭐⭐⭐ (Très élevé - collaboration critique)

**Implémentation** :
```typescript
// Dans CompositionService
subscribeToComposition(
  journee: number,
  phase: "aller" | "retour",
  championshipType: "masculin" | "feminin",
  callback: (composition: DayComposition | null) => void
): () => void {
  const docId = this.getDocumentId(journee, phase, championshipType);
  const docRef = doc(getDbInstanceDirect(), this.collectionName, docId);
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        journee: data.journee,
        phase: data.phase,
        championshipType: data.championshipType,
        teams: data.teams || {},
        // ...
      });
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
}
```

**Bénéfices** :
- ✅ Voir les changements de composition en temps réel
- ✅ Éviter les conflits de modification
- ✅ Meilleure coordination entre utilisateurs
- ✅ Alerte visuelle si quelqu'un d'autre modifie

#### 3. Joueurs (`src/app/joueurs/page.tsx`)

**Pourquoi** : Les joueurs peuvent être modifiés par les admins (points, Discord, etc.). Un onSnapshot permettrait de voir les changements en temps réel, surtout après une sync FFTT.

**Impact** : ⭐⭐⭐⭐ (Élevé - utile pour voir les mises à jour)

**Implémentation** :
```typescript
// Dans FirestorePlayerService
subscribeToPlayers(
  callback: (players: Player[]) => void
): () => void {
  const playersRef = collection(getDbInstanceDirect(), this.collectionName);
  const q = query(playersRef, orderBy("nom", "asc"));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const players = querySnapshot.docs.map((doc) =>
      this.convertFirestoreToPlayer(doc)
    );
    callback(players);
  });
  
  return unsubscribe;
}
```

**Bénéfices** :
- ✅ Voir les mises à jour de joueurs en temps réel
- ✅ Synchronisation automatique après sync FFTT
- ✅ Meilleure réactivité
- ⚠️ **Attention** : Peut être coûteux si beaucoup de joueurs

---

### 🟡 Priorité 2 : Boutons de rafraîchissement

#### 1. Équipes avec matchs (`src/app/equipes/page.tsx`)

**Pourquoi** : Les matchs peuvent être synchronisés depuis FFTT. Un bouton de rafraîchissement permettrait de recharger les données après une sync.

**Impact** : ⭐⭐⭐ (Moyen - utile après sync)

**Implémentation** :
```typescript
// Dans useEquipesWithMatches
const [refreshing, setRefreshing] = useState(false);

const refresh = useCallback(async () => {
  setRefreshing(true);
  // Recharger les données
  await fetchEquipesWithMatches();
  setRefreshing(false);
}, []);

return { equipes, loading, error, refresh, refreshing };
```

**UI** :
```typescript
<IconButton onClick={refresh} disabled={refreshing || loading}>
  <RefreshIcon />
</IconButton>
```

**Bénéfices** :
- ✅ Recharger après une sync FFTT
- ✅ Contrôle manuel du rafraîchissement
- ✅ Moins de coûts que onSnapshot pour des données qui changent rarement

#### 2. Membres Discord (`src/app/compositions/page.tsx`, `src/app/joueurs/page.tsx`)

**Pourquoi** : Les membres Discord peuvent changer (nouveaux membres, changements de nom). Un bouton de rafraîchissement permettrait de recharger la liste.

**Impact** : ⭐⭐ (Faible - changement rare)

**Implémentation** :
```typescript
const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([]);
const [loadingDiscord, setLoadingDiscord] = useState(false);

const refreshDiscordMembers = useCallback(async () => {
  setLoadingDiscord(true);
  try {
    const response = await fetch("/api/discord/members", {
      credentials: "include",
    });
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        setDiscordMembers(result.members || []);
      }
    }
  } finally {
    setLoadingDiscord(false);
  }
}, []);
```

**Bénéfices** :
- ✅ Recharger après ajout de membres Discord
- ✅ Contrôle manuel
- ✅ Moins de coûts que onSnapshot

#### 3. Canaux Discord (`src/app/compositions/page.tsx`, `src/app/equipes/page.tsx`)

**Pourquoi** : Les canaux Discord peuvent changer (nouveaux canaux, suppression). Un bouton de rafraîchissement permettrait de recharger la liste.

**Impact** : ⭐⭐ (Faible - changement rare)

#### 4. Lieux (`src/app/compositions/page.tsx`, `src/app/equipes/page.tsx`)

**Pourquoi** : Les lieux peuvent être ajoutés/supprimés par les admins. Un bouton de rafraîchissement permettrait de recharger la liste.

**Impact** : ⭐⭐ (Faible - changement rare)

---

## Plan d'implémentation

### Phase 1 : onSnapshot pour données collaboratives (1-2 semaines)

1. **Disponibilités** (`src/app/disponibilites/page.tsx`)
   - Ajouter `subscribeToAvailability` dans `AvailabilityService`
   - Créer hook `useAvailabilityRealtime`
   - Remplacer `useEffect` avec `getAvailability` par `useAvailabilityRealtime`
   - Gérer le cleanup dans `useEffect`

2. **Compositions** (`src/app/compositions/page.tsx`)
   - Ajouter `subscribeToComposition` dans `CompositionService`
   - Créer hook `useCompositionRealtime`
   - Remplacer le chargement unique par `useCompositionRealtime`
   - Gérer le cleanup

3. **Joueurs** (`src/app/joueurs/page.tsx`) - Optionnel
   - Ajouter `subscribeToPlayers` dans `FirestorePlayerService`
   - Créer hook `usePlayersRealtime`
   - Remplacer `loadPlayers` par `usePlayersRealtime`
   - Gérer le cleanup

### Phase 2 : Boutons de rafraîchissement (1 semaine)

4. **Équipes avec matchs** (`src/app/equipes/page.tsx`)
   - Ajouter fonction `refresh` dans `useEquipesWithMatches`
   - Ajouter bouton de rafraîchissement dans l'UI

5. **Membres Discord** (compositions, joueurs)
   - Ajouter fonction `refreshDiscordMembers`
   - Ajouter bouton de rafraîchissement (IconButton avec RefreshIcon)

6. **Canaux Discord** (compositions, equipes)
   - Ajouter fonction `refreshDiscordChannels`
   - Ajouter bouton de rafraîchissement

7. **Lieux** (compositions, equipes)
   - Ajouter fonction `refreshLocations`
   - Ajouter bouton de rafraîchissement

---

## Exemple d'implémentation complète

### Hook avec onSnapshot

```typescript
// src/hooks/useAvailabilityRealtime.ts
import { useEffect, useState } from "react";
import { AvailabilityService, DayAvailability } from "@/lib/services/availability-service";

export const useAvailabilityRealtime = (
  journee: number | null,
  phase: "aller" | "retour" | null,
  championshipType: "masculin" | "feminin"
) => {
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!journee || !phase) {
      setAvailability(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const availabilityService = new AvailabilityService();
    const unsubscribe = availabilityService.subscribeToAvailability(
      journee,
      phase,
      championshipType,
      (data) => {
        setAvailability(data);
        setLoading(false);
        setError(null);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [journee, phase, championshipType]);

  return { availability, loading, error };
};
```

### Hook avec bouton de rafraîchissement

```typescript
// src/hooks/useEquipesWithMatches.ts (amélioré)
import { useState, useEffect, useCallback } from "react";
import { Match, Team } from "@/types";
import { transformAggregatedTeamEntry, type AggregatedTeamEntry } from "@/lib/client/team-match-transform";

export interface EquipeWithMatches {
  team: Team;
  matches: Match[];
}

interface EquipesWithMatchesData {
  equipes: EquipeWithMatches[];
  loading: boolean;
  error: string | null;
}

export const useEquipesWithMatches = () => {
  const [data, setData] = useState<EquipesWithMatchesData>({
    equipes: [],
    loading: true,
    error: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchEquipesWithMatches = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      const response = await fetch("/api/teams/matches");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const aggregated = Array.isArray(result.teams) ? result.teams : [];

      const equipesWithMatches: EquipeWithMatches[] = aggregated.map(
        (entry: { team: unknown; matches: unknown[] }) =>
          transformAggregatedTeamEntry(entry as AggregatedTeamEntry)
      );

      const sortedEquipes = equipesWithMatches.sort((a, b) => {
        const numA = a.team.number || 0;
        const numB = b.team.number || 0;
        return numA - numB;
      });

      setData({
        equipes: sortedEquipes,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching equipes with matches:", error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch data",
      }));
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEquipesWithMatches();
    setRefreshing(false);
  }, [fetchEquipesWithMatches]);

  useEffect(() => {
    fetchEquipesWithMatches();
  }, [fetchEquipesWithMatches]);

  return { ...data, refresh, refreshing };
};
```

### Composant avec bouton de rafraîchissement

```typescript
// Exemple dans equipes/page.tsx
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";

const { equipes, loading, error, refresh, refreshing } = useEquipesWithMatches();

// Dans le header de la page
<Box display="flex" justifyContent="space-between" alignItems="center">
  <Typography variant="h5">Équipes</Typography>
  <Tooltip title="Rafraîchir les données">
    <IconButton 
      onClick={refresh} 
      disabled={refreshing || loading}
      aria-label="Rafraîchir"
    >
      <RefreshIcon />
    </IconButton>
  </Tooltip>
</Box>
```

---

## Critères de choix : onSnapshot vs Bouton refresh

### Utiliser onSnapshot quand :
- ✅ Données modifiées par plusieurs utilisateurs simultanément
- ✅ Besoin de voir les changements en temps réel
- ✅ Données critiques pour la collaboration
- ✅ Fréquence de modification élevée
- ✅ Impact utilisateur élevé si données obsolètes

**Exemples** : Disponibilités, Compositions, Joueurs (si modifiés souvent)

### Utiliser bouton de rafraîchissement quand :
- ✅ Données modifiées occasionnellement
- ✅ Pas besoin de temps réel
- ✅ Contrôle manuel souhaité
- ✅ Réduction des coûts Firestore
- ✅ Données qui changent rarement

**Exemples** : Équipes, Matchs, Membres Discord, Canaux Discord, Lieux

---

## Coûts et considérations

### onSnapshot
- **Coûts Firestore** : Lecture à chaque changement (peut être élevé si beaucoup de changements)
- **Performance** : Excellent pour la réactivité
- **Complexité** : Gestion du cleanup nécessaire
- **Bande passante** : Plus élevée (écoute continue)

### Bouton de rafraîchissement
- **Coûts Firestore** : Lecture uniquement au clic
- **Performance** : Bonne, contrôle manuel
- **Complexité** : Simple à implémenter
- **Bande passante** : Faible (requête ponctuelle)

---

## Recommandations finales

### 🔴 À implémenter en priorité

1. **onSnapshot pour Disponibilités** - Impact collaboratif très élevé ⭐⭐⭐⭐⭐
2. **onSnapshot pour Compositions** - Impact collaboratif très élevé ⭐⭐⭐⭐⭐
3. **Bouton refresh pour Équipes/Matchs** - Utile après sync FFTT ⭐⭐⭐

### 🟡 À implémenter ensuite

4. **onSnapshot pour Joueurs** - Si modifications fréquentes ⭐⭐⭐⭐
5. **Boutons refresh pour Discord** - Utile mais moins critique ⭐⭐
6. **Boutons refresh pour Lieux** - Utile mais moins critique ⭐⭐

### 🟢 Optimisations futures

7. Cache avec timestamp
8. Polling optionnel
9. Indicateurs visuels de "dernière mise à jour"
10. Toast notifications pour les changements en temps réel

---

## Impact utilisateur

### Avec onSnapshot (Disponibilités, Compositions)
- ✅ Voir les réponses/changements en temps réel
- ✅ Meilleure collaboration
- ✅ Moins de conflits
- ✅ Expérience plus fluide

### Avec boutons de rafraîchissement
- ✅ Contrôle manuel
- ✅ Réduction des coûts
- ✅ Utile après actions spécifiques (sync, ajout)

---

## Métriques de succès

- Réduction des conflits de données
- Amélioration de l'expérience collaborative
- Réduction des rechargements de page
- Satisfaction utilisateur

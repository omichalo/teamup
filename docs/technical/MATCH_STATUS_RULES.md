# Règles de gestion de l'affichage du statut des matchs

## Vue d'ensemble

Le statut d'un match dans la page équipes est déterminé par le champ `result` stocké dans Firestore. Ce champ est calculé lors de la synchronisation des matchs depuis l'API FFTT.

## Règle d'affichage du statut

### Fonction `getMatchStatusChip` (`src/app/equipes/page.tsx`)

La fonction `getMatchStatusChip` détermine l'affichage du statut en fonction de la valeur du champ `match.result` :

```typescript
const getMatchStatusChip = (match: Match) => {
  if (match.result === "EXEMPT") {
    return <Chip label="EXEMPT" color="info" size="small" />;
  }
  if (match.result === "W.O.") {
    return <Chip label="W.O." color="error" size="small" />;
  }
  if (match.result === "VICTOIRE") {
    return <Chip label="VICTOIRE" color="success" size="small" />;
  }
  if (match.result === "DEFAITE") {
    return <Chip label="DÉFAITE" color="error" size="small" />;
  }
  if (match.result === "NUL") {
    return <Chip label="NUL" color="warning" size="small" />;
  }
  if (match.result === "À VENIR") {
    return <Chip label="À VENIR" color="warning" size="small" />;
  }
  
  // Fallback par défaut
  return <Chip label="À VENIR" color="warning" size="small" />;
};
```

### Valeurs possibles du champ `result`

| Valeur | Affichage | Couleur | Signification |
|--------|-----------|---------|---------------|
| `"EXEMPT"` | EXEMPT | Info (bleu) | Équipe exempte (pas de match) |
| `"W.O."` | W.O. | Error (rouge) | Walkover (forfait) |
| `"VICTOIRE"` | VICTOIRE | Success (vert) | Match gagné |
| `"DEFAITE"` | DÉFAITE | Error (rouge) | Match perdu |
| `"NUL"` | NUL | Warning (orange) | Match nul |
| `"À VENIR"` | À VENIR | Warning (orange) | Match non joué |
| Autre / `undefined` | À VENIR | Warning (orange) | Fallback par défaut |

## Calcul du champ `result`

### Fonction `determineMatchResult` (`src/lib/shared/fftt-utils.ts`)

Le champ `result` est calculé lors de la synchronisation des matchs via la fonction `determineMatchResult` :

```typescript
export const determineMatchResult = (
  scoreA: number | null,
  scoreB: number | null,
  isHome: boolean
): string => {
  // Si les scores ne sont pas disponibles, le match est "À VENIR"
  if (scoreA === null || scoreB === null) return "À VENIR";

  // Déterminer notre score et celui de l'adversaire selon si on joue à domicile
  const ourScore = isHome ? scoreA : scoreB;
  const opponentScore = isHome ? scoreB : scoreA;

  // Comparer les scores pour déterminer le résultat
  if (ourScore > opponentScore) return "VICTOIRE";
  if (ourScore < opponentScore) return "DÉFAITE";
  return "ÉGALITÉ"; // Note: affiché comme "NUL" dans l'UI
};
```

### Logique de calcul

1. **Scores manquants** (`scoreA === null || scoreB === null`) :
   - Résultat : `"À VENIR"`

2. **Victoire** (`ourScore > opponentScore`) :
   - Résultat : `"VICTOIRE"`

3. **Défaite** (`ourScore < opponentScore`) :
   - Résultat : `"DÉFAITE"`

4. **Égalité** (`ourScore === opponentScore`) :
   - Résultat : `"ÉGALITÉ"` (mais affiché comme "NUL" dans l'UI)

### Cas spéciaux

- **EXEMPT** : Déterminé par le champ `isExempt` du match (actuellement toujours `false` dans le code)
- **W.O.** : Déterminé par le champ `isForfeit` du match (actuellement toujours `false` dans le code)

> **Note** : Les cas `EXEMPT` et `W.O.` ne sont actuellement pas calculés automatiquement. Ils doivent être définis manuellement dans Firestore ou lors de la synchronisation.

## Récupération des données depuis Firestore

### Flux de données

1. **Page équipes** (`src/app/equipes/page.tsx`) :
   - Utilise le hook `useTeamData()`
   - Appelle l'API `/api/teams/matches`

2. **API Route** (`src/app/api/teams/matches/route.ts`) :
   - Utilise `getTeams()` pour récupérer les équipes depuis `teams`
   - Utilise `getTeamMatches()` pour récupérer les matchs depuis `teams/{teamId}/matches`

3. **Fonction `getTeamMatches`** (`src/lib/server/team-matches.ts`) :
   - Lit la collection `teams/{teamId}/matches` dans Firestore
   - Convertit les Timestamps Firestore en Date JavaScript
   - Retourne les matchs avec tous leurs champs, y compris `result`

### Structure Firestore

```
teams/
  {teamId}/
    matches/
      {matchId}/
        - id: string
        - ffttId: string
        - teamNumber: number
        - opponent: string
        - opponentClub: string
        - date: Timestamp
        - location: string
        - isHome: boolean
        - isExempt: boolean
        - isForfeit: boolean
        - phase: string
        - journee: number
        - isFemale: boolean
        - division: string
        - teamId: string
        - epreuve: string
        - score: string (ex: "4-2")
        - result: string (VICTOIRE, DEFAITE, EXEMPT, W.O., NUL, À VENIR)
        - rencontreId: string
        - equipeIds: { equipe1: string, equipe2: string }
        - lienDetails: string
        - resultatsIndividuels: object
        - joueursSQY: array
        - joueursAdversaires: array
        - createdAt: Timestamp
        - updatedAt: Timestamp
```

### Champs utilisés pour le statut

- **`result`** : Champ principal qui détermine le statut affiché
- **`score`** : Score du match (ex: "4-2"), utilisé pour calculer `result` lors de la sync
- **`isHome`** : Indique si le match est à domicile, utilisé pour déterminer "notre score" vs "score adverse"
- **`isExempt`** : Indique si l'équipe est exempte (non utilisé actuellement)
- **`isForfeit`** : Indique si c'est un forfait (non utilisé actuellement)

## Synchronisation des matchs

### Processus de synchronisation

1. **Déclenchement** : Via l'API `/api/admin/sync-team-matches`
2. **Service** : `TeamMatchesSyncService` (`src/lib/shared/team-matches-sync.ts`)
3. **Source** : API FFTT (`getRencontrePouleByLienDivision`)
4. **Transformation** : `createBaseMatch` (`src/lib/shared/fftt-utils.ts`)
5. **Calcul du résultat** : `determineMatchResult` avec les scores de l'API FFTT
6. **Stockage** : Sauvegarde dans `teams/{teamId}/matches/{matchId}`

### Calcul des scores

Les scores sont extraits dans l'ordre de priorité suivant :

1. **Depuis `rencontre.scoreEquipeA` et `rencontre.scoreEquipeB`** (API FFTT)
2. **Depuis `detailsRencontre.scoreEquipeA` et `detailsRencontre.scoreEquipeB`** (si disponibles)
3. **Depuis `detailsRencontre.expectedScoreEquipeA` et `detailsRencontre.expectedScoreEquipeB`** (scores attendus)
4. **Calcul depuis les parties individuelles** (`detailsRencontre.parties`) :
   - Compter les parties gagnées par chaque équipe
   - Utiliser ces scores calculés si les scores globaux ne sont pas disponibles

### Mise à jour du résultat

Le champ `result` est calculé et stocké lors de chaque synchronisation. Si les scores changent dans l'API FFTT, le résultat sera recalculé lors de la prochaine synchronisation.

## Exemples

### Exemple 1 : Match gagné à domicile
- `scoreA = 4` (SQY Ping)
- `scoreB = 2` (Adversaire)
- `isHome = true`
- **Calcul** : `ourScore = 4`, `opponentScore = 2` → `4 > 2` → `result = "VICTOIRE"`

### Exemple 2 : Match perdu à l'extérieur
- `scoreA = 3` (Adversaire)
- `scoreB = 2` (SQY Ping)
- `isHome = false`
- **Calcul** : `ourScore = 2`, `opponentScore = 3` → `2 < 3` → `result = "DÉFAITE"`

### Exemple 3 : Match non joué
- `scoreA = null`
- `scoreB = null`
- **Calcul** : Scores manquants → `result = "À VENIR"`

### Exemple 4 : Match nul
- `scoreA = 3`
- `scoreB = 3`
- `isHome = true`
- **Calcul** : `ourScore = 3`, `opponentScore = 3` → `3 === 3` → `result = "ÉGALITÉ"` (affiché "NUL")

## Points d'attention

1. **Cas spéciaux non gérés automatiquement** :
   - `EXEMPT` et `W.O.` ne sont pas calculés automatiquement
   - Ils doivent être définis manuellement dans Firestore si nécessaire

2. **Égalité vs NUL** :
   - Le code retourne `"ÉGALITÉ"` mais l'UI affiche `"NUL"`
   - Il faudrait harmoniser : soit retourner `"NUL"` dans `determineMatchResult`, soit gérer `"ÉGALITÉ"` dans `getMatchStatusChip`

3. **Synchronisation** :
   - Le résultat n'est mis à jour que lors d'une synchronisation manuelle
   - Pas de mise à jour automatique en temps réel

4. **Fallback** :
   - Si `result` est `undefined` ou a une valeur inconnue, l'affichage par défaut est `"À VENIR"`

## Améliorations possibles

1. **Gestion automatique de EXEMPT et W.O.** :
   - Détecter les matchs exempts depuis l'API FFTT
   - Détecter les forfaits depuis l'API FFTT ou les scores 0-0 avec date passée

2. **Harmonisation ÉGALITÉ/NUL** :
   - Retourner `"NUL"` directement dans `determineMatchResult`
   - Ou gérer `"ÉGALITÉ"` dans `getMatchStatusChip`

3. **Mise à jour en temps réel** :
   - Utiliser `onSnapshot` pour écouter les changements de matchs
   - Mettre à jour automatiquement le statut quand les scores changent dans Firestore


# Architecture du module compositions

Ce document décrit la structure du store `useTeamManagementStore` et les principaux événements qui pilotent la page des compositions (temps réel, disponibilités et listes de joueurs). Il sert de guide pour comprendre l'état global partagé entre les différentes vues (compositions, disponibilités, page joueurs) et faciliter son évolution.

## Schéma d'état principal

Le store Zustand `useTeamManagementStore` centralise l'ensemble des données utilisées par les écrans liés aux compositions :

- `players`: tableau de `Player` issu de Firestore.
- `equipesWithMatches`: liste d'objets `{ team, matches }` pour chaque équipe, déjà triée par numéro d'équipe.
- `availabilityByKey`: dictionnaire des disponibilités par clé de journée (`<championshipType>:<phase>:<journee>[:<idEpreuve>]`).
- `compositionsByKey`: dictionnaire des compositions par clé de journée (`<championshipType>:<phase>:<journee>`).
- `defaultsByChampionship`: valeurs par défaut des compositions, indexées par `championshipType` et `phase`.
- États de chargement/erreur associés (`playersLoading`, `equipesLoading`, `availabilityLoading`, `compositionsLoading`, `defaultsLoading`, etc.).
- `availabilitySubscriptions` / `compositionSubscriptions`: map des callbacks de désinscription Firestore pour garantir un nettoyage propre.

### Clés de journée

Les clés sont construites via `getDayKey({ journee, phase, championshipType, idEpreuve? })` et sont réutilisées par les hooks `useAvailabilities` et `useCompositions` pour partager les données et les indicateurs de statut.

## Événements et flux de données

- `loadEquipesWithMatches()`: déclenche un appel `/api/teams/matches`, transforme la réponse puis peuple `equipesWithMatches` (caché ensuite via `useTeamData`).
- `loadPlayers()`: récupère tous les joueurs Firestore et alimente `players` (utilisé par `usePlayers`).
- `subscribeToAvailability(params)`: ouvre une subscription temps réel via `AvailabilityService`, met à jour `availabilityByKey` et enregistre une fonction de cleanup dans `availabilitySubscriptions`.
- `subscribeToComposition(params)`: comportement équivalent côté compositions via `CompositionService`.
- `fetchCompositionDefaults(params)`: charge les compositions par défaut pour une phase/championnat.

## Hooks de lecture

- `useTeamData()`: fournit les équipes, le statut de chargement/erreur et la phase courante calculée à partir des matchs.
- `usePlayers()`: expose les joueurs avec caching (pas de rechargement si déjà présents).
- `useAvailabilities({ journee, phase, championshipType, idEpreuve? })`: s'abonne/désabonne automatiquement aux disponibilités d'une journée, et réutilise les données en cache.
- `useCompositions({ journee, phase, championshipType })`: même logique pour les compositions.
- `useDiscordMembers()`: récupère et met en cache les membres Discord (mentions) partagés entre les écrans.

## Nettoyage des subscriptions

Les hooks `useAvailabilities` et `useCompositions` retournent la fonction de désinscription fournie par le store. Lorsqu'un composant se démonte ou que les paramètres (journée, phase, championnat) changent, la subscription précédente est résiliée et retirée des maps `availabilitySubscriptions` ou `compositionSubscriptions`, évitant les fuites de listeners.


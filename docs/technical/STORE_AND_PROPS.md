# Gestion des stores et conventions de props

## Structure du store des compositions

Le store `teamManagementStore` centralise toutes les données liées aux compositions :

- **Joueurs** : `players`, état de chargement/erreur associé et méthode `loadPlayers()` pour récupérer la liste via `FirestorePlayerService`.
- **Équipes et matchs** : `equipesWithMatches` ainsi que `loadEquipesWithMatches()` qui appelle l'API `/api/teams/matches` puis trie les équipes par numéro.
- **Disponibilités** : stockées par clé (`availabilityByKey`) générée par `getDayKey()`, avec suivi des états de chargement/erreur et des subscriptions temps réel.
- **Compositions** : `compositionsByKey` avec indicateurs de chargement/erreur et `subscribeToComposition()` pour suivre les mises à jour d'une journée/phase donnée.
- **Defaults** : `defaultsByChampionship` et `fetchCompositionDefaults()` pour récupérer les compositions par défaut par championnat et par phase.

Chaque section du store possède son triplet `data/loading/error` ainsi qu'un dictionnaire de `subscriptions` lorsque la ressource est temps réel. Privilégier l'utilisation des sélecteurs fournis par le store pour éviter les re-render inutiles.

## Conventions de props pour les composants de compositions

- **Nommage explicite** : utiliser des props `value`/`onChange` typées (`phase`, `epreuve`, `searchQuery`) plutôt que des noms génériques.
- **Accessoires optionnels** : préférer des props optionnelles documentées (`label`, `minWidth`, `containerProps`) avec des valeurs par défaut définies dans le composant.
- **Contenu injecté** : pour les panneaux réutilisables comme `AvailablePlayersPanel`, passer le rendu des éléments via une prop de fonction (`renderPlayerItem`) et autoriser des blocs additionnels (`actions`, `headerContent`) pour conserver la flexibilité sans multiplier les variantes.
- **Messages paramétrables** : exposer les textes d'état (vides, erreurs, placeholders) en props (`emptyMessage`, `noResultMessage`) afin de garder les composants indépendants du contexte métier.
- **Styles extensibles** : ouvrir les props `sx` ou `containerProps` quand les composants s'intègrent dans des layouts variés, tout en conservant un style par défaut cohérent.

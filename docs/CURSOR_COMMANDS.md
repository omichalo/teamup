# Prompts Cursor - Guide d'utilisation

Ce document liste les prompts prêts à l'emploi pour utiliser Cursor efficacement dans ce projet.

**Note importante**: Ces "commandes" ne sont pas des commandes slash intégrées à Cursor. Ce sont des prompts à copier-coller dans le chat Cursor. Cursor ne permet pas de créer des commandes slash personnalisées.

## Comment utiliser ces prompts

1. Ouvrir le chat Cursor (Cmd+L ou Ctrl+L)
2. Copier-coller le prompt souhaité
3. Adapter le prompt selon vos besoins

## Planification

### Plan structuré

Créer un plan structuré pour une nouvelle fonctionnalité ou modification.

**Prompt à utiliser:**

```
Crée un plan structuré pour: Ajouter une fonctionnalité de notification push
```

ou simplement:

```
Plan: Ajouter une fonctionnalité de notification push
```

## Exécution multi-agent

### Workflow multi-agent

Lancer plusieurs agents en parallèle pour travailler sur différentes parties du projet.

**Prompt à utiliser:**

```
Utilise un workflow multi-agent pour implémenter la fonctionnalité de notifications:
- RepoScout: explorer les patterns existants
- Architect: définir la structure
- NextJS: créer les composants UI
- Firebase: configurer les Cloud Functions
- Tester: écrire les tests
```

## Validation rapide

### Validation rapide (check-fast)

Validation rapide (lint + type-check sans build).

**Prompt à utiliser:**

```
Exécute npm run check:dev et corrige toutes les erreurs
```

**Équivalent à:** `npm run check:dev`

**Utilisation:** Pendant le développement, fréquemment

## Validation complète

### Validation complète (check-full)

Validation complète (lint + type-check + build + tests).

**Prompt à utiliser:**

```
Exécute npm run check et corrige toutes les erreurs
```

**Équivalent à:** `npm run check`

**Utilisation:** Avant chaque commit/push

## Tests

### Tests unitaires

Lancer les tests unitaires.

**Prompt à utiliser:**

```
Exécute npm test et affiche les résultats
```

**Équivalent à:** `npm test`

### Tests en mode watch

Lancer les tests en mode watch.

**Prompt à utiliser:**

```
Exécute npm run test:watch
```

**Équivalent à:** `npm run test:watch`

### Tests avec coverage

Lancer les tests avec coverage.

**Prompt à utiliser:**

```
Exécute npm run test:coverage et affiche le rapport de couverture
```

**Équivalent à:** `npm run test:coverage`

## Smoke Tests

### Smoke test web

Exécuter le smoke test web (build + start + health check + stop).

**Prompt à utiliser:**

```
Exécute npm run smoke:web
```

**Équivalent à:** `npm run smoke:web`

**Utilisation:** Avant de créer une PR importante

### Smoke test emulators

Exécuter le smoke test des emulators Firebase.

**Prompt à utiliser:**

```
Exécute npm run emulators:smoke
```

**Équivalent à:** `npm run emulators:smoke`

**Utilisation:** Avant de déployer des Functions

## Préparation PR

### Vérification PR (pr-ready)

Vérifier que le code est prêt pour une Pull Request.

**Prompt à utiliser:**

```
Vérifie que le code est prêt pour une PR:
- Qualité du code (lint, type-check, build)
- Sécurité (pas de secrets, validation inputs)
- Cohérence avec les règles (.cursor/rules/)
- Passage des quality gates (npm run check)
- Documentation à jour
- Tests passent
```

**Utilisation:** Avant de créer une PR

## Discord (optionnel)

### Enregistrer commandes Discord

Enregistrer les commandes slash Discord.

**Prompt à utiliser:**

```
Exécute npm run discord:register-command
```

**Équivalent à:** `npm run discord:register-command`

**Utilisation:** Après avoir modifié les commandes Discord

## Exemples de workflow

### Workflow de développement typique

1. **Planification**

   ```
   Plan: Ajouter une nouvelle page de statistiques
   ```

2. **Développement avec validation fréquente**

   ```
   Exécute npm run check:dev et corrige les erreurs
   ```

3. **Tests**

   ```
   Exécute npm test
   ```

4. **Validation complète avant commit**

   ```
   Exécute npm run check et corrige toutes les erreurs
   ```

5. **Smoke test avant PR**

   ```
   Exécute npm run smoke:web
   ```

6. **Vérification finale**
   ```
   Vérifie que le code est prêt pour une PR (qualité, sécurité, tests, docs)
   ```

### Workflow multi-agent

1. **Lancer les agents**

   ```
   Utilise un workflow multi-agent pour implémenter la fonctionnalité X:
   - RepoScout: explorer les patterns existants
   - Architect: définir la structure
   - NextJS: créer les composants UI
   - Firebase: configurer les Cloud Functions
   - Tester: écrire les tests
   ```

2. **Valider le résultat**
   ```
   Exécute npm run check
   Vérifie que le code est prêt pour une PR
   ```

## Commandes slash Cursor intégrées

Cursor dispose de quelques commandes slash intégrées que vous pouvez utiliser:

- `/edit` - Modifier du code
- `/fix` - Corriger des erreurs
- `/explain` - Expliquer du code
- `/generate` - Générer du code

Pour voir toutes les commandes disponibles, tapez `/` dans le chat Cursor.

## Notes

- Les prompts ci-dessus sont à copier-coller dans le chat Cursor (Cmd+L ou Ctrl+L)
- Ces prompts déclenchent l'exécution des scripts npm correspondants
- Consulter [WORKFLOW.md](./WORKFLOW.md) pour plus de détails sur le workflow multi-agent
- Pour des commandes rapides, vous pouvez aussi utiliser directement les scripts npm dans le terminal

# Exemples concrets de workflow multi-agent

Ce document fournit des exemples concrets et pratiques d'utilisation du workflow multi-agent.

## Comprendre le concept

Le workflow multi-agent n'est **pas** une fonctionnalité automatique de Cursor. C'est une **méthode d'organisation** où vous guidez Cursor pour adopter différents rôles selon les besoins.

**Analogie**: C'est comme si vous travailliez avec une équipe de développeurs spécialisés, mais en réalité c'est vous qui demandez à Cursor de "jouer" chaque rôle à tour de rôle.

## Approche séquentielle (recommandée - 90% des cas)

## Exemple 1 : Ajouter une nouvelle fonctionnalité simple

### Scénario

Vous voulez ajouter un bouton "Exporter les données" sur la page admin.

### Approche séquentielle (recommandée)

**1. Exploration (RepoScout)**

```
Agis comme RepoScout : explore le repository pour trouver:
- Où se trouve la page admin
- Quels composants de boutons existent déjà
- Comment les exports sont gérés ailleurs dans le projet
```

**2. Planification (Architect)**

```
Agis comme Architect : crée un plan pour ajouter un bouton "Exporter les données" qui:
- S'intègre dans la page admin existante
- Réutilise les composants de boutons existants
- Crée une route API pour l'export si nécessaire
Liste les fichiers à modifier.
```

**3. Implémentation (NextJS)**

```
Agis comme NextJS : implémente le bouton et la fonctionnalité d'export selon le plan.
```

**4. Tests (Tester)**

```
Agis comme Tester : écris un test pour vérifier que le bouton fonctionne.
```

**5. Review (Reviewer)**

```
Agis comme Reviewer : vérifie que tout est prêt pour une PR.
```

## Exemple 2 : Tâche complexe avec plusieurs aspects

### Scénario

Vous voulez ajouter un système de notifications en temps réel avec Firebase.

### Approche "multi-agent" en une interaction

```
Implémente un système de notifications en temps réel avec Firebase en adoptant ces rôles successivement:

1. RepoScout: Explore le repo pour identifier:
   - Comment les notifications sont actuellement gérées
   - Quels hooks React existent pour Firebase
   - Quels patterns sont utilisés pour le temps réel

2. Architect: Planifie l'architecture:
   - Structure Firestore pour les notifications
   - Cloud Function pour créer les notifications
   - Hook React pour écouter les notifications
   - Composant UI pour afficher les notifications

3. Firebase: Configure:
   - Les Firestore rules pour les notifications
   - La Cloud Function de création
   - Les index Firestore nécessaires

4. NextJS: Implémente:
   - Le hook useNotifications
   - Le composant NotificationCenter
   - La route API pour marquer comme lues

5. Tester: Écrit:
   - Tests unitaires pour le hook
   - Tests d'intégration pour le composant
   - Tests pour la Cloud Function

6. Reviewer: Vérifie:
   - Qualité du code
   - Sécurité (rules Firestore, validation inputs)
   - Performance (index, optimisations)
   - Tests passent

Commence par RepoScout et passe au rôle suivant une fois terminé.
```

## Exemple 3 : Correction de bug

### Scénario

Un bug dans le calcul des statistiques de disponibilité.

### Approche ciblée

**1. Investigation (RepoScout)**

```
Agis comme RepoScout : trouve où se trouve le code qui calcule les statistiques de disponibilité.
Identifie les fichiers concernés et explique la logique actuelle.
```

**2. Diagnostic (Tester)**

```
Agis comme Tester : analyse le bug et propose un test qui reproduit le problème.
```

**3. Correction (NextJS)**

```
Agis comme NextJS : corrige le bug en respectant les conventions du projet.
```

**4. Validation (Reviewer)**

```
Agis comme Reviewer : vérifie que la correction est correcte et que les tests passent.
```

## Exemple 4 : Refactorisation

### Scénario

Vous voulez refactoriser un composant trop complexe.

### Approche structurée

**1. Analyse (RepoScout)**

```
Agis comme RepoScout : analyse le composant X et identifie:
- Les responsabilités actuelles
- Les dépendances
- Les patterns similaires dans le projet
```

**2. Planification (Architect)**

```
Agis comme Architect : propose un plan de refactorisation qui:
- Sépare les responsabilités
- Réutilise les patterns existants
- Améliore la maintenabilité
Sans casser les fonctionnalités existantes.
```

**3. Implémentation (NextJS)**

```
Agis comme NextJS : implémente la refactorisation selon le plan.
```

**4. Tests (Tester)**

```
Agis comme Tester : vérifie que tous les tests existants passent toujours.
Ajoute des tests si nécessaire pour la nouvelle structure.
```

## Approche parallèle avec worktrees (option avancée - 10% des cas)

> **⚠️ Option avancée** : Cette approche est utile uniquement pour des fonctionnalités très complexes. Voir [WORKTREES_SETUP.md](./WORKTREES_SETUP.md) pour le guide complet.

## Astuce : Combiner avec les scripts npm

N'hésitez pas à combiner les rôles avec l'exécution de scripts :

```
Agis comme NextJS : implémente la fonctionnalité X, puis exécute npm run check:dev pour valider.
```

```
Agis comme Reviewer : vérifie le code, puis exécute npm run check pour une validation complète.
```

## Exemple 5 : Workflow parallèle avec worktrees Git (option avancée)

### Scénario

Vous voulez implémenter une fonctionnalité complexe de notifications en temps réel avec Firebase, nécessitant plusieurs aspects (exploration, architecture, UI, backend, tests).

### Setup avec worktrees

**1. Créer les worktrees**

```bash
./scripts/setup-worktrees.sh notifications
```

**2. Ouvrir plusieurs instances de Cursor**

- Instance 1 : Ouvrir `../teamup-notifications-reposcout`
- Instance 2 : Ouvrir `../teamup-notifications-architect`
- Instance 3 : Ouvrir `../teamup-notifications-nextjs`
- Instance 4 : Ouvrir `../teamup-notifications-firebase`
- Instance 5 : Ouvrir `../teamup-notifications-tester`

**3. Travailler en parallèle dans chaque instance**

**Instance RepoScout** (commence en premier) :

```
Tu es l'agent RepoScout. Explore le repository pour identifier:
- Comment les notifications sont actuellement gérées
- Quels hooks React existent pour Firebase
- Quels patterns sont utilisés pour le temps réel
Documente tes findings dans docs/temp/notifications-exploration.md
```

**Instance Architect** (peut commencer en parallèle après RepoScout) :

```
Tu es l'agent Architect. Crée un plan d'architecture pour un système de notifications en temps réel:
- Structure Firestore pour les notifications
- Cloud Function pour créer les notifications
- Hook React pour écouter les notifications
- Composant UI pour afficher les notifications
Base-toi sur docs/temp/notifications-exploration.md
Documente le plan dans docs/temp/notifications-plan.md
```

**Instance NextJS** (une fois le plan disponible) :

```
Tu es l'agent NextJS. Implémente selon docs/temp/notifications-plan.md:
- Le hook useNotifications
- Le composant NotificationCenter
- La route API pour marquer comme lues
```

**Instance Firebase** (une fois le plan disponible) :

```
Tu es l'agent Firebase. Configure selon docs/temp/notifications-plan.md:
- Les Firestore rules pour les notifications (least privilege)
- La Cloud Function de création
- Les index Firestore nécessaires
```

**Instance Tester** (une fois l'implémentation commencée) :

```
Tu es l'agent Tester. Écris les tests pour:
- Le hook useNotifications
- Le composant NotificationCenter
- La Cloud Function
```

**4. Merge final**

```bash
# Depuis le repository principal
git checkout feature/notifications-main
git merge feature/notifications-reposcout
git merge feature/notifications-architect
git merge feature/notifications-nextjs
git merge feature/notifications-firebase
git merge feature/notifications-tester
```

**5. Nettoyage**

```bash
git worktree remove ../teamup-notifications-reposcout
git worktree remove ../teamup-notifications-architect
# etc.
```

Voir [WORKTREES_SETUP.md](./WORKTREES_SETUP.md) pour le guide complet.

## Conseils pratiques

### Quand utiliser un seul rôle

- Tâche simple et ciblée
- Vous savez exactement ce qu'il faut faire
- Correction de bug mineur

### Quand utiliser plusieurs rôles séquentiellement (recommandé)

- Nouvelle fonctionnalité
- Tâche complexe avec plusieurs aspects
- Refactorisation importante
- **👉 C'est l'approche recommandée pour la majorité des cas**

### Quand utiliser l'approche "multi-agent" en une interaction

- Tâche très complexe nécessitant plusieurs perspectives
- Vous voulez que Cursor considère tous les aspects d'un coup
- Première implémentation d'une fonctionnalité majeure

### Quand utiliser les worktrees (option avancée)

- Fonctionnalité très complexe avec parties vraiment indépendantes
- Besoin de vraie parallélisation
- Deadline très serrée

## Résumé

Le workflow multi-agent est une **méthode d'organisation**. Vous guidez Cursor pour adopter différents rôles selon les besoins.

**Pour la majorité des cas (90%)** : Utilisez l'approche séquentielle (un rôle à la fois)
**Pour les cas très complexes (10%)** : Utilisez les worktrees Git pour vraie parallélisation

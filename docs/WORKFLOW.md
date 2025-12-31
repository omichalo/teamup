# Workflow Multi-Agent Cursor

Ce document décrit le workflow multi-agent pour le développement avec Cursor, permettant une approche structurée et spécialisée pour développer des fonctionnalités complexes.

## Vue d'ensemble

Le workflow multi-agent est une **approche méthodologique** où vous guidez Cursor pour adopter différents rôles spécialisés selon les besoins. C'est une façon d'organiser votre interaction avec Cursor pour traiter des tâches complexes de manière structurée.

**Important**: Vous guidez Cursor à adopter différents rôles successivement. Cursor ne lance pas automatiquement plusieurs agents en parallèle.

## Rôles des agents

### RepoScout (Lecture)

**Rôle**: Cartographier le repository et identifier les conventions existantes

- Explore la structure du projet
- Identifie les patterns de code existants
- Documente les conventions de nommage
- Repère les dépendances et intégrations

### Architect (Plan + Règles)

**Rôle**: Définir la structure cible et les règles Cursor

- Planifie l'architecture des nouvelles fonctionnalités
- Définit les règles dans `.cursor/rules/`
- Assure la cohérence architecturale
- Valide les décisions techniques

### DevEx/Automation

**Rôle**: Scripts npm, hooks git, CI

- Crée et maintient les scripts npm
- Configure les hooks git (Husky)
- Améliore les workflows CI/CD
- Automatise les tâches répétitives

### NextJS

**Rôle**: Conventions front + DX

- Applique les conventions Next.js App Router
- Optimise l'expérience développeur
- Assure la cohérence des composants React
- Gère les Server/Client Components

### Firebase

**Rôle**: Rules, Functions, Emulators, Sécurité

- Maintient les Firestore rules (least privilege)
- Développe et teste les Cloud Functions
- Configure les emulators Firebase
- Assure la sécurité des données

### Tester

**Rôle**: Tests unit/integration + smoke

- Écrit et maintient les tests unitaires
- Crée des tests d'intégration
- Implémente les smoke tests
- Valide la non-régression

### Reviewer

**Rôle**: Audit final qualité/sécurité/cohérence

- Vérifie la qualité du code
- Audite la sécurité
- Valide la cohérence avec les règles
- S'assure que les quality gates passent

## Comment utiliser le workflow multi-agent

### Approche séquentielle (recommandée - 90% des cas)

C'est l'approche la plus simple et efficace pour la majorité des cas. Vous demandez à Cursor d'adopter un rôle à la fois, dans l'ordre logique.

Au lieu de demander à Cursor de jouer plusieurs rôles en même temps, vous pouvez travailler **séquentiellement** en demandant à Cursor d'adopter un rôle à la fois :

#### Exemple concret : Ajouter une nouvelle page de statistiques

**Étape 1 : Exploration (rôle RepoScout)**

```
Agis comme RepoScout : explore le repository pour identifier où se trouvent les pages similaires,
quels patterns sont utilisés pour les pages de statistiques, et quels composants réutilisables existent.
```

**Étape 2 : Planification (rôle Architect)**

```
Agis comme Architect : crée un plan structuré pour ajouter une page de statistiques qui:
- Respecte l'architecture existante
- Réutilise les composants existants
- Suit les conventions Next.js App Router
Liste les fichiers à créer/modifier et les étapes d'implémentation.
```

**Étape 3 : Implémentation (rôle NextJS)**

```
Agis comme NextJS : implémente la page de statistiques selon le plan, en respectant:
- Les conventions Next.js App Router
- La séparation Server/Client Components
- Les patterns existants dans le projet
```

**Étape 4 : Tests (rôle Tester)**

```
Agis comme Tester : écris les tests unitaires pour la nouvelle page de statistiques.
```

**Étape 5 : Review (rôle Reviewer)**

```
Agis comme Reviewer : vérifie que le code est prêt pour une PR:
- Qualité du code (lint, type-check, build)
- Sécurité (pas de secrets, validation inputs)
- Cohérence avec les règles (.cursor/rules/)
- Tests passent
```

#### Avantages de l'approche séquentielle

- ✅ **Simple** : Un seul contexte Cursor à gérer
- ✅ **Naturel** : Les dépendances entre rôles sont respectées (Architect a besoin de RepoScout, etc.)
- ✅ **Efficace** : Cursor garde le contexte entre les rôles
- ✅ **Moins de ressources** : Une seule instance Cursor
- ✅ **Pas de conflits** : Pas de risque de modifications simultanées

### Approche parallèle avec worktrees Git (option avancée - 10% des cas)

**⚠️ Option avancée** : Les worktrees permettent de créer plusieurs copies du repository et d'ouvrir plusieurs instances de Cursor en parallèle. Cette approche est utile uniquement pour des fonctionnalités **très complexes** avec des parties **vraiment indépendantes**.

**Quand utiliser les worktrees** :

- Fonctionnalités massives nécessitant plusieurs aspects complètement indépendants
- Besoin de tester plusieurs approches en parallèle
- Deadline très serrée nécessitant vraie parallélisation

**Quand ne PAS utiliser les worktrees** :

- ❌ Tâches simples ou moyennes (90% des cas)
- ❌ Quand les agents ont des dépendances (la plupart du temps)
- ❌ Pour débuter avec le workflow multi-agent

Voir [WORKTREES_SETUP.md](./WORKTREES_SETUP.md) pour le guide complet (option avancée uniquement).

### Approche "multi-agent" en une interaction (pour tâches complexes)

Pour des tâches très complexes, vous pouvez demander à Cursor de considérer plusieurs perspectives en une seule interaction :

```
Implémente une fonctionnalité de notifications push en adoptant successivement ces rôles:

1. RepoScout: Explore le repo pour identifier les patterns existants de notifications
2. Architect: Planifie l'architecture (Firebase Functions, routes API, composants UI)
3. NextJS: Crée les composants UI et routes API
4. Firebase: Configure les Cloud Functions et Firestore rules
5. Tester: Écrit les tests unitaires et d'intégration
6. Reviewer: Vérifie la qualité, sécurité et cohérence

Commence par le rôle RepoScout et passe au suivant une fois terminé.
```

## Workflow typique simplifié

### 1. Planification

**Prompt**:

```
Plan: Ajouter une nouvelle page de statistiques
```

### 2. Développement séquentiel

Travaillez étape par étape en demandant à Cursor d'adopter le rôle approprié :

- **Exploration**: `Agis comme RepoScout: explore...`
- **Implémentation**: `Agis comme NextJS: implémente...`
- **Tests**: `Agis comme Tester: écris les tests...`

### 3. Validation

- **check-fast**: `Exécute npm run check:dev`
- **check-full**: `Exécute npm run check`

### 4. Review

**Prompt**:

```
Agis comme Reviewer: vérifie que le code est prêt pour une PR
```

## Prompts Cursor

Voir [CURSOR_COMMANDS.md](./CURSOR_COMMANDS.md) pour la liste complète des prompts prêts à l'emploi.

**Note**: Ces prompts sont à copier-coller dans le chat Cursor (Cmd+L ou Ctrl+L), ce ne sont pas des commandes slash intégrées.

## Bonnes pratiques

1. **Toujours commencer par un plan** avant d'implémenter (`Plan: [description]`)
2. **Utiliser l'approche séquentielle** pour la majorité des cas (plus simple et efficace)
3. **Valider fréquemment** pendant le développement (`Exécute npm run check:dev`)
4. **Validation complète** avant de créer une PR (`Exécute npm run check`)
5. **Vérifier avec Reviewer** avant de pousser (`Agis comme Reviewer: vérifie que le code est prêt pour une PR`)
6. **Documenter les décisions** avec des ADR si nécessaire

## Exemples concrets

Pour des exemples détaillés et pratiques, voir [WORKFLOW_EXAMPLES.md](./WORKFLOW_EXAMPLES.md).

## Résumé

Le workflow multi-agent est une **méthode d'organisation** où vous guidez Cursor pour adopter différents rôles spécialisés.

**Pour 90% des cas** : Utilisez l'approche séquentielle (un rôle à la fois)
**Pour 10% des cas** : Utilisez les worktrees Git pour vraie parallélisation (fonctionnalités très complexes uniquement)

L'important est de structurer votre interaction avec Cursor selon les besoins de la tâche.

## Quality Gates

Voir [QUALITY_GATES.md](./QUALITY_GATES.md) pour la description complète des quality gates.

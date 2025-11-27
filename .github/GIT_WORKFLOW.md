# Workflow Git/GitHub pour la Production

Ce document décrit le workflow Git/GitHub recommandé pour gérer les versions et déploiements en production, ainsi que comment les règles `.cursorrules` appliquent ce workflow.

## 📋 Principes

1. **Un commit par fonctionnalité** : Chaque fonctionnalité est développée dans une branche dédiée
2. **Pull Requests obligatoires** : Toutes les fonctionnalités passent par une PR avant d'être mergées
3. **Main = Production** : La branche `main` est toujours déployable et correspond à la production
4. **Déploiement automatique** : Chaque merge sur `main` déclenche un déploiement automatique
5. **Tags de version** : Les versions importantes sont taguées pour faciliter le suivi

## 🌿 Structure des branches

### Branche principale
- **`main`** : Branche de production, toujours stable et déployable

### Branches de fonctionnalités
- **`feature/nom-fonctionnalite`** : Développement d'une nouvelle fonctionnalité
- **`fix/nom-correction`** : Correction d'un bug
- **`refactor/nom-refactoring`** : Refactoring de code
- **`docs/nom-documentation`** : Amélioration de la documentation

### Exemples de noms de branches
```
feature/discord-integration
feature/player-burnout-calculation
fix/discord-message-permissions
refactor/composition-validation
docs/api-documentation
```

## 🔄 Workflow de développement

### 1. Créer une branche de fonctionnalité

```bash
# Mettre à jour main
git checkout main
git pull origin main

# Créer et basculer sur une nouvelle branche
git checkout -b feature/nom-fonctionnalite
```

### 2. Développer la fonctionnalité

- Faire des commits atomiques et descriptifs
- Chaque commit doit être fonctionnel (pas de commits cassés)
- Utiliser des messages de commit clairs (voir section "Messages de commit")

### 3. Pousser la branche et créer une PR

```bash
# Pousser la branche
git push origin feature/nom-fonctionnalite
```

Ensuite, sur GitHub :
1. Cliquez sur **"Compare & pull request"**
2. Remplissez le titre et la description
3. Attendez que les checks CI passent
4. Obtenez une approbation si nécessaire
5. Merge la PR

### 4. Merge sur main

Une fois la PR approuvée et les checks passés :
- Merge la PR sur `main`
- Le déploiement automatique se déclenche
- Supprimez la branche de fonctionnalité (optionnel)

## 📝 Messages de commit (Conventional Commits)

### Format

```
<type>(<scope>): <description>

[corps optionnel]

[pied de page optionnel]
```

### Types autorisés

- **`feat`** : Nouvelle fonctionnalité
- **`fix`** : Correction de bug
- **`docs`** : Documentation
- **`style`** : Formatage, point-virgules manquants, etc. (pas de changement de code)
- **`refactor`** : Refactoring de code
- **`test`** : Ajout ou modification de tests
- **`chore`** : Tâches de maintenance (dépendances, config, etc.)

### Exemples

```bash
feat(discord): ajout de la vérification de signature Ed25519
fix(compositions): correction du calcul de brûlage
refactor(validation): simplification de la logique
docs(api): ajout de la documentation des routes
chore(deps): mise à jour des dépendances
```

## 🛡️ Comment les .cursorrules appliquent le workflow

Les règles dans `.cursorrules` font en sorte que l'IA :
- ✅ Vous rappelle toujours de créer une branche avant de développer
- ✅ Vous incite à utiliser des messages de commit conventionnels
- ✅ Vous rappelle de créer une PR avant de merge sur main
- ✅ Vérifie que le code est prêt avant commit/push

### Protection de la branche main

**Règle** : "NE JAMAIS commiter directement sur `main` ou `master`"

**Comportement** :
- Si vous demandez de commiter/pousser sur main, l'IA va :
  - ❌ Refuser poliment
  - ✅ Vous rappeler de créer une branche d'abord
  - ✅ Vous proposer la commande pour créer la branche

### Structure des branches

**Règle** : "TOUJOURS créer une branche dédiée avant de développer"

**Comportement** :
- L'IA suggère toujours de créer une branche avec le bon préfixe :
  - `feature/` pour les nouvelles fonctionnalités
  - `fix/` pour les bugs
  - `refactor/` pour les refactorings
  - `docs/` pour la documentation

### Messages de commit conventionnels

**Règle** : "TOUJOURS utiliser le format Conventional Commits"

**Comportement** :
- Si vous proposez un message non conforme, l'IA va :
  - ✅ Vous suggérer un message conforme
  - ✅ Expliquer le format attendu

### Pull Requests obligatoires

**Règle** : "AVANT de pousser sur main, TOUJOURS créer une Pull Request"

**Comportement** :
- Avant chaque push, l'IA va :
  - ✅ Vérifier que vous êtes sur une branche feature/fix/etc
  - ✅ Vous rappeler de créer une PR après le push
  - ✅ Vous donner les étapes pour créer la PR

### Vérifications avant commit/push

**Règle** : "AVANT chaque commit/push, vérifier que tout est OK"

**Comportement** :
- L'IA exécute toujours :
  - ✅ `npm run check:dev` avant commit
  - ✅ `npm run check` avant push
  - ✅ Vérifie qu'il n'y a pas de TODO
  - ✅ Vérifie que les messages de commit sont conformes

## 🔄 Flux de travail complet

```
┌─────────────────┐
│  Feature Branch │
└────────┬────────┘
         │
         │ Push + PR
         ▼
┌─────────────────┐
│  Pull Request   │───► CI Workflow (lint, type-check, build)
└────────┬────────┘
         │
         │ Review + Approve
         ▼
┌─────────────────┐
│  Merge to main  │
└────────┬────────┘
         │
         ├──► CI Workflow (vérification)
         ├──► Deploy Production (App Hosting)
         └──► Deploy Firestore (si règles modifiées)
```

## 📚 Ressources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Configuration GitHub Actions](./workflows/SETUP.md)


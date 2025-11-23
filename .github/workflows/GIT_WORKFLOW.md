# Workflow Git/GitHub pour la Production

Ce document décrit le workflow Git/GitHub recommandé pour gérer les versions et déploiements en production.

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
- Utiliser des messages de commit clairs :
  ```bash
  git commit -m "feat: ajout de la vérification de signature Discord"
  git commit -m "fix: correction du calcul de brûlage pour les équipes"
  git commit -m "refactor: simplification de la validation des compositions"
  ```

### 3. Pousser la branche et créer une Pull Request

```bash
# Pousser la branche
git push origin feature/nom-fonctionnalite
```

Ensuite, créer une Pull Request sur GitHub :
- Titre descriptif : `feat: Ajout de la vérification de signature Discord`
- Description détaillée de la fonctionnalité
- Référencer les issues liées si applicable

### 4. Review et validation

- Le workflow CI vérifie automatiquement :
  - ✅ Lint (ESLint)
  - ✅ Type-check (TypeScript)
  - ✅ Build (Next.js)
- Un reviewer doit approuver la PR
- Tous les checks doivent passer avant le merge

### 5. Merge sur main

Une fois la PR approuvée et les checks passés :
- **Option 1 : Merge commit** (recommandé pour l'historique)
  - Cliquer sur "Merge pull request" → "Create a merge commit"
  - Conserve l'historique complet des branches

- **Option 2 : Squash and merge** (pour nettoyer l'historique)
  - Cliquer sur "Merge pull request" → "Squash and merge"
  - Combine tous les commits en un seul commit propre

### 6. Déploiement automatique

Après le merge sur `main` :
1. ✅ Le workflow CI vérifie le code
2. ✅ Le workflow de déploiement déploie automatiquement sur Firebase App Hosting
3. ✅ Les règles Firestore sont déployées si modifiées

## 🏷️ Gestion des versions

### Créer un tag de version

Pour marquer une version importante (release) :

```bash
# Mettre à jour main
git checkout main
git pull origin main

# Créer un tag (semantic versioning : v1.0.0, v1.1.0, v1.0.1)
git tag -a v1.0.0 -m "Release v1.0.0: Intégration Discord complète"
git push origin v1.0.0
```

### Convention de versionnement (Semantic Versioning)

- **MAJOR** (v2.0.0) : Changements incompatibles avec les versions précédentes
- **MINOR** (v1.1.0) : Nouvelles fonctionnalités rétro-compatibles
- **PATCH** (v1.0.1) : Corrections de bugs rétro-compatibles

### Exemples de tags

```bash
v1.0.0  # Première version stable
v1.1.0  # Ajout de nouvelles fonctionnalités
v1.1.1  # Correction de bugs
v2.0.0  # Refonte majeure
```

## 📝 Messages de commit

Utiliser le format [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <description>

[corps optionnel]

[footer optionnel]
```

### Types de commits

- **feat** : Nouvelle fonctionnalité
- **fix** : Correction de bug
- **docs** : Documentation
- **style** : Formatage, point-virgules manquants, etc.
- **refactor** : Refactoring de code
- **test** : Ajout de tests
- **chore** : Tâches de maintenance (dépendances, config, etc.)

### Exemples

```bash
feat(discord): ajout de la vérification de signature Ed25519
fix(compositions): correction du calcul de brûlage pour les équipes multiples
refactor(validation): simplification de la logique de validation
docs(readme): mise à jour de la documentation d'installation
chore(deps): mise à jour de Next.js vers 15.5.3
```

## 🚀 Déploiement

### Déploiement automatique

Le déploiement se fait automatiquement via GitHub Actions :
- **Déclenchement** : Push sur `main`
- **Actions** :
  1. Vérification du code (lint, type-check, build)
  2. Déploiement sur Firebase App Hosting
  3. Déploiement des règles Firestore si modifiées

### Déploiement manuel (si nécessaire)

```bash
# Déployer l'application
npm run deploy:apphosting

# Déployer les règles Firestore
npm run deploy:firestore:prod
```

## 🔍 Vérifications avant merge

Avant de créer une PR, vérifier localement :

```bash
# Vérifier le lint et le type-check (sans build)
npm run check:dev

# Vérifier le build complet (avant de pousser)
npm run check
```

## 📋 Checklist pour une PR

- [ ] Code testé localement
- [ ] `npm run check:dev` passe sans erreur
- [ ] Messages de commit clairs et descriptifs
- [ ] Description de la PR complète
- [ ] Pas de console.log oubliés
- [ ] Pas de TODO dans le code
- [ ] Documentation mise à jour si nécessaire

## 🐛 Gestion des hotfixes

Pour les corrections urgentes en production :

```bash
# Créer une branche depuis main
git checkout main
git pull origin main
git checkout -b hotfix/correction-urgente

# Faire les corrections
git commit -m "fix: correction urgente du problème X"

# Pousser et créer une PR
git push origin hotfix/correction-urgente
```

Après merge, créer un tag de version patch :
```bash
git tag -a v1.0.1 -m "Hotfix: correction du problème X"
git push origin v1.0.1
```

## 📊 Suivi des versions

### Voir les tags existants

```bash
git tag -l
git tag -l "v1.*"  # Filtrer par pattern
```

### Voir les changements entre versions

```bash
git log v1.0.0..v1.1.0  # Entre deux versions
git diff v1.0.0..v1.1.0  # Diff détaillé
```

## 🔐 Protection de la branche main

Il est recommandé de configurer les protections de branche sur GitHub :

1. Aller dans **Settings** → **Branches**
2. Ajouter une règle pour `main` :
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1 reviewer minimum)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

## 📚 Ressources

- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)


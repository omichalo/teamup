# GitHub Actions Workflows

Ce dossier contient les workflows GitHub Actions pour l'automatisation du CI/CD.

## 📋 Workflows disponibles

### 1. CI - Lint, Type-check and Build (`ci.yml`)

**Déclenchement** :

- Sur chaque Pull Request vers `main`
- Sur chaque push sur `main`

**Actions** :

- ✅ Vérification du lint (ESLint)
- ✅ Vérification du type-check (TypeScript)
- ✅ Build de l'application (Next.js)
- ✅ Vérification de l'absence de TODO dans le code

**Objectif** : S'assurer que le code est valide avant le merge.

---

### 2. Deploy to Production (`deploy-production.yml`)

**Déclenchement** :

- Sur chaque push sur `main` (sauf les commits de merge automatiques)
- Ignore les modifications de documentation (`.md`)

**Actions** :

- ✅ Vérification du code (lint, type-check, build)
- ✅ Déploiement automatique sur Firebase App Hosting
- ✅ Nettoyage des fichiers sensibles

**Objectif** : Déployer automatiquement chaque modification sur `main` en production.

**Configuration requise** :

- Secret GitHub : `FIREBASE_SERVICE_ACCOUNT` (même secret que pour Firestore)

---

### 3. Deploy Firestore Rules and Indexes (`deploy-firestore.yml`)

**Déclenchement** :

- Sur chaque push sur `main` ou `master` si les fichiers suivants sont modifiés :
  - `firestore.rules`
  - `firestore.indexes.json`
  - `.github/workflows/deploy-firestore.yml`
- Peut être déclenché manuellement via `workflow_dispatch`

**Actions** :

- ✅ Déploiement des règles Firestore
- ✅ Déploiement des index Firestore

**Objectif** : Maintenir les règles et index Firestore à jour en production.

**Configuration requise** :

- Secret GitHub : `FIREBASE_SERVICE_ACCOUNT`

---

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

## 🔐 Secrets GitHub requis

### `FIREBASE_SERVICE_ACCOUNT`

JSON complet du service account Firebase avec les permissions suivantes :

- `roles/firebase.admin` (recommandé) OU
- `roles/firebaserules.admin` + `roles/datastore.user` + `roles/datastore.indexAdmin` + `roles/serviceusage.serviceUsageAdmin`

**Comment configurer** :

1. Allez dans [Google Cloud Console - Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=sqyping-teamup)
2. Créez ou sélectionnez un service account
3. Ajoutez les rôles nécessaires
4. Créez une clé JSON
5. Copiez le contenu complet du JSON
6. Dans GitHub : **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
7. Nom : `FIREBASE_SERVICE_ACCOUNT`
8. Valeur : collez le JSON complet

## 📚 Documentation

- [Guide du workflow Git/GitHub](./GIT_WORKFLOW.md) : Workflow complet de développement
- [Configuration Firestore](./SETUP.md) : Configuration détaillée pour Firestore

## 🐛 Dépannage

### Le workflow CI échoue

1. Vérifier les logs dans l'onglet **Actions** de GitHub
2. Exécuter localement : `npm run check`
3. Corriger les erreurs de lint, type-check ou build

### Le déploiement échoue

1. Vérifier que le secret `FIREBASE_SERVICE_ACCOUNT` est bien configuré
2. Vérifier que le service account a les permissions nécessaires
3. Vérifier les logs dans l'onglet **Actions** de GitHub

### Les règles Firestore ne se déploient pas

1. Vérifier que les fichiers `firestore.rules` ou `firestore.indexes.json` ont été modifiés
2. Le workflow se déclenche uniquement si ces fichiers sont modifiés
3. Pour forcer le déploiement : utiliser `workflow_dispatch` dans l'onglet **Actions**

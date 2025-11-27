# Configuration GitHub Actions - Guide complet

Ce guide couvre toute la configuration nécessaire pour les workflows GitHub Actions du projet TeamUp.

## 📋 Table des matières

1. [Workflows disponibles](#workflows-disponibles)
2. [Configuration initiale](#configuration-initiale)
3. [Protection de branche](#protection-de-branche)
4. [Tests et validation](#tests-et-validation)
5. [Dépannage](#dépannage)

---

## Workflows disponibles

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
- Secret GitHub : `FIREBASE_SERVICE_ACCOUNT`

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

## Configuration initiale

### Étape 1 : Créer un service account dans Google Cloud

1. **Ouvrez la console Google Cloud** :
   - Allez sur [Google Cloud Console - Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=sqyping-teamup)
   - Assurez-vous que le projet `sqyping-teamup` est sélectionné

2. **Créez un nouveau service account** :
   - Cliquez sur **Créer un compte de service**
   - **Nom** : `github-actions-firestore-deploy`
   - **Description** : `Service account pour déployer les règles Firestore via GitHub Actions`
   - Cliquez sur **Créer et continuer**

3. **Ajoutez les rôles nécessaires** :
   - Recherchez et sélectionnez **Administrateur Firebase** (`roles/firebase.admin`)
   - ⚠️ **Important** : Ce rôle inclut tous les rôles nécessaires (recommandé)
   - Cliquez sur **Continuer** puis **Terminer**

### Étape 2 : Générer une clé JSON

1. **Trouvez votre service account** dans la liste
2. **Créez une clé JSON** :
   - Allez dans l'onglet **Clés**
   - Cliquez sur **Ajouter une clé** → **Créer une nouvelle clé**
   - Sélectionnez **JSON**
   - Cliquez sur **Créer**
   - ⚠️ **Important** : Le fichier JSON sera téléchargé. Gardez-le en sécurité !

### Étape 3 : Configurer le secret dans GitHub

1. **Ouvrez les paramètres de votre dépôt GitHub** :
   - Allez sur votre dépôt GitHub
   - Cliquez sur **Settings** → **Secrets and variables** → **Actions**

2. **Créez un nouveau secret** :
   - Cliquez sur **New repository secret**
   - **Name** : `FIREBASE_SERVICE_ACCOUNT` (respectez la casse)
   - **Secret** : Collez le contenu complet du fichier JSON téléchargé
   - ⚠️ **Important** : Assurez-vous qu'il n'y a pas d'espaces avant ou après le JSON
   - Cliquez sur **Add secret**

---

## Protection de branche

### Configuration de la protection pour `main`

1. **Accéder aux paramètres** :
   - GitHub → **Settings** → **Branches**

2. **Ajouter une règle de protection** :
   - Cliquez sur **Add rule**
   - **Branch name pattern** : `main`

3. **Configurer les options** :

   #### ✅ Require a pull request before merging
   - ✅ Cocher **Require a pull request before merging**
   - ✅ **Require approvals** : `1` (minimum)
   - ✅ **Dismiss stale pull request approvals when new commits are pushed**

   #### ✅ Require status checks to pass before merging
   - ✅ Cocher **Require status checks to pass before merging**
   - ✅ Cocher **Require branches to be up to date before merging**
   - Dans la liste, cocher : `check / check`

   #### ✅ Autres options recommandées
   - ✅ **Require conversation resolution before merging**
   - ✅ **Require linear history**
   - ✅ **Include administrators**

4. **Sauvegarder** : Cliquez sur **Create**

### Vérification

Pour vérifier que la protection est active :
1. Créez une branche de test : `git checkout -b test-branch-protection`
2. Faites un commit : `git commit --allow-empty -m "test"`
3. Essayez de push directement sur `main` : `git push origin test-branch-protection:main`
4. GitHub devrait refuser le push ou demander une PR

---

## Tests et validation

### Test 1 : Workflow CI sur une PR

1. **Créer une branche de test** :
   ```bash
   git checkout -b test/ci-workflow-validation
   ```

2. **Faire une modification mineure** (ex: ajouter un commentaire)

3. **Commiter et pousser** :
   ```bash
   git add .
   git commit -m "test: validation du workflow CI"
   git push origin test/ci-workflow-validation
   ```

4. **Créer une PR sur GitHub**

5. **Vérifier** :
   - ✅ Le workflow CI se déclenche automatiquement
   - ✅ Les checks apparaissent dans la PR
   - ✅ Tous les checks passent (lint, type-check, build)

### Test 2 : Déploiement Firestore

1. **Déclenchez le workflow manuellement** :
   - GitHub → **Actions** → **Deploy Firestore Rules and Indexes**
   - Cliquez sur **Run workflow**
   - Sélectionnez la branche `main`
   - Cliquez sur **Run workflow**

2. **Surveillez l'exécution** :
   - ✅ Si tout fonctionne : "✅ Règles et index Firestore déployés avec succès"
   - ❌ Si erreur : Consultez la section "Dépannage"

### Checklist de validation

- [ ] Protection de branche main activée
- [ ] Secret `FIREBASE_SERVICE_ACCOUNT` configuré
- [ ] Workflow CI s'exécute sur les PR
- [ ] Workflow de déploiement s'exécute sur merge
- [ ] Workflow Firestore fonctionne

---

## Dépannage

### Le workflow CI échoue

1. Vérifier les logs dans l'onglet **Actions** de GitHub
2. Exécuter localement : `npm run check`
3. Corriger les erreurs de lint, type-check ou build

### Le déploiement échoue

1. Vérifier que le secret `FIREBASE_SERVICE_ACCOUNT` est bien configuré
2. Vérifier que le service account a les permissions nécessaires
3. Vérifier les logs dans l'onglet **Actions** de GitHub

### Erreur : "403, The caller does not have permission"

**Solution** :
- Vérifier que le service account a le rôle **Administrateur Firebase** dans Google Cloud Console
- Allez dans [Google Cloud Console - IAM](https://console.cloud.google.com/iam-admin/iam?project=sqyping-teamup)
- Trouvez votre service account et ajoutez le rôle si nécessaire

### Erreur : "403, Permission denied to get service [firestore.googleapis.com]"

**Solution** :
- Le service account n'a pas les permissions pour activer les APIs
- Ajoutez le rôle **Administrateur Service Usage** (`roles/serviceusage.serviceUsageAdmin`)
- **OU** utilisez le rôle **Administrateur Firebase** qui inclut cette permission (recommandé)

### Les checks ne s'affichent pas dans la PR

- Attendez quelques secondes (GitHub peut prendre du temps)
- Les checks n'apparaissent qu'après la première exécution
- Créez une PR de test pour déclencher le workflow CI

---

## 📚 Ressources supplémentaires

- [Documentation Firebase - Service Accounts](https://firebase.google.com/docs/admin/setup)
- [Documentation GitHub Actions - Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Documentation Google Cloud - IAM](https://cloud.google.com/iam/docs)
- [Guide du workflow Git/GitHub](./GIT_WORKFLOW.md)

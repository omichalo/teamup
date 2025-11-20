# Guide de configuration GitHub Actions pour le déploiement Firestore

Ce guide vous explique étape par étape comment configurer GitHub Actions pour déployer automatiquement les règles et index Firestore.

## 📋 Prérequis

- Un compte Google Cloud avec accès au projet Firebase `sqyping-teamup`
- Un dépôt GitHub avec les fichiers `firestore.rules` et `firestore.indexes.json`

## 🔧 Configuration étape par étape

### Étape 1 : Créer un service account dans Google Cloud

1. **Ouvrez la console Google Cloud** :

   - Allez sur [Google Cloud Console - Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=sqyping-teamup)
   - Assurez-vous que le projet `sqyping-teamup` est sélectionné

2. **Créez un nouveau service account** :

   - Cliquez sur **Créer un compte de service** (bouton en haut)
   - **Nom du compte de service** : `github-actions-firestore-deploy` (ou un nom de votre choix)
   - **Description** : `Service account pour déployer les règles Firestore via GitHub Actions`
   - Cliquez sur **Créer et continuer**

3. **Ajoutez les rôles nécessaires** :

   - Dans la section **Accorder l'accès à ce compte de service**, cliquez sur **Sélectionner un rôle**
   - Recherchez et sélectionnez **Administrateur Firebase** ou **Firebase Admin SDK Administrator Service Agent** (nom technique : `roles/firebase.admin`)
   - ⚠️ **Important** : Ce rôle est recommandé car il inclut tous les rôles nécessaires (règles, index, activation des APIs)
   - **Alternative** : Si vous préférez utiliser des rôles spécifiques, ajoutez :
     - **Administrateur des règles Firebase** (`roles/firebaserules.admin`)
     - **Utilisateur Cloud Datastore** (`roles/datastore.user`)
     - **Administrateur d'index Cloud Datastore** (`roles/datastore.indexAdmin`)
     - **Administrateur Service Usage** (`roles/serviceusage.serviceUsageAdmin`) - **NÉCESSAIRE** pour activer les APIs comme Firestore
   - Cliquez sur **Ajouter un autre rôle** si vous voulez ajouter des rôles supplémentaires
   - Cliquez sur **Continuer**

4. **Finalisez la création** :
   - Vous pouvez laisser la section "Accorder aux utilisateurs l'accès à ce compte de service" vide
   - Cliquez sur **Terminer**

### Étape 2 : Générer une clé JSON pour le service account

1. **Trouvez votre service account** :

   - Dans la liste des comptes de service, cliquez sur celui que vous venez de créer (`github-actions-firestore-deploy`)

2. **Créez une clé JSON** :

   - Allez dans l'onglet **Clés** (en haut)
   - Cliquez sur **Ajouter une clé** → **Créer une nouvelle clé**
   - Sélectionnez **JSON** comme type de clé
   - Cliquez sur **Créer**
   - ⚠️ **Important** : Le fichier JSON sera téléchargé automatiquement. Gardez-le en sécurité !

3. **Vérifiez le fichier JSON** :
   - Ouvrez le fichier téléchargé avec un éditeur de texte
   - Il doit commencer par `{` et se terminer par `}`
   - Il doit contenir des champs comme `type`, `project_id`, `private_key_id`, `private_key`, etc.

### Étape 3 : Configurer le secret dans GitHub

1. **Ouvrez les paramètres de votre dépôt GitHub** :

   - Allez sur votre dépôt GitHub
   - Cliquez sur **Settings** (en haut à droite)
   - Dans le menu de gauche, allez dans **Secrets and variables** → **Actions**

2. **Créez un nouveau secret** :

   - Cliquez sur **New repository secret** (bouton en haut à droite)
   - **Name** : `FIREBASE_SERVICE_ACCOUNT` (exactement comme indiqué, respectez la casse)
   - **Secret** :
     - Ouvrez le fichier JSON téléchargé à l'étape précédente
     - Sélectionnez TOUT le contenu (Ctrl+A / Cmd+A)
     - Copiez-le (Ctrl+C / Cmd+C)
     - Collez-le dans le champ "Secret"
     - ⚠️ **Important** : Assurez-vous qu'il n'y a pas d'espaces avant ou après le JSON
   - Cliquez sur **Add secret**

3. **Vérifiez que le secret est créé** :
   - Vous devriez voir `FIREBASE_SERVICE_ACCOUNT` dans la liste des secrets
   - ⚠️ **Note** : Une fois créé, vous ne pourrez plus voir la valeur du secret (c'est normal pour la sécurité)

### Étape 4 : Vérifier les permissions du service account

1. **Vérifiez les rôles** :

   - Retournez dans [Google Cloud Console - IAM](https://console.cloud.google.com/iam-admin/iam?project=sqyping-teamup)
   - Cherchez votre service account dans la liste
   - Vérifiez qu'il a bien le rôle **Firebase Admin** (ou `Firebase Admin SDK Administrator Service Agent`)

2. **Si le rôle n'est pas présent** :
   - Cliquez sur l'icône ✏️ (crayon) à droite du service account
   - Cliquez sur **Ajouter un autre rôle**
   - Recherchez et sélectionnez **Firebase Admin**
   - Cliquez sur **Enregistrer**

### Étape 5 : Tester le workflow

1. **Déclenchez le workflow manuellement** :

   - Allez dans l'onglet **Actions** de votre dépôt GitHub
   - Dans le menu de gauche, sélectionnez **Deploy Firestore Rules and Indexes**
   - Cliquez sur **Run workflow** (bouton en haut à droite)
   - Sélectionnez la branche `main` (ou `master`)
   - Cliquez sur **Run workflow**

2. **Surveillez l'exécution** :
   - Cliquez sur le workflow qui vient de démarrer
   - Vous verrez les étapes s'exécuter en temps réel
   - ✅ Si tout fonctionne, vous verrez "✅ Règles et index Firestore déployés avec succès"
   - ❌ Si une erreur se produit, consultez la section "Dépannage" ci-dessous

## 🔍 Dépannage

### Erreur : "Le secret FIREBASE_SERVICE_ACCOUNT n'est pas défini"

**Solution** :

- Vérifiez que le secret est bien créé dans GitHub (Settings → Secrets and variables → Actions)
- Vérifiez que le nom du secret est exactement `FIREBASE_SERVICE_ACCOUNT` (respectez la casse)

### Erreur : "Le fichier JSON du service account est invalide"

**Solution** :

- Vérifiez que le secret contient bien le JSON complet (commence par `{` et se termine par `}`)
- Assurez-vous qu'il n'y a pas d'espaces avant ou après le JSON
- Recréez le secret en copiant à nouveau le contenu du fichier JSON

### Erreur : "403, The caller does not have permission"

**Solution** :

- Vérifiez que le service account a bien le rôle **Administrateur Firebase** (ou **Firebase Admin**) dans Google Cloud Console
- Allez dans [Google Cloud Console - IAM](https://console.cloud.google.com/iam-admin/iam?project=sqyping-teamup)
- Trouvez votre service account et ajoutez le rôle **Administrateur Firebase** si nécessaire

### Erreur : "403, Permission denied to get service [firestore.googleapis.com]"

**Solution** :

- Le service account n'a pas les permissions pour activer les APIs Google Cloud
- Allez dans [Google Cloud Console - IAM](https://console.cloud.google.com/iam-admin/iam?project=sqyping-teamup)
- Trouvez votre service account et ajoutez le rôle **Administrateur Service Usage** (`roles/serviceusage.serviceUsageAdmin`)
- **OU** utilisez le rôle **Administrateur Firebase** qui inclut automatiquement cette permission (recommandé)

### Erreur : "Failed to authenticate, have you run firebase login?"

**Solution** :

- Cette erreur ne devrait plus se produire avec la nouvelle configuration
- Si elle persiste, vérifiez que le fichier JSON est correctement écrit dans le workflow
- Vérifiez les logs de l'étape "Authenticate with Firebase Service Account"

## ✅ Vérification finale

Une fois le workflow configuré et testé avec succès :

1. **Le workflow se déclenchera automatiquement** lorsque :

   - Vous poussez des modifications sur `firestore.rules` ou `firestore.indexes.json` sur la branche `main` ou `master`
   - Vous modifiez le fichier `.github/workflows/deploy-firestore.yml`

2. **Vous pouvez aussi le déclencher manuellement** depuis l'onglet Actions de GitHub

3. **Les règles et index seront déployés** sur le projet Firebase `sqyping-teamup` (production)

## 📚 Ressources supplémentaires

- [Documentation Firebase - Service Accounts](https://firebase.google.com/docs/admin/setup)
- [Documentation GitHub Actions - Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Documentation Google Cloud - IAM](https://cloud.google.com/iam/docs)

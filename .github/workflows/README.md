# GitHub Actions Workflows

## Deploy Firestore Rules and Indexes

Ce workflow déploie automatiquement les règles et index Firestore en production.

### Déclenchement

Le workflow se déclenche automatiquement lorsque :

- Un push est effectué sur les branches `main` ou `master`
- ET que les fichiers suivants ont été modifiés :
  - `firestore.rules`
  - `firestore.indexes.json`
  - `.github/workflows/deploy-firestore.yml`

Le workflow peut également être déclenché manuellement depuis l'onglet "Actions" de GitHub.

### Configuration requise

#### Secret GitHub : `FIREBASE_SERVICE_ACCOUNT`

Ce secret doit contenir le JSON complet du service account Firebase avec les permissions suivantes :

- **Recommandé** : `roles/firebase.admin` (nom français : **Administrateur Firebase** ou **Firebase Admin SDK Administrator Service Agent**) - Accès complet à Firebase (inclut tout)
- **OU** les rôles spécifiques suivants :
  - `roles/firebaserules.admin` (nom français : **Administrateur des règles Firebase**) - **NÉCESSAIRE** pour déployer les règles Firestore
  - `roles/datastore.user` (nom français : **Utilisateur Cloud Datastore**) - Pour lire/écrire dans Firestore
  - `roles/datastore.indexAdmin` (nom français : **Administrateur d'index Cloud Datastore**) - Pour déployer les index Firestore
  - `roles/serviceusage.serviceUsageAdmin` (nom français : **Administrateur Service Usage**) - **NÉCESSAIRE** pour activer les APIs (comme Firestore API)

**⚠️ Important** : Le service account doit avoir au minimum les rôles suivants :

- `roles/firebaserules.admin` pour déployer les règles Firestore
- `roles/serviceusage.serviceUsageAdmin` pour activer les APIs nécessaires

Sans ces rôles, vous obtiendrez une erreur 403 "Permission denied".

**Comment obtenir le service account** :

1. Allez dans [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=sqyping-teamup)
2. Cliquez sur **Créer un compte de service** (ou utilisez un compte existant)
3. Donnez-lui un nom (ex: `github-actions-firestore-deploy`)
4. Cliquez sur **Créer et continuer**
5. **Ajoutez les rôles suivants** (IMPORTANT) :
   - **Administrateur Firebase** ou **Firebase Admin SDK Administrator Service Agent** (`roles/firebase.admin`) - **Recommandé** (inclut tous les rôles nécessaires)
   - OU les rôles spécifiques suivants :
     - **Administrateur des règles Firebase** (`roles/firebaserules.admin`)
     - **Utilisateur Cloud Datastore** (`roles/datastore.user`)
     - **Administrateur d'index Cloud Datastore** (`roles/datastore.indexAdmin`)
     - **Administrateur Service Usage** (`roles/serviceusage.serviceUsageAdmin`) - **NÉCESSAIRE** pour activer les APIs
6. Cliquez sur **Terminer**
7. Cliquez sur le service account créé
8. Allez dans l'onglet **Clés**
9. Cliquez sur **Ajouter une clé** → **Créer une nouvelle clé**
10. Sélectionnez **JSON** et cliquez sur **Créer**
11. Téléchargez le fichier JSON
12. **Important** : Ouvrez le fichier JSON et copiez TOUT son contenu (de `{` jusqu'à `}`)
13. Dans GitHub, allez dans **Settings** → **Secrets and variables** → **Actions**
14. Cliquez sur **New repository secret**
15. Nom : `FIREBASE_SERVICE_ACCOUNT`
16. Valeur : collez le contenu COMPLET du fichier JSON (sans espaces avant/après)
17. Cliquez sur **Add secret**

**⚠️ Vérification** : Assurez-vous que le secret contient bien un JSON valide commençant par `{` et se terminant par `}`. Le secret ne doit PAS être vide.

### Vérification de la configuration

Après avoir configuré le secret, vous pouvez tester le workflow :

1. Allez dans l'onglet **Actions** de votre dépôt GitHub
2. Sélectionnez le workflow **Deploy Firestore Rules and Indexes**
3. Cliquez sur **Run workflow** → **Run workflow**
4. Vérifiez que le workflow s'exécute sans erreur

**Si vous obtenez une erreur 403 "The caller does not have permission"** :

- Vérifiez que le service account a bien le rôle `Firebase Admin` ou `Firebase Rules Admin`
- Allez dans [Google Cloud Console - IAM](https://console.cloud.google.com/iam-admin/iam?project=sqyping-teamup)
- Trouvez votre service account et vérifiez ses rôles
- Si nécessaire, ajoutez le rôle `Firebase Admin` (recommandé)

### Projet cible

Le workflow déploie toujours sur le projet de production : `sqyping-teamup`

Pour déployer en développement, utilisez la commande manuelle :

```bash
npm run deploy:firestore:dev
```

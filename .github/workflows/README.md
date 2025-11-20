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

- `roles/datastore.user` (ou `roles/firebase.admin`)

**Comment obtenir le service account** :

1. Allez dans la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez le projet `sqyping-teamup`
3. Allez dans **Paramètres du projet** → **Comptes de service**
4. Cliquez sur **Générer une nouvelle clé privée**
5. Téléchargez le fichier JSON
6. **Important** : Ouvrez le fichier JSON et copiez TOUT son contenu (de `{` jusqu'à `}`)
7. Dans GitHub, allez dans **Settings** → **Secrets and variables** → **Actions**
8. Cliquez sur **New repository secret**
9. Nom : `FIREBASE_SERVICE_ACCOUNT`
10. Valeur : collez le contenu COMPLET du fichier JSON (sans espaces avant/après)
11. Cliquez sur **Add secret**

**⚠️ Vérification** : Assurez-vous que le secret contient bien un JSON valide commençant par `{` et se terminant par `}`. Le secret ne doit PAS être vide.

### Projet cible

Le workflow déploie toujours sur le projet de production : `sqyping-teamup`

Pour déployer en développement, utilisez la commande manuelle :

```bash
npm run deploy:firestore:dev
```

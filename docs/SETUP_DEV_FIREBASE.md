# Guide de configuration d'un projet Firebase dédié au développement

Ce guide vous permet de créer et configurer un projet Firebase séparé pour le développement, sans nécessiter le plan Blaze.

## Principe

- **En local** (`npm run dev`) : Utilise automatiquement le projet Firebase de développement via `.env.local`
- **Sur App Hosting** : Utilise automatiquement le projet Firebase de production via `apphosting.yaml`

**Aucun switch manuel nécessaire** - la séparation dev/prod est automatique selon l'environnement d'exécution. Vous ne pouvez pas accéder au projet prod depuis votre machine locale par erreur.

## Étape 1 : Créer le projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Nommez-le (ex: `sqyping-teamup-dev`)
4. **Important** : Ne cochez PAS "App Hosting" (nécessite Blaze)
5. Créez le projet

## Étape 2 : Activer les services nécessaires

### Firestore Database

1. Dans le projet, allez dans "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez "Mode test" (pour le dev, vous pouvez utiliser des règles permissives)
4. Choisissez une région (ex: `europe-west1`)

### Authentication

1. Allez dans "Authentication"
2. Cliquez sur "Commencer"
3. Activez "Email/Password"
4. Configurez les domaines autorisés : ajoutez `localhost` si nécessaire

### Storage (optionnel)

1. Allez dans "Storage"
2. Cliquez sur "Commencer"
3. Acceptez les règles par défaut

## Étape 3 : Récupérer les identifiants Firebase

1. Allez dans "Paramètres du projet" (icône ⚙️)
2. Dans "Vos applications", cliquez sur l'icône Web `</>`
3. Enregistrez l'application (nom: "teamup-dev")
4. **Copiez les identifiants** :
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## Étape 4 : Créer un compte de service pour Firebase Admin

1. Dans "Paramètres du projet", allez dans "Comptes de service"
2. Cliquez sur "Générer une nouvelle clé privée"
3. Téléchargez le fichier JSON (ex: `sqyping-teamup-dev-firebase-adminsdk-xxxxx.json`)
4. Placez-le à la racine du projet

**⚠️ Important : Ajouter les permissions nécessaires au service account**

Le service account généré automatiquement par Firebase n'a pas toujours toutes les permissions nécessaires. Vous devez lui ajouter les rôles suivants :

1. Allez dans [Google Cloud Console - IAM](https://console.cloud.google.com/iam-admin/iam?project=sqyping-teamup-dev)
2. Trouvez le service account (il devrait avoir un nom comme `firebase-adminsdk-xxxxx@sqyping-teamup-dev.iam.gserviceaccount.com`)
3. Cliquez sur l'icône ✏️ (crayon) à droite
4. Cliquez sur **Ajouter un autre rôle**
5. Ajoutez les rôles suivants :
   - **Administrateur Firebase** (`roles/firebase.admin`) - **Recommandé** (inclut tous les rôles nécessaires)
   - OU les rôles spécifiques :
     - **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`) - **NÉCESSAIRE** pour utiliser les APIs Firebase
     - **Administrateur des règles Firebase** (`roles/firebaserules.admin`) - Pour déployer les règles
6. Cliquez sur **Enregistrer**

**Note** : Le rôle `Service Usage Consumer` est nécessaire pour que Firebase Admin SDK puisse utiliser les APIs comme Identity Toolkit (génération de liens de vérification d'email, reset de mot de passe, etc.).

## Étape 5 : Configurer le développement local

### Créer `.env.local`

Créez un fichier `.env.local` à la racine du projet avec les identifiants du projet dev :

```bash
# Firebase Configuration (projet DEV - utilisé uniquement en local)
NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key_dev
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_auth_domain_dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id_dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_project_id_dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id_dev
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id_dev

# Firebase Admin (chemin vers le fichier de service account DEV)
GOOGLE_APPLICATION_CREDENTIALS=sqyping-teamup-dev-firebase-adminsdk-xxxxx.json

# Application URL (local)
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# FFTT API (utilisez les mêmes valeurs que pour la prod, ou créez des comptes de test)
ID_FFTT=votre_id_fftt
PWD_FFTT=votre_pwd_fftt

# SMTP (optionnel pour le dev, vous pouvez utiliser un service de test comme Mailtrap)
SMTP_USER=votre_smtp_user
SMTP_PASS=votre_smtp_pass
SMTP_HOST=votre_smtp_host
SMTP_PORT=587

# Discord (optionnel pour le dev)
DISCORD_TOKEN=votre_discord_token
DISCORD_SERVER_ID=votre_discord_server_id
```

**Important** : Le fichier `.env.local` est déjà dans `.gitignore`, il ne sera jamais commité.

### Mettre à jour `.firebaserc` (pour les commandes Firebase CLI)

Modifiez votre fichier `.firebaserc` pour pointer vers le projet dev :

```json
{
  "projects": {
    "default": "sqyping-teamup-dev"
  }
}
```

**Note** : Ce fichier est utilisé uniquement pour les commandes Firebase CLI en local (comme `firebase deploy --only firestore:rules`). Il n'affecte pas l'exécution de l'application Next.js.

## Étape 6 : Vérifier la configuration App Hosting (production)

Le fichier `apphosting.yaml` contient déjà les variables d'environnement pour la production. Vérifiez qu'il pointe bien vers le projet prod :

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` doit être `sqyping-teamup` (prod)
- Les autres variables `NEXT_PUBLIC_FIREBASE_*` doivent correspondre au projet prod

**Sur App Hosting, l'application utilisera automatiquement ces variables**, donc le projet prod. Aucune modification nécessaire.

## Étape 7 : Déployer les règles et index Firestore

### Règles et index identiques entre dev et prod

Les règles et index Firestore sont définis dans :

- `firestore.rules` - Règles de sécurité (identiques pour dev et prod)
- `firestore.indexes.json` - Index Firestore (identiques pour dev et prod)

**Important** : Les mêmes règles et index sont utilisés pour les deux environnements. Cela garantit la cohérence et évite les différences de comportement entre dev et prod.

### Déploiement automatique via GitHub Actions

Les règles et index Firestore sont **automatiquement déployés en production** via un workflow GitHub Actions (`.github/workflows/deploy-firestore.yml`) qui se déclenche :

- Automatiquement lors d'un push sur `main` ou `master` si les fichiers `firestore.rules` ou `firestore.indexes.json` ont été modifiés
- Manuellement via l'interface GitHub Actions (onglet "Actions" → "Deploy Firestore Rules and Indexes" → "Run workflow")

**Configuration requise** :

- Un secret GitHub nommé `FIREBASE_SERVICE_ACCOUNT` contenant le JSON du service account Firebase avec les permissions nécessaires pour déployer les règles Firestore

Voir `.github/workflows/README.md` pour plus de détails sur la configuration.

### Déploiement manuel

Pour déployer manuellement les règles et index :

**En production** :

```bash
npm run deploy:firestore:prod
```

**En développement** :

```bash
npm run deploy:firestore:dev
```

**Note** : Les règles et index sont les mêmes pour dev et prod. Seul le projet Firebase cible change.

## Utilisation

### En développement local

1. Assurez-vous que `.env.local` contient les variables du projet dev
2. Assurez-vous que `.firebaserc` pointe vers le projet dev (pour les commandes CLI)
3. Lancez simplement :
   ```bash
   npm run dev
   ```

L'application utilisera automatiquement le projet Firebase de développement.

### En production (App Hosting)

L'application déployée sur App Hosting utilisera automatiquement les variables d'environnement définies dans `apphosting.yaml`, qui pointent vers le projet de production.

**Aucune action manuelle nécessaire** - la séparation dev/prod est automatique selon l'environnement d'exécution.

## Notes importantes

- ⚠️ **Ne commitez JAMAIS** `.env.local` ou les fichiers de service account dans Git
- ✅ `.env.local` et `*-firebase-adminsdk-*.json` sont déjà dans `.gitignore`
- 🔒 Les règles Firestore en dev peuvent être permissives, mais restez prudent
- 📊 Surveillez l'utilisation dans la console Firebase pour éviter de dépasser les limites gratuites
- 🎯 **Séparation automatique** : Le projet dev est utilisé en local, le projet prod sur App Hosting
- 🔐 **Sécurité** : Impossible d'accéder au projet prod depuis votre machine locale par erreur
- 🚀 **Simplicité** : Aucun script de switch nécessaire, tout est automatique

# Configuration Firebase Admin pour le développement local

Pour que les routes API fonctionnent en développement local, vous devez configurer les credentials Firebase Admin.

## Option 1 : Variables d'environnement (Recommandé)

1. **Récupérer les credentials du service account** :
   - Allez sur [Firebase Console](https://console.firebase.google.com/project/sqyping-teamup/settings/serviceaccounts/adminsdk)
   - Cliquez sur "Générer une nouvelle clé privée"
   - Téléchargez le fichier JSON

2. **Créer un fichier `.env.local`** à la racine du projet :

```bash
# Firebase Admin SDK Credentials
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@sqyping-teamup.iam.gserviceaccount.com"
```

**Important** : Le `FIREBASE_PRIVATE_KEY` doit contenir les sauts de ligne `\n` comme dans le fichier JSON. 

**Exemple de récupération depuis le JSON** :
```bash
# Dans le fichier JSON téléchargé, copiez :
# - "private_key" → FIREBASE_PRIVATE_KEY (en gardant les \n)
# - "client_email" → FIREBASE_CLIENT_EMAIL
```

## Option 2 : gcloud CLI

Si vous avez installé `gcloud` et que vous êtes connecté :

```bash
gcloud auth application-default login
```

**Note** : Cette méthode peut nécessiter un navigateur et peut ne pas fonctionner dans tous les environnements.

## Option 3 : Fichier Service Account JSON

1. Téléchargez le fichier JSON du service account depuis Firebase Console
2. Placez-le dans un répertoire sécurisé (par exemple `~/.config/firebase/`)
3. Définissez la variable d'environnement :

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

Ou ajoutez dans `.env.local` :
```bash
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

## Vérification

Après configuration, redémarrez le serveur de développement :

```bash
npm run dev
```

Testez l'API :
```bash
curl http://localhost:3000/api/teams
```

Si tout fonctionne, vous devriez recevoir une liste d'équipes au lieu d'une erreur.

## Sécurité

⚠️ **IMPORTANT** : 
- Ne jamais commiter le fichier `.env.local` dans Git
- Ne jamais commiter les fichiers de service account JSON
- Le fichier `.env.local` est déjà dans `.gitignore`


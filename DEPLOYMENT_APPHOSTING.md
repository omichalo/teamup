# Déploiement sur Firebase App Hosting

Ce guide explique comment déployer l'application Next.js sur Firebase App Hosting.

## 📋 Prérequis

1. Firebase CLI installé et à jour (`firebase --version`)
2. Projet Firebase configuré (sqyping-teamup)
3. Variables d'environnement configurées
4. **Important** : Firebase App Hosting doit être activé dans la console Firebase

## 🚀 Étapes de déploiement

### 1. Activer Firebase App Hosting dans la console

1. Accédez à la [Console Firebase App Hosting](https://console.firebase.google.com/project/sqyping-teamup/apphosting)
2. Si ce n'est pas encore activé, cliquez sur "Get Started" pour activer App Hosting
3. Sélectionnez votre projet Firebase (sqyping-teamup)

### 2. Initialiser App Hosting (première fois)

Exécutez la commande suivante pour initialiser la configuration :

```bash
firebase init apphosting
```

**Réponses attendues :**
- Sélectionnez le projet : `sqyping-teamup` (ou utilisez l'alias `default`)
- Framework : `Next.js`
- Build command : `npm run build` (ou gardez la valeur par défaut)
- Run command : `npm start` (ou gardez la valeur par défaut)
- Directory : `.` (racine du projet)

Cette commande va créer/modifier :
- `.firebase/apphosting.yaml` (configuration App Hosting)
- Mettre à jour `firebase.json` si nécessaire

### 3. Configurer les variables d'environnement

**Option 1 : Via la console Firebase**
1. Accédez à [Console Firebase App Hosting](https://console.firebase.google.com/project/sqyping-teamup/apphosting)
2. Sélectionnez votre environnement (preview ou production)
3. Allez dans "Environment variables"
4. Ajoutez les variables nécessaires :
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FFTT_API_KEY` (si nécessaire)
   - `FFTT_API_SECRET` (si nécessaire)

**Option 2 : Via le fichier de configuration local**
Vous pouvez aussi définir les variables dans `.firebase/apphosting.yaml` ou via GitHub Actions si vous utilisez l'intégration GitHub.

### 4. Vérifier la configuration

Vérifiez que les fichiers suivants sont présents et correctement configurés :

```bash
# Vérifier le projet Firebase
cat .firebaserc

# Vérifier la configuration App Hosting
cat .firebase/apphosting.yaml

# Vérifier firebase.json
cat firebase.json
```

### 5. Déployer l'application

#### Méthode 1 : Via Firebase CLI (preview)

```bash
npm run deploy:apphosting
```

Ou directement :

```bash
firebase deploy --only apphosting
```

#### Méthode 2 : Via la console Firebase (recommandé)

1. Accédez à la [Console Firebase App Hosting](https://console.firebase.google.com/project/sqyping-teamup/apphosting)
2. Connectez votre dépôt GitHub (si pas déjà fait)
3. Les déploiements preview se créent automatiquement pour chaque commit/PR
4. Pour la production, utilisez le bouton "Deploy to production" dans la console

#### Méthode 3 : Via GitHub Actions (si configuré)

Si vous avez configuré l'intégration GitHub, les déploiements se feront automatiquement.

### 6. Vérifier le déploiement

Une fois déployé :
- Vous recevrez une URL de preview ou de production
- Vérifiez que l'application fonctionne correctement
- Consultez les logs dans la console Firebase en cas d'erreur

## 🔧 Configuration actuelle

### Fichiers de configuration

- `firebase.json` : Configuration Firebase incluant App Hosting
- `.firebaserc` : Projet Firebase par défaut (`sqyping-teamup`)
- `.firebase/apphosting.yaml` : Configuration spécifique App Hosting

### Commandes de build

- **Build** : `npm run build`
- **Start** : `npm start`
- **Framework** : Next.js
- **Node version** : Vérifiée automatiquement par Firebase

## 📝 Notes importantes

1. **Variables d'environnement** : 
   - Les variables `NEXT_PUBLIC_*` sont exposées côté client
   - Les autres variables sont uniquement côté serveur
   - Configurez-les dans la console Firebase App Hosting

2. **Build** : 
   - Le build est effectué automatiquement lors du déploiement
   - Assurez-vous que `npm run build` fonctionne localement avant de déployer

3. **Preview vs Production** : 
   - Les déploiements preview sont créés automatiquement pour chaque commit/PR
   - Les déploiements en production nécessitent une action manuelle dans la console

4. **Firestore** : 
   - Assurez-vous que les règles Firestore sont déployées :
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Domaine personnalisé** : 
   - Vous pouvez configurer un domaine personnalisé dans la console Firebase App Hosting

## 🔗 Liens utiles

- [Documentation Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- [Console Firebase App Hosting](https://console.firebase.google.com/project/sqyping-teamup/apphosting)
- [Firebase CLI Documentation](https://firebase.google.com/docs/cli)
- [Next.js on Firebase App Hosting](https://firebase.google.com/docs/app-hosting/frameworks/nextjs)

## 🐛 Dépannage

### Erreur : "Cannot understand what targets to deploy"
- Vérifiez que `firebase init apphosting` a été exécuté
- Vérifiez que `.firebase/apphosting.yaml` existe

### Erreur de build
- Vérifiez que `npm run build` fonctionne localement
- Consultez les logs dans la console Firebase

### Variables d'environnement manquantes
- Vérifiez que toutes les variables nécessaires sont configurées dans la console
- Vérifiez que les noms des variables sont corrects (sensible à la casse)


# 🚀 Déploiement Firebase App Hosting

## Configuration actuelle

- **Backend ID** : `teamup`
- **Repository** : `omichalo/teamup` (branche `main`)
- **URL** : https://teamup--sqyping-teamup.us-east4.hosted.app
- **Région** : `us-east4`

## Déclencher un build

### Option 1 : Via la console Firebase (Recommandé)

1. Allez sur : https://console.firebase.google.com/project/sqyping-teamup/apphosting
2. Cliquez sur le backend `teamup`
3. Dans l'onglet **Builds**, cliquez sur **"Create build"** ou **"New build"**
4. Sélectionnez la branche `main` et le commit souhaité
5. Cliquez sur **"Start build"**

### Option 2 : Push sur GitHub (si webhooks configurés)

Si les webhooks GitHub sont correctement configurés, un push sur `main` devrait déclencher automatiquement un build.

**Pour vérifier/configurer les webhooks :**
1. Allez dans la console Firebase App Hosting
2. Vérifiez les paramètres de connexion GitHub
3. Assurez-vous que les webhooks sont activés pour la branche `main`

## Variables d'environnement

Les variables d'environnement doivent être configurées dans la console Firebase App Hosting :

1. Allez sur : https://console.firebase.google.com/project/sqyping-teamup/apphosting
2. Sélectionnez le backend `teamup`
3. Allez dans **"Environment variables"** ou **"Configuration"**
4. Ajoutez les variables suivantes :

```
ID_FFTT=votre_id_fftt
PWD_FFTT=votre_mot_de_passe_fftt
```

**Important :** Ces variables doivent être disponibles à la fois pour le **BUILD** et le **RUNTIME**.

## Configuration actuelle

Le fichier `apphosting.yaml` configure :
- `minInstances: 0` - Pas d'instances minimales (cold start possible)
- Variables d'environnement à configurer dans la console

## Fichiers de configuration

- `firebase.json` : Configuration Firebase (inclut App Hosting)
- `apphosting.yaml` : Configuration spécifique App Hosting
- `.npmrc` : Configuration npm avec `legacy-peer-deps=true` pour résoudre les conflits de dépendances

## Résolution des problèmes

### Build échoue avec des erreurs de dépendances

✅ **Résolu** : Le fichier `.npmrc` avec `legacy-peer-deps=true` résout les conflits entre `@omichalo/sqyping-mui-theme` et `@mui/icons-material`.

### Build ne se déclenche pas automatiquement

1. Vérifiez que les webhooks GitHub sont configurés
2. Déclenchez manuellement un build depuis la console
3. Vérifiez que vous poussez bien sur la branche `main`

### Variables d'environnement non disponibles

Assurez-vous que les variables sont configurées dans la console Firebase et qu'elles sont disponibles pour **BUILD** et **RUNTIME**.

## Commandes utiles

```bash
# Lister les backends
firebase apphosting:backends:list

# Vérifier le statut du projet
firebase use sqyping-teamup
```

## Documentation officielle

- [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
- [Configuration App Hosting](https://firebase.google.com/docs/app-hosting/configure)

# Configuration des variables d'environnement Firebase App Hosting

## Variables à configurer dans Firebase App Hosting

Pour que l'application fonctionne correctement côté client, vous devez configurer les variables d'environnement suivantes dans Firebase App Hosting avec la disponibilité **RUNTIME** (et BUILD si nécessaire).

### Configuration Firebase (publiques, côté client)

Ces variables doivent être configurées avec la disponibilité **RUNTIME** :

1. **NEXT_PUBLIC_FIREBASE_API_KEY**

   - Valeur : `AIzaSyC9fsfuDqF0jjV8ocgCtqMpcPA-E6pZoNg`
   - Disponibilité : RUNTIME (et BUILD)

2. **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**

   - Valeur : `sqyping-teamup.firebaseapp.com`
   - Disponibilité : RUNTIME (et BUILD)

3. **NEXT_PUBLIC_FIREBASE_PROJECT_ID**

   - Valeur : `sqyping-teamup`
   - Disponibilité : RUNTIME (et BUILD)

4. **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**

   - Valeur : `sqyping-teamup.firebasestorage.app`
   - Disponibilité : RUNTIME (et BUILD)

5. **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**

   - Valeur : `567392028186`
   - Disponibilité : RUNTIME (et BUILD)

6. **NEXT_PUBLIC_FIREBASE_APP_ID**
   - Valeur : `1:567392028186:web:0fa11cf39ce060931eb3a3`
   - Disponibilité : RUNTIME (et BUILD)

### Configuration FFTT (privées, côté serveur uniquement)

Ces variables doivent être configurées avec la disponibilité **RUNTIME** uniquement (pas BUILD) :

7. **ID_FFTT**

   - Valeur : Votre numéro de licence FFTT
   - Disponibilité : RUNTIME uniquement

8. **PWD_FFTT**
   - Valeur : Votre mot de passe FFTT
   - Disponibilité : RUNTIME uniquement

## Comment configurer dans Firebase App Hosting

### Méthode 1 : Via le fichier `apphosting.yaml` (Recommandé)

Les variables d'environnement sont configurées dans le fichier `apphosting.yaml` à la racine du projet. Ce fichier est déjà configuré avec toutes les variables Firebase.

**⚠️ Action requise :** Remplacez les valeurs `YOUR_FFTT_ID_HERE` et `YOUR_FFTT_PASSWORD_HERE` dans `apphosting.yaml` par vos vraies identifiants FFTT :

```yaml
- variable: ID_FFTT
  value: VOTRE_NUMERO_DE_LICENCE_FFTT # Exemple: SW251
  availability:
    - RUNTIME

- variable: PWD_FFTT
  value: VOTRE_MOT_DE_PASSE_FFTT # Exemple: XpZ31v56Jr
  availability:
    - RUNTIME
```

Après modification, poussez le fichier sur GitHub et Firebase App Hosting utilisera automatiquement ces variables lors du prochain déploiement.

### Méthode 2 : Via la console Firebase (si disponible)

Si vous avez accès à une interface dans la console :

1. Allez dans la console Firebase : https://console.firebase.google.com
2. Sélectionnez le projet `sqyping-teamup`
3. Allez dans **App Hosting** (dans le menu de gauche)
4. Cliquez sur votre application
5. Cherchez l'onglet **Settings**, **Configuration**, ou **Environment variables**
6. Pour chaque variable :
   - Cliquez sur **Ajouter une variable** ou **Add variable**
   - Entrez le nom de la variable (ex: `NEXT_PUBLIC_FIREBASE_API_KEY`)
   - Entrez la valeur
   - Cochez **RUNTIME** (et **BUILD** pour les variables NEXT*PUBLIC*\*)
   - Sauvegardez

## Note importante

Les variables préfixées par `NEXT_PUBLIC_` sont injectées dans le bundle JavaScript côté client lors du build. Elles sont donc **publiques** et visibles dans le code source du navigateur. C'est normal pour les credentials Firebase client (API Key, etc.) qui sont conçus pour être publics.

Les variables FFTT (`ID_FFTT` et `PWD_FFTT`) ne doivent **JAMAIS** être préfixées par `NEXT_PUBLIC_` car elles sont privées et utilisées uniquement côté serveur dans les API routes.

## Alternative : Utiliser le fallback

Si vous ne configurez pas ces variables, l'application utilisera automatiquement les valeurs par défaut hardcodées dans `src/lib/firebase.ts`. C'est acceptable pour les credentials Firebase (qui sont publics), mais les variables FFTT doivent absolument être configurées pour que l'application fonctionne correctement.

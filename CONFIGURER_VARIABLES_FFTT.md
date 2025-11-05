# Configuration des variables d'environnement FFTT sur Firebase App Hosting

## 🔐 Variables à configurer

Les variables suivantes doivent être configurées dans Firebase App Hosting :
- `ID_FFTT`
- `PWD_FFTT`

## 📋 Méthode 1 : Via la console Firebase (Recommandé)

### Étapes

1. **Accéder à Firebase App Hosting**
   - Ouvrez : https://console.firebase.google.com/project/sqyping-teamup/apphosting
   - Connectez-vous avec votre compte Google

2. **Sélectionner votre backend**
   - Si vous avez déjà créé un backend, sélectionnez-le
   - Sinon, créez un nouveau backend en cliquant sur "Get Started"

3. **Configurer les variables d'environnement**
   - Cliquez sur votre environnement (Preview ou Production)
   - Allez dans l'onglet "Environment variables" ou "Variables d'environnement"
   - Cliquez sur "Add variable" ou "Ajouter une variable"

4. **Ajouter les variables FFTT**
   
   **Variable 1 :**
   - **Name** : `ID_FFTT`
   - **Value** : `SW251` (ou votre identifiant FFTT)
   - **Type** : Plain text (ou Secret si disponible)
   
   **Variable 2 :**
   - **Name** : `PWD_FFTT`
   - **Value** : `XpZ31v56Jr` (ou votre mot de passe FFTT)
   - **Type** : Secret (recommandé) ou Plain text

5. **Sauvegarder**
   - Cliquez sur "Save" ou "Sauvegarder"
   - Les variables seront disponibles lors du prochain déploiement

## 🔒 Méthode 2 : Utiliser Firebase Secrets (Plus sécurisé)

Si Firebase App Hosting supporte les secrets (recommandé pour les mots de passe) :

1. **Créer un secret pour ID_FFTT**
   ```bash
   firebase functions:secrets:set ID_FFTT
   # Entrer la valeur : SW251
   ```

2. **Créer un secret pour PWD_FFTT**
   ```bash
   firebase functions:secrets:set PWD_FFTT
   # Entrer la valeur : XpZ31v56Jr
   ```

3. **Dans Firebase App Hosting console**
   - Référencer les secrets au lieu de valeurs en texte clair
   - Utiliser `SECRET:ID_FFTT` et `SECRET:PWD_FFTT`

## ✅ Vérification

Après configuration, vérifiez que les variables sont bien disponibles :

1. Déployez une nouvelle version de l'application
2. Vérifiez les logs de déploiement dans la console
3. L'application devrait démarrer sans erreur de variables manquantes

## 📝 Notes importantes

- **Sécurité** : Les valeurs des secrets sont chiffrées et stockées de manière sécurisée
- **Environnements** : Configurez les variables pour Preview ET Production séparément si nécessaire
- **Synchronisation** : Les variables sont disponibles uniquement après un nouveau déploiement

## 🔗 Liens utiles

- [Console Firebase App Hosting](https://console.firebase.google.com/project/sqyping-teamup/apphosting)
- [Documentation Firebase Secrets](https://firebase.google.com/docs/functions/config-env)


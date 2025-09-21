# 🔐 Activation de l'authentification Email/Password dans Firebase

## ⚠️ IMPORTANT : Cette étape est OBLIGATOIRE

L'erreur "je reste sur la page de connexion" vient du fait que l'authentification Email/Password n'est **PAS encore activée** dans Firebase.

## 📋 Étapes pour activer l'authentification Email/Password

### 1. Accéder à la console Firebase
- Aller sur : https://console.firebase.google.com/project/sqyping-teamup/authentication/providers

### 2. Activer Email/Password
1. Cliquer sur **"Email/Password"** dans la liste des fournisseurs
2. Activer le premier bouton **"Email/Password"** (pas Email link)
3. Cliquer sur **"Save"**

### 3. Vérifier l'activation
- Vous devriez voir "Email/Password" avec un indicateur vert "Enabled"

## 🧪 Test après activation

1. **Aller sur** http://localhost:3001/auth
2. **Utiliser l'onglet "Inscription"** pour créer un compte :
   - Nom complet : `Test User`
   - Email : `test@example.com`
   - Mot de passe : `password123`
3. **Cliquer sur "Créer un compte"**
4. **Vérifier** que vous êtes redirigé vers la page d'accueil

## 🔍 Debug en cas de problème

### Ouvrir la console du navigateur (F12)
- Aller dans l'onglet "Console"
- Essayer de se connecter
- Regarder les messages de log :
  - `Hook useAuth: Tentative de connexion`
  - `Hook useAuth: Connexion Firebase réussie`
  - `Hook useAuth: État d'authentification changé`

### Messages d'erreur courants
- `auth/operation-not-allowed` → Email/Password pas activé
- `auth/user-not-found` → Compte n'existe pas
- `auth/wrong-password` → Mot de passe incorrect

## ✅ Une fois activé

L'application devrait fonctionner correctement :
- ✅ Inscription de nouveaux utilisateurs
- ✅ Connexion avec email/mot de passe
- ✅ Redirection automatique après connexion
- ✅ Gestion des rôles (joueur/coach)

## 🚨 Si le problème persiste

1. Vérifier que l'authentification Email/Password est bien activée
2. Vérifier les logs dans la console du navigateur
3. Vérifier les règles Firestore (déjà configurées)
4. Redémarrer l'application si nécessaire

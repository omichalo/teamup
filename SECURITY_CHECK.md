# 🔒 Vérification de sécurité - Secrets dans le code

## ❌ PROBLÈMES CRITIQUES DÉTECTÉS

### 1. Identifiants FFTT hardcodés

**Fichiers concernés :**
- `src/lib/shared/fftt-utils.ts` (lignes 12-13)
- `src/pages/api/fftt/real-matches-optimized.ts` (lignes 6-7)
- `src/pages/api/fftt/real-matches-old.ts` (lignes 6-7)

**Problème :**
```typescript
id: process.env.ID_FFTT || "SW251",
pwd: process.env.PWD_FFTT || "XpZ31v56Jr",
```

Les identifiants FFTT sont hardcodés en fallback. Si les variables d'environnement ne sont pas définies, les valeurs par défaut sont utilisées.

**Action requise :**
- ⚠️ **SUPPRIMER** les valeurs par défaut hardcodées
- Utiliser uniquement `process.env.ID_FFTT` et `process.env.PWD_FFTT`
- Lever une erreur si les variables ne sont pas définies

## ✅ POINTS POSITIFS

### 1. Fichiers `.env*` bien ignorés
- Le `.gitignore` contient `.env*` ✅
- Aucun fichier `.env` présent dans le dépôt ✅

### 2. Configuration Firebase
- Utilise uniquement des variables d'environnement ✅
- Pas de secrets hardcodés dans `src/lib/firebase.ts` ✅
- Pas de secrets hardcodés dans `src/lib/firebase-admin.ts` ✅

### 3. Webhooks Discord
- Stockés dans Firestore (clubSettings) ✅
- Pas de secrets hardcodés ✅

## 🔧 CORRECTIONS REQUISES AVANT PUSH GIT

### 1. Corriger les identifiants FFTT

**Fichier : `src/lib/shared/fftt-utils.ts`**
```typescript
// AVANT (❌ DANGEREUX)
id: process.env.ID_FFTT || "SW251",
pwd: process.env.PWD_FFTT || "XpZ31v56Jr",

// APRÈS (✅ SÉCURISÉ)
id: process.env.ID_FFTT || (() => {
  throw new Error("ID_FFTT environment variable is required");
})(),
pwd: process.env.PWD_FFTT || (() => {
  throw new Error("PWD_FFTT environment variable is required");
})(),
```

**OU plus simplement :**
```typescript
if (!process.env.ID_FFTT || !process.env.PWD_FFTT) {
  throw new Error("FFTT credentials (ID_FFTT and PWD_FFTT) are required");
}

id: process.env.ID_FFTT,
pwd: process.env.PWD_FFTT,
```

### 2. Appliquer la même correction aux autres fichiers

Même correction à appliquer dans :
- `src/pages/api/fftt/real-matches-optimized.ts`
- `src/pages/api/fftt/real-matches-old.ts`

## ✅ CHECKLIST AVANT PUSH GIT

- [ ] Supprimer les identifiants FFTT hardcodés
- [ ] Vérifier qu'aucun fichier `.env` n'est dans le dépôt
- [ ] Vérifier que `.gitignore` contient bien `.env*`
- [ ] S'assurer que toutes les variables d'environnement sont documentées dans `env.example`
- [ ] Configurer les variables d'environnement dans Firebase App Hosting console

## 📝 Variables d'environnement requises

Documentées dans `env.example` :
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `ID_FFTT` (⚠️ Ne pas commiter)
- `PWD_FFTT` (⚠️ Ne pas commiter)
- `FIREBASE_CLIENT_EMAIL` (pour Firebase Admin)
- `FIREBASE_PRIVATE_KEY` (pour Firebase Admin)
- `DISCORD_WEBHOOK_TEAM1`, `DISCORD_WEBHOOK_TEAM2`, etc. (optionnel)

## 🚨 IMPORTANT

**NE JAMAIS COMMITER :**
- Les identifiants FFTT (ID_FFTT, PWD_FFTT)
- Les clés privées Firebase
- Les webhooks Discord
- Tout fichier `.env` ou `.env.local`


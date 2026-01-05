# Guide de sécurité - Gestion des secrets

Ce document décrit comment gérer les secrets et credentials dans le projet.

## ⚠️ Règles importantes

1. **NE JAMAIS commiter de secrets** dans le code source
2. **NE JAMAIS utiliser de fallbacks hardcodés** pour les credentials
3. **TOUJOURS utiliser des variables d'environnement** ou des gestionnaires de secrets

## Variables d'environnement

### Développement local

Créez un fichier `.env.local` (non commité) avec les variables suivantes :

```bash
# Credentials FFTT (pour scripts/setup-functions-config.js)
ID_FFTT=votre_id_fftt
PWD_FFTT=votre_mot_de_passe_fftt
# CLUB_CODE n'est pas un secret, c'est le code public du club (08781477)
# Il peut être omis, la valeur par défaut sera utilisée

# Discord (si nécessaire pour les scripts locaux)
DISCORD_TOKEN=votre_token_discord
DISCORD_PUBLIC_KEY=votre_public_key
DISCORD_SERVER_ID=votre_server_id

# Firebase (si nécessaire pour les scripts locaux)
FIREBASE_PRIVATE_KEY=votre_private_key
FIREBASE_CLIENT_EMAIL=votre_client_email
```

### Production (Firebase App Hosting)

Les secrets sont gérés via Firebase App Hosting Secrets Manager dans `apphosting.yaml`.

Pour configurer un secret :

```bash
firebase apphosting:secrets:set SECRET_NAME
```

## Configuration Firebase Functions

Pour configurer les credentials FFTT pour Firebase Functions :

```bash
# 1. Créez un fichier .env.local avec vos credentials
# 2. Exécutez le script de configuration
npm run functions:setup
```

Le script `scripts/setup-functions-config.js` lit les variables d'environnement et configure Firebase Functions automatiquement.

## Fichiers concernés

- `functions/shared/fftt-utils.ts` : Utilise `functions.config().fftt.*` (sans fallback)
- `src/lib/shared/fftt-utils.ts` : Utilise `process.env.ID_FFTT` et `process.env.PWD_FFTT`
- `scripts/setup-functions-config.js` : Lit depuis `.env.local` ou variables d'environnement
- `apphosting.yaml` : Utilise Firebase App Hosting Secrets Manager pour les secrets

**Note** : `CLUB_CODE` (08781477) n'est pas un secret, c'est le code public du club FFTT. Il peut être hardcodé dans le code ou défini comme variable d'environnement pour la flexibilité, mais ne nécessite pas de gestion de secret.

## Note sur NEXT_PUBLIC_*

Les variables préfixées par `NEXT_PUBLIC_` sont **publiques** et incluses dans le bundle JavaScript côté client. C'est normal pour la configuration Firebase (clés API, domaines, etc.) car elles sont sécurisées par des restrictions de domaine dans Firebase Console.

## En cas d'exposition de secrets

Si un secret a été commité par erreur :

1. **Révoquer immédiatement** le secret exposé
2. **Générer de nouveaux credentials**
3. **Nettoyer l'historique Git** si nécessaire (coordonner avec l'équipe)
4. **Mettre à jour** tous les environnements avec les nouveaux secrets


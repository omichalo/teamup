# Guide de configuration — projet Firebase développement (`sqyping-teamup-dev`)

Ce projet Firebase sert à la fois au **développement local** et à l’**environnement staging hébergé** (App Hosting). La production utilise `sqyping-teamup`.

## Trois contextes d’exécution

| Contexte | Firebase | Configuration |
|----------|----------|---------------|
| Local (`npm run dev`) | `sqyping-teamup-dev` | `.env.local` |
| Staging (URL App Hosting) | `sqyping-teamup-dev` | `apphosting.staging.yaml` + secrets dev |
| Production | `sqyping-teamup` | `apphosting.yaml` |

**Même base Firestore** pour local et staging : éviter les tests destructifs en local pendant une campagne QA sur l’URL staging.

## Prérequis projet

- Plan **Blaze** (requis pour App Hosting)
- Application Web enregistrée (ex. `teamup`)
- Backend App Hosting `teamup-staging` — voir [APP_HOSTING_STAGING_SETUP.md](./APP_HOSTING_STAGING_SETUP.md)

## Création du projet (rappel)

1. [Firebase Console](https://console.firebase.google.com/) → créer `sqyping-teamup-dev`
2. Activer Firestore, Authentication (Email/Password), Storage si besoin
3. Enregistrer l’app Web et noter les identifiants `NEXT_PUBLIC_FIREBASE_*`

## Développement local

### `.env.local`

```bash
# Firebase (sqyping-teamup-dev)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sqyping-teamup-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sqyping-teamup-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sqyping-teamup-dev.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

GOOGLE_APPLICATION_CREDENTIALS=sqyping-teamup-dev-firebase-adminsdk-xxxxx.json

APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Secrets métier (test / dev)
ID_FFTT=...
PWD_FFTT=...
# SMTP, Discord, Stripe test, CSRF_SECRET, etc.
```

Ne jamais committer `.env.local` ni les fichiers `*-firebase-adminsdk-*.json`.

### `.firebaserc`

```json
{
  "projects": {
    "default": "sqyping-teamup-dev",
    "staging": "sqyping-teamup-dev",
    "production": "sqyping-teamup"
  }
}
```

## Staging App Hosting

- URL : https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app
- Fichier : `apphosting.staging.yaml` (fusionné si Environment name = `staging`)
- Déploiement : merge sur branche Git `staging` (intégration GitHub Firebase)
- Setup complet : [APP_HOSTING_STAGING_SETUP.md](./APP_HOSTING_STAGING_SETUP.md)

## Production App Hosting

- Projet `sqyping-teamup`, backend `teamup`, branche `main`
- Fichier : `apphosting.yaml`
- Déploiement : merge sur `main` (Firebase GitHub)

## Firestore rules et index

Fichiers partagés : `firestore.rules`, `firestore.indexes.json`.

| Cible | Commande | CI |
|-------|----------|-----|
| Dev / staging | `npm run deploy:firestore:dev` | push `staging` |
| Production | `npm run deploy:firestore:prod` | push `main` |

Le service account CI doit avoir les droits sur les deux projets.

## Workflow Git

1. `feature/*` → PR → **`staging`**
2. Validation sur l’URL staging
3. PR release **`staging` → `main`**

Détails : [`.github/GIT_WORKFLOW.md`](../.github/GIT_WORKFLOW.md)

## Notes

- Secrets App Hosting : un jeu par projet GCP (noms identiques, valeurs différentes)
- Auth : ajouter le domaine `*.hosted.app` staging dans les domaines autorisés
- Stripe staging : webhooks en mode **test** vers l’URL staging

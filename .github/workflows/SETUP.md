# Configuration GitHub Actions - Guide complet

Ce guide couvre la configuration des workflows GitHub Actions du projet TeamUp (option C : CI GitHub + App Hosting Firebase).

## Workflows disponibles

### 1. CI - Lint, Type-check and Build (`ci.yml`)

**Déclenchement** :

- Pull Request vers `staging` ou `main`
- Push sur `staging` ou `main`

**Actions** : lint, file-sizes, type-check, tests, build, détection TODO.

**Variables** : pour les builds ciblant `staging`, définir des variables de dépôt `*_DEV` et `*_STAGING` (voir ci-dessous). Si absentes, repli sur les variables prod.

### 2. Deploy Firestore (`deploy-firestore.yml`)

**Déclenchement** :

- Push sur `staging` si `firestore.rules` / `firestore.indexes.json` modifiés → projet **sqyping-teamup-dev**
- Push sur `main` (mêmes paths) → projet **sqyping-teamup**
- `workflow_dispatch` avec choix `staging` ou `production`

**Secret** : `FIREBASE_SERVICE_ACCOUNT` (compte de service avec accès aux **deux** projets Firebase).

### 3. App Hosting (Firebase, hors GHA)

Les déploiements Next.js ne passent **plus** par GitHub Actions. Au merge :

- `staging` → backend `teamup-staging` (`sqyping-teamup-dev`)
- `main` → backend `teamup` (`sqyping-teamup`)

Configuration : [docs/APP_HOSTING_STAGING_SETUP.md](../../docs/APP_HOSTING_STAGING_SETUP.md)

~~Deploy to Production (`deploy-production.yml`)~~ — **supprimé** (option C).

## Variables GitHub (Settings → Secrets and variables → Actions → Variables)

### Production (existantes)

- `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_APP_URL`, `APP_URL` — projet `sqyping-teamup`

### Staging / CI (à ajouter)

Copier les valeurs du projet **sqyping-teamup-dev** (console Firebase ou `.env.local`) :

| Variable | Exemple |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY_DEV` | clé web dev |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV` | `sqyping-teamup-dev.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID_DEV` | `sqyping-teamup-dev` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV` | `sqyping-teamup-dev.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV` | … |
| `NEXT_PUBLIC_FIREBASE_APP_ID_DEV` | … |
| `NEXT_PUBLIC_APP_URL_STAGING` | `https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app` |
| `APP_URL_STAGING` | idem |

## Secret `FIREBASE_SERVICE_ACCOUNT`

1. Service account avec **Administrateur Firebase** sur `sqyping-teamup` **et** `sqyping-teamup-dev`
2. Clé JSON → secret GitHub `FIREBASE_SERVICE_ACCOUNT`

## Protection de branche

### `staging`

- Require PR before merging
- Require status check : `check / check`

### `main`

- Require PR before merging (depuis `staging` en release)
- Require status check : `check / check`
- Optionnel : GitHub Environment `production` avec reviewers

## Checklist

- [ ] Secret `FIREBASE_SERVICE_ACCOUNT` (multi-projet)
- [ ] Variables `*_DEV` et `*_STAGING` pour la CI
- [ ] Backend `teamup-staging` lié à GitHub, live branch `staging`, environment `staging`
- [ ] Backend `teamup` prod : live branch `main`
- [ ] Branche `staging` créée sur GitHub
- [ ] Protections `staging` et `main`

## Ressources

- [Workflow Git](../GIT_WORKFLOW.md)
- [App Hosting staging](../../docs/APP_HOSTING_STAGING_SETUP.md)

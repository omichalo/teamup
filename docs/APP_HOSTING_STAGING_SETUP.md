# App Hosting staging (sqyping-teamup-dev)

Ce guide complète le déploiement **option C** : CI sur GitHub, rollout App Hosting au merge sur la branche live.

## Backends

| Projet | Backend | URL | Live branch | Environment name |
|--------|---------|-----|-------------|------------------|
| `sqyping-teamup-dev` | `teamup-staging` | https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app | `staging` | `staging` |
| `sqyping-teamup` | `teamup` | https://teamup--sqyping-teamup.us-east4.hosted.app | `main` | *(vide ou `production`)* |

Le backend `teamup-staging` a été créé via CLI. Il reste à **connecter GitHub** (console uniquement).

## 1. Lier le dépôt GitHub (staging)

1. [Console Firebase](https://console.firebase.google.com/) → projet **sqyping-teamup-dev**
2. **Hosting** → **App Hosting** → backend **teamup-staging** → **View dashboard**
3. **Settings** → connecter le dépôt `omichalo/teamup` (ou votre org)
4. **Live branch** : `staging`
5. **Environment name** : `staging` (charge `apphosting.staging.yaml`)

## 2. Vérifier la prod (sqyping-teamup)

1. Projet **sqyping-teamup** → backend **teamup**
2. **Live branch** : `main`
3. Dépôt GitHub connecté (déjà le cas si déployé via la console)
4. Après migration option C : **ne plus** utiliser le workflow `deploy-production.yml` (supprimé)

## 3. Secrets App Hosting (teamup-dev)

### Option rapide : depuis `.env.local` + `.env.staging`

Deux fichiers distincts pour **séparer local et staging** (notamment le webhook Stripe) :

| Fichier | Usage |
|---------|--------|
| `.env.local` | Dev local ; `STRIPE_WEBHOOK_SECRET` = `whsec_...` de `stripe listen` |
| `.env.staging` | Overrides staging ; `STRIPE_WEBHOOK_SECRET` = `whsec_...` du webhook Dashboard (URL staging) |

Modèle : copier [`.env.staging.example`](../.env.staging.example) vers `.env.staging`.

```bash
cp .env.staging.example .env.staging
# Éditer .env.staging : coller le whsec_ du webhook Stripe staging

chmod +x scripts/sync-apphosting-secrets-from-env.sh
./scripts/sync-apphosting-secrets-from-env.sh
```

Le script **ignore** `STRIPE_WEBHOOK_SECRET` dans `.env.local` pour Secret Manager : seule la valeur de `.env.staging` est poussée vers App Hosting.

Variables lues depuis `.env.local` (mapping vers Secret Manager) :

| `.env.local` | Secret App Hosting |
|--------------|-------------------|
| `ID_FFTT` | `fftt-id-secret` |
| `PWD_FFTT` | `fftt-pwd-secret` |
| `SMTP_*`, `DISCORD_*`, `STRIPE_SECRET_KEY` | même nom |
| `CSRF_SECRET` | `CSRF_SECRET` (généré si absent) |

| `.env.staging` uniquement | Secret App Hosting |
|---------------------------|-------------------|
| `STRIPE_WEBHOOK_SECRET` | `STRIPE_WEBHOOK_SECRET` |

Options :

```bash
DRY_RUN=1 ./scripts/sync-apphosting-secrets-from-env.sh   # simulation
```

**Non synchronisés** : `NEXT_PUBLIC_*`, `APP_URL` localhost, `GOOGLE_APPLICATION_CREDENTIALS`.

### Option manuelle

Pour chaque secret référencé dans `apphosting.staging.yaml`, créer la version dans le projet **dev** :

```bash
firebase apphosting:secrets:set SECRET_NAME --project sqyping-teamup-dev
```

Secrets à provisionner (noms identiques à la prod, **valeurs de test / dev**) :

- `fftt-id-secret`, `fftt-pwd-secret`
- `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`
- `DISCORD_*` (optionnel en staging)
- `CSRF_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (clés **test** Stripe)

Accorder l’accès au backend :

```bash
firebase apphosting:secrets:grantaccess SECRET_NAME --backend teamup-staging --project sqyping-teamup-dev
```

## 4. Firebase Auth — domaines autorisés et callback email

Dans **sqyping-teamup-dev** → **Authentication** → **Settings** → **Authorized domains**, ajouter :

- `teamup-staging--sqyping-teamup-dev.us-east4.hosted.app`
- Domaine custom si configuré (ex. `staging.teamup.sqyping.fr`)

Dans **Authentication** → **Templates** (ou paramètres email du projet), vérifier que l’**URL de redirection par défaut** (`callbackUri`) n’est plus `http://localhost:3000/...` mais l’URL staging :

- `https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app/auth/verify-email`

Sans cela, les liens générés par Firebase peuvent contenir `continueUrl=localhost` même depuis staging. Côté serveur, les routes `/api/auth/send-verification` et `send-password-reset` envoient un **lien direct** vers l’app (`/auth/verify-email?oobCode=…` ou `/reset-password?oobCode=…`) via `buildDirectAppActionLink`, et `resolveAppOrigin` ignore les `APP_URL` localhost en hébergé (secours par `NEXT_PUBLIC_FIREBASE_PROJECT_ID`).

## 5. Stripe (mode test)

### Webhook staging (URL hébergée)

1. [Dashboard Stripe test](https://dashboard.stripe.com/test/webhooks) → **Add endpoint**
2. URL : `https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app/api/stripe/webhook`
3. Événement : **`checkout.session.completed`** uniquement
4. Copier le **Signing secret** (`whsec_...`) dans **`.env.staging`** (pas `.env.local`) :

```bash
cp .env.staging.example .env.staging
# STRIPE_WEBHOOK_SECRET=whsec_...  ← clé du webhook Dashboard staging
./scripts/sync-apphosting-secrets-from-env.sh
```

### Webhook local (développement)

Garder dans **`.env.local`** le `whsec_...` affiché par :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Les deux secrets sont **différents** et doivent rester dans des fichiers séparés.

## 6. Branche `staging` sur GitHub

```bash
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

## 7. Protections de branche (GitHub Settings → Branches)

**`staging`** : PR obligatoire ; required check `check / check`

**`main`** : PR obligatoire depuis `staging` uniquement (release) ; required check `check / check` ; optionnel : environment `production` avec approbation

## 8. Service account CI (Firestore)

Le secret `FIREBASE_SERVICE_ACCOUNT` doit pouvoir déployer sur **les deux** projets (`roles/firebase.admin` sur `sqyping-teamup` et `sqyping-teamup-dev`).

## Validation

1. Merge une PR vers `staging` → rollout visible dans App Hosting (dev)
2. Ouvrir l’URL staging, tester Auth + un parcours métier
3. PR `staging` → `main` → rollout prod (Firebase, pas GHA)

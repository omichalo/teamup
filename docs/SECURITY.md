# Guide de sécurité - Gestion des secrets

Ce document décrit comment gérer les secrets et credentials dans le projet.

## ⚠️ Règles importantes

1. **NE JAMAIS commiter de secrets** dans le code source
2. **NE JAMAIS utiliser de fallbacks hardcodés** pour les credentials
3. **TOUJOURS utiliser des variables d'environnement** ou des gestionnaires de secrets
4. **NE JAMAIS exposer de secrets** dans les variables `NEXT_PUBLIC_*` (elles sont publiques côté client)

## Variables d'environnement

### Développement local

Créez un fichier `.env.local` (non commité) en copiant `.env.example` :

```bash
cp .env.example .env.local
# Puis éditez .env.local avec vos valeurs
```

Voir `.env.example` pour la liste complète des variables d'environnement avec leurs descriptions.

### Variables essentielles pour le développement

```bash
# Protection CSRF (obligatoire)
CSRF_SECRET=votre_secret_csrf_genere

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
# Option 1: Fichier service account (recommandé)
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json

# Option 2: Variables d'environnement
FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FB_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
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

- `src/lib/shared/fftt-config.ts` : `process.env.ID_FFTT` / `PWD_FFTT`, secours `functions.config().fftt.*` (Cloud Functions)
- `scripts/setup-functions-config.js` : Lit depuis `.env.local` ou variables d'environnement
- `apphosting.yaml` : Utilise Firebase App Hosting Secrets Manager pour les secrets

**Note** : `CLUB_CODE` (08781477) n'est pas un secret, c'est le code public du club FFTT. Il peut être hardcodé dans le code ou défini comme variable d'environnement pour la flexibilité, mais ne nécessite pas de gestion de secret.

## Note sur NEXT_PUBLIC_*

Les variables préfixées par `NEXT_PUBLIC_` sont **publiques** et incluses dans le bundle JavaScript côté client. C'est normal pour la configuration Firebase (clés API, domaines, etc.) car elles sont sécurisées par des restrictions de domaine dans Firebase Console.

Elles doivent être définies dans l’environnement au **build** (`.env.local`, CI, `apphosting.yaml`) : **`next.config.ts` ne duplique plus de valeurs par défaut** pour éviter la divergence entre environnements et les faux positifs « tout marche sans .env » en local.

## En cas d'exposition de secrets

Si un secret a été commité par erreur :

1. **Révoquer immédiatement** le secret exposé
2. **Générer de nouveaux credentials**
3. **Nettoyer l'historique Git** si nécessaire (coordonner avec l'équipe)
4. **Mettre à jour** tous les environnements avec les nouveaux secrets

## Politique de divulgation responsable

Si vous découvrez une vulnérabilité de sécurité dans ce projet :

1. **Ne pas créer d'issue publique** sur GitHub
2. **Contacter directement** le mainteneur du projet par email ou message privé
3. **Fournir des détails** sur la vulnérabilité et les étapes pour la reproduire
4. **Attendre une réponse** avant de divulguer publiquement

Nous nous engageons à :
- Répondre dans les 48 heures
- Corriger les vulnérabilités critiques dans les 7 jours
- Créditer les chercheurs en sécurité (si souhaité)

## Liste des secrets utilisés

Ce projet utilise les secrets suivants (stockés dans Firebase Secret Manager en production) :

- `CSRF_SECRET` : Protection contre les attaques CSRF
- `DISCORD_TOKEN` : Token du bot Discord
- `DISCORD_PUBLIC_KEY` : Clé publique pour valider les interactions Discord
- `DISCORD_WEBHOOK_SECRET` : Secret partagé pour l'authentification des webhooks Discord
- `ID_FFTT` / `PWD_FFTT` : Identifiants pour l'API FFTT
- `SMTP_*` : Credentials SMTP pour l'envoi d'emails
- `FB_PRIVATE_KEY` / `FB_CLIENT_EMAIL` : Credentials Firebase Admin (alternative au service account)

**Note** : Cette liste est fournie à titre informatif. Les valeurs réelles ne doivent jamais être exposées.

## API : CSRF (`validateOrigin`) et rate limiting

Les mutations exposées au navigateur sur la même origine passent par **`validateOrigin`** (`src/lib/auth/csrf-utils.ts`), qui vérifie `Origin` / `Referer` / `Host` par rapport à `APP_URL` ou `NEXT_PUBLIC_APP_URL`. En développement, `localhost` est autorisé.

### Politique par type de route

| Type | CSRF (`validateOrigin`) | Rate limiting |
|------|-------------------------|---------------|
| Formulaires / fetch same-origin avec cookie de session | **Oui** sur POST/PATCH/DELETE concernés | Identifiants stables (IP ou `uid`) via `checkRateLimit` / `enforceRateLimit` |
| Webhooks Discord (`discord/interactions`) | **N/A** — signature Ed25519 | N/A (Discord applique ses propres limites) |
| Webhooks / secrets serveur (`discord/link-license`, etc.) | **N/A** — secret partagé ou équivalent | Optionnel selon la route |
| Envoi d’emails anonymes (`auth/send-password-reset`, `auth/send-verification`) | **N/A** — pas de session cookie | **Oui** — limite par email (voir routes) |
| Lecture OpenAPI (`openapi`) | **N/A** — GET public | N/A |
| Health (`health`) | **N/A** | N/A |

### Inventaire des mutations (référence maintenance)

**Session & auth navigateur**

- `POST /api/session` — CSRF oui ; rate limit **par IP** (`session:post:<ip>`).
- `POST /api/session/firebase-token` — CSRF oui ; rate limit **par uid** (`session:firebase-token:<uid>`).

**Discord (proxy HTTP avec cookie)**

- `POST /api/discord/send-message` — CSRF oui ; rate limit par uid.
- `POST /api/discord/update-custom-message` — CSRF oui ; rate limit par uid.
- `POST /api/discord/availability-polls/create` — CSRF oui ; rate limit par uid (sondages).
- `POST /api/discord/availability-polls/[pollId]/close` — CSRF oui ; rate limit par uid.

**Admin**

- `POST /api/admin/discord-availability-config` — CSRF oui ; rate limit par uid (admin).
- `POST /api/admin/sync-teams` — CSRF déjà présent ; rate limit par uid (sync).
- `POST /api/admin/sync-players` — idem.
- `POST /api/admin/sync-team-matches` — idem.

Les autres routes admin / coach déjà couvertes par l’audit (ex. `brulage/validate`, `coach/request`, `teams/.../location`) conservent leur `validateOrigin` existant.

**Limitation** : le rate limiting en mémoire n’est pas distribué ; pour plusieurs instances, prévoir Redis ou équivalent.

## API : en-têtes anti-cache (`Cache-Control`)

Les réponses JSON des route handlers passent par **`jsonNoStore`** ou **`applyNoStoreHeaders`** (`src/lib/http/cache-headers.ts`) : `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0` (aligné sur les règles projet).

- Le wrapper **`withAuth`** (`src/lib/auth/api-utils.ts`) applique `applyNoStoreHeaders` sur la réponse du handler et renvoie les erreurs d’authentification via **`jsonNoStore`**.
- **`POST` / `DELETE` `/api/session`** : construction d’une `NextResponse` avec cookies, puis **`applyNoStoreHeaders`** (seul cas courant de `NextResponse.json` direct hors helper).
- **`GET` `/api/openapi`** et **`GET` `/api/health`** : `jsonNoStore` pour une politique homogène (le contenu reste public, sans cache intermédiaire sur le JSON).

## Audit de sécurité automatisé

Le projet utilise des outils automatisés pour détecter les secrets commités par erreur :

### GitHub Actions

Un workflow automatisé scanne chaque commit et pull request avec :
- **TruffleHog** : Détecte les secrets dans le code et l'historique Git
- **Gitleaks** : Scanner supplémentaire pour les secrets et credentials
- **npm audit** : Vérifie les vulnérabilités dans les dépendances

Le workflow s'exécute :
- Sur chaque push vers `main` ou `develop`
- Sur chaque pull request
- Une fois par semaine pour scanner tout l'historique

### Scan local (recommandé avant de commiter)

#### Option 1 : TruffleHog (recommandé)

```bash
# Installation
brew install trufflesecurity/trufflehog/trufflehog

# Scanner les commits récents
trufflehog git file://. --since-commit HEAD~10

# Scanner tout l'historique
trufflehog git file://. --since-commit $(git rev-list --max-parents=0 HEAD)
```

#### Option 2 : Gitleaks

```bash
# Installation
brew install gitleaks

# Scanner les fichiers modifiés
gitleaks detect --source . --verbose

# Scanner avec rapport
gitleaks detect --source . --report-path gitleaks-report.json
```

#### Option 3 : git-secrets (AWS)

```bash
# Installation
brew install git-secrets

# Configuration initiale
git secrets --install
git secrets --register-aws

# Scanner les commits
git secrets --scan-history
```

### Pré-commit hook (optionnel)

Pour scanner automatiquement avant chaque commit :

```bash
# Installer git-secrets
brew install git-secrets

# Configurer dans le repo
git secrets --install
git secrets --register-aws

# Ajouter des patterns personnalisés
git secrets --add 'password\s*=\s*.+'
git secrets --add 'api[_-]?key\s*=\s*.+'
```

**Note** : Les hooks pre-commit sont déjà configurés avec Husky pour le linting et le type-check. Vous pouvez ajouter un scan de secrets si nécessaire.

### Que faire si un secret est détecté ?

1. **Révoquer immédiatement** le secret exposé
2. **Générer de nouveaux credentials**
3. **Nettoyer l'historique Git** (si le secret a été commité) :
   ```bash
   # ATTENTION : Cela réécrit l'historique Git
   # Coordonner avec l'équipe avant d'exécuter
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```
4. **Mettre à jour** tous les environnements avec les nouveaux secrets
5. **Forcer le push** (après coordination avec l'équipe) :
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```


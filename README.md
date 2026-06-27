# TeamUp — Plateforme de gestion du club SQY Ping

Application **Next.js** pour la gestion du club de tennis de table SQY Ping : championnat (équipes, joueurs, compositions, disponibilités), adhésions et paiements, intégration Discord et synchronisation FFTT.

| Environnement | Branche | Hébergement |
|---------------|---------|-------------|
| Staging | `staging` | Firebase App Hosting (`sqyping-teamup-dev`) |
| Production | `main` | Firebase App Hosting (`sqyping-teamup`) → [teamup.sqyping.fr](https://teamup.sqyping.fr) |

## Fonctionnalités

### Championnat

- **Joueurs** : référentiel synchronisé avec l'API FFTT
- **Équipes** : championnats par équipe, matchs, lieux de rencontre
- **Disponibilités** : saisie des disponibilités des joueurs pour les journées
- **Compositions** : montage des équipes par match, validation du brûlage, modèles par défaut
- **Discord** : liaison licence ↔ compte Discord, envoi de messages, sondages de disponibilité

### Adhésions club

- **Inscription** : parcours guidé (wizard) pour les joueurs et responsables
- **Suivi** : tableau de bord joueur (`/club/mes-inscriptions`), validation secrétariat (`/club/demandes-adhesion`)
- **Tarification** : campagnes et grilles tarifaires configurables
- **Paiements** : Stripe Checkout, webhooks, factures et suivi manuel
- **Boîte à idées** : suggestions et commentaires des adhérents

### Administration

- Synchronisation manuelle FFTT (joueurs, équipes, matchs)
- Gestion des utilisateurs et des rôles
- Configuration des sondages Discord de disponibilité
- API documentée via OpenAPI (`/swagger`)

## Rôles

| Rôle | Accès principal |
|------|-----------------|
| **Joueur** | Accueil joueur, nouvelle adhésion, suivi de ses dossiers |
| **Coach** | Compositions, disponibilités, championnat |
| **Secrétaire** | Validation des dossiers, tableau des adhésions, campagnes & tarifs |
| **Admin** | Tout le secrétariat + administration, sync FFTT, paramétrage global |

Les contrôles d'accès sont appliqués côté client (`AuthGuard`) et côté serveur (routes API).

## Stack technique

- **Frontend** : Next.js 15 (App Router), React 19, MUI 7, Tailwind CSS 4
- **Backend** : Route handlers Next.js (runtime Node.js), Firebase Admin SDK
- **Données** : Firestore, Firebase Auth, Firebase Storage
- **Intégrations** : API FFTT, Discord.js, Stripe, SMTP (Nodemailer)
- **Cloud** : Firebase App Hosting, Firebase Functions (sync FFTT planifiée)
- **Qualité** : TypeScript strict, ESLint, Jest, plafonds de taille de fichiers

## Démarrage rapide

### Prérequis

- Node.js 20+ et npm
- Projet Firebase (voir [Configuration Firebase Dev](./docs/SETUP_DEV_FIREBASE.md))
- Variables optionnelles selon les fonctionnalités testées : Discord, Stripe, SMTP, identifiants FFTT

### Installation

```bash
git clone git@github.com:omichalo/teamup.git
cd teamup
npm install
cp .env.example .env.local
# Éditer .env.local (Firebase obligatoire ; voir .env.example pour le détail)
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

### Vérifications

```bash
npm run check:dev   # pendant le développement (lint + tailles + types)
npm run check       # avant commit/push (lint + tailles + types + tests + build)
```

## Documentation

### Configuration

| Sujet | Document |
|-------|----------|
| Firebase (dev) | [docs/SETUP_DEV_FIREBASE.md](./docs/SETUP_DEV_FIREBASE.md) |
| App Hosting staging | [docs/APP_HOSTING_STAGING_SETUP.md](./docs/APP_HOSTING_STAGING_SETUP.md) |
| Discord | [docs/DISCORD.md](./docs/DISCORD.md) |
| Stripe (adhésions) | [docs/STRIPE.md](./docs/STRIPE.md) |
| Sécurité & secrets | [docs/SECURITY.md](./docs/SECURITY.md) |
| GitHub Actions (CI) | [.github/workflows/SETUP.md](./.github/workflows/SETUP.md) |

### Technique

| Sujet | Document |
|-------|----------|
| Workflow Git (staging → main) | [.github/GIT_WORKFLOW.md](./.github/GIT_WORKFLOW.md) |
| Quality gates | [docs/QUALITY_GATES.md](./docs/QUALITY_GATES.md) |
| Sync FFTT (Cloud Functions) | [docs/technical/SYNC_CLOUD_FUNCTIONS.md](./docs/technical/SYNC_CLOUD_FUNCTIONS.md) |
| Règles statut des matchs | [docs/technical/MATCH_STATUS_RULES.md](./docs/technical/MATCH_STATUS_RULES.md) |
| Firebase Functions | [functions/README.md](./functions/README.md) |
| Guide inscription club (PDF) | [docs/club-registration-guide/README.md](./docs/club-registration-guide/README.md) |

## Scripts utiles

```bash
# Développement
npm run dev                    # Serveur de dev (port 3000)
npm run check:dev              # Lint + tailles + type-check
npm run check                  # Lint + tailles + types + tests + build
npm test                       # Tests Jest
npm run test:watch             # Tests en mode watch

# Discord
npm run discord:register-command

# Firebase Functions (sync FFTT)
npm run functions:build
npm run functions:deploy:dev   # sqyping-teamup-dev
npm run functions:deploy:prod  # sqyping-teamup

# Firestore (règles + index)
npm run deploy:firestore:dev
npm run deploy:firestore:prod

# Smoke tests
npm run smoke:web              # Build + /api/health
npm run emulators:smoke        # Emulators Firebase Functions
```

## Structure du projet

```
teamup/
├── src/
│   ├── app/              # Pages et routes API (App Router)
│   ├── components/       # Composants React
│   ├── hooks/            # Hooks personnalisés
│   ├── lib/              # Logique métier, services, auth
│   └── types/            # Types TypeScript
├── docs/                 # Documentation
├── functions/            # Firebase Functions (sync FFTT)
├── scripts/              # Scripts utilitaires (deploy, smoke, guides…)
├── .cursor/rules/        # Standards de code pour les agents Cursor
└── .github/workflows/    # CI et déploiement Firestore
```

## Variables d'environnement

Voir [`.env.example`](./.env.example) pour la liste complète.

- **`NEXT_PUBLIC_*`** : configuration Firebase et URL publique de l'app (incluses dans le bundle client, sécurisées par restrictions de domaine Firebase — pas de secrets ici)
- **Secrets serveur** : tokens Discord, clés Stripe, SMTP, identifiants FFTT, `CSRF_SECRET` — dans `.env.local` en dev, Firebase Secret Manager en production

Chaque commit et PR est scanné pour détecter les secrets accidentels (TruffleHog, Gitleaks). Voir [docs/SECURITY.md](./docs/SECURITY.md).

## Déploiement

Le déploiement de l'application se fait via **Firebase App Hosting** au merge sur la branche live :

1. **Développement** : branche `feature/*` ou `fix/*` → PR vers `staging` → rollout sur l'environnement dev
2. **Production** : PR `staging` → `main` → rollout sur la production

La CI GitHub (`.github/workflows/ci.yml`) exécute lint, plafonds de taille, type-check, tests et build sur chaque PR. Le déploiement Firestore (règles et index) est géré par un workflow dédié lorsque ces fichiers changent.

Voir [.github/GIT_WORKFLOW.md](./.github/GIT_WORKFLOW.md) et [docs/APP_HOSTING_STAGING_SETUP.md](./docs/APP_HOSTING_STAGING_SETUP.md).

## Contribution

1. Créer une branche depuis `staging` (`feature/*`, `fix/*`, …)
2. Développer en passant `npm run check:dev` régulièrement
3. Ouvrir une PR vers `staging` avec un message de commit [Conventional Commits](https://www.conventionalcommits.org/)
4. Attendre la CI et une review avant merge

Ne pas merger directement sur `staging` ou `main`.

## Licence

[À définir]

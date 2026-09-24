# TeamUp — guide agents Cursor

Carte d’orientation pour les agents. Les standards détaillés vivent dans `.cursor/rules/*.mdc`.

## Autonomie

**Mode assisté** : proposer des diffs et commandes ; **ne pas** committer, pusher, merger ni déployer sans demande explicite humaine. Voir `.cursor/rules/91-sensitive-ops.mdc`.

## Stack

- Next.js App Router (`src/app/`), React, Firebase (Auth, Firestore, App Hosting, Functions)
- Domaines métier : `src/lib/club-registration/`, `club-registration-config/`, `championship/`, `attendance/`, `auth/`, …

## Environnements

| Usage | Branche / projet |
|-------|------------------|
| Local | `.env.local` + Firebase `sqyping-teamup-dev` (défaut `.firebaserc`) |
| Staging | branche `staging` → App Hosting `teamup-staging` / `sqyping-teamup-dev` |
| Production | branche `main` → App Hosting `teamup` / `sqyping-teamup` |

## Flux Git

`feature/*` ou `fix/*` → PR vers **`staging`** → (validation) PR **`staging` → `main`**.

`staging` et `main` sont protégées (PR + check CI `Lint, Type-check and Build`, pas de force-push).

## Quality gates

- Dev : `npm run check:dev` (lint + file-sizes + type-check)
- Avant push : `npm run check` (ajoute tests + build)
- CI : `.github/workflows/ci.yml` + security-scan sur `staging`/`main`

Détail : `docs/QUALITY_GATES.md`.

## Règles Cursor (toujours chargées)

`00-foundation-quality`, `60-api-security`, `70-auth-and-roles`, `80-club-platform-extension`, `90-pr-and-release`, `91-sensitive-ops`.

Autres rules : scoped par globs (Next, UI, Firebase, taille de fichiers).

## Skills

- `.cursor/skills/teamup-feature-slice/` — feature verticale
- `.cursor/skills/pr-staging/` — checklist PR → staging
- `.cursor/skills/post-deploy-smoke/` — vérif après deploy staging
- `.cursor/skills/invariants-check/` — rappel invariants métier
- `.cursor/skills/agent-review-sensitive/` — quand lancer Bugbot / Security Review
- Stripe (`.agents/skills/`) — intégration paiement **clés test uniquement** via MCP

## Invariants métier

Source : `docs/technical/invariants/`. ADRs : `docs/technical/adr/`.

## Plan Mode

Utiliser le Plan Mode avant toute slice multi-fichiers, changement Firestore rules, paiement/webhook, ou auth/rôles.

## MCP / outils

- Préférer `gh` pour GitHub si le MCP GitHub est indisponible.
- MCP Stripe : **environnement test uniquement** (jamais de clés live dans le chat).
- Ne pas lire ni coller le contenu de `~/.cursor/mcp.json` (secrets).

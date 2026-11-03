---
name: pr-staging
description: >-
  Préparer une Pull Request TeamUp vers staging : checks locaux, description,
  risques (Firestore, rôles, paiement). Ne pas committer/pusher sans demande explicite.
---

# Checklist PR → staging

## Quand utiliser

Avant d’ouvrir (ou de demander d’ouvrir) une PR `feature/*` | `fix/*` → `staging`.

## Checklist

1. Branche dédiée (pas `main` / `staging`).
2. `npm run check:dev` puis, avant push, `npm run check`.
3. Aucun `TODO` dans `src/`.
4. Conventional Commits.
5. Description PR : périmètre, risques (Firestore rules, auth, Stripe), plan de test.
6. Si paiement / rules / auth : proposer Bugbot + Security Review (skill `agent-review-sensitive`).
7. **Ne pas** push/merge — mode assisté ; l’humain exécute `git push` et `gh pr create`.

## Références

- `docs/QUALITY_GATES.md`, `.cursor/rules/90-pr-and-release.mdc`, `91-sensitive-ops.mdc`

---
name: agent-review-sensitive
description: >-
  Quand lancer Bugbot et/ou Security Review sur une PR TeamUp (paiement, auth,
  Firestore rules, secrets). Revue à la demande ; pas d’autonomie de merge.
---

# Review agents sur changements sensibles

## Déclencher Bugbot (review-bugbot)

- Diff touchant paiements Stripe, webhooks, calculs `remainingAmountCents`
- Auth / rôles / session cookies
- `firestore.rules` ou nouvelles collections
- Parsing d’entrées utilisateur non trivial

## Déclencher Security Review (review-security)

- Webhooks, CSRF, cookies, rate limit
- Gestion de secrets / service accounts
- Surfaces admin ou élévation de privilèges

## Méthode

Utiliser les skills Cursor `review-bugbot` / `review-security` (demande explicite utilisateur).
Ne pas merger ; remonter les findings et proposer des correctifs.

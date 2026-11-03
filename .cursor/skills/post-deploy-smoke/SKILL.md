---
name: post-deploy-smoke
description: >-
  Vérifier le staging App Hosting après merge (health check lecture seule).
  Ne jamais cibler la production ni muter des données.
---

# Smoke post-deploy staging

## Quand utiliser

Après merge sur `staging` / rollout App Hosting `teamup-staging`.

## Actions

1. Exécuter `npm run smoke:staging` (ou `STAGING_URL=... npm run smoke:staging`).
2. Si le changement touche un parcours métier : lister 2–3 vérifications manuelles UI (sans credentials en clair).
3. En cas d’échec health : ne pas « réparer » en déployant la prod ; diagnostiquer logs staging / rollback PR.

## Interdit

- Appeler l’URL de production TeamUp pour un smoke agentique.
- Écrire en Firestore / Stripe live.

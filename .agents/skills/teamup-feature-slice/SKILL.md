---
name: teamup-feature-slice
description: >-
  Livrer une feature verticale sur TeamUp (Next.js, Firebase, API routes) : cadrage,
  sécurité, Firestore, rôles, UI, tests et quality gates. À utiliser pour adhésions,
  présences, tarifs, paiements, ou toute nouvelle route API / collection.
---

# Livraison d’une feature verticale TeamUp

## Workflow

1. **Explorer avant d’éditer** : identifier parcours, modèles, API, règles Firestore, rôles et tests déjà présents. Réutiliser les patterns existants.
2. **Découper** : viser une slice livrable et un petit diff ; éviter PR multi-domaines et refactors hors périmètre.
3. **API** : runtime Node si nécessaire ; CSRF sur mutations cookie ; validation ; no-store sur données sensibles ; rate limit sur surfaces exposées.
4. **Rôles** : aligner `AuthGuard` et contrôles serveur. Vérifier les autres pages/routes du même parcours.
5. **Firestore** : règles + index en même temps que nouvelle collection/requête ; moindre privilège.
6. **Paiement/webhook** : signature, idempotence, secrets absents des logs, état métier fondé sur événements fiables.
7. **UI** : petits composants, primitives existantes, `extract alongside`; respecter `npm run check:file-sizes` et la dette legacy figée.
8. **Tests** : tester en priorité la règle métier ou le handler risqué modifié ; ajouter un test de régression pour un bug lorsque pertinent.
9. **Boucle qualité** : `npm run check:dev` pendant le travail ; `npm run check` avant livraison.
10. **Critique indépendante** : pour une feature sensible ou transverse, déléguer une revue à `teamup-reviewer`, puis validation à `teamup-verifier`.

## Références

- `.cursor/rules/60-api-security.mdc`
- `.cursor/rules/70-auth-and-roles.mdc`
- `.cursor/rules/80-club-platform-extension.mdc`
- `docs/QUALITY_GATES.md`
- `docs/SECURITY.md`
- `docs/technical/AUDIT_NEXTJS_REACT_ACTION_PLAN.md`

## Sortie attendue

- Diff focalisé, tests adaptés, quality gates verts.
- Branche dédiée et PR vers `staging`, description des risques (Firestore, rôles, paiement) si concernés.

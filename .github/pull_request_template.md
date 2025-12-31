# Pull Request

## Description

<!-- Décrire brièvement les changements apportés -->

## Type de changement

- [ ] Feature (nouvelle fonctionnalité)
- [ ] Fix (correction de bug)
- [ ] Refactor (refactorisation)
- [ ] Docs (documentation)
- [ ] Style (formatage, pas de changement de code)
- [ ] Test (ajout/modification de tests)
- [ ] Chore (tâches de maintenance)

## Checklist qualité

### Code
- [ ] Le code respecte les règles du projet (voir `.cursor/rules/`)
- [ ] Pas de `any` implicite, TypeScript strict respecté
- [ ] Pas de code mort, imports inutilisés, ou console.log permanents
- [ ] Pas de TODO dans le code (remplacer par des issues GitHub si nécessaire)
- [ ] Les tests existants passent toujours
- [ ] Nouveaux tests ajoutés si nécessaire

### Sécurité
- [ ] Routes API protégées (CSRF, rate limiting si nécessaire)
- [ ] Headers de sécurité ajoutés sur les routes sensibles
- [ ] Cookies sécurisés configurés correctement
- [ ] Validation des inputs utilisateur (Zod ou équivalent)
- [ ] Pas de données sensibles exposées (logs, erreurs, etc.)
- [ ] Cohérence client/serveur pour les vérifications de rôles

### Firebase
- [ ] Firestore rules mises à jour si nécessaire (least privilege)
- [ ] Firebase Functions validées si modifiées
- [ ] Tests emulators si applicable

### Tests & Validation
- [ ] `npm run check:dev` passe en local
- [ ] `npm run check` passe en local (lint + type-check + build)
- [ ] Tests unitaires/integration ajoutés ou mis à jour
- [ ] Smoke tests passent si applicables (`npm run smoke:web`, `npm run emulators:smoke`)

### Documentation
- [ ] README mis à jour si nécessaire
- [ ] Documentation technique ajoutée si nouvelle fonctionnalité
- [ ] ADR créé si décision architecturale importante

### Discord (si applicable)
- [ ] Commandes Discord testées si modifiées
- [ ] Scripts Discord fonctionnent (`npm run discord:register-command`)

## Tests effectués

<!-- Décrire les tests manuels effectués -->

## Screenshots (si applicable)

<!-- Ajouter des captures d'écran pour les changements UI -->

## Notes additionnelles

<!-- Informations complémentaires pour les reviewers -->


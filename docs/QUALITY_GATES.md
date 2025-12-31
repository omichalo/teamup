# Quality Gates

Ce document décrit les quality gates du projet et comment les valider.

## Quality Gates locaux

### check:dev (Développement)
```bash
npm run check:dev
```
- Lint (ESLint)
- Type-check (TypeScript)
- **Utilisation**: Pendant le développement, fréquemment

### check (Complet)
```bash
npm run check
```
- Lint (ESLint)
- Type-check (TypeScript)
- Build (Next.js)
- **Utilisation**: Avant chaque commit/push

### Smoke Tests

#### smoke:web
```bash
npm run smoke:web
```
- Build l'application
- Démarre le serveur
- Teste `/api/health`
- Arrête le serveur
- **Utilisation**: Avant de créer une PR importante

#### emulators:smoke
```bash
npm run emulators:smoke
```
- Build les Firebase Functions
- Démarre les emulators Firebase
- Vérifie que les emulators répondent
- Arrête les emulators
- **Utilisation**: Avant de déployer des Functions

## Quality Gates CI

La CI GitHub Actions exécute automatiquement:

1. **Lint**: Vérifie le code avec ESLint
2. **Type-check**: Vérifie les types TypeScript
3. **Build**: Compile l'application Next.js
4. **TODO Check**: Vérifie qu'il n'y a pas de TODO dans le code
5. **Security Audit**: Audit npm des dépendances

Voir [.github/workflows/ci.yml](../.github/workflows/ci.yml) pour les détails.

## Checklist avant PR

- [ ] `npm run check:dev` passe
- [ ] `npm run check` passe
- [ ] Pas de TODO dans le code
- [ ] Tests existants passent
- [ ] Nouveaux tests ajoutés si nécessaire
- [ ] Documentation mise à jour si nécessaire

## Checklist avant merge

- [ ] Tous les checks CI passent
- [ ] Review approuvée
- [ ] Pas de conflits avec main
- [ ] Smoke tests passent (si applicable)

## Validation manuelle

### Tests unitaires
```bash
npm test
```

### Tests avec coverage
```bash
npm run test:coverage
```

### Tests en mode watch
```bash
npm run test:watch
```

## Intégration continue

Les quality gates sont automatiquement exécutés:
- Sur chaque Pull Request
- Sur chaque push sur `main`

Voir [.github/workflows/ci.yml](../.github/workflows/ci.yml) pour la configuration complète.


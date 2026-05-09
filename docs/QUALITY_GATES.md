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
- Build (Next.js), avec **ESLint exécuté pendant `next build`** (`eslint.ignoreDuringBuilds: false` dans `next.config.ts`). Une divergence entre lint CLI et build est donc impossible si `npm run check` passe.

### Variables `NEXT_PUBLIC_*` au build

Sans valeurs dans l’environnement au moment du `next build`, le bundle client peut manquer la config Firebase. En local : remplir `.env.local` à partir de `.env.example`. En production : définir les variables dans Firebase App Hosting (`apphosting.yaml`) ou dans les secrets CI, comme pour tout déploiement Next.js.

**Utilisation**: Avant chaque commit/push

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

1. **Lint**: Vérifie le code avec ESLint (`eslint` en ligne de commande)
2. **Type-check**: Vérifie les types TypeScript
3. **Build**: Compile l'application Next.js (**inclut ESLint** comme ci-dessus, doublon acceptable pour une détection précoce dans les logs de job)
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


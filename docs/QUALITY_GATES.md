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
- Tests unitaires Jest (`jest --ci`, aligné sur la CI)
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

## Règles Cursor et skills projet

- **Règles modulaires** : `.cursor/rules/*.mdc` contiennent le détail des standards (frontmatter `alwaysApply: true` sauf `99-legacy`). C’est la **source de vérité**.
- **`.cursorrules` (racine)** : court pointeur vers `.cursor/rules/` — ne pas y réintroduire de longues copies ; modifier les `.mdc` concernés.
- **Extension club / nouvelles features** : `.cursor/rules/80-club-platform-extension.mdc` regroupe les principes pour bounded contexts, Firestore, paiements, extraction UI (**sans** imposer le refactor des écrans existants).
- **Skill projet** : `.cursor/skills/teamup-feature-slice/SKILL.md` — checklist pour une livraison verticale (API, rôles, Firestore, qualité). À invoquer ou à associer aux agents Cursor lors du développement des parcours adhésion, présences, tarifs, etc.

## Quality Gates CI

La CI GitHub Actions exécute automatiquement:

1. **Lint**: Vérifie le code avec ESLint (`eslint` en ligne de commande)
2. **Type-check**: Vérifie les types TypeScript
3. **Tests**: `npm test -- --ci` (Jest, sans collecte de coverage — rapidité ; seuils coverage pour `npm run test:coverage` en local ou job dédié si besoin)
4. **Build**: Compile l'application Next.js (**inclut ESLint** comme ci-dessus, doublon acceptable pour une détection précoce dans les logs de job)
5. **TODO Check**: Vérifie qu'il n'y a pas de TODO dans le code
6. **Security Audit**: Audit npm des dépendances (`continue-on-error` — signal sans bloquer le merge)

Le déploiement production ([`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml)) enchaîne les mêmes étapes **lint → type-check → tests → build** avant `firebase deploy`.

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


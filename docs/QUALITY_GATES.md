# Quality Gates

Ce document décrit les quality gates du projet et comment les valider.

## Quality Gates locaux

### check:dev (Développement)
```bash
npm run check:dev
```
- Lint (ESLint)
- Plafonds de taille fichiers (`check:file-sizes`, politique universelle sur `src/`)
- Type-check (TypeScript)
- **Utilisation**: Pendant le développement, fréquemment

### check:file-sizes (Structure React / Next)
```bash
npm run check:file-sizes
```
- Parcourt **tout** `src/**/*.ts(x)` (pas de filtre git vs `main`)
- Plafonds par catégorie : pages, composants, `_containers`, `lib/`, tests — voir `scripts/file-size-policy.mjs` et `.cursor/rules/21-react-component-size.mdc`
- Fichiers historiques hors plafond : `scripts/legacy-oversized-files.json` (plafond **figé** par fichier ; interdiction d’augmenter la taille)
- **Échec** si un fichier non listé dépasse son plafond, ou si un fichier listé dépasse son plafond legacy

### check (Complet)
```bash
npm run check
```
- Lint (ESLint)
- Plafonds de taille (`check:file-sizes`)
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

- **Carte agents** : [`AGENTS.md`](../AGENTS.md) (autonomie assistée, flux Git, pointeurs).
- **Règles modulaires** : `.cursor/rules/*.mdc` — source de vérité. Toujours chargées : fondations, API sécurité, auth, extension club, PR, opérations sensibles (`91-sensitive-ops`). Les rules Next/UI/Firebase/taille sont **scoped par globs**.
- **`.cursorrules` (racine)** : court pointeur — ne pas y dupliquer le détail.
- **Invariants métier** : [`docs/technical/invariants/`](./technical/invariants/).
- **Taille fichiers React/Next** : `.cursor/rules/21-react-component-size.mdc` + `npm run check:file-sizes`.
- **Skills** : `teamup-feature-slice`, `pr-staging`, `post-deploy-smoke`, `invariants-check`, `agent-review-sensitive` sous `.cursor/skills/`.
- **Contexte** : [`.cursorignore`](../.cursorignore) exclut secrets, service accounts et bruits de build du contexte agent.

## Quality Gates CI

La CI GitHub Actions exécute automatiquement:

1. **Lint**: Vérifie le code avec ESLint (`eslint` en ligne de commande)
2. **File sizes**: `npm run check:file-sizes` (plafonds universels `src/`, manifeste legacy)
3. **Type-check**: Vérifie les types TypeScript
3. **Tests**: `npm test -- --ci` (Jest, sans collecte de coverage — rapidité ; seuils coverage pour `npm run test:coverage` en local ou job dédié si besoin)
4. **Build**: Compile l'application Next.js (**inclut ESLint** comme ci-dessus, doublon acceptable pour une détection précoce dans les logs de job)
5. **TODO Check**: Vérifie qu'il n'y a pas de TODO dans le code
6. **Security Audit**: Audit npm des dépendances (`continue-on-error` — signal sans bloquer le merge)

Workflow séparé **Security Scan** (TruffleHog, Gitleaks, npm audit) sur PR/push `staging` et `main` : [.github/workflows/security-scan.yml](../.github/workflows/security-scan.yml).

**Branch protection** : merges sur `staging`/`main` uniquement via PR avec le check CI **Lint, Type-check and Build** (voir [docs/SECURITY.md](./SECURITY.md#protection-des-branches-et-scans-ci)).

Le déploiement App Hosting (staging / prod) est déclenché par Firebase au merge sur `staging` ou `main` (option C). La CI GitHub ne déploie pas l’application.

Voir [.github/workflows/ci.yml](../.github/workflows/ci.yml) et [docs/APP_HOSTING_STAGING_SETUP.md](./APP_HOSTING_STAGING_SETUP.md).

### Smoke post-staging (lecture seule)

```bash
npm run smoke:staging
```

Vérifie `GET /api/health` sur l’URL App Hosting staging (pas de mutation). Détail : skill `.cursor/skills/post-deploy-smoke/`.

## Checklist avant PR

- [ ] `npm run check:dev` passe
- [ ] `npm run check:file-sizes` passe (aucun fichier hors plafond hors manifeste legacy ; pas de croissance des entrées legacy)
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

Les quality gates sont automatiquement exécutés :
- Sur chaque Pull Request vers `staging` ou `main`
- Sur chaque push sur `staging` ou `main`

Voir [.github/workflows/ci.yml](../.github/workflows/ci.yml) pour la configuration complète.


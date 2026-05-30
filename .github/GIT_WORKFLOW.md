# Workflow Git/GitHub — staging et production

Ce document décrit le workflow Git/GitHub pour les environnements **staging** (App Hosting sur `sqyping-teamup-dev`) et **production** (`sqyping-teamup`).

## Principes

1. **Un commit par fonctionnalité** : développement sur une branche dédiée (`feature/*`, `fix/*`, etc.)
2. **Pull Requests obligatoires** : aucun merge direct sur `staging` ou `main`
3. **`staging` = intégration** : chaque merge déclenche le rollout App Hosting sur le projet dev
4. **`main` = production** : release uniquement via PR `staging` → `main`
5. **Qualité** : CI GitHub (`ci.yml`) sur les PR ; **déploiement app** : Firebase App Hosting au push sur la live branch

## Structure des branches

| Branche | Rôle |
|---------|------|
| `staging` | Intégration, déploiement automatique sur https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app |
| `main` | Production, déploiement automatique sur https://teamup.sqyping.fr (App Hosting prod) |
| `feature/*`, `fix/*`, … | Travail en cours → PR vers `staging` |

## Workflow de développement

### 1. Créer une branche depuis `staging`

```bash
git checkout staging
git pull origin staging
git checkout -b feature/nom-fonctionnalite
```

### 2. Développer, pousser, ouvrir une PR vers `staging`

```bash
git push origin feature/nom-fonctionnalite
```

Sur GitHub : PR **base = `staging`** → attendre le check `check / check` → review → merge.

Le merge sur `staging` déclenche le rollout App Hosting (projet dev) si le backend est connecté à GitHub.

### 3. Release vers la production

Quand `staging` est validé (QA, métier) :

```bash
# Sur GitHub : PR staging → main (release)
```

Après merge sur `main` : rollout App Hosting prod + déploiement Firestore prod si `firestore.rules` / index modifiés.

### 4. Resynchroniser `staging` après une release (recommandé)

```bash
git checkout staging
git pull origin staging
git merge origin/main
git push origin staging
```

## Messages de commit (Conventional Commits)

Format : `<type>(<scope>): <description>`

Types : `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Flux complet

```
Feature Branch
      │
      │ PR + CI
      ▼
   staging ──────► App Hosting (sqyping-teamup-dev)
      │
      │ PR release + CI
      ▼
    main ─────────► App Hosting (sqyping-teamup)
      │
      └──► Firestore rules/index (si fichiers modifiés)
```

## Protections de branche (à configurer sur GitHub)

- **`staging`** : PR requise ; status check `check / check`
- **`main`** : PR requise depuis `staging` ; status check `check / check` ; optionnel : environment `production` avec approbateurs

Voir [docs/APP_HOSTING_STAGING_SETUP.md](../docs/APP_HOSTING_STAGING_SETUP.md) pour la console Firebase et les secrets.

## Ressources

- [Configuration GitHub Actions](./workflows/SETUP.md)
- [App Hosting staging](../docs/APP_HOSTING_STAGING_SETUP.md)
- [Conventional Commits](https://www.conventionalcommits.org/)

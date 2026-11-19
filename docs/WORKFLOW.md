# Workflow Cursor (TeamUp)

Guide à jour pour Cursor **3.21+**. Complète [`AGENTS.md`](../AGENTS.md).

## Principes

1. **Plan Mode** pour les changements multi-fichiers, Firestore, paiement, auth.
2. **Agent mode** pour implémenter le plan validé.
3. **Autonomie assistée** : l’humain commit / push / merge / déploie (`.cursor/rules/91-sensitive-ops.mdc`).
4. Skills projet sous `.cursor/skills/` plutôt que longs prompts copiés.

## Parcours recommandé

### 1. Planifier

Passer en Plan Mode, ou demander un plan structuré pour la feature. Relire les invariants du domaine (`docs/technical/invariants/`).

### 2. Implémenter

- Skill `teamup-feature-slice` pour une slice verticale.
- Skill `invariants-check` si adhésion / paiement / maillot / FFTT / rôles.
- Boucler avec `npm run check:dev`.

### 3. Review (sensible)

Skill `agent-review-sensitive` → Bugbot / Security Review à la demande.

### 4. PR vers staging

Skill `pr-staging` puis, côté humain : push + `gh pr create` (base `staging`).

### 5. Après merge staging

Skill `post-deploy-smoke` → `npm run smoke:staging` + checks métier manuels.

### 6. Release prod

PR `staging` → `main` (humaine). Jamais de deploy prod agentique.

## Subagents natifs (Cursor Task)

Préférer les types natifs plutôt que des « rôles » inventés dans le prompt :

| Besoin | Approche |
|--------|----------|
| Explorer le repo | Subagent `explore` |
| Revue style Bugbot | Skill / subagent Bugbot (demande explicite) |
| Revue sécu | Skill / subagent Security Review (demande explicite) |
| Essais parallèles isolés | Worktrees / `best-of-n-runner` (cas rare) |

Les anciens rôles RepoScout / Architect / … dans [`WORKFLOW_EXAMPLES.md`](./WORKFLOW_EXAMPLES.md) restent des **métaphores de prompt** utiles en séquentiel, mais ne remplacent pas Plan Mode + skills.

## Worktrees

Option avancée : [`WORKTREES_SETUP.md`](./WORKTREES_SETUP.md). Pour 90 % des cas, une branche + Plan + Agent suffisent. Cursor peut aussi isoler via worktrees natifs des subagents cloud — documenter au cas par cas.

## Prompts courts encore utiles

Voir [`CURSOR_COMMANDS.md`](./CURSOR_COMMANDS.md) (liste allégée).

## Quality gates

[`QUALITY_GATES.md`](./QUALITY_GATES.md).

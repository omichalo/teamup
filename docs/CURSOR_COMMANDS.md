# Prompts Cursor — TeamUp

Liste **allégée**. Préférer les **skills** (`.cursor/skills/`) et le **Plan Mode**.  
Les prompts ci-dessous restent utiles en copier-coller dans le chat.

> Historique : Cursor 3.21+ expose aussi skills, subagents Task, Bugbot / Security Review. Ce fichier ne documente plus un workflow « multi-agent parallèle » custom comme solution par défaut — voir [`WORKFLOW.md`](./WORKFLOW.md).

## Planification

```
Passe en Plan Mode et propose un plan pour: <objectif>
Respecte AGENTS.md, les invariants du domaine, et 91-sensitive-ops.
```

## Feature verticale

```
Utilise le skill teamup-feature-slice pour: <périmètre>
```

## Invariants

```
Utilise le skill invariants-check avant de modifier <domaine>
```

## Validation

```
Exécute npm run check:dev et corrige les erreurs
```

```
Exécute npm run check et corrige les erreurs
```

## PR staging

```
Utilise le skill pr-staging et prépare le texte de PR (sans push)
```

## Smoke staging

```
Utilise le skill post-deploy-smoke / exécute npm run smoke:staging
```

## Review sensible

```
Sur ce diff, utilise le skill agent-review-sensitive
(Bugbot et/ou Security Review — paiement, auth, firestore.rules)
```

## Exploration

```
Explore le code pour: <question>
Cite fichiers et invariants Confirmé si le sujet est métier.
```

## Scripts npm de référence

| Intent | Commande |
|--------|----------|
| Check rapide | `npm run check:dev` |
| Check complet | `npm run check` |
| Tests | `npm test` |
| Smoke local | `npm run smoke:web` |
| Smoke staging | `npm run smoke:staging` |
| Emulators | `npm run emulators:smoke` |

## Notes

- Ne pas demander à l’agent de pusher sur `main`/`staging` ni de déployer la prod.
- MCP Stripe : test uniquement — `docs/technical/MCP_CURSOR.md`.

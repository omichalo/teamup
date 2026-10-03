# MCP Cursor — TeamUp

## État attendu

| Serveur | Usage | Contrainte |
|---------|--------|------------|
| Stripe (`plugin-stripe-stripe`) | Docs / API Stripe assistées | **Clés et compte test uniquement** |
| GitHub | Issues/PR via MCP | Si indisponible → CLI `gh` |
| Browser (idé) | Smoke UI locale / staging | Pas de saisie de secrets |

## Règles

1. Ne jamais coller de clés live Stripe, tokens GitHub, ni contenu de `~/.cursor/mcp.json` dans le chat.
2. Préférer l’auth OAuth MCP (`mcp_auth`) à un PAT stocké en clair dans la config locale.
3. Si un PAT a été exposé (logs, chat, commit) : **révoquer et régénérer** immédiatement (GitHub → Settings → Developer settings).
4. Agents en mode assisté : MCP en lecture / exploration ; pas de déploiement prod.

## Réparation GitHub MCP

Si le namespace `user-github` est en erreur ou si `mcp_auth` expire :

1. Préférer **`gh`** (déjà utilisé pour le repo) pour PR / checks.
2. Dans Cursor : Settings → MCP → ré-authentifier GitHub via OAuth (`mcp_auth`), **sans** coller de PAT dans le chat.
3. Si un PAT était stocké en clair dans `~/.cursor/mcp.json` : le **révoquer** sur GitHub, supprimer l’entrée du fichier, puis ré-auth OAuth.

## Coûts / contexte

- [`.cursorignore`](../../.cursorignore) réduit le bruit (env, adminsdk, logs, `node_modules`).
- Rules scoped par globs (Next, UI, Firebase) ; sécurité / auth / PR / ops restent `alwaysApply`.
- Modèles coûteux : réserver aux reviews sensibles (skill `agent-review-sensitive`).

## Cursor Projects

Évaluation optionnelle plus tard ; la source de vérité reste le dépôt GitHub `omichalo/teamup`.

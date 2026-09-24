# Invariants — rôles

## Confirmé

| Règle | Preuve |
|-------|--------|
| Rôles : admin, secretary, assistant_secretary, board_member, coach, player | `src/lib/auth/roles.ts` + tests |
| Défaut / inconnu → `player` | `resolveRole` |
| Cohérence AuthGuard (client) = `hasAnyRole` (API) | règle 70 |
| Routes `/api/admin/*` : ADMIN uniquement | règle 70 |
| Escalade rôle interdite en update client `users` | `firestore.rules` |

## À valider

| Question | Notes |
|----------|-------|
| Périmètre exact board_member hors tableau adhésions | Produit / navigation |

## Tests

- `src/lib/auth/roles.test.ts`

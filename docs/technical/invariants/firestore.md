# Invariants — Firestore security

## Confirmé

| Règle | Preuve |
|-------|--------|
| Moindre privilège ; nouvelles collections avec rules dès la 1ère livraison | rules 40 + 80 |
| `clubRegistrationConfig`, attendance*, submissionAttempts, appSuggestions, userUiPreferences : client `read,write: false` | `firestore.rules` |
| `clubRegistrations` list client : uniquement `submitterUid == uid`, limit ≤ 50 | rules |
| Listes secrétariat via Admin SDK (API) | commentaires rules |

## À valider

| Question | Notes |
|----------|-------|
| Faut-il bloquer update owner après `paid` ? | Voir registration.md |

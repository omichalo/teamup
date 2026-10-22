# Invariants — Firestore security

## Confirmé

| Règle | Preuve |
|-------|--------|
| Moindre privilège ; nouvelles collections avec rules dès la 1ère livraison | rules 40 + 80 |
| `clubRegistrationConfig`, attendance*, submissionAttempts, appSuggestions, userUiPreferences : client `read,write: false` | `firestore.rules` |
| `clubRegistrations` list client : uniquement `submitterUid == uid`, limit ≤ 50 | rules |
| Listes secrétariat via Admin SDK (API) | commentaires rules |
| Update client `clubRegistrations` : owner seulement, interdit si `paid` ou `approved` | `firestore.rules` (PR #506) ; Admin SDK inchangé |

## À valider

_(aucun item ouvert pour l’instant)_

## Tests

- Déploiement rules via workflow `deploy-firestore` après merge `staging` / `main`

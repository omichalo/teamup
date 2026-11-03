# Invariants — dossiers d’inscription

## Confirmé

| Règle | Preuve |
|-------|--------|
| Statuts : `submitted`, `in_review`, `payment_requested`, `paid`, `approved`, `rejected` | `src/lib/club-registration/registration-status.ts` |
| Actionnable secrétariat : submitted / in_review / payment_requested | idem + tests analytics |
| Managers (validation / paiement / suppression / reverse / aides reçues) : `admin`, `secretary` | `registration-access.ts`, `payment/api-auth.ts` + tests |
| Lecture tableau : managers + `assistant_secretary`, `board_member`, `coach` | idem |
| Propriétaire : `submitterUid` ; plusieurs dossiers par uid autorisés | `firestore.rules` commentaires + match |
| Idempotence soumission via `clubRegistrationSubmissionAttempts` (Admin SDK) | rules `read,write: false` |
| Mutations métier via API Admin SDK (pas de write client SDK sur les parcours UI) | composants `fetch /api/club/registration*` |
| Update client Firestore interdit si `status` ∈ `paid` \| `approved` (défense en profondeur) | `firestore.rules` (PR #506) |

## À valider

| Question | Observation code |
|----------|------------------|
| Matrice exacte des transitions secrétariat (statut × action) | Routes API club/registration — reporté (item audit) |

## Tests

- `src/lib/club-registration/registration-access.test.ts`
- `src/lib/club-registration/create-registration-with-idempotency.test.ts`

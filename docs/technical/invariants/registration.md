# Invariants — dossiers d’inscription

## Confirmé

| Règle | Preuve |
|-------|--------|
| Statuts : `submitted`, `in_review`, `payment_requested`, `paid`, `approved`, `rejected` | `src/lib/club-registration/registration-status.ts` |
| Actionnable secrétariat : submitted / in_review / payment_requested | idem + tests analytics |
| Managers (validation / paiement / suppression) : `admin`, `secretary` | `registration-access.ts` + tests |
| Lecture tableau : managers + `assistant_secretary`, `board_member`, `coach` | idem |
| Propriétaire : `submitterUid` ; plusieurs dossiers par uid autorisés | `firestore.rules` commentaires + match |
| Idempotence soumission via `clubRegistrationSubmissionAttempts` (Admin SDK) | rules `read,write: false` |

## À valider

| Question | Observation code |
|----------|------------------|
| L’owner peut-il encore mettre à jour un dossier `paid` côté client ? | Rules : update owner tant que `status != approved` |
| Matrice exacte des transitions secrétariat (statut × action) | Routes API club/registration — à formaliser |

## Tests

- `src/lib/club-registration/registration-access.test.ts`
- `src/lib/club-registration/create-registration-with-idempotency.test.ts`

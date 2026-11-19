# Invariants — maillots

## Confirmé

| Règle | Preuve |
|-------|--------|
| Suivi `jerseyFollowUpStatus` indépendant du paiement / complément | ADR-0010 |
| Valeurs : `not_applicable`, `to_do`, `prepared_awaiting_payment`, `given` | `jersey-follow-up.ts` |
| Demandé si `wantsCompetitorExtras` ou `wantsOptionalJersey` | idem + tests |
| Client : ne peut pas poser le champ à la création ; figé à l’update owner | `firestore.rules` |
| Écriture secrétariat via Admin SDK (API) | rules + ADR |

## Tests

- `src/lib/club-registration/jersey-follow-up.test.ts`

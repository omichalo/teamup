# Invariants — paiements

## Confirmé

| Règle | Preuve |
|-------|--------|
| Soldé = `remainingAmountCents === 0` (pas seulement `status === paid`) | ADR-0010 |
| Complément dû = encaissement(s) + reliquat > 0 | ADR-0010 + `isRegistrationSupplementDue` |
| Modif tarifaire post-paiement → réouverture `payment_requested`, conserve `paidAt` | ADR-0010 |
| Webhook Stripe : vérif signature ; idempotence session Checkout | `stripe/webhook/route.ts`, `apply-stripe-checkout-paid.ts` |
| État métier dérivé des événements fiables, pas du seul retour navigateur | règle 80 + skill feature-slice |
| Statuts paiement : pending_validation, waiting_payment, partially_paid, paid, manual_follow_up | `payment-constants.ts` |
| Reverse d’un encaissement manuel : `admin` + `secretary` uniquement | `requireRegistrationManager` + `.../payment/received/[id]/reverse` |
| Encaissement manuel / réception d’échéance attendue : mêmes rôles | routes `payment/received`, `expected/.../receive` |
| Marquer une aide déclarée comme reçue (`aid.received`) : `admin` + `secretary` | PATCH manager / `PaymentDeclaredAidsTable` |

## À valider

| Question | Notes |
|----------|-------|
| Recalcul rétroactif des aides sur complément | ADR-0010 : pas de recalcul auto (déjà décidé ADR ; laisser en suivi produit si besoin d’exception) |

## Tests

- `payment/apply-stripe-checkout-payment.test.ts`, `calculate-payment-summary.test.ts`, `resolve-remaining-payable.test.ts`, `sync-payment-after-quote-change.test.ts`, …
- `registration-access.test.ts` (managers)

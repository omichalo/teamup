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

## À valider

| Question | Notes |
|----------|-------|
| Qui peut reverse un paiement manuel ? | `secretariat-payment-action` / reverse — confirmer rôles métier |
| Recalcul rétroactif des aides sur complément | ADR-0010 : pas de recalcul auto |

## Tests

- `payment/apply-stripe-checkout-payment.test.ts`, `calculate-payment-summary.test.ts`, `resolve-remaining-payable.test.ts`, `sync-payment-after-quote-change.test.ts`, …

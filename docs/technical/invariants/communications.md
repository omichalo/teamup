# Invariants — communications / notifications

## Confirmé

| Règle | Preuve |
|-------|--------|
| E-mail confirmation paiement déclenché côté webhook Stripe (best-effort) | `dispatch-payment-confirmed-email.ts` + webhook |
| Secrets SMTP / Discord via env / Secret Manager, jamais `NEXT_PUBLIC_*` | `docs/SECURITY.md` |

## À valider

| Question | Notes |
|----------|-------|
| Matrice événements × canaux (e-mail / Discord) × rôles destinataires | Produit — documenter avant d’automatiser |
| Contenu et fréquence des relances complément / maillot | Produit |

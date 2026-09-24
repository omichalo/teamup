# Invariants — communications / notifications (adhésions)

Inventaire code (audit Cursor). Canal **Discord non utilisé** pour le parcours adhésion / paiement club.

## Confirmé — matrice e-mail

| Événement | Canal | Destinataires | Déclencheur | Preuve |
|-----------|-------|---------------|-------------|--------|
| Nouvelle inscription soumise | E-mail | Contact dossier (`resolveRegistrationContactEmail`) | `POST /api/club/registration` | `registration-submitted-email.ts` |
| Nouvelle inscription soumise | E-mail | Comptes rôle **`secretary` uniquement** (pas admin, pas assistant) | idem, best-effort | `notifySecretariesOfNewRegistration` + `listSecretaryEmails` |
| Demande de paiement / complément (lien Checkout ou variante) | E-mail | E-mails paiement du dossier | `request-payment` / `payment-requested.ts` | `payment-email.ts` (variants request / resend / supplement) |
| Instructions de règlement hors carte (chèque, etc.) | E-mail | E-mails paiement | `request-payment-checkout.ts` | `payment-instructions-email.ts` |
| Demande solde restant CB | E-mail | E-mails paiement | `.../payment/request-remaining-card` | `remaining-balance-payment-email.ts` |
| Paiement enregistré (Stripe Checkout) | E-mail | E-mails paiement | Webhook `checkout.session.completed` | `dispatch-payment-confirmed-email.ts` |
| Paiement enregistré (mark-paid / request-payment déjà soldé) | E-mail | E-mails paiement | routes secrétariat | idem `dispatchPaymentConfirmedEmail` |
| Secrets SMTP | — | — | env / Secret Manager, jamais `NEXT_PUBLIC_*` | `docs/SECURITY.md` |

Les envois secrétariat / confirmation sont en général **best-effort** (erreur loguée, la mutation métier n’est pas toujours annulée).

## Confirmé — hors adhésion (référence)

| Domaine | Canal | Notes |
|---------|-------|-------|
| Suggestions app | E-mail | `dispatch-suggestion-notifications.ts` |
| Auth (vérif / reset) | E-mail | `auth-emails.ts` |
| Licences Discord | Discord | canal `DISCORD_LICENSE_CHANNEL_ID` — **pas** le flux `clubRegistrations` |
| Disponibilités | Discord | hors périmètre adhésion |

## À valider (produit)

| Question | Notes |
|----------|-------|
| Faut-il notifier aussi les **admins** à chaque nouvelle inscription ? | Aujourd’hui : `secretary` seulement |
| Relances automatiques (impayé, complément, maillot non remis) | Pas d’envoi auto périodique trouvé |
| Discord pour adhésions (salon secrétariat) | Non implémenté — souhaité ou non ? |
| Contenu / ton des e-mails complément vs 1ʳᵉ demande | Variants existent ; copy produit à figer si besoin |

## Tests

- `src/lib/email/email-templates.test.ts`
- Deep links secrétariat : `managed-list-url-state.test.ts`

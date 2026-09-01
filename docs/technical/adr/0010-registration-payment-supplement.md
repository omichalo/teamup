# ADR-0010: Complément de paiement après modification du dossier

## Statut

Accepté — 2026-08-31

## Contexte

Un adhérent peut régler son adhésion par carte avant que le secrétariat n’ajoute une option tarifée (maillot optionnel, compétition, etc.). TeamUp recalculait déjà le reliquat (`remainingAmountCents`, `partially_paid`) mais ne proposait ni lien Stripe ni parcours adhérent adapté tant que le dossier restait `paid`.

## Décision

1. **Soldé** = `remainingAmountCents === 0` (et non plus seulement `status === "paid"` ou `paidAt`).
2. **Complément dû** = au moins un encaissement enregistré **et** reliquat > 0 (`isRegistrationSupplementDue`).
3. **Modification tarifaire post-paiement** : réouverture automatique en `payment_requested`, conservation de `paidAt`, horodatage `supplementRequestedAt`.
4. **Stripe** : réutilisation du checkout existant (coupon « déjà encaissé » sur le devis multi-lignes) ; montant demandé = `onlinePayableCents` (complément CB).
5. **Self-service** : adhérent peut payer le complément depuis Mes dossiers ; secrétariat envoie un e-mail dédié « Complément à régler ».
6. **Maillot** : si complément dû et maillot demandé, passage auto en `prepared_awaiting_payment`. Le règlement ne modifie jamais le suivi du maillot ; seul le secrétariat peut le passer à `given`.
7. **Aides secrétariat** : pas de recalcul rétroactif automatique sur le complément (delta tarif brut).
8. **Dossier `approved`** : même logique de réouverture si un reliquat apparaît après modification.

## Conséquences

- Filtre secrétariat « Complément dû » sur la liste des demandes.
- Script `repair-registration-payment-status.ts` étendu pour rouvrir les dossiers `paid`/`approved` incohérents avec `partially_paid`.
- Tests unitaires sur settlement, self-service, sync devis, CTA secrétariat.

# ADR-0005: Don libre avec remise sur l'adhésion

## Statut

Accepté — 2026-06-29

## Contexte

Le club souhaite permettre un don libre lors de l'inscription, avec une remise de 25 % de ce don sur le prix de l'adhésion (plafond 73 €). Le don et la remise doivent figurer sur la facture Stripe.

## Décision

1. **Saisie** : à l'étape Paiement du wizard (adhérent) ; modifiable ensuite **uniquement** par le secrétariat. Minimum 1 € si don choisi.
2. **Calcul pur** : `src/lib/pricing/donation-discount.ts` — remise = `min(don × 25 %, 73 €, adhésion nette catalogue)`.
3. **Total facture** : `devis catalogue + don − remise don` ; les aides secrétariat réduisent le **net encaissé** via le même coupon Stripe que la remise don (fusion obligatoire : 1 coupon max. Checkout).
4. **Stripe Checkout** : lignes détaillées + **un** coupon (remise don + aides) ; détail dans les champs personnalisés facture.
5. **Paiement manuel** : même ventilation via `createPaidOutOfBandInvoice` multi-lignes + coupons.
6. **Reporting** : champs `voluntaryDonationCents` et `donationDiscountCents` sur `clubRegistrations` + colonnes export tableau secrétariat.

## Conséquences

- Tests unitaires sur `donation-discount.ts`, `stripe-checkout-lines` et `stripe-checkout-discounts`.
- Checkout multi-lignes dès qu'un devis catalogue est disponible ; le mode legacy (une ligne) ne subsiste que sans devis.

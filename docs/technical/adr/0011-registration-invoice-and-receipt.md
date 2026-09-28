# ADR-0011: Facture et reçu d’adhésion

## Statut

Accepté — 2026-09-28

## Contexte

Les adhérents ont besoin d’une **preuve de paiement**, y compris pour les règlements hors CB (chèque, chèques vacances, espèces) et les **paiements partiels / compléments**.

Le PDF facture Stripe (même une fois payé) peut encore afficher « montant dû » / « Payer en ligne », ce qui prête à confusion. Stripe ne couvre pas non plus correctement les encaissements manuels ni l’historique multi-moyens.

## Décision

1. **Deux documents distincts**
   - **Facture** : détail tarifaire (lignes du devis / facture Stripe).
   - **Reçu (justificatif d’encaissement)** : preuve de ce qui a été réellement reçu.

2. **Reçu TeamUp (PDF)** : généré côté serveur (PDFKit) à partir de :
   - le devis (`pricingQuote`) ;
   - `payment.receivedPayments` (date, moyen, montant, référence) ;
   - totaux facturé / encaissé / reste dû ;
   - statut **Soldé** ou **Partiellement payé**.

3. **Facture Stripe** : conservée quand un `stripeInvoiceId` existe ou peut être généré (Checkout ou hors bande). Pour une facture **payée**, préférer la **page hébergée** Stripe (libellé « Facture payée ») plutôt que le seul PDF trompeur.

4. **Disponibilité**
   - Reçu : dès qu’il existe au moins un encaissement actif (`paidAmountCents > 0`).
   - Facture : dossier soldé / facture Stripe déjà liée (comportement existant enrichi).

5. **Pas de nouvelle collection Firestore** au départ : documents dérivés du dossier `clubRegistrations`.

## Conséquences

### Positives
- Preuve homogène pour CB, chèque, CV, mixte et partiels.
- Vocabulaire clair facture ≠ reçu dans l’UI et les e-mails.

### Négatives
- Dépendance `pdfkit` + polices TTF (Noto Sans) à tracer pour le build standalone.
- Deux CTA à maintenir sur Mes dossiers.

### Neutres
- La génération de facture Stripe hors bande pour les chèques reste utile à la compta club.

## Alternatives considérées

### Alternative 1: HTML imprimable uniquement
- **Pourquoi rejetée** : l’adhérent attend un PDF téléchargeable comme justificatif.

### Alternative 2: Reçu Stripe uniquement
- **Pourquoi rejetée** : absent ou inadapté hors CB et pour l’historique partiel multi-moyens.

## Références

- ADR-0010 (complément de paiement)
- `src/lib/club-registration/payment-documents/`
- Point boîte à idées : téléchargement facture (paiements chèque)

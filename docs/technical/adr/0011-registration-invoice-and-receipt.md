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

3. **Facture TeamUp (PDF)** : détail tarifaire généré côté serveur (même pipeline PDFKit),
   indépendamment de Stripe. Disponible dès qu’un devis/montant existe **et** que le
   paiement a été demandé / engagé (y compris avant le 1er encaissement).

4. **Stripe** : les factures Checkout restent en place côté PSP ; elles ne constituent
   plus le document « facture » proposé à l’adhérent / secrétariat dans TeamUp.

5. **Disponibilité UI**
   - Facture : dès phase paiement (montant connu + paiement demandé).
   - Reçu : dès qu’il existe au moins un encaissement actif (`paidAmountCents > 0`).
   - CTAs sur **Mes dossiers** et sur le **suivi paiement secrétariat** (un seul bloc).

6. **Numérotation comptable** : numéros séquentiels stables par saison, attribués
   **au premier téléchargement** du PDF concerné, puis persistés sur le dossier
   (`teamupInvoiceNumber`, `teamupReceiptNumber`). Format `FAC-{saison}-{NNNNN}` /
   `REC-{saison}-{NNNNN}`. Compteur serveur : collection `clubPaymentDocumentCounters`
   (Admin SDK uniquement).

7. **Présentation PDF** : destinataire libellé **Adhérent** (pas « Facturer à ») ;
   pas de date d’échéance sur ces justificatifs (détail tarifaire / preuve d’encaissement,
   pas une facture à régler).

## Conséquences

### Positives
- Preuve homogène pour CB, chèque, CV, mixte et partiels.
- Vocabulaire clair facture ≠ reçu dans l’UI et les e-mails.
- Numéros réutilisables et traçables pour le secrétariat / la compta club.

### Négatives
- Dépendance `pdfkit` + polices TTF (Noto Sans) à tracer pour le build standalone.
- Les AFM / `standard-fonts` de PDFKit (Helvetica par défaut) doivent être inclus
  dans l’artefact App Hosting (`outputFileTracingIncludes` + `prepare-standalone.mjs`),
  sinon facture/reçu renvoient 500 en prod.
- Deux CTA à maintenir sur Mes dossiers.
- Compteur Firestore à maintenir (une écriture transactionnelle à la 1ʳᵉ génération).

### Neutres
- La génération de facture Stripe hors bande pour les chèques reste utile à la compta club.

## Alternatives considérées

### Alternative 1: HTML imprimable uniquement
- **Pourquoi rejetée** : l’adhérent attend un PDF téléchargeable comme justificatif.

### Alternative 2: Reçu Stripe uniquement
- **Pourquoi rejetée** : absent ou inadapté hors CB et pour l’historique partiel multi-moyens.

### Alternative 3: N° dérivé de l’id Firestore tronqué
- **Pourquoi rejetée** : peu lisible, non séquentiel, inadapté au classement comptable.

## Références

- ADR-0010 (complément de paiement)
- `src/lib/club-registration/payment-documents/`
- Point boîte à idées : téléchargement facture (paiements chèque)

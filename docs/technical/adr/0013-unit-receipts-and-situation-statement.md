# ADR-0013: Pièces comptables unitaires et état de situation

## Statut

Accepté — 2026-10-02

## Contexte

ADR-0011/0012 prévoyaient **1 FAC + 1 REC par dossier**. Avec des paiements partiels
(plusieurs encaissements), un seul REC cumulatif :

- change de contenu sous le même numéro (immutabilité cassée) ;
- complique le journal Sage (1 écriture / encaissement).

Les adhérents ont toutefois besoin d’un PDF montrant le **solde actuel**.

## Décision

1. **FAC** : 1 numéro / dossier, à l’engagement de la facture (inchangé).
2. **REC** : 1 numéro / `receivedPayment` (`payment.receivedPayments[].documentNumber`),
   attribué à l’enregistrement (ou rattrapage). Réutilise éventuellement
   `teamupReceiptNumber` legacy pour le 1er paiement sans n°.
3. **État de situation** : PDF informatif régénérable (facture + tous encaissements +
   solde), **sans** numéro de pièce comptable. Routes
   `/payment-situation` et compat `/payment-receipt`.
4. **Reçu unitaire** : PDF `/payment-receipt/[receivedId]` = pièce REC.
5. UI : boutons Facture, État de situation, Reçu REC-… (×N).

## Conséquences

### Positives

- Alignement piste d’audit / export Sage.
- Conservation de la vue solde via l’état de situation.

### Négatives

- Script de rattrapage à relancer (REC par ligne).
- UI avec plusieurs boutons reçus si multi-paiements.

## Références

- ADR-0011, ADR-0012
- ADR-0014 (factures figées / avoirs / aides)
- `src/lib/club-registration/payment-documents/`
- `scripts/backfill-payment-document-numbers.ts`

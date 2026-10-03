# ADR-0014: Factures figées, avoirs et pièces d'aides

## Statut

Accepté — 2026-10-02

## Contexte

ADR-0011/0013 fixent FAC + REC unitaires, mais :

1. le **PDF facture** était recalculé depuis le devis courant sous le **même n° FAC**
   après correction de dossier → immutabilité cassée ;
2. les **aides reçues** (Pass Sport, Labaz…) réduisaient le reste à payer sans pièce
   comptable dédiée → trou pour un export Sage.

## Décision

1. **Snapshots `accountingInvoices[]`** sur le dossier :
   - à l'attribution du 1er FAC : snapshot initial figé (lignes + total) ;
   - hausse de devis après engagement → **FAC complémentaire** (`kind: supplement`) ;
   - baisse → **avoir** (`kind: credit_note`, préfixe `AVO-…`, `totalCents` négatif) ;
   - `teamupInvoiceNumber` reste le n° de la **première** FAC (compat).
2. **PDF facture** : toujours depuis le snapshot (routes `/invoice` et
   `/invoice/[invoiceId]`), jamais depuis le devis live une fois engagé.
3. **Aides reçues** : champ `documentNumber` (`AID-…`) sur `PaymentAid` à la
   réception ; PDF `/aid-receipt/[aidType]` ; projection ledger comme encaissement
   `method: "aid"`.
4. Compteurs saisonniers étendus : `nextCreditNoteSeq`, `nextAidSeq` dans
   `clubPaymentDocumentCounters`.
5. Sync post-écriture : `syncAccountingDocumentsAfterRegistrationWrite`
   (FAC/REC + snapshot + AID + réconciliation devis).

## Conséquences

### Positives

- Chaîne documentaire FAC → complément / avoir auditables.
- Aides traçables comme pièces distinctes de la créance adhérent.

### Négatives

- Rattrapage : dossiers déjà numérotés sans snapshot → snapshot créé au prochain
  sync / téléchargement à partir du devis **actuel** (approximation historique).
- UI multi-boutons (plusieurs FAC / AID).

## Références

- ADR-0011, ADR-0012, ADR-0013
- `src/lib/club-registration/payment-documents/`
- `scripts/backfill-payment-document-numbers.ts`

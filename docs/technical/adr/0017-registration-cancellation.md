# ADR-0017: Annulation de dossier d'adhésion (remplace la suppression)

## Statut

Accepté — 2026-10-05

## Contexte

La suppression dure (`DELETE` Firestore) effaçait dossiers et pièces comptables, créant des trous de séquence (ex. `FAC-2026-2027-00448` pour Aubin JAEGLE PATOU). Le statut `rejected` existait dans le modèle mais n'était plus le terminal métier utile.

## Décision

1. **Statut terminal unique** : `cancelled` (« Annulé ») remplace `rejected`.
2. **Annulation avec motif** : `cancellationReason`, `cancelledAt`, `cancelledByUid` ; confirmation phrase `ANNULER Prénom NOM`.
3. **Précondition REC** : refuser l'annulation tant qu'un encaissement non reverse existe — d'abord le flux reverse unitaire (trésorerie), ensuite l'annulation dossier (créance).
4. **Compta** : si net `accountingInvoices` > 0 → AVO de clôture (`reconcileAccountingInvoicesAfterQuoteChange` target 0). Les FAC/REC/AID restent sur le dossier.
5. **Suppression dure** : retirée (API `DELETE` → 405).
6. **Visibilité** : filtre « Annulé » / « Tous » sur demandes, tableau, analytics.

## Conséquences

- Les dossiers annulés restent exportables Sage.
- Un dossier cancelled n'entre plus dans effectifs / roster / conflits licence (comme l'ex-rejected).
- Remédiation one-shot possible pour reconstituter un dossier effacé à tort (script `restore-aubin-jaegle-patou-registration.ts`).

## Références

- ADR-0014 (FAC / AVO)
- `src/lib/club-registration/cancel-registration.ts`
- `POST /api/club/registration/[id]/cancel`

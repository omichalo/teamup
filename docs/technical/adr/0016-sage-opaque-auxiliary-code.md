# ADR-0016: Code auxiliaire Sage opaque (pas la licence FFTT)

## Statut

Accepté — 2026-10-04

## Contexte

L’export comptable utilisait `C{licence}` ou `P{dossier}` recalculé à chaque export. Pour un nouvel adhérent, la FAC est émise avant la licence FFTT : geler `C…` à la facture est impossible, et basculer `P` → `C` plus tard casse le lettrage dès qu’un import Sage a eu lieu. Les imports successifs exigent un code auxiliaire stable.

## Décision

1. **Clé Sage (411 auxiliaire)** : code TeamUp opaque figé sur le dossier (`sageAuxiliaryCode`), forme `A` + séquence globale (`A000001`).
2. **Licence FFTT** : attribut du tiers uniquement (`tiers.csv`, fiche), jamais la clé d’écriture.
3. **Allocation** : à la première FAC (engagement), via Admin SDK. Si une licence est déjà connue et qu’un code existe pour cette licence (registre / saison N−1), le réutiliser.
4. **Immutabilité** : une fois posé, le code ne change plus (y compris si la licence arrive ensuite).
5. **Legacy** : backfill des dossiers déjà engagés en **figeant** le code qu’aurait produit l’ancien export (`C…` / `P…`), pour ne pas invalider un éventuel essai d’import. Les **nouveaux** codes sont uniquement `A…`.
6. **Export** : lit exclusivement `sageAuxiliaryCode`. Absence → anomalie `tiers_code_non_fige` + repli legacy temporaire. Licence absente → `licence_absente` (review), plus de `tiers_provisoire` ni consigne de fusion P→C.

Collections Admin-only : `clubSageAuxiliaryCounters`, `clubSageAuxiliaryCodes`, `clubSageAuxiliaryLicenseIndex`.

## Conséquences

### Positives

- Identifiant de même nature pour tous les adhérents (nouveaux inclus).
- Arrivée tardive d’une licence sans réécriture des pièces.
- Prérequis pour des exports / imports successifs (delta) sans double auxiliaire.

### Négatives

- Coexistence temporaire de codes `A…`, `C…` et `P…` après backfill.
- Continuité inter-saisons sans licence repose sur le registre licence une fois celle-ci connue.

### Neutres

- Le libellé / colonne licence du fichier tiers reste le rapprochement humain et FFTT.

## Alternatives considérées

### Alternative 1: Licence comme code, gelée à la FAC
- **Pourquoi rejetée**: la FAC précède presque toujours la licence pour les nouveaux.

### Alternative 2: Toujours `P{dossier}`
- **Pourquoi rejetée**: casse la continuité de lettrage d’une saison à l’autre (nouveau dossier chaque année).

## Références

- `src/lib/club-registration/payment-documents/sage-auxiliary-code.ts`
- `src/lib/accounting-export/format-sage.ts`
- `docs/technical/export-comptable-anomalies.md`
- ADR-0011, ADR-0013, ADR-0014

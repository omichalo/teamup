# ADR-0006: Pointage des présences aux entraînements

## Statut

Accepté — 2026-08-20 · Mis à jour — 2026-08-30 (annulations d’occurrences)

## Contexte

Le club doit pointer les présences sur tablette, par créneau du jour. Les créneaux existent déjà dans la config d’inscription (`clubRegistrationConfig.sites[].slots`) et les dossiers (`clubRegistrations.slotIds`), mais il n’y a ni séances datées ni pointage.

Deux référentiels personnes coexistent : `clubRegistrations` (adhérents saisonniers) et `players` (roster FFTT). Les coachs lisent les dossiers mais n’écrivent pas les adhésions d’autrui.

## Décision

1. **Domaine isolé** : collections `attendanceMarks`, `attendanceLeads` et `attendanceSlotCancellations`, API `/api/club/attendance/*`, pas de présence stockée dans `clubRegistrations`. Accès client Firestore refusé (Admin SDK uniquement).
2. **Effectif** : dossiers non refusés dont `slotIds` contient le créneau. Source = `clubRegistrations`, jamais `players`.
3. **Créneaux du jour** : champs structurés `weekday` (ISO 1–7), `startMinutes`, `endMinutes` sur chaque slot, backfill depuis le libellé / l’id. Catalogue récurrent filtré sur le weekday de la date choisie.
4. **Pointage** : un document par présence, id déterministe `{date}_{slotId}_{personKey}` (idempotent). Dépointage = suppression. Geste opt-in « Présent ».
5. **Walk-in adhérent** : mark `walkin` ; ajout optionnel du créneau via un endpoint dédié (`arrayUnion` sur `slotIds` uniquement), pas le PATCH manager des dossiers.
6. **Essai** : `attendanceLeads` (identité minimale) + mark `guest`. File de relance (`ADMIN`/`SECRETARY`/`BOARD_MEMBER`). Pas de dossier d’adhésion ni de joueur FFTT.
7. **Rôles** : pointage / stats / export = `ADMIN` + `SECRETARY` + `BOARD_MEMBER` + `COACH`. File des essais **et annulations d’occurrences** = `ADMIN` + `SECRETARY` + `BOARD_MEMBER` (pas le coach, ni le secrétaire adjoint).
8. **Offline** : reporté. Les ids déterministes n’interdisent pas une file locale plus tard.
9. **Stats** : taux = présences `enrolled` (hors dates annulées) / (occurrences calendaires du weekday depuis max(début de saison, date d’inscription) jusqu’à aujourd’hui **moins** les occurrences annulées de ce `slotId`). Pas d’exclusion jours fériés automatiques.
10. **Annulations d’occurrences** : overlay `attendanceSlotCancellations` (id `{date}__{slotId}`), sans modifier le catalogue d’inscription. Portées : une occurrence, tout le jour, ou toute la semaine ISO (lun–dim). Confirmation UI obligatoire. Les marks existants ne sont pas effacés ; tout nouveau pointage sur une occurrence annulée est refusé (409). Restauration = suppression du document d’annulation.

## Conséquences

### Positives
- Frontière claire adhésion / présence / championnat.
- Les coachs ne gagnent pas l’écriture générale des dossiers.
- Deux tablettes sur le même créneau ne dupliquent pas un pointage.
- Vacances / gymnase fermé : annulation datée sans casser le wizard d’inscription.

### Négatives
- Catalogue d’inscription enrichi (horaire structuré) à maintenir dans l’éditeur de config.
- Les annulations sont manuelles (pas de jours fériés automatiques en V1).

### Neutres
- Fuseau `Europe/Paris`. Saison = `meta.seasonLabel` (1er septembre → 31 août).

## Alternatives considérées

### Alternative 1: sous-collection sur le dossier d’adhésion
- **Pourquoi rejetée** : mélange planning et workflow de validation ; requêtes « séance du soir » peu naturelles.

### Alternative 2: réutiliser `players`
- **Pourquoi rejetée** : roster FFTT ≠ adhérents de la saison ; les loisirs sans licence n’y sont pas.

### Alternative 3: désactiver le créneau dans la config d’adhésion
- **Pourquoi rejetée** : retirerait le créneau de toutes les semaines et du parcours d’inscription.

## Références

- `.cursor/rules/80-club-platform-extension.mdc`
- `src/lib/club-registration/registration-access.ts`
- `src/lib/attendance/cancellations.ts`

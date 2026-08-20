# ADR-0006: Pointage des présences aux entraînements

## Statut

Accepté — 2026-08-20

## Contexte

Le club doit pointer les présences sur tablette, par créneau du jour. Les créneaux existent déjà dans la config d’inscription (`clubRegistrationConfig.sites[].slots`) et les dossiers (`clubRegistrations.slotIds`), mais il n’y a ni séances datées ni pointage.

Deux référentiels personnes coexistent : `clubRegistrations` (adhérents saisonniers) et `players` (roster FFTT). Les coachs lisent les dossiers mais n’écrivent pas les adhésions d’autrui.

## Décision

1. **Domaine isolé** : collections `attendanceMarks` et `attendanceLeads`, API `/api/club/attendance/*`, pas de présence stockée dans `clubRegistrations`. Accès client Firestore refusé (Admin SDK uniquement).
2. **Effectif** : dossiers non refusés dont `slotIds` contient le créneau. Source = `clubRegistrations`, jamais `players`.
3. **Créneaux du jour** : champs structurés `weekday` (ISO 1–7), `startMinutes`, `endMinutes` sur chaque slot, backfill depuis le libellé / l’id.
4. **Pointage** : un document par présence, id déterministe `{date}_{slotId}_{personKey}` (idempotent). Dépointage = suppression. Geste opt-in « Présent ».
5. **Walk-in adhérent** : mark `walkin` ; ajout optionnel du créneau via un endpoint dédié (`arrayUnion` sur `slotIds` uniquement), pas le PATCH manager des dossiers.
6. **Essai** : `attendanceLeads` (identité minimale) + mark `guest`. File de relance (`ADMIN`/`SECRETARY`/`BOARD_MEMBER`). Pas de dossier d’adhésion ni de joueur FFTT.
7. **Rôles** : pointage / stats / export = `ADMIN` + `SECRETARY` + `BOARD_MEMBER` + `COACH`. File des essais = `ADMIN` + `SECRETARY` + `BOARD_MEMBER` (pas le coach, ni le secrétaire adjoint).
8. **Offline** : reporté. Les ids déterministes n’interdisent pas une file locale plus tard.
9. **Stats V1** : taux = présences `enrolled` / occurrences calendaires du weekday depuis max(début de saison, date d’inscription) jusqu’à aujourd’hui. Pas d’exclusion jours fériés.

## Conséquences

### Positives
- Frontière claire adhésion / présence / championnat.
- Les coachs ne gagnent pas l’écriture générale des dossiers.
- Deux tablettes sur le même créneau ne dupliquent pas un pointage.

### Négatives
- Catalogue d’inscription enrichi (horaire structuré) à maintenir dans l’éditeur de config.
- Taux de présence V1 ignore les séances annulées.

### Neutres
- Fuseau `Europe/Paris`. Saison = `meta.seasonLabel` (1er septembre → 31 août).

## Alternatives considérées

### Alternative 1: sous-collection sur le dossier d’adhésion
- **Pourquoi rejetée** : mélange planning et workflow de validation ; requêtes « séance du soir » peu naturelles.

### Alternative 2: réutiliser `players`
- **Pourquoi rejetée** : roster FFTT ≠ adhérents de la saison ; les loisirs sans licence n’y sont pas.

## Références

- `.cursor/rules/80-club-platform-extension.mdc`
- `src/lib/club-registration/registration-access.ts`

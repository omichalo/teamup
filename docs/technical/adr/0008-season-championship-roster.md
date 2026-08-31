# ADR-0008: Effectif championnat saisonnier et miroir FFTT

## Statut

Accepté — 2026-08-22

## Contexte

La collection `players` mélange un miroir de l’API FFTT (liste club + détails licence) et des données club : participation championnat, équipes préférées, Discord, fauteuil, joueurs temporaires, agrégats de brûlage.

À la transition de saison, la FFTT continue d’attribuer d’anciens adhérents à SQY tant qu’ils n’ont pas repris de licence (club ou ailleurs), tout en les sortant de `getJoueursByClub`. Les booléens `participation.*` survivent donc hors effectif réel. Les dossiers d’adhésion (`clubRegistrations`) disent qui est membre et ce qu’il a demandé, mais ce n’est pas un roster FFTT.

Le championnat 2026-2027 doit se baser sur l’intention des dossiers (paiement et licence visibles, non bloquants), pas sur les reliquats `players.participation`.

## Décision

1. **`players`** : miroir FFTT actif (liste club courante), plus `listedInClub` / `lastSeenInClubListAt`. **`playersArchive`** : miroir historique des licences sorties de la liste club (rafraîchi à la synchro, restauré dans `players` si la licence réapparaît).
2. **`seasons/{seasonLabel}/championshipPlayers/{personKey}`** : effectif championnat de la saison (`meta.seasonLabel`, 1er septembre → 31 août, comme ADR-0006). Seed automatique depuis les dossiers non refusés avec `championnat_equipe` et/ou `championnat_paris`. `coachExcluded` est sticky. Ajout coach sans intention dossier autorisé.
3. **Paiement et licence** : informatifs (`paymentStatus`, `licensePresence`). L’entraîneur les voit ; ils n’excluent pas du pool.
4. **Clé personne** : licence FFTT si connue, sinon `reg_{registrationId}`. Fusion vers la licence quand elle arrive.
5. **`playerClubProfiles/{personKey}`** : Discord et fauteuil, durables hors saison.
6. **Temporaires** : documents du roster saison (`isTemporary`), plus des fiches `players` fictives.
7. **Écritures** : seed et recalcul via Admin SDK ; toggles participation via API (`ADMIN`/`COACH`). Lectures roster : `ADMIN`/`COACH`.
8. Ouverture de saison = changement de `seasonLabel` publié. Action « Recalculer l’effectif » sur l’onglet admin Synchronisation FFTT.

## Conséquences

### Positives

- Le pool compositions / dispos ne reprend plus les 188 affiliés SQY sans licence saison.
- Un adhérent payé sans liste club (ex. Deshayes) peut apparaître, avec un chip d’alerte.
- Le brûlage est recalculable par saison.

### Négatives

- Join roster + `players` + profils à chaque chargement.
- Les compositions 2025-2026 restent sur l’ancien modèle (hors migration historique).

### Neutres

- Critérium fédéral / championnat jeunes hors UI compositions de cette vague.
- Pas de purge physique des documents `players` hors liste club ; archivage vers `playersArchive` lors de la synchro FFTT (restauration automatique si la licence revient dans `getJoueursByClub`).

## Alternatives considérées

### Alternative 1: se fier uniquement à `players`

- **Pourquoi rejetée** : affiliation FFTT résiduelle ≠ licencié de saison ≠ adhérent club.

### Alternative 2: se fier uniquement aux dossiers

- **Pourquoi rejetée** : pas de points / type de licence ; loisirs et dossiers incomplets.

### Alternative 3: garder `participation` sur `players` avec un reset annuel

- **Pourquoi rejetée** : la synchro `merge` ne reset pas ; le modèle reste couplé au miroir FFTT.

## Références

- `.cursor/rules/80-club-platform-extension.mdc`
- `docs/technical/adr/0006-training-attendance.md`
- `src/lib/shared/player-sync.ts`

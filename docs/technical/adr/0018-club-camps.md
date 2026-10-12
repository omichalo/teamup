# ADR-0018: Stages vacances (camps) — domaine isolé

## Statut

Accepté — 2026-10-10

## Contexte

SQY Ping organise des stages (vacances) avec inscriptions (adhérents et non-adhérents),
paiements (CB Stripe, chèque, chèques vacances, espèces), pointage par créneau, et suivi
secrétariat. Le workflow d’adhésion (`clubRegistrations`) et le pointage entraînement
(`attendanceMarks`) ne doivent pas absorber ce métier (ADR-0012, ADR-0006).

## Décision

1. **Bounded context** `camps` : collections `camps`, `campSlots`, `campRegistrations`,
   `campAttendanceMarks`, `campPaymentDocumentCounters`, catalogue réutilisable
   `campCatalogSites` / `campCatalogFormulas` / `campCatalogPricings` — Admin SDK
   uniquement. Les stages **assignent** des snapshots catalogue (sites + formules
   + horaires + grille tarifaire).
2. **Compte obligatoire** pour s’inscrire (`ownerUid`) ; saisie staff avec `ownerUid` cible.
3. **Paiement isolé** sur `campRegistrations.payment` (pas `clubRegistrations.payment`).
4. **Pièces** : séries `STG-FAC` / `STG-REC` (compteurs séparés de FAC/REC adhésion).
5. **Export Sage** : pack unifié adhésions + stages ; produit stages sur
   `SAGE_ACCOUNTS.stages` (`706100` proposé, à confirmer trésorier) — jamais `756000`.
6. **Pointage unifié** : `/club/presences` liste aussi les `campSlots` du jour
   (`source: "training" | "camp"`) ; marks camp dans `campAttendanceMarks`.
7. **Rôles** : managers `ADMIN` + `SECRETARY` ; pointage = opérateurs présence existants.
8. **Stripe webhook** : `metadata.domain === "camp"` ; aucun side-effect adhésion/championnat.

## Conséquences

### Positives
- Frontière claire adhésion / stage / entraînement.
- Coachs : une seule pointeuse.
- Comptabilité : séries et compte produit distincts.

### Négatives
- Extensions du pack export et du picker présences à maintenir.
- Numéro de compte Sage stages à valider avec le trésorier.

### Neutres
- Ledger `kind: "camp"` (placeholder ADR-0012) activé en projection lecture.

## Alternatives considérées

### Alternative 1: Étendre `clubRegistrations.payment`
- **Pourquoi rejetée** : contredit ADR-0012 ; mélange cotisation et stage.

### Alternative 2: Seconde app de pointage `/club/stages/presences`
- **Pourquoi rejetée** : charge cognitive pour les coachs.

## Références

- `.cursor/rules/80-club-platform-extension.mdc`
- ADR-0006, ADR-0011, ADR-0012, ADR-0013, ADR-0016
- `src/lib/camps/`

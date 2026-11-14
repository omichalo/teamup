# ADR-0019: Clés Firestore des compositions saisonnées

## Statut

Accepté — 2026-11-14

## Contexte

Les documents `compositions` étaient adressés par
`${phase}_${journee}_${championshipType}[_${idEpreuve}]`, sans libellé de saison
(même dette que les disponibilités avant ADR-0018). En prod, `aller_5_masculin` /
`aller_5_feminin` contenaient encore les compositions de la saison précédente ;
l’UI les rechargeait à l’ouverture de J5 au lieu de repartir des défauts + dispos
courantes.

## Décision

1. **IDs compositions** : `${seasonLabel}_${phase}_${journee}_${championshipType}[_${idEpreuve}]`
   (ex. `2026-2027_aller_5_masculin`).
2. **`seasonLabel`** : même calendrier club que ADR-0018 (`seasonLabelFromDate`).
3. **Defaults** (`compositionDefaults`) : hors scope — templates de phase, pas liés
   à une journée ; revue séparée si collision inter-saisons.
4. **Migration** : script `scripts/migrate-compositions-season-keys.ts` —
   J5 aller forcé en archive `2025-2026_*` + `teams` vidés sur le legacy ; autres
   journées classées via `updatedAt` vs début de saison courante.

## Conséquences

### Positives

- J5 de la saison courante démarre vide (défauts + dispos), sans héritage N-1.
- Alignement avec le modèle disponibilités / sondages Discord.

### Négatives

- Migration one-shot obligatoire au déploiement, sinon J1–J4 compositions
  apparaissent vides côté UI (docs saisonnés non lus).

## Références

- ADR-0018 (disponibilités saisonnées)
- [`src/lib/compositions/document-id.ts`](../../../src/lib/compositions/document-id.ts)
- [`scripts/migrate-compositions-season-keys.ts`](../../../scripts/migrate-compositions-season-keys.ts)

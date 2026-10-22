# Invariants — licences / FFTT

## Confirmé

| Règle | Preuve |
|-------|--------|
| Miroir club : collection `players` (sync) | ADR-0008 / 0009 |
| Relecture dossier : overlay FFTT depuis `players/{licence}`, cliché `ffttLicenseLookup` en repli | ADR-0009 |
| Pas d’appel FFTT systématique au GET dossier | ADR-0009 |
| Bouton « Retrouver » = appel API FFTT (nouveaux hors miroir) | ADR-0009 |
| Validation licences UI : `assistant_secretary`, `secretary`, `admin` | `license-validation/access.ts` + tests |

## À valider

| Question | Notes |
|----------|-------|
| SLA fraîcheur sync quotidienne vs attente secrétariat | Produit |

## Tests

- `src/lib/players/fftt-mirror.test.ts`, `license-validation/access.test.ts`, `compare-fftt-identity.test.ts`

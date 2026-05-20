# ADR-0004: Catalogue tarifaire et moteur de devis

## Statut

Accepté — 2026-05-19

## Contexte

La grille publique [sqyping.fr/tarifs](https://www.sqyping.fr/tarifs) n’était pas modélisée en code : le secrétariat saisissait un montant unique avant Stripe Checkout (une seule ligne facture).

## Décision

1. **Catalogue versionné** dans `src/lib/pricing/catalog/sqyping-2025.ts` (`PRICING_CATALOG_VERSION = sqyping-2025-05`).
2. **Moteur pur** `calculateQuote(PricingContext)` — mêmes règles côté client et serveur (PR suivantes).
3. **Remises fixes sur l’adhésion club uniquement** : 2ᵉ membre −15 €, 3ᵉ et + −30 €, 1ʳᵉ inscription féminine −80 €.
4. **Compétitions** : une ligne par option cochée aux montants grille ; critérium fédéral **seniors** distinct des tarifs jeunes.
5. **Pass Sport, Labaz, aide municipale** : déclaration conservée, **sans montant** en V1 (`requiresAdminReview` + message secrétariat).
6. **Handisport** : champ `handisportPracticeLevel` (`leisure` | `competition`) requis pour le calcul.
7. **Stripe (PR ultérieure)** : lignes génériques (« Adhésion club », « Licence FFTT », …) ; identité dossier en metadata.

## Conséquences

- Tests unitaires exhaustifs sur la grille dans `calculate-quote.test.ts`.
- Évolution annuelle = nouveau fichier catalogue + bump de version.
- UI estimation et Checkout multi-lignes : PRs 2 à 4.

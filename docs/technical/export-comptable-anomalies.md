# Anomalies export comptable Sage — inventaire et corrections

Date : 2026-10-04  
Source : export production `sqyping-teamup`, saison 2026-2027  
Fichiers : `tmp/sage-export/anomalies.csv`, `tmp/sage-export/anomalies-classification.json`

## Synthèse

| Code | Nb initial | Après correctif app (sans `--apply`) | Sévérité | Correction données |
|---|---:|---:|---|---|
| `piece_manquante` | 29 | **3** | blocking | Backfill REC des 3 actifs du 2026-10-04 |
| `moyen_inconnu` | 12 | **0** (10 `moyen_reclasse` info + 2 `encaissement_non_financier`) | info / blocking | Reclasser SumUp/virement ; 2 cas manuels |
| `remise_exceptionnelle` | 11 | 11 | blocking | Émettre les AVO via sync |
| `tiers_provisoire` (obsolète) | 33 | remplacé par `licence_absente` | review | Voir ADR-0016 — plus de fusion P→C |
| `aide_non_recue` | 14 | 14 | pending | Suivi secrétariat |

Dry-run du rattrapage (`repair-plan.json`) : **25 dossiers**, 3 REC, 11 AVO, 10 reclassements, 2 revues manuelles.  
Après `--apply` + traitement manuel des 2 remises déguisées : anomalies bloquantes résolues ; suivi `licence_absente` / `aide_non_recue`.

---

## 1. `piece_manquante` — 29

### Cause

- **26** encaissements **annulés** (`reversedAt`) **jamais numérotés**. Le backfill ADR-0013 ne numérote que les encaissements actifs. L'export tentait quand même de les écrire → faux positifs (ex. Joao-Marques FERREIRA : 2 chèques erronés annulés, puis les bons avec REC).
- **3** encaissements **actifs** sans REC, saisis le **2026-10-04** (565 €) :
  - stephane MOTLOCH — chèques vacances 340 €
  - Sacha ABISROR — chèques vacances 190 €
  - Yaël MONIN — chèque 35 €  
  La route API appelle bien `syncPaymentDocumentNumbersForRegistration`, mais l'erreur est avalée (`try/catch` + log). Probable échec ponctuel ou écriture hors route.

### Correction applicative

- Export : **ne plus signaler** un encaissement annulé sans numéro (hors chaîne comptable).
- Optionnel (plus tard) : faire échouer la réponse API si l'attribution REC échoue, au lieu de logger silencieusement.

### Correction données

```bash
npx tsx scripts/repair-sage-export-anomalies.ts --project sqyping-teamup --use-adc
npx tsx scripts/repair-sage-export-anomalies.ts --project sqyping-teamup --use-adc --apply
```

Le script rappelle `syncAccountingDocumentsAfterRegistrationWrite` (attribue les REC manquants).

---

## 2. `moyen_inconnu` — 12 × « other »

### Répartition réelle

| Libellé saisi | Nb | Compte cible |
|---|---:|---|
| SUM UP | 8 | `511210` SumUp à rapprocher |
| Virement | 2 | `512000` Banque |
| Remise année tronquée Trappes (Noah CAZENAVE) | 1 | **Pas un encaissement** → AVO |
| Trop perçu achat raquette (Lucille MOUGEOTTE) | 1 | **Pas un encaissement** → AVO / OD |

### Correction applicative

- Nouveaux moyens reçus : `sumup`, `transfer` (UI secrétariat).
- Plan de comptes : `511210` SumUp, `512000` virement.
- Export : heuristique sur libellé/note des `other` legacy (`SUM UP`, `Virement`, `remise`…).
- Les « remises » déguisées en encaissement → anomalie `encaissement_non_financier` (blocking).

### Correction données

- Reclassement automatique SumUp / virement via le script de rattrapage.
- **Manuel** pour Noah CAZENAVE (65 € « Remise année tronquée Traptops/Trappes ») et Lucille MOUGEOTTE (5 € « Trop perçu achat raquette ») : annuler l'encaissement `other` (ou le laisser et passer une remise exceptionnelle + AVO), ne pas les laisser en trésorerie.

---

## 3. `remise_exceptionnelle` — 11 × 2 021 €

### Cause

La remise secrétariat (`payment.aids[]` type `other`) diminue `amountToPay` mais **ne touchait pas** `accountingInvoices`. La FAC restait au montant devis → créance 411 trop haute du montant de la remise.

Exemples :

| Adhérent | Remise | Motif | Effet attendu |
|---|---:|---|---|
| Patricia BERNARD | 249 € | (virtuel / bureau) | AVO 756 |
| Romain BREHIER / Herve PANTEGNIES | 64 € | Pas de licence | AVO plutôt 467100 |
| Antoine TAILLEUR / Raphael STEAU | 264 € | Entraineur | AVO 756 (cotisation offerte) |
| Andy RASOLOHERY | 30 € | Complément Pass+ | AVO 756 *ou* hausse AID Pass Plus à 80 € |
| David PHENGTHONG | 194 € | Juge-arbitrage | AVO 756 |

### Correction applicative

Dans `syncAccountingDocumentsAfterRegistrationWrite` :

`cible comptable = total devis (avec don) − somme des remises exceptionnelles`

Les aides collectibles (Pass Sport, Labaz…) ne réduisent **pas** la FAC (elles soldent via AID).  
Une baisse de cible après engagement émet un **AVO** ; le libellé reprend le motif (« Remise exceptionnelle — Pas de licence ») pour ventiler licence → 467100.

### Correction données

Même script `repair-sage-export-anomalies.ts --apply` : resync → émission des AVO manquants.

Point métier à trancher pour Andy RASOLOHERY : plutôt augmenter l'AID Pass Plus de 50 → 80 € (et retirer la remise 30 €) si le QR code Pass+ le justifie.

---

## 4. Identifiant tiers — ADR-0016

### Ancien modèle (`tiers_provisoire`)

Code recalculé `C{licence}` / `P{dossier}` à chaque export → bascule dangereuse pour les imports successifs.

### Nouveau modèle

- Champ figé `sageAuxiliaryCode` (`A######` pour les nouveaux ; backfill legacy `C…`/`P…`).
- Licence = attribut (`licence_absente` si manquante, sévérité review).
- Plus de consigne de fusion P→C dans Sage.
- Backfill : `npx tsx scripts/backfill-sage-auxiliary-codes.ts --project sqyping-teamup --use-adc [--apply]`
- Si export sans champ : `tiers_code_non_fige` + repli legacy temporaire.

---

## 5. `aide_non_recue` — 14 × 964 €

### Cause

Aides déclarées (`pass_plus`, `pass_sport`, `labaz`, `aide_municipale`) avec `received !== true`. Comportement voulu : pas d'écriture tant que le secrétariat n'a pas coché la réception.

### Correction

- Export : sévérité `pending` (pas blocking).
- Suivi opérationnel secrétariat (écran aides en attente déjà prévu).
- Aucune écriture Sage tant que non reçues.

---

## Correctifs livrés dans le code

| Zone | Changement |
|---|---|
| `payment-constants` | Moyens `sumup`, `transfer` |
| `accounting-export/chart` | Comptes 511210 / 512000 + heuristiques `other` |
| `accounting-export/append-settlements` | Ignore annulés sans n° ; reclasse SumUp/virement ; flag remises déguisées |
| `sync-document-numbers` | Cible FAC/AVO = devis − remise exceptionnelle |
| `reconcile-accounting-invoices` | Libellé AVO = motif de remise |
| `sage-auxiliary-code` + ADR-0016 | Code auxiliaire opaque figé ; licence = attribut |
| `scripts/backfill-sage-auxiliary-codes.ts` | Fige les codes legacy C…/P… |
| `scripts/repair-sage-export-anomalies.ts` | Dry-run / apply du rattrapage |
| `scripts/export-sage-entries.ts` | Anomalies avec colonne `Severite` |

## Ordre recommandé

1. Relire `tmp/sage-export/repair-plan.json` (dry-run).
2. `--apply` du script de rattrapage sur la production.
3. Traiter à la main les 2 `encaissement_non_financier` et Andy (Pass+ 80 €).
4. Relancer `export-sage-entries.ts`.
5. Vérifier `controle.json` : plus de `piece_manquante` / `remise_exceptionnelle` / `moyen_inconnu` blocking.
6. Valider le plan de comptes (`511210`, `512000`, `754000`…) sur le dossier Sage du club avant import.

# ADR-0009: Infos FFTT du dossier d’adhésion depuis le miroir `players`

## Statut

Accepté — 2026-08-30

## Contexte

Le lookup licence (`getJoueurDetailsByLicence`) persiste un cliché `ffttLicenseLookup` sur `clubRegistrations`. À la relecture du dossier, ce cliché n’est plus à jour (club, catégorie, points, type de licence).

La collection `players` est déjà le miroir FFTT du club (ADR-0008) : synchro quotidienne et admin, y compris un rafraîchissement partiel des fiches hors liste club. Le championnat joint déjà `players` au seed d’effectif.

## Décision

1. **Lecture d’un dossier** (`GET /api/club/registration`, tableur secrétariat) : joindre `players/{licence}` et overlay des champs FFTT sur `ffttLicenseLookup`. Pas d’appel API FFTT, pas d’écriture Firestore.
2. **Cliché conservé** comme preuve de vérification et **repli** si la fiche `players` est absente ou temporaire.
3. **Merge champ par champ** : une valeur non vide du miroir l’emporte ; le cliché reste pour les champs absents du miroir (fiches unlisted partielles).
4. **Catégorie** : exposée au client via `ffttLicenseLookup.categorie` et un champ dérivé `ffttCategorie` (colonne tableau, non persisté).
5. Le bouton « Retrouver » du wizard / secrétariat continue d’appeler l’API FFTT (nouveaux licenciés hors miroir).

## Conséquences

### Positives

- Relecture d’un dossier SQY = données de la dernière synchro `players`.
- Catégorie visible dans le détail et filtrable / exportable dans le tableau.

### Négatives

- Fraîcheur limitée à la dernière synchro (volontaire). Refresh à chaud = bouton Retrouver.
- +1 lecture Firestore par dossier (bulk `getAll` pour le tableur).

### Neutres

- Un PATCH secrétariat peut réécrire le lookup hydraté : le cliché se rapproche du miroir, ce n’est pas un write-on-read.

## Alternatives considérées

### Alternative 1: rappeler la FFTT à chaque GET

- **Pourquoi rejetée** : latence et quota ; le miroir existe déjà.

### Alternative 2: n’utiliser que le cliché

- **Pourquoi rejetée** : catégorie / club / points périmés dès le lendemain de l’inscription.

## Références

- `docs/technical/adr/0008-season-championship-roster.md`
- `src/lib/shared/player-sync.ts`
- `src/lib/players/fftt-mirror.ts`

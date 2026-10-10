---
name: invariants-check
description: >-
  Avant de modifier adhésions, paiements, maillots, FFTT, rôles ou Firestore rules,
  relire les invariants Confirmé et signaler les items À valider.
---

# Contrôle des invariants métier

1. Lire `docs/technical/invariants/README.md` et la fiche du domaine touché.
2. Citer les règles **Confirmé** applicables dans la proposition de change.
3. Si le change repose sur un item **À valider** : stopper et demander confirmation métier ; ne pas durcir en rule Cursor.
4. Préférer étendre un test Jest existant listé dans la fiche.
5. ADRs : `docs/technical/adr/` (notamment 0009 FFTT, 0010 paiement/complément).

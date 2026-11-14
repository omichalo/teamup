# ADR-0018: Clés Firestore des disponibilités saisonnées

## Statut

Accepté — 2026-11-14

## Contexte

Les documents `availabilities` (et les sondages Discord associés) étaient adressés par
`${phase}_${journee}_${championshipType}[_${idEpreuve}]`, sans libellé de saison.
À chaque nouvelle saison FFTT, la même clé (`aller_5_masculin`, etc.) réaffichait
les réponses de l’année précédente. Les réponses joueur n’ont pas d’horodatage
individuel, donc aucun filtrage fiable « frais vs ancien » dans un même document.

## Décision

1. **IDs disponibilités** : `${seasonLabel}_${phase}_${journee}_${championshipType}[_${idEpreuve}]`
   (ex. `2026-2027_aller_5_masculin`).
2. **`seasonLabel`** : calendrier club 1er septembre → 31 août
   (`seasonLabelFromDate`), aligné ADR-0006/0008. Côté serveur, préférence pour
   `meta.seasonLabel` publié sur la config d’adhésion active, avec repli calendaire.
3. **Sondages Discord** : les **nouveaux** sondages utilisent un ID saisonné.
   Les messages déjà postés (custom_id legacy, ex. `aller_5_masculin`) restent
   valides : lookup par ID de document exact, écriture des dispos vers la clé
   **saison courante**.
4. **Migration** : script `scripts/migrate-availabilities-season-keys.ts` —
   J5 aller forcé en archive `2025-2026_*` + slate vide ; autres journées
   classées via date de sondage / `updatedAt`.
5. **Compositions** : hors scope de cette ADR (même dette de clé, suivi séparé).

## Conséquences

### Positives

- Séparation nette des réponses par saison.
- Le sondage J5 déjà lancé en prod continue de fonctionner sans republier le message.

### Négatives

- Lecture client dépend du calendrier (la config adhésion n’est pas lisible en rules).
- Migration one-shot obligatoire au déploiement, sinon J1–J4 apparaissent vides.

### Neutres

- Les docs legacy sans préfixe peuvent rester vides après migration (filet de secours).

## Alternatives considérées

### Alternative 1: filtrer les réponses par `updatedAt` document

- **Pourquoi rejetée** : pas de timestamp par joueur ; un seul `updatedAt` mélange saisons.

### Alternative 2: collection `seasons/{label}/availabilities`

- **Pourquoi rejetée** : coût de migration plus élevé ; le préfixe d’ID suffit et
  reste compatible avec les abonnements `onSnapshot` existants.

## Références

- [`src/lib/availability/document-id.ts`](../../../src/lib/availability/document-id.ts)
- [`scripts/migrate-availabilities-season-keys.ts`](../../../scripts/migrate-availabilities-season-keys.ts)
- ADR-0008 (effectif championnat saisonnier)

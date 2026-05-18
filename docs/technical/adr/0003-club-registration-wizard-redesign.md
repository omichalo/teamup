# ADR-0003: Refonte UX du wizard d'inscription au club

## Statut

Accepté — 2026-05-12

## Contexte

Le wizard d'inscription au club (`src/components/club-registration/`) est issu
de la traduction directe du formulaire papier SQY PING. L'audit UX réalisé en
amont de cet ADR a fait remonter trois problèmes structurels :

1. **Étape 0 trop chargée.** Pour un dossier mineur, la première étape demande
   ~20 champs (méta-question, identité, contact, adresse, 1 à 2 représentants
   légaux). C'est la principale source d'abandon potentiel d'un wizard long :
   la marche initiale est trop haute, alors que la 1ʳᵉ étape doit engager.
2. **Étape 3 (« Consentements et compétition ») sémantiquement hétéroclite.**
   Elle mélange des consentements/engagements (image, urgence médicale,
   règlement intérieur) avec un **choix de pratique sportive** (section
   compétiteur, taille de maillot, compétitions visées). Un utilisateur
   cherchant à modifier sa taille de maillot ne devinera pas que la commande
   est dans « Autorisations ».
3. **Désynchronisation de nommage** entre les étapes du wizard, les composants
   (`MedicalFamilyStep`, `LegalCompetitorStep`), et les blocs du récap
   (`"Médical et aides"`, `"Autorisations"`, `"Section compétiteur"`).

S'ajoutent des frictions transverses : pas de feedback de tarif estimé en
cours de saisie, doublon entre le toggle « Pass Sport » des réductions et le
champ texte « Code Pass Sport », terme « Section principale » ambigu (désigne
en réalité un lieu géographique), email adhérent marqué « optionnel » alors
qu'il est essentiel pour un majeur.

## Décision

Restructurer le wizard en **6 étapes** dont une **conditionnelle**, avec une
nouvelle nomenclature stable de bout en bout (étape → composant → récap →
mapping serveur). Le schéma de validation Zod et la forme du payload servi à
l'API ne sont **pas modifiés** dans cette PR — seule l'organisation visuelle et
l'expérience utilisateur changent.

### Nouvelle séquence d'étapes

| # | ID symbolique | Libellé wizard | Conditionnelle ? | Contenu |
|---|---|---|---|---|
| 1 | `audience` | Pour qui ? | Non | `adherentRole`, `birthDate` |
| 2 | `adherent` | L'adhérent | Non | identité, contact, adresse postale |
| 3 | `representatives` | Représentants légaux | **Oui** (mineur uniquement) | bloc `representatives` |
| 4 | `practice` | Pratique sportive | Non | `mainSectionId`, `additionalSectionIds`, `slotIds`, `wantsCompetitorExtras`, `competitionJerseySize`, `competitionIds` |
| 5 | `admin` | Dossier administratif | Non | médical, attestation, ordre famille, Pass Sport unifié, autres réductions |
| 6 | `engagements` | Engagements à signer | Non | image, urgence médicale + prise en charge (mineur), règlement intérieur |
| 7 | `recap` | Récapitulatif | Non | lecture seule |

Pour un dossier majeur, le wizard compte 6 étapes (audience → adherent →
practice → admin → engagements → recap). Pour un dossier mineur, 7 étapes
(insertion de `representatives` en 3ᵉ position).

### Changements transverses

1. **Mapping `field-to-step` symbolique.** Les champs sont mappés à un ID
   symbolique (`audience | adherent | representatives | practice | admin |
   engagements`). Le wizard convertit l'ID en index numérique selon la
   séquence active courante. Cela rend le code robuste à l'apparition/
   disparition d'une étape conditionnelle.
2. **Pass Sport unifié.** Un seul contrôle « Avez-vous un Pass Sport ? Oui/Non »
   pilote à la fois la présence de `pass_sport` dans `reductionTypes` et
   l'affichage du champ code. L'option `pass_sport` disparaît des cases à
   cocher « autres réductions » pour éviter le doublon. Le schéma serveur
   reste inchangé : `pass_sport` continue d'être une valeur valide de
   `reductionTypes`, simplement non saisissable séparément.
3. **Section compétiteur déplacée** depuis l'étape « engagements » vers
   l'étape « pratique ». C'est sa place sémantique : un choix de pratique
   sportive, pas un consentement.
4. **« Section principale » → « Lieu principal »** dans les libellés UI
   (l'ID technique `mainSectionId` est conservé pour compatibilité).
5. **Panneau récap latéral** (`RegistrationSidebar`). Sur ≥ md, affiché à
   droite ; sur mobile, repliable au-dessus de l'étape. Affiche les choix
   structurants en temps réel (type d'inscription, âge, lieu, créneaux,
   compétiteur) pour réduire le sentiment de perte de repère dans un wizard
   long. Pas de tarif chiffré dans cette PR (grille tarifaire non encore
   modélisée côté code).
6. **Email adhérent** : helper textuel adapté selon l'âge, mais la validation
   reste optionnelle pour ne pas casser les drafts existants ni le payload
   accepté côté API. Le passage à un champ obligatoire pour les majeurs fera
   l'objet d'une PR dédiée si validé côté produit.

## Conséquences

### Positives

- Engagement utilisateur amélioré : la 1ʳᵉ étape (« Pour qui ? ») compte 2
  champs au lieu de ~20, ce qui crée un effet « ratchet » d'engagement.
- Chaque étape devient sémantiquement homogène (identité ≠ représentants,
  pratique ≠ consentements).
- Mapping `field-to-step` symbolique robuste aux étapes conditionnelles.
- Pass Sport sans doublon : une seule source de vérité côté UI.
- Cohérence des libellés étape ↔ composant ↔ récap ↔ mapping serveur.

### Négatives

- Plus de fichiers de composants (un par étape) : surface d'entretien
  augmentée mais chaque composant reste petit et focalisé.
- La date de naissance passe à l'étape 1 (« Pour qui ? ») : l'utilisateur qui
  souhaite la modifier après coup doit revenir 2 étapes en arrière. Le wizard
  autorise déjà la navigation libre vers les étapes passées, donc l'impact est
  faible.
- Renommage du fichier `IdentityStep.tsx` → `AdherentStep.tsx` etc. nécessite
  d'adapter quelques imports de tests.

### Neutres

- Le schéma Zod côté serveur est intentionnellement inchangé : aucune
  migration de drafts en cours ni de payload API.
- La séquence variable (6 ou 7 étapes selon mineur/majeur) est gérée par une
  liste d'IDs symboliques, transparente pour l'utilisateur (numérotation
  affichée toujours « Étape N sur M »).

## Alternatives considérées

### Alternative 1 : refonte cosmétique uniquement (renommages + descriptions)

- **Description** : harmoniser les libellés et descriptions sans toucher au
  découpage des étapes ni à la position de la section compétiteur.
- **Pourquoi rejetée** : ne résout aucun des trois problèmes structurels
  identifiés (étape 0 trop chargée, étape 3 hétéroclite, doublon Pass Sport).

### Alternative 2 : refonte en 4 étapes

- **Description** : regrouper plus agressivement (« L'adhérent et sa famille » /
  « Pratique » / « Dossier complet » / « Récap »).
- **Pourquoi rejetée** : l'étape « Dossier complet » concentrerait à nouveau
  médical + tarifaire + consentements + règlement, recréant le problème de
  l'étape 3 actuelle.

### Alternative 3 : déplacer la section compétiteur dans le récap

- **Description** : laisser le choix « compétiteur ou pas » au moment final,
  comme un upsell.
- **Pourquoi rejetée** : la pratique compétiteur a un impact sur le choix des
  créneaux (séances dédiées). Elle doit être posée avant ou pendant la
  sélection des créneaux, pas après.

## Références

- Audit UX réalisé en chat (synthèse en 3 niveaux d'ambition A/B/C) — option C
  validée par le mainteneur.
- `src/components/club-registration/ClubRegistrationWizard.tsx`
- `src/lib/club-registration/field-to-step.ts`
- `src/lib/club-registration/schema.ts`

## Notes

- Si une grille tarifaire devient modélisable (Firestore ou config statique),
  enrichir `RegistrationSidebar` pour afficher un tarif estimé en temps réel.
  C'est le levier d'engagement le plus puissant identifié dans l'audit, non
  livré ici faute de référentiel.
- Si l'option « email obligatoire pour les majeurs » est validée côté produit,
  ouvrir une PR distincte qui modifie le schéma Zod (`adherentEmail` requis
  via `superRefine` lorsque `!isMinorAt(birthDate)`).

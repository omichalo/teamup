# ADR-0007: Capacité et remplissage des créneaux d’entraînement

## Statut

Accepté — 2026-08-21, amendé 2026-08-21 (fermeture à la demande)

## Contexte

Les créneaux vivent dans le catalogue d’inscription (`clubRegistrationConfig.sites[].slots`). Les inscrits sont les dossiers `clubRegistrations` dont `slotIds` contient le créneau (hors refusés), y compris les walk-in ajoutés depuis le pointage (`arrayUnion`).

Le staff a besoin d’une vue synthétique du remplissage (taux + liste) pour piloter les effectifs. Le blocage des inscriptions est une **fermeture à la demande** (`enrollmentsClosed`), distincte de la jauge `capacity`.

`exactSlotCount` des règles tarifaires (`PricingDevice`) n’est pas une capacité de salle : c’est une contrainte de pricing (ex. exactement un créneau).

## Décision

1. **Champ observationnel** : `capacity` optionnel (entier ≥ 1) sur chaque `RegistrationSiteSlot`. Absent = pas de taux, seulement le compteur d’inscrits.
2. **Capacité sans enforcement** : le wizard et l’API d’inscription n’utilisent pas `capacity` pour refuser une inscription. Un créneau « plein » reste signalé dans l’UI staff (page Créneaux).
3. **Fermeture à la demande** : flag `enrollmentsClosed` sur le créneau. Pilotage admin / secrétaire (page Créneaux et Campagnes & tarifs).
4. **Blocage** : une personne sans rôle prioritaire (anonyme, joueur, secrétaire adjoint) ne peut pas sélectionner ni soumettre un créneau fermé. Bypass : admin, secrétaire, coach, membre du bureau. Le walk-in pointage n’est pas bloqué ; l’info « Inscriptions fermées » y est affichée.
5. **Libellé formulaire / pointage** : uniquement « Inscriptions fermées ». Pas de taux de remplissage dans le wizard ni au choix de créneau du pointage.
6. **Population** : même règle que le pointage (dossiers non refusés, source `clubRegistrations`, jamais `players`). Liste d’inscrits : mêmes alertes (paiement, certificat, PPS) via le mapping roster existant.
7. **Domaine** : lecture via `/api/club/slots/occupancy*` et `src/lib/club-slot-occupancy/`. Pas de nouvelle collection. Accès occupancy = opérateurs de présence. Édition capacité / fermeture = `ADMIN`, `SECRETARY`.
8. **Taux** : `enrolledCount / capacity` lorsque `capacity` est défini. Surcharge visuelle si `enrolledCount > capacity`.

## Conséquences

### Positives
- Une seule source de vérité pour la capacité, déjà dans le catalogue publié.
- Le pointage et le remplissage partagent l’effectif, y compris les walk-in.
- Le staff ferme quand il le décide, sans lier le geste au seul compteur.

### Négatives
- Tant que les capacités ne sont pas saisies, la page Créneaux n’affiche que des compteurs.
- Un scan des dossiers à chaque ouverture de la vue remplissage (pas de compteurs dénormalisés).
- Un créneau plein mais non fermé reste inscriptible pour les familles.

### Neutres
- `enabled` continue de masquer le créneau dans le formulaire ; ce n’est pas un substitut à `enrollmentsClosed`.

## Alternatives considérées

### Alternative 1: capacité en nombre de tables
- **Pourquoi rejetée** : le besoin V1 est un max d’inscrits simple. Les tables pourront s’ajouter plus tard sans retirer `capacity`.

### Alternative 2: fermeture automatique dès `enrolledCount >= capacity`
- **Pourquoi rejetée** : le produit a choisi la fermeture à la demande.

### Alternative 3: réutiliser `exactSlotCount`
- **Pourquoi rejetée** : contrainte tarifaire (nombre de créneaux choisis), pas une jauge de salle.

## Références

- `.cursor/rules/80-club-platform-extension.mdc`
- `docs/technical/adr/0006-training-attendance.md`
- `src/lib/club-slot-occupancy/`
- `src/lib/club-registration-config/slot-enrollments.ts`

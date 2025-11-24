# Organisation du Kanban - Projet TeamUp

## Vue d'ensemble

Ce document décrit l'organisation recommandée du kanban GitHub pour le projet TeamUp.

## Labels créés

### Priorité
- `critical` - Priorité critique (rouge)
- `important` - Priorité importante (orange)
- `priority: high` - Haute priorité (existant)

### Type de travail
- `refactor` - Refactorisation de code (violet)
- `code-quality` - Amélioration de la qualité du code (vert)
- `bug` - Correction de bug (rouge)
- `enhancement` - Nouvelle fonctionnalité (bleu clair)
- `documentation` - Documentation (bleu)

### Principes
- `solid` - Principe SOLID
- `dry` - Principe DRY
- `duplication` - Duplication de code

### Domaine
- `frontend` - Interface utilisateur
- `api` - Routes API
- `logging` - Système de logging
- `ui-ux` - Interface et expérience utilisateur

## Organisation recommandée du Kanban

### Colonne 1 : 🔴 CRITIQUE (À faire en priorité)

**Issues critiques identifiées dans l'audit** :
- #38 : Réduire la duplication masculin/féminin
  - Labels: `critical`, `refactor`, `dry`, `duplication`, `code-quality`
- #39 : Découper compositions/page.tsx (4075 lignes)
  - Labels: `critical`, `refactor`, `solid`, `code-quality`, `frontend`
- #40 : Découper joueurs/page.tsx (2134 lignes)
  - Labels: `critical`, `refactor`, `solid`, `code-quality`, `frontend`

**Bugs critiques** :
- #26 : Souci de droit d'envoi de message
  - Labels: `bug`, `api`
- #19 : Souci état match
  - Labels: `bug`

### Colonne 2 : 🟡 IMPORTANT (À planifier)

**Issues importantes identifiées dans l'audit** :
- #41 : Découper les composants > 1500 lignes
  - Labels: `important`, `refactor`, `solid`, `code-quality`, `frontend`
- #42 : Remplacer console.log par un système de logging structuré
  - Labels: `important`, `refactor`, `logging`, `code-quality`
- #43 : Ajouter runtime = "nodejs" aux routes API
  - Labels: `important`, `refactor`, `api`, `code-quality`

**Autres issues importantes** :
- #15 : Retravaille l'archi globale de l'application
  - Labels: `refactor`, `important`, `code-quality`

### Colonne 3 : 📋 BACKLOG (Fonctionnalités)

**Nouvelles fonctionnalités** :
- #33 : Avoir des boutons de rafraîchissement des données
  - Labels: `enhancement`, `frontend`
- #29 : Créer un journal des modifications des compos à la journée
  - Labels: `enhancement`, `frontend`
- #28 : Gérer les dispo automatique avec bouton pour fermer la fonctionnalité
  - Labels: `enhancement`, `frontend`
- #25 : Ajouter un bouton notif de relance de dispo
  - Labels: `enhancement`, `frontend`
- #24 : Afficher le classement dans la poule pour chaque équipe
  - Labels: `enhancement`, `frontend`
- #23 : Virer l'heure dans la liste des matchs dans la page équipe
  - Labels: `enhancement`, `ui-ux`, `frontend`
- #17 : Générer plan des salles de voisins
  - Labels: `enhancement`

### Colonne 4 : 🐛 BUGS (Corrections)

**Bugs à corriger** :
- #26 : Souci de droit d'envoi de message (attention ça considère le message envoyé)
  - Labels: `bug`, `api`
- #20 : S'assurer qu'on gère bien les matchs exempts
  - Labels: `bug`
- #19 : Souci état match
  - Labels: `bug`
- #11 : Vérifier les clouds functions
  - Labels: `bug`, `api`

### Colonne 5 : 📚 DOCUMENTATION

**Documentation** :
- #16 : Refaire une page de documentation
  - Labels: `documentation`

## Ordre de traitement recommandé

### Phase 1 : Corrections critiques (1-2 semaines)
1. #38 - Réduire duplication (impact sur toutes les autres issues)
2. #39 - Découper compositions/page.tsx
3. #40 - Découper joueurs/page.tsx
4. #26 - Bug envoi de message Discord
5. #19 - Bug état match

### Phase 2 : Améliorations importantes (2-3 semaines)
6. #41 - Découper composants > 1500 lignes
7. #42 - Système de logging structuré
8. #43 - Runtime Node.js pour routes API
9. #20 - Gestion matchs exempts

### Phase 3 : Fonctionnalités (selon priorités métier)
10. #33, #29, #28, #25, #24, #23, #17

### Phase 4 : Documentation et architecture
11. #16 - Documentation
12. #15 - Architecture globale
13. #11 - Cloud Functions

## Filtres recommandés

### Vue "Refactorisation"
Filtre : `label:refactor`
- Affiche toutes les issues de refactorisation

### Vue "Code Quality"
Filtre : `label:code-quality`
- Affiche toutes les issues d'amélioration de qualité

### Vue "Bugs"
Filtre : `label:bug`
- Affiche tous les bugs

### Vue "Frontend"
Filtre : `label:frontend`
- Affiche toutes les issues frontend

### Vue "API"
Filtre : `label:api`
- Affiche toutes les issues API

## Statistiques

- **Total issues** : 19
- **Critiques** : 5 (3 refactor + 2 bugs)
- **Importantes** : 4 (refactor)
- **Fonctionnalités** : 7
- **Bugs** : 4
- **Documentation** : 1

## Notes

- Les issues d'audit (#38-43) ont toutes des prompts IA détaillés
- Les issues critiques doivent être traitées en priorité car elles impactent la maintenabilité
- Les issues de refactorisation peuvent être traitées par étapes (un composant à la fois)


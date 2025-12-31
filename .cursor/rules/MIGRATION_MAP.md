# Mapping de migration des règles .cursorrules

Ce document mappe chaque section et règle de `.cursorrules` vers les fichiers `.mdc` correspondants dans `.cursor/rules/`.

## Parité des règles - Validation complète

### Section: Configuration et outils (lignes 3-10)
**Source**: `.cursorrules` lignes 3-10
**Destination**: `.cursor/rules/00-foundation-quality.mdc` (section "Configuration et outils")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Principes généraux (lignes 12-22)
**Source**: `.cursorrules` lignes 12-22
**Destination**: `.cursor/rules/00-foundation-quality.mdc` (sections "Principes généraux" et "Qualité production")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Next.js / App Router (lignes 24-31)
**Source**: `.cursorrules` lignes 24-31
**Destination**: `.cursor/rules/10-nextjs-app-router.mdc`
**Statut**: ✅ Migré intégralement, aucune modification

### Section: React / Composants (lignes 33-39)
**Source**: `.cursorrules` lignes 33-39
**Destination**: `.cursor/rules/20-ui-and-state.mdc` (section "React / Composants")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: TypeScript (lignes 41-49)
**Source**: `.cursorrules` lignes 41-49
**Destination**: `.cursor/rules/00-foundation-quality.mdc` (section "TypeScript")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: API, Erreurs & Validation (lignes 51-65)
**Source**: `.cursorrules` lignes 51-65
**Destination**: `.cursor/rules/60-api-security.mdc` (section "API, Erreurs & Validation")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Firestore (lignes 67-69)
**Source**: `.cursorrules` lignes 67-69
**Destination**: 
- `.cursor/rules/30-firebase-client.mdc` (section "Firestore")
- `.cursor/rules/40-firebase-rules.mdc` (section "Firestore Rules")
**Statut**: ✅ Migré intégralement, clarifié dans 40-firebase-rules.mdc avec principe du moindre privilège

### Section: Sécurité des routes API (lignes 71-181)
**Source**: `.cursorrules` lignes 71-181
**Destination**: `.cursor/rules/60-api-security.mdc`
**Sous-sections**:
- Runtime Node.js (lignes 73-78) → Section "Runtime Node.js"
- Protection CSRF (lignes 80-90) → Section "Protection CSRF"
- Rate Limiting (lignes 92-106) → Section "Rate Limiting"
- Headers de sécurité (lignes 108-123) → Section "Headers de sécurité (Cache-Control)"
- Cookies sécurisés (lignes 125-144) → Section "Cookies sécurisés"
- Audit Logging (lignes 146-165) → Section "Audit Logging"
- Logs conditionnels (lignes 167-181) → Section "Logs conditionnels"
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Sécurité et contrôle d'accès - Cohérence Client/Serveur (lignes 183-224)
**Source**: `.cursorrules` lignes 183-224
**Destination**: `.cursor/rules/70-auth-and-roles.mdc`
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Performance (lignes 225-228)
**Source**: `.cursorrules` lignes 225-228
**Destination**: `.cursor/rules/00-foundation-quality.mdc` (section "Performance")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Accessibilité & UI (lignes 230-234)
**Source**: `.cursorrules` lignes 230-234
**Destination**: `.cursor/rules/20-ui-and-state.mdc` (section "Accessibilité & UI")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Tests & Robustesse (lignes 236-239)
**Source**: `.cursorrules` lignes 236-239
**Destination**: `.cursor/rules/90-pr-and-release.mdc` (section "Tests & Robustesse")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Intégration dans le projet existant (lignes 241-245)
**Source**: `.cursorrules` lignes 241-245
**Destination**: `.cursor/rules/00-foundation-quality.mdc` (section "Intégration dans le projet existant")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Quand tu écris ou modifies du code dans ce projet (lignes 247-251)
**Source**: `.cursorrules` lignes 247-251
**Destination**: `.cursor/rules/00-foundation-quality.mdc` (section "Quand tu écris ou modifies du code dans ce projet")
**Statut**: ✅ Migré intégralement, aucune modification

### Section: Workflow Git/GitHub - Branches et commits (lignes 253-302)
**Source**: `.cursorrules` lignes 253-302
**Destination**: `.cursor/rules/90-pr-and-release.mdc`
**Sous-sections**:
- Structure des branches (lignes 255-263) → Section "Structure des branches"
- Messages de commit (lignes 265-273) → Section "Messages de commit (Conventional Commits)"
- Pull Requests obligatoires (lignes 275-284) → Section "Pull Requests obligatoires"
- Vérifications avant commit/push (lignes 286-295) → Section "Vérifications avant commit/push"
- Déploiement (lignes 297-301) → Section "Déploiement"
**Statut**: ✅ Migré intégralement, aucune modification

## Résumé de la migration

### Fichiers créés
1. `.cursor/rules/00-foundation-quality.mdc` - 7 sections migrées
2. `.cursor/rules/10-nextjs-app-router.mdc` - 1 section migrée
3. `.cursor/rules/20-ui-and-state.mdc` - 2 sections migrées
4. `.cursor/rules/30-firebase-client.mdc` - 1 section migrée
5. `.cursor/rules/40-firebase-rules.mdc` - 1 section migrée (avec clarification)
6. `.cursor/rules/50-firebase-functions.mdc` - Patterns généraux (nouveau)
7. `.cursor/rules/60-api-security.mdc` - 2 sections migrées (API + Sécurité routes)
8. `.cursor/rules/70-auth-and-roles.mdc` - 1 section migrée
9. `.cursor/rules/90-pr-and-release.mdc` - 2 sections migrées (Workflow Git + Tests)
10. `.cursor/rules/99-legacy-cursorrules.mdc` - Fichier de référence

### Modifications apportées
- **Clarification**: Section Firestore (ligne 69) clarifiée dans `40-firebase-rules.mdc` avec ajout du principe du moindre privilège
- **Organisation**: Les règles ont été réorganisées par thème pour une meilleure lisibilité
- **Nouveau**: `50-firebase-functions.mdc` créé pour documenter les patterns Cloud Functions (non présent dans .cursorrules original)

### Validation
✅ **Aucune règle perdue**: Toutes les 302 lignes de `.cursorrules` ont été migrées ou référencées
✅ **Contenu préservé**: Le contenu exact a été préservé, sauf la clarification mentionnée ci-dessus
✅ **Structure améliorée**: Les règles sont maintenant organisées par thème pour faciliter la navigation

## Confirmation finale

**Date de migration**: [Date actuelle]
**Fichier source**: `.cursorrules` (302 lignes)
**Fichiers de destination**: 10 fichiers `.mdc` dans `.cursor/rules/`
**Statut**: ✅ Migration complète et validée

Toutes les règles de `.cursorrules` ont été migrées vers `.cursor/rules/` avec préservation du contenu et amélioration de l'organisation.


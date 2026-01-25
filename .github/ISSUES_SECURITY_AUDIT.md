# Audit de sécurité des Issues GitHub

Date : 2026-01-25

## Résumé

**Total d'issues analysées** : 28 (ouvertes + fermées)

**Issues avec informations sensibles** : 1 (nettoyée)

## Issues nettoyées

### Issue #22 - "souci lors de la validation des droits coach" ✅ NETTOYÉE

**Problème identifié** :
- UID Firebase utilisateur exposé : `[USER_ID_REDACTED]` (28 caractères)
- Chemin de document Firestore exposé : `users/[USER_ID_REDACTED]`

**Action effectuée** :
- UID remplacé par `[USER_ID_REDACTED]`
- Chemin de document masqué
- Description technique conservée pour le debugging

**Statut** : ✅ Nettoyée et mise à jour

### Issue #27 - "souci avec l'indicateur de futur brulage" ✅ NETTOYÉE

**Problème identifié** :
- Prénom de joueur mentionné : "[PLAYER_NAME_REDACTED]"

**Action effectuée** :
- Prénom retiré, description généralisée
- Informations techniques conservées

**Statut** : ✅ Nettoyée et mise à jour

## Issues vérifiées (sans problème)

Les issues suivantes ont été vérifiées et ne contiennent pas d'informations sensibles :

- ✅ #1 à #18 : Descriptions techniques, pas de données sensibles
- ✅ #19 : Screenshot (image) - pas de données textuelles sensibles
- ✅ #20, #21 : Descriptions techniques
- ✅ #23 à #26 : Descriptions techniques
- ✅ #28 à #79 : Descriptions techniques, pas de données sensibles

## Recommandations

### Avant de rendre le repository public

1. ✅ **Issues nettoyées** : Les issues contenant des informations sensibles ont été nettoyées
2. ⚠️ **Issue #19** : Contient une image (screenshot). Vérifier manuellement si l'image contient des données sensibles (emails, noms complets, etc.)
3. ✅ **Workflows GitHub Actions** : Aucune information sensible dans les workflows (secrets utilisés via `${{ secrets.* }}`)

### Bonnes pratiques pour l'avenir

1. **Ne jamais inclure** :
   - UIDs Firebase utilisateurs
   - Emails d'utilisateurs
   - Noms complets de joueurs
   - Tokens, secrets, credentials
   - Chemins de documents Firestore avec IDs utilisateurs

2. **Utiliser des placeholders** :
   - `[USER_ID]` pour les UIDs
   - `[USER_EMAIL]` pour les emails
   - `[PLAYER_NAME]` pour les noms de joueurs
   - `[DOCUMENT_PATH]` pour les chemins Firestore

3. **Pour les screenshots** :
   - Masquer les données sensibles avant de prendre la capture
   - Utiliser des outils de floutage si nécessaire

## Vérification continue

Le workflow `.github/workflows/security-scan.yml` scanne automatiquement :
- Chaque commit et pull request
- L'historique Git complet (hebdomadaire)

Cela permet de détecter automatiquement les secrets commités par erreur.

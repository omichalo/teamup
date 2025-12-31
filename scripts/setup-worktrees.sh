#!/bin/bash
# Script pour créer des worktrees Git pour le workflow multi-agent parallèle
# Usage: ./scripts/setup-worktrees.sh <feature-name>

set -e

FEATURE_NAME=$1

if [ -z "$FEATURE_NAME" ]; then
  echo "❌ Usage: ./scripts/setup-worktrees.sh <feature-name>"
  echo ""
  echo "Exemple: ./scripts/setup-worktrees.sh notifications"
  echo ""
  echo "Cela créera les worktrees suivants:"
  echo "  - ../teamup-notifications-reposcout (feature/notifications-reposcout)"
  echo "  - ../teamup-notifications-architect (feature/notifications-architect)"
  echo "  - ../teamup-notifications-nextjs (feature/notifications-nextjs)"
  echo "  - ../teamup-notifications-firebase (feature/notifications-firebase)"
  echo "  - ../teamup-notifications-tester (feature/notifications-tester)"
  exit 1
fi

# Vérifier qu'on est dans le repo principal
if [ ! -d ".git" ]; then
  echo "❌ Erreur: Ce script doit être exécuté depuis la racine du repository"
  exit 1
fi

# Créer le dossier docs/temp pour la coordination entre agents
mkdir -p docs/temp

echo "🔧 Création des worktrees pour la fonctionnalité: ${FEATURE_NAME}"
echo ""

# Créer les branches et worktrees
git worktree add "../teamup-${FEATURE_NAME}-reposcout" "feature/${FEATURE_NAME}-reposcout" 2>/dev/null || git worktree add "../teamup-${FEATURE_NAME}-reposcout" -b "feature/${FEATURE_NAME}-reposcout"
echo "✅ Worktree créé: ../teamup-${FEATURE_NAME}-reposcout (branche: feature/${FEATURE_NAME}-reposcout)"

git worktree add "../teamup-${FEATURE_NAME}-architect" "feature/${FEATURE_NAME}-architect" 2>/dev/null || git worktree add "../teamup-${FEATURE_NAME}-architect" -b "feature/${FEATURE_NAME}-architect"
echo "✅ Worktree créé: ../teamup-${FEATURE_NAME}-architect (branche: feature/${FEATURE_NAME}-architect)"

git worktree add "../teamup-${FEATURE_NAME}-nextjs" "feature/${FEATURE_NAME}-nextjs" 2>/dev/null || git worktree add "../teamup-${FEATURE_NAME}-nextjs" -b "feature/${FEATURE_NAME}-nextjs"
echo "✅ Worktree créé: ../teamup-${FEATURE_NAME}-nextjs (branche: feature/${FEATURE_NAME}-nextjs)"

git worktree add "../teamup-${FEATURE_NAME}-firebase" "feature/${FEATURE_NAME}-firebase" 2>/dev/null || git worktree add "../teamup-${FEATURE_NAME}-firebase" -b "feature/${FEATURE_NAME}-firebase"
echo "✅ Worktree créé: ../teamup-${FEATURE_NAME}-firebase (branche: feature/${FEATURE_NAME}-firebase)"

git worktree add "../teamup-${FEATURE_NAME}-tester" "feature/${FEATURE_NAME}-tester" 2>/dev/null || git worktree add "../teamup-${FEATURE_NAME}-tester" -b "feature/${FEATURE_NAME}-tester"
echo "✅ Worktree créé: ../teamup-${FEATURE_NAME}-tester (branche: feature/${FEATURE_NAME}-tester)"

echo ""
echo "✅ Tous les worktrees ont été créés avec succès!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Ouvrir plusieurs instances de Cursor:"
echo "   - Instance 1: Ouvrir ../teamup-${FEATURE_NAME}-reposcout"
echo "   - Instance 2: Ouvrir ../teamup-${FEATURE_NAME}-architect"
echo "   - Instance 3: Ouvrir ../teamup-${FEATURE_NAME}-nextjs"
echo "   - Instance 4: Ouvrir ../teamup-${FEATURE_NAME}-firebase"
echo "   - Instance 5: Ouvrir ../teamup-${FEATURE_NAME}-tester"
echo ""
echo "2. Dans chaque instance, guider Cursor avec le rôle approprié (voir WORKTREES_SETUP.md)"
echo ""
echo "3. Utiliser docs/temp/ pour la coordination entre agents"
echo ""
echo "4. Pour supprimer les worktrees:"
echo "   git worktree remove ../teamup-${FEATURE_NAME}-reposcout"
echo "   git worktree remove ../teamup-${FEATURE_NAME}-architect"
echo "   # etc."


#!/bin/bash
# Script pour organiser le kanban GitHub
# Usage: ./organize-kanban.sh

echo "📋 Organisation du Kanban GitHub..."

# Récupérer l'ID du projet
PROJECT_ID="PVT_kwHOAJG3Lc4BH9Pt"
OWNER="omichalo"

# Colonnes identifiées:
# - Todo
# - In Progress  
# - A déployer
# - A tester en prod
# - Done

echo ""
echo "✅ Colonnes du projet:"
echo "  1. Todo"
echo "  2. In Progress"
echo "  3. A déployer"
echo "  4. A tester en prod"
echo "  5. Done"
echo ""

echo "📝 Organisation recommandée:"
echo ""
echo "🔴 COLONNE 'Todo' - Issues critiques et importantes:"
echo "  - #38: Réduire duplication (CRITIQUE)"
echo "  - #39: Découper compositions/page.tsx (CRITIQUE)"
echo "  - #40: Découper joueurs/page.tsx (CRITIQUE)"
echo "  - #41: Découper composants > 1500 lignes (IMPORTANT)"
echo "  - #42: Remplacer console.log (IMPORTANT)"
echo "  - #43: Ajouter runtime nodejs (IMPORTANT)"
echo "  - #26: Bug envoi message Discord (BUG)"
echo "  - #19: Bug état match (BUG)"
echo ""
echo "📋 COLONNE 'Todo' - Autres issues:"
echo "  - #33, #29, #28, #25, #24, #23, #17 (Fonctionnalités)"
echo "  - #20, #11 (Bugs)"
echo "  - #15 (Refactor architecture)"
echo "  - #16 (Documentation)"
echo ""

echo "💡 Pour organiser manuellement:"
echo "  1. Aller sur https://github.com/users/omichalo/projects/1"
echo "  2. Déplacer les issues dans les colonnes appropriées"
echo "  3. Utiliser les labels pour filtrer"
echo ""

echo "📊 Statistiques:"
echo "  - Issues critiques: 3"
echo "  - Issues importantes: 4"
echo "  - Bugs: 4"
echo "  - Fonctionnalités: 7"
echo "  - Documentation: 1"
echo ""


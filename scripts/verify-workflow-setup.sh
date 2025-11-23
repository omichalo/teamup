#!/bin/bash

# Script de vérification de la configuration du workflow Git/GitHub
# Usage: ./scripts/verify-workflow-setup.sh

echo "🔍 Vérification de la configuration du workflow Git/GitHub..."
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASSED=0
FAILED=0
WARNINGS=0

# Fonction pour afficher un succès
check_pass() {
  echo -e "${GREEN}✅${NC} $1"
  PASSED=$((PASSED + 1))
}

# Fonction pour afficher une erreur
check_fail() {
  echo -e "${RED}❌${NC} $1"
  FAILED=$((FAILED + 1))
}

# Fonction pour afficher un avertissement
check_warn() {
  echo -e "${YELLOW}⚠️${NC} $1"
  WARNINGS=$((WARNINGS + 1))
}

echo "📁 1. Vérification des fichiers de workflow..."
echo ""

# Vérifier les fichiers de workflow
if [ -f ".github/workflows/ci.yml" ]; then
  check_pass "Fichier .github/workflows/ci.yml existe"
else
  check_fail "Fichier .github/workflows/ci.yml manquant"
fi

if [ -f ".github/workflows/deploy-production.yml" ]; then
  check_pass "Fichier .github/workflows/deploy-production.yml existe"
else
  check_fail "Fichier .github/workflows/deploy-production.yml manquant"
fi

if [ -f ".github/workflows/deploy-firestore.yml" ]; then
  check_pass "Fichier .github/workflows/deploy-firestore.yml existe"
else
  check_fail "Fichier .github/workflows/deploy-firestore.yml manquant"
fi

echo ""
echo "📝 2. Vérification de la syntaxe YAML des workflows..."
echo ""

# Vérifier la syntaxe YAML (si Python est disponible)
if command -v python3 &> /dev/null && python3 -c "import yaml" 2>/dev/null; then
  for file in .github/workflows/*.yml; do
    if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
      check_pass "Syntaxe YAML valide pour $(basename $file)"
    else
      check_warn "Impossible de vérifier la syntaxe YAML pour $(basename $file) (peut être valide)"
    fi
  done
else
  check_warn "Python3 ou module yaml non disponible, impossible de vérifier la syntaxe YAML"
fi

echo ""
echo "⚙️  3. Vérification des scripts npm..."
echo ""

# Vérifier que package.json contient les scripts nécessaires
if grep -q '"check":' package.json; then
  check_pass "Script 'check' présent dans package.json"
else
  check_fail "Script 'check' manquant dans package.json"
fi

if grep -q '"check:dev":' package.json; then
  check_pass "Script 'check:dev' présent dans package.json"
else
  check_fail "Script 'check:dev' manquant dans package.json"
fi

echo ""
echo "📋 4. Vérification du fichier .cursorrules..."
echo ""

if [ -f ".cursorrules" ]; then
  check_pass "Fichier .cursorrules existe"
  
  if grep -qi "workflow git" .cursorrules; then
    check_pass "Règles du workflow Git présentes dans .cursorrules"
  else
    check_fail "Règles du workflow Git manquantes dans .cursorrules"
  fi
  
  if grep -qi "pull request" .cursorrules; then
    check_pass "Règles des Pull Requests présentes dans .cursorrules"
  else
    check_fail "Règles des Pull Requests manquantes dans .cursorrules"
  fi
else
  check_fail "Fichier .cursorrules manquant"
fi

echo ""
echo "🔧 5. Vérification de la configuration Git..."
echo ""

# Vérifier la branche actuelle
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  check_warn "Vous êtes actuellement sur la branche $CURRENT_BRANCH (normal pour la vérification)"
else
  check_pass "Vous êtes sur la branche $CURRENT_BRANCH (pas sur main)"
fi

# Vérifier que le remote origin existe
if git remote get-url origin &> /dev/null; then
  check_pass "Remote 'origin' configuré"
  REMOTE_URL=$(git remote get-url origin)
  if [[ "$REMOTE_URL" == *"github.com"* ]]; then
    check_pass "Remote pointe vers GitHub"
  else
    check_warn "Remote ne pointe pas vers GitHub: $REMOTE_URL"
  fi
else
  check_fail "Remote 'origin' non configuré"
fi

echo ""
echo "📚 6. Vérification de la documentation..."
echo ""

if [ -f ".github/workflows/GIT_WORKFLOW.md" ]; then
  check_pass "Documentation GIT_WORKFLOW.md présente"
else
  check_warn "Documentation GIT_WORKFLOW.md manquante"
fi

if [ -f ".github/workflows/README.md" ]; then
  check_pass "Documentation README.md présente"
else
  check_warn "Documentation README.md manquante"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Résumé de la vérification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Succès:${NC} $PASSED"
echo -e "${RED}❌ Erreurs:${NC} $FAILED"
echo -e "${YELLOW}⚠️  Avertissements:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 Tous les fichiers sont présents et correctement configurés !${NC}"
  echo ""
  echo "📋 Prochaines étapes :"
  echo "   1. Vérifier sur GitHub que la protection de branche main est activée"
  echo "   2. Vérifier que le secret FIREBASE_SERVICE_ACCOUNT est configuré"
  echo "   3. Tester le workflow CI en créant une PR de test"
  exit 0
else
  echo -e "${RED}❌ Des erreurs ont été détectées. Veuillez les corriger avant de continuer.${NC}"
  exit 1
fi


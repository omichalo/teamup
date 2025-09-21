#!/bin/bash

# Script de démarrage avec données de test
# Usage: ./start-with-data.sh

echo "🏓 Démarrage de SQY Ping Team Up avec données de test..."

# 1. Vérifier que l'application est en cours d'exécution
echo "🔍 Vérification de l'application..."
if ! curl -s http://localhost:3001 > /dev/null; then
    echo "❌ L'application n'est pas en cours d'exécution"
    echo "💡 Lancez d'abord: npm run dev"
    exit 1
fi

echo "✅ Application en cours d'exécution"

# 2. Charger les variables d'environnement
echo "📋 Chargement des variables d'environnement..."
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
    echo "✅ Variables d'environnement chargées"
else
    echo "⚠️  Fichier .env.local non trouvé"
    echo "💡 Créez le fichier .env.local avec vos identifiants FFTT"
fi

# 3. Créer les données de test
echo "🏓 Création des données de test..."
node create-test-data.js

if [ $? -eq 0 ]; then
    echo "✅ Données de test créées avec succès"
else
    echo "❌ Erreur lors de la création des données de test"
    exit 1
fi

# 4. Tester l'API FFTT si configurée
if [ ! -z "$ID_FFTT" ] && [ ! -z "$PWD_FFTT" ] && [ ! -z "$CLUB_CODE_FFTT" ]; then
    echo "🏓 Test de l'API FFTT..."
    node test-fftt-api.js
else
    echo "⚠️  API FFTT non configurée"
    echo "💡 Configurez vos identifiants FFTT dans .env.local pour utiliser les vraies données"
fi

echo ""
echo "🎉 Démarrage terminé !"
echo ""
echo "📱 Application disponible sur: http://localhost:3001"
echo "🔐 Page d'authentification: http://localhost:3001/auth"
echo ""
echo "📊 Données disponibles:"
echo "   - Joueurs réalistes avec classements"
echo "   - Équipes N1 et N2"
echo "   - Matchs programmés et terminés"
echo "   - Disponibilités des joueurs"
echo "   - Compositions d'équipes"
echo "   - Paramètres du club"
echo ""
echo "🧪 Tests recommandés:"
echo "   1. Se connecter avec un compte existant"
echo "   2. Explorer le tableau de bord"
echo "   3. Tester la gestion des compositions"
echo "   4. Vérifier les disponibilités"
echo "   5. Configurer les paramètres du club"

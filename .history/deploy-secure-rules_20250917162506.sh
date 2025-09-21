#!/bin/bash

# Script de déploiement sécurisé des règles Firestore
# Usage: ./deploy-secure-rules.sh

echo "🔒 Déploiement des règles Firestore sécurisées..."

# 1. Sauvegarder les règles actuelles
echo "📦 Sauvegarde des règles actuelles..."
cp firestore.rules firestore.dev.rules.backup
echo "✅ Sauvegarde créée: firestore.dev.rules.backup"

# 2. Activer les règles de production
echo "🔄 Activation des règles de production..."
cp firestore.prod.rules firestore.rules
echo "✅ Règles de production activées"

# 3. Vérifier la syntaxe des règles
echo "🔍 Vérification de la syntaxe..."
firebase deploy --only firestore:rules --dry-run
if [ $? -eq 0 ]; then
    echo "✅ Syntaxe des règles valide"
else
    echo "❌ Erreur de syntaxe détectée"
    echo "🔄 Restauration des règles de développement..."
    cp firestore.dev.rules.backup firestore.rules
    exit 1
fi

# 4. Déployer les règles
echo "🚀 Déploiement des règles..."
firebase deploy --only firestore:rules
if [ $? -eq 0 ]; then
    echo "✅ Règles déployées avec succès"
    echo ""
    echo "🔒 Règles de sécurité activées:"
    echo "   - Lecture/écriture basée sur les rôles"
    echo "   - Coaches peuvent modifier toutes les données"
    echo "   - Joueurs peuvent seulement lire et modifier leurs disponibilités"
    echo "   - Utilisateurs peuvent seulement accéder à leur propre profil"
    echo ""
    echo "🧪 Tests recommandés:"
    echo "   1. Créer un compte joueur et tester les permissions"
    echo "   2. Créer un compte coach et tester les permissions"
    echo "   3. Vérifier que les accès non autorisés sont bloqués"
else
    echo "❌ Erreur lors du déploiement"
    echo "🔄 Restauration des règles de développement..."
    cp firestore.dev.rules.backup firestore.rules
    exit 1
fi

echo ""
echo "🎉 Déploiement sécurisé terminé !"
echo "📋 Prochaines étapes:"
echo "   1. Tester les permissions avec différents rôles"
echo "   2. Implémenter la validation côté serveur"
echo "   3. Configurer le monitoring de sécurité"

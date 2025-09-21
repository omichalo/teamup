# 🔥 Firebase Functions - Synchronisation SQY Ping

## 🚀 **Déploiement des Functions**

### **1. Prérequis**
```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser le projet (si pas déjà fait)
firebase init functions
```

### **2. Déploiement automatique**
```bash
# Déployer toutes les Functions
npm run functions:deploy

# Ou manuellement
firebase deploy --only functions
```

### **3. Vérification du déploiement**
```bash
# Lister les Functions déployées
firebase functions:list

# Voir les logs
npm run functions:logs
```

## 🔄 **Functions disponibles**

### **1. Synchronisation automatique**
- **`syncPlayersDaily`** : Quotidienne à 6h00 (Europe/Paris)
- **`syncPlayersWeekly`** : Hebdomadaire le dimanche à 8h00 (Europe/Paris)

### **2. Synchronisation manuelle**
- **`syncPlayersManual`** : Déclenchement via HTTP POST
- **`getSyncLogs`** : Récupération des logs de synchronisation
- **`testFFTTConnection`** : Test de connexion à l'API FFTT

## 🧪 **Tests des Functions**

### **Test complet**
```bash
npm run functions:test
```

### **Tests individuels**
```bash
# Test connexion FFTT
npm run functions:test:fftt

# Test synchronisation manuelle
npm run functions:test:sync

# Test récupération des logs
npm run functions:test:logs
```

### **Test local avec émulateur**
```bash
# Démarrer l'émulateur
npm run functions:emulator

# Tester localement
curl -X POST http://localhost:5001/sqyping-teamup/europe-west1/syncPlayersManual
```

## 📊 **Monitoring et logs**

### **Voir les logs en temps réel**
```bash
firebase functions:log --only syncPlayersDaily
firebase functions:log --only syncPlayersWeekly
firebase functions:log --only syncPlayersManual
```

### **Récupérer les logs via API**
```bash
curl "https://europe-west1-sqyping-teamup.cloudfunctions.net/getSyncLogs?limit=10"
```

## 🔧 **Configuration**

### **Variables d'environnement**
Les Functions utilisent les variables d'environnement Firebase :
```bash
# Définir des variables d'environnement
firebase functions:config:set fftt.id="SW251"
firebase functions:config:set fftt.pwd="XpZ31v56Jr"

# Voir la configuration
firebase functions:config:get
```

### **Permissions Firestore**
Les Functions ont accès complet à Firestore via Firebase Admin SDK.

## 📈 **Avantages des Firebase Functions**

### **✅ Avantages**
1. **Scalabilité automatique** : Gère la charge sans configuration
2. **Fiabilité** : Infrastructure Google Cloud
3. **Monitoring intégré** : Logs et métriques automatiques
4. **Sécurité** : Authentification et autorisation intégrées
5. **Coût optimisé** : Pay-per-use
6. **Déploiement simple** : Une commande pour tout déployer

### **🔄 Triggers automatiques**
- **Pub/Sub Scheduler** : Déclenchement précis selon le calendrier
- **Timezone support** : Europe/Paris configuré
- **Retry automatique** : En cas d'échec temporaire

### **📊 Monitoring**
- **Logs structurés** : JSON avec métadonnées
- **Métriques** : Durée, succès/échec, nombre de joueurs
- **Alertes** : Configurables dans Firebase Console

## 🚨 **Gestion des erreurs**

### **Logs d'erreur**
```bash
# Voir les erreurs
firebase functions:log --only syncPlayersDaily --severity error

# Voir les warnings
firebase functions:log --only syncPlayersDaily --severity warn
```

### **Alertes**
Configurer des alertes dans Firebase Console :
- Échec de synchronisation
- Temps de réponse élevé
- Quota dépassé

## 🔐 **Sécurité**

### **Authentification**
- Les Functions sont sécurisées par défaut
- Accès Firestore via Admin SDK (pas de règles nécessaires)
- API FFTT protégée par credentials

### **Autorisation**
- Seules les Functions peuvent modifier les données
- Interface utilisateur en lecture seule
- Logs de synchronisation accessibles via API

## 📋 **Prochaines étapes**

1. **Déployer les Functions** : `npm run functions:deploy`
2. **Tester la connexion** : `npm run functions:test:fftt`
3. **Lancer une synchronisation** : `npm run functions:test:sync`
4. **Vérifier les logs** : `npm run functions:logs`
5. **Configurer les alertes** dans Firebase Console

---

**🔥 Le système de synchronisation Firebase Functions est prêt ! Plus robuste, scalable et fiable que les scripts locaux.**

# Guide de configuration Discord ↔ Application

Ce guide vous explique comment configurer Discord et votre application pour que les commandes slash fonctionnent correctement.

## 📋 Vue d'ensemble

Pour que les commandes Discord fonctionnent, vous devez configurer :

1. **Discord Developer Portal** : Créer l'application, récupérer les identifiants, configurer l'URL d'interaction
2. **Variables d'environnement** : Configurer les tokens et clés nécessaires
3. **Enregistrement des commandes** : Enregistrer les commandes slash dans Discord
4. **Déploiement** : Déployer l'application et configurer l'URL d'interaction
5. **Invitation du bot** : Inviter le bot sur votre serveur Discord

---

## 🔧 Étape 1 : Configuration Discord Developer Portal

### 1.1 Créer une application Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur **"New Application"**
3. Donnez un nom à votre application (ex: "SQY Ping TeamUp")
4. Cliquez sur **"Create"**

### 1.2 Récupérer les identifiants nécessaires

Dans la section **"General Information"**, vous trouverez :

- **Application ID** : Copiez cette valeur → `DISCORD_APPLICATION_ID`
- **Public Key** : Copiez cette valeur → `DISCORD_PUBLIC_KEY`

⚠️ **Important** : Gardez ces valeurs précieusement, vous en aurez besoin pour la configuration.

### 1.3 Créer un bot

1. Dans le menu de gauche, allez dans **"Bot"**
2. Cliquez sur **"Add Bot"** puis **"Yes, do it!"**
3. Dans la section **"Token"**, cliquez sur **"Reset Token"** ou **"Copy"** pour récupérer le token
4. Copiez cette valeur → `DISCORD_TOKEN`

⚠️ **Sécurité** : Ne partagez jamais ce token ! Il donne un accès complet à votre bot.

### 1.4 Configurer les permissions du bot

Dans la section **"Bot"**, activez les permissions suivantes :

- ✅ **Use Slash Commands** (obligatoire)
- ✅ **Send Messages** (pour envoyer des messages)
- ✅ **Read Message History** (pour lire l'historique des messages)
- ✅ **View Channels** (pour voir les canaux)

### 1.5 Activer les Privileged Gateway Intents

⚠️ **Important** : Pour récupérer la liste des membres, vous devez activer les "Privileged Gateway Intents".

Dans la section **"Bot"**, activez :

- ✅ **Server Members Intent** (obligatoire pour récupérer la liste des membres)
  - Permet au bot d'accéder à la liste des membres du serveur
  - Nécessaire pour l'API `/api/discord/members`

⚠️ **Note** : Si votre bot est dans plus de 100 serveurs, vous devrez demander la vérification du bot pour activer ces intents.

### 1.6 Configurer l'URL d'interaction (après le déploiement)

⚠️ **Note** : Cette étape se fait **après** le déploiement de l'application.

1. Dans **"General Information"**, trouvez la section **"Interactions Endpoint URL"**
2. Entrez l'URL de votre application : `https://votre-app-url.com/api/discord/interactions`
   - Exemple pour Firebase App Hosting : `https://teamup--sqyping-teamup.us-east4.hosted.app/api/discord/interactions`
3. Cliquez sur **"Save Changes"**
4. Discord va tester l'URL et afficher un message de confirmation si tout est correct

### 1.7 Récupérer l'ID du serveur (optionnel, pour le développement)

Pour enregistrer les commandes sur un serveur spécifique (plus rapide pour le développement) :

1. Activez le **Mode développeur** dans Discord :
   - Paramètres Discord → Avancé → Mode développeur
2. Sur votre serveur Discord, faites un **clic droit** sur le serveur
3. Cliquez sur **"Copier l'ID"**
4. Copiez cette valeur → `DISCORD_SERVER_ID` ou `DISCORD_GUILD_ID`

---

## 🔐 Étape 2 : Configuration des variables d'environnement

### 2.1 Variables requises

Créez ou modifiez votre fichier `.env.local` à la racine du projet :

```bash
# Token du bot Discord (obligatoire)
DISCORD_TOKEN=votre_token_bot_ici

# Clé publique du bot Discord (obligatoire pour la vérification des signatures)
DISCORD_PUBLIC_KEY=votre_public_key_ici

# Application ID du bot Discord (obligatoire pour enregistrer les commandes)
DISCORD_APPLICATION_ID=votre_application_id_ici

# ID du serveur Discord (optionnel, pour enregistrer sur un serveur spécifique)
# Utile pour le développement (les commandes apparaissent immédiatement)
DISCORD_SERVER_ID=votre_server_id_ici
# ou
DISCORD_GUILD_ID=votre_guild_id_ici
```

### 2.2 Variables pour la production (Firebase App Hosting)

Si vous utilisez Firebase App Hosting, ajoutez ces variables dans `apphosting.yaml` ou via la console Firebase :

```yaml
env:
  # Discord Configuration (privées, côté serveur uniquement)
  - variable: DISCORD_TOKEN
    secret: discord-token-secret # Créer le secret dans Cloud Secret Manager
  - variable: DISCORD_PUBLIC_KEY
    secret: discord-public-key-secret
  - variable: DISCORD_APPLICATION_ID
    secret: discord-application-id-secret
  # Optionnel
  - variable: DISCORD_SERVER_ID
    secret: discord-server-id-secret
```

**Pour créer les secrets dans Cloud Secret Manager** :

```bash
# Via gcloud CLI
echo -n "votre_token" | gcloud secrets create discord-token-secret --data-file=-
echo -n "votre_public_key" | gcloud secrets create discord-public-key-secret --data-file=-
echo -n "votre_application_id" | gcloud secrets create discord-application-id-secret --data-file=-
```

Ou via la [Console Google Cloud](https://console.cloud.google.com/security/secret-manager)

---

## 📝 Étape 3 : Enregistrement des commandes slash

### 3.1 Méthode automatique (recommandée)

Une fois les variables d'environnement configurées, exécutez :

```bash
npm run discord:register-command
```

Le script va :

- ✅ Charger les variables depuis `.env.local`
- ✅ Afficher les variables détectées
- ✅ Enregistrer toutes les commandes slash dans Discord

**Commandes enregistrées** :

- `/lier_licence` / `/link_license`
- `/modifier_licence` / `/update_license`
- `/supprimer_licence` / `/unlink_license`
- `/ma_licence` / `/my_license`

### 3.2 Vérification

Après l'enregistrement, vous devriez voir :

```
✅ Commandes enregistrées avec succès pour ce serveur (guild)
📋 Commandes enregistrées (8):
   - /lier_licence (ID: ...)
   - /modifier_licence (ID: ...)
   ...
```

### 3.3 Notes importantes

- **Enregistrement global** : Si `DISCORD_SERVER_ID` n'est pas défini, les commandes sont enregistrées globalement (tous les serveurs). Cela peut prendre jusqu'à **1 heure** pour apparaître.
- **Enregistrement sur serveur** : Si `DISCORD_SERVER_ID` est défini, les commandes apparaissent **immédiatement** sur ce serveur uniquement.

---

## 🚀 Étape 4 : Déploiement

### 4.1 Développement local

Pour tester localement, utilisez un tunnel (ngrok, Cloudflare Tunnel, etc.) :

```bash
# Installer ngrok
npm install -g ngrok

# Créer un tunnel vers votre serveur local
ngrok http 3000

# Utiliser l'URL ngrok dans Discord Developer Portal > Interactions Endpoint URL
# Exemple: https://abc123.ngrok.io/api/discord/interactions
```

⚠️ **Important** : L'URL doit être accessible publiquement. Discord ne peut pas accéder à `localhost`.

### 4.2 Production (Firebase App Hosting)

1. **Déployer l'application** :

   ```bash
   firebase deploy --only apphosting
   ```

2. **Configurer l'URL d'interaction dans Discord** :

   - Allez dans Discord Developer Portal > General Information
   - Dans "Interactions Endpoint URL", entrez : `https://votre-app-url.com/api/discord/interactions`
   - Cliquez sur "Save Changes"
   - Discord va tester l'URL et afficher un ✅ si tout est correct

3. **Vérifier les variables d'environnement** :
   - Assurez-vous que toutes les variables Discord sont configurées dans `apphosting.yaml` ou via la console Firebase
   - Redéployez si nécessaire

---

## 🤖 Étape 5 : Inviter le bot sur votre serveur

### 5.1 Générer le lien d'invitation

1. Dans Discord Developer Portal, allez dans **"OAuth2"** > **"URL Generator"**
2. Dans **"Scopes"**, cochez :
   - ✅ `bot` (obligatoire)
   - ✅ `applications.commands` (obligatoire pour les slash commands)
3. Dans **"Bot Permissions"**, cochez les permissions nécessaires :
   - ✅ `View Channels` (pour voir les canaux)
   - ✅ `Send Messages` (pour envoyer des messages)
   - ✅ `Read Message History` (pour lire l'historique)
   - ✅ `Use Slash Commands` (pour utiliser les commandes slash)
   - ✅ `Mention Everyone` (optionnel, si vous voulez mentionner @everyone)
4. Copiez l'URL générée en bas de la page

⚠️ **Important** : Les permissions sélectionnées ici déterminent ce que le bot peut faire sur le serveur. Assurez-vous d'avoir au minimum :

- `View Channels` (pour récupérer la liste des canaux)
- `Send Messages` (pour envoyer des messages)
- `Read Message History` (pour lire les messages)

### 5.2 Inviter le bot

1. Ouvrez l'URL copiée dans votre navigateur
2. Sélectionnez le serveur Discord où vous voulez inviter le bot
3. Cliquez sur **"Authorize"**
4. Vérifiez que le bot apparaît dans la liste des membres de votre serveur

---

## ✅ Étape 6 : Vérification et tests

### 6.1 Vérifier que tout fonctionne

1. **Vérifier l'URL d'interaction** :

   - Dans Discord Developer Portal > General Information
   - L'URL d'interaction doit afficher un ✅ vert si elle est correctement configurée

2. **Tester les commandes** :

   - Dans Discord, tapez `/` dans n'importe quel canal
   - Vous devriez voir les commandes `/lier_licence`, `/modifier_licence`, etc.
   - Si elles n'apparaissent pas, attendez quelques minutes (pour les commandes globales)

3. **Tester une commande** :
   ```
   /ma_licence
   ```
   - Vous devriez recevoir une réponse (même si vous n'êtes pas encore associé)

### 6.2 Vérifier les logs

Si quelque chose ne fonctionne pas, vérifiez les logs :

- **En local** : Les logs apparaissent dans la console
- **En production** :
  ```bash
  # Firebase App Hosting
  firebase functions:log
  # ou via la console Firebase
  ```

---

## 🔍 Checklist de configuration

Utilisez cette checklist pour vérifier que tout est configuré :

### Discord Developer Portal

- [ ] Application créée
- [ ] Bot créé
- [ ] Application ID copié → `DISCORD_APPLICATION_ID`
- [ ] Public Key copié → `DISCORD_PUBLIC_KEY`
- [ ] Token du bot copié → `DISCORD_TOKEN`
- [ ] Permissions du bot configurées
- [ ] URL d'interaction configurée (après déploiement)
- [ ] Bot invité sur le serveur avec la permission `applications.commands`

### Variables d'environnement

- [ ] `DISCORD_TOKEN` configuré dans `.env.local` (dev) ou `apphosting.yaml` (prod)
- [ ] `DISCORD_PUBLIC_KEY` configuré
- [ ] `DISCORD_APPLICATION_ID` configuré
- [ ] `DISCORD_SERVER_ID` configuré (optionnel, pour le développement)

### Application

- [ ] Commandes enregistrées avec `npm run discord:register-command`
- [ ] Application déployée (production)
- [ ] URL d'interaction accessible publiquement
- [ ] Variables d'environnement disponibles en production

### Tests

- [ ] Les commandes apparaissent dans Discord (tapez `/`)
- [ ] La commande `/ma_licence` fonctionne
- [ ] Les logs ne montrent pas d'erreurs

---

## 🐛 Dépannage

### Les commandes n'apparaissent pas dans Discord

1. **Vérifiez que le bot est invité** avec la permission `applications.commands`
2. **Attendez quelques minutes** si vous avez enregistré les commandes globalement
3. **Redémarrez Discord** ou rafraîchissez la liste des commandes
4. **Vérifiez les logs** de l'enregistrement des commandes

### L'API retourne une erreur 401

- Vérifiez que `DISCORD_PUBLIC_KEY` est configuré et correspond à la clé publique dans Discord Developer Portal
- Vérifiez que l'URL d'interaction est correctement configurée
- Vérifiez les logs pour voir les détails de l'erreur

### Erreur lors de la récupération des membres (code 50001)

Si vous obtenez une erreur `50001` lors de la récupération des membres :

1. **Vérifiez que le Server Members Intent est activé** :

   - Discord Developer Portal > Bot > Privileged Gateway Intents
   - Activez **"Server Members Intent"**
   - Sauvegardez les modifications

2. **Vérifiez que le bot est présent dans le serveur** :

   - Le bot doit être invité sur le serveur
   - Vérifiez que le bot apparaît dans la liste des membres

3. **Vérifiez les permissions du bot** :

   - Le bot doit avoir la permission "View Server Members"
   - Vérifiez les permissions du rôle du bot sur le serveur Discord

4. **Réinvitez le bot** si nécessaire :
   - Si vous avez activé l'intent après avoir invité le bot, réinvitez-le avec le nouveau lien OAuth2

### Erreur lors de la récupération des canaux

- Vérifiez que le bot a la permission "View Channels" sur le serveur
- Vérifiez que `DISCORD_SERVER_ID` est correct
- Vérifiez que le bot est présent dans le serveur

### L'URL d'interaction ne fonctionne pas

1. **Vérifiez que l'URL est accessible** :

   ```bash
   curl https://votre-app-url.com/api/discord/interactions
   ```

   - Devrait retourner une erreur 405 (Method Not Allowed) car on ne peut que POST
   - Si vous obtenez une erreur 404, l'URL est incorrecte

2. **Vérifiez que l'application est déployée** et que la route existe

3. **Vérifiez les logs** de l'application pour voir les erreurs

### Les commandes ne répondent pas

1. **Vérifiez les logs** de l'application
2. **Vérifiez que `DISCORD_PUBLIC_KEY` est configuré** (obligatoire en production)
3. **Vérifiez que Firebase Admin est correctement configuré**
4. **Vérifiez que la collection `players` existe** dans Firestore

---

## 📚 Ressources

- [Documentation Discord Interactions](https://discord.com/developers/docs/interactions/overview)
- [Documentation Discord Slash Commands](https://discord.com/developers/docs/interactions/application-commands)
- [Documentation Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- [Documentation du projet](./DISCORD_LICENSE_LINKING.md)

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. Vérifiez la checklist ci-dessus
2. Consultez les logs de l'application
3. Vérifiez la documentation Discord
4. Vérifiez que toutes les variables d'environnement sont correctement configurées

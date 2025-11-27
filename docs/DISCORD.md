# Guide Discord - Configuration complète

Ce guide couvre toute la configuration nécessaire pour l'intégration Discord avec l'application TeamUp.

## 📋 Table des matières

1. [Configuration Discord Developer Portal](#configuration-discord-developer-portal)
2. [Configuration de l'application](#configuration-de-lapplication)
3. [Liaison Discord ↔ Licence](#liaison-discord--licence)
4. [Envoi de messages](#envoi-de-messages)
5. [Dépannage](#dépannage)

---

## Configuration Discord Developer Portal

### 1. Créer une application Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur **"New Application"**
3. Donnez un nom à votre application (ex: "SQY Ping TeamUp")
4. Cliquez sur **"Create"**

### 2. Récupérer les identifiants nécessaires

Dans la section **"General Information"**, vous trouverez :

- **Application ID** : Copiez cette valeur → `DISCORD_APPLICATION_ID`
- **Public Key** : Copiez cette valeur → `DISCORD_PUBLIC_KEY`

⚠️ **Important** : Gardez ces valeurs précieusement.

### 3. Créer un bot

1. Dans le menu de gauche, allez dans **"Bot"**
2. Cliquez sur **"Add Bot"** puis **"Yes, do it!"**
3. Dans la section **"Token"**, cliquez sur **"Reset Token"** ou **"Copy"** pour récupérer le token
4. Copiez cette valeur → `DISCORD_TOKEN`

⚠️ **Sécurité** : Ne partagez jamais ce token !

### 4. Configurer les permissions du bot

Dans la section **"Bot"**, activez les permissions suivantes :

- ✅ **Use Slash Commands** (obligatoire)
- ✅ **Send Messages** (pour envoyer des messages)
- ✅ **Read Message History** (pour lire l'historique)
- ✅ **View Channels** (pour voir les canaux)
- ✅ **Mention Everyone** (pour mentionner @everyone si nécessaire)

### 5. Configurer l'URL d'interaction

1. Dans **"General Information"**, allez dans **"Interactions Endpoint URL"**
2. Entrez l'URL de votre API : `https://votre-domaine.com/api/discord/interactions`
3. Cliquez sur **"Save Changes"**
4. Discord vérifiera l'URL en envoyant un PING

### 6. Inviter le bot sur votre serveur

1. Dans **"OAuth2"** → **"URL Generator"**
2. Cochez les scopes :
   - ✅ **bot**
   - ✅ **applications.commands**
3. Cochez les permissions nécessaires (voir section 4)
4. Copiez l'URL générée et ouvrez-la dans votre navigateur
5. Sélectionnez votre serveur et autorisez le bot

---

## Configuration de l'application

### Variables d'environnement requises

```bash
# Token du bot Discord
DISCORD_TOKEN=your_bot_token

# Clé publique du bot Discord (pour vérifier les signatures)
DISCORD_PUBLIC_KEY=your_public_key

# Application ID du bot Discord (pour enregistrer les commandes slash)
DISCORD_APPLICATION_ID=your_application_id

# ID du serveur Discord (optionnel, pour développement)
DISCORD_SERVER_ID=your_server_id
# ou
DISCORD_GUILD_ID=your_guild_id

# Secret pour l'API de liaison (optionnel, pour sécurité supplémentaire)
DISCORD_WEBHOOK_SECRET=your_webhook_secret
```

### Enregistrer les commandes slash

```bash
# Enregistrer toutes les commandes
npm run discord:register-command

# Utiliser uniquement les variables d'environnement (sans .env)
npm run discord:register-command -- --no-env-file
```

Les commandes disponibles :
- `/lier_licence <numéro>` : Lier un compte Discord à une licence FFTT
- `/modifier_licence <numéro>` : Modifier la licence liée
- `/supprimer_licence` : Supprimer la liaison
- `/ma_licence` : Afficher la licence actuellement liée

---

## Liaison Discord ↔ Licence

### Fonctionnement

1. Un utilisateur utilise la commande slash `/lier_licence <numéro>` dans Discord
2. Discord envoie une interaction HTTP à `/api/discord/interactions`
3. L'API vérifie :
   - Que le numéro de licence ne contient que des chiffres
   - Que l'utilisateur Discord n'est pas déjà associé à un autre joueur
   - Que la licence existe dans la collection `players`
4. Si tout est valide, l'ID Discord est ajouté au tableau `discordMentions` du joueur
5. Un message de confirmation ou d'erreur est envoyé dans Discord (visible uniquement par l'utilisateur)

### Structure Firestore

```typescript
players/
  {licence}/
    - discordMentions: string[]  // Tableau d'IDs Discord
    - prenom: string
    - nom: string
    // ... autres champs
```

### Messages d'erreur

- **Licence déjà associée à un autre compte** : Message explicite avec le nom du joueur
- **Licence inexistante** : Message indiquant que la licence n'existe pas
- **Licence déjà associée à ce compte** : Message de confirmation
- **Format invalide** : Message indiquant que le numéro doit contenir uniquement des chiffres

---

## Envoi de messages

### Configuration des canaux Discord

1. Dans l'application, allez sur la page **Équipes**
2. Pour chaque équipe, vous pouvez sélectionner un canal Discord
3. Les messages de composition seront envoyés dans ce canal

### Permissions requises

Le bot doit avoir les permissions suivantes dans le canal :
- ✅ **View Channels**
- ✅ **Send Messages**
- ✅ **Read Message History**
- ✅ **Mention Everyone** (si vous voulez mentionner @everyone)

### Envoi depuis l'application

Les messages sont envoyés depuis la page **Compositions** :
1. Configurez la composition
2. Cliquez sur **"Envoyer sur Discord"**
3. Le message est envoyé dans le canal configuré pour l'équipe

---

## Dépannage

### Les commandes slash n'apparaissent pas

1. Vérifiez que les commandes sont enregistrées : `npm run discord:register-command`
2. Vérifiez que le bot est invité sur le serveur avec les permissions `applications.commands`
3. Attendez quelques minutes (Discord peut prendre du temps pour propager les commandes)
4. Redémarrez Discord (Ctrl+R ou Cmd+R)

### Erreur "Invalid signature"

1. Vérifiez que `DISCORD_PUBLIC_KEY` est correctement configuré
2. Vérifiez que l'URL d'interaction est correcte dans Discord Developer Portal
3. Vérifiez que l'application est bien déployée et accessible

### Erreur "Missing Access" lors de l'envoi de messages

1. Vérifiez que le bot a les permissions nécessaires dans le canal
2. Vérifiez que le canal existe et est accessible
3. Vérifiez que le bot est membre du serveur

### Le bot ne répond pas aux commandes

1. Vérifiez que l'URL d'interaction est correcte et accessible
2. Vérifiez les logs de l'application pour voir les erreurs
3. Vérifiez que la signature Discord est correctement vérifiée

---

## 📚 Ressources supplémentaires

- [Documentation Discord - Interactions](https://discord.com/developers/docs/interactions/overview)
- [Documentation Discord - Slash Commands](https://discord.com/developers/docs/interactions/application-commands)
- [Documentation Discord - Bot Permissions](https://discord.com/developers/docs/topics/permissions)


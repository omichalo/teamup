# Liaison Discord ↔ Licence

Ce système permet aux utilisateurs Discord de lier leur compte à leur numéro de licence FFTT via une commande slash Discord.

## 🎯 Fonctionnement

1. Un utilisateur utilise la commande slash `/lier_licence <numéro>` dans Discord
2. Discord envoie une interaction HTTP à notre API `/api/discord/interactions`
3. L'API vérifie :
   - Que le numéro de licence ne contient que des chiffres
   - Que l'utilisateur Discord n'est pas déjà associé à un autre joueur
   - Que la licence existe dans la collection `players`
4. Si tout est valide, l'ID Discord est ajouté au tableau `discordMentions` du joueur
5. Un message de confirmation ou d'erreur est envoyé dans Discord (visible uniquement par l'utilisateur)

## 📋 Configuration

### Variables d'environnement requises

```bash
# Token du bot Discord (déjà configuré et réutilisé)
DISCORD_TOKEN=your_bot_token

# Clé publique du bot Discord (pour vérifier les signatures)
# Récupérable dans Discord Developer Portal > Application > General Information > Public Key
DISCORD_PUBLIC_KEY=your_public_key

# Application ID du bot Discord (pour enregistrer les commandes slash)
# Récupérable dans Discord Developer Portal > Application > General Information > Application ID
DISCORD_APPLICATION_ID=your_application_id

# Optionnel : ID du serveur Discord (guild) pour enregistrer les commandes sur un serveur spécifique
# Utile pour le développement (les commandes apparaissent immédiatement)
# Récupérable en activant le mode développeur Discord et en faisant clic droit sur le serveur > Copier l'ID
# Note: DISCORD_SERVER_ID et DISCORD_GUILD_ID sont synonymes (le script accepte les deux)
DISCORD_SERVER_ID=your_server_id
# ou
DISCORD_GUILD_ID=your_guild_id
```

**Note** : `DISCORD_TOKEN` est la même variable que celle utilisée pour les autres fonctionnalités Discord (envoi de messages, récupération des membres, etc.).

### Configuration du bot Discord

1. **Créer un bot Discord** sur le [Discord Developer Portal](https://discord.com/developers/applications)
2. **Récupérer la clé publique** :
   - Aller dans "General Information"
   - Copier la "Public Key"
3. **Configurer l'URL d'interaction** :
   - Aller dans "General Information" > "Interactions Endpoint URL"
   - Entrer : `https://your-app-url.com/api/discord/interactions`
   - Cliquer sur "Save Changes"
4. **Créer la commande slash** :

   **Méthode recommandée (automatique)** :

   ```bash
   # Les variables d'environnement sont chargées automatiquement depuis .env.local
   # Assurez-vous d'avoir :
   # - DISCORD_TOKEN
   # - DISCORD_APPLICATION_ID
   # - DISCORD_SERVER_ID ou DISCORD_GUILD_ID (optionnel, pour enregistrer sur un serveur spécifique)

   # Enregistrer la commande
   npm run discord:register-command
   ```

   **Méthode manuelle (via Discord Developer Portal)** :

   - Aller dans "Slash Commands"
   - Cliquer sur "New Command"
   - Nom : `lier_licence` (ou `link_license`)
   - Description : "Lier votre compte Discord à votre numéro de licence FFTT"
   - Ajouter une option :
     - Nom : `licence`
     - Description : "Votre numéro de licence FFTT"
     - Type : STRING
     - Requis : Oui
   - Cliquer sur "Save Changes"

5. **Inviter le bot** sur votre serveur Discord avec les permissions nécessaires :
   - `applications.commands` (pour utiliser les slash commands)

**Note importante** : Une fois la commande slash créée et le bot invité sur le serveur, la commande `/lier_licence` sera disponible **partout dans le serveur Discord** (tous les canaux textuels), pas seulement dans un canal spécifique. C'est le comportement standard des slash commands Discord.

### Index Firestore

**Note importante** : Firestore crée automatiquement les index simples pour les requêtes `array-contains` sur un seul champ. Vous n'avez donc **pas besoin** de définir manuellement un index pour `discordMentions` dans `firestore.indexes.json`.

L'index sera créé automatiquement lors de la première utilisation de la requête `where("discordMentions", "array-contains", userId)`. Si vous voyez un message d'erreur dans les logs vous demandant de créer un index, suivez le lien fourni dans l'erreur pour le créer automatiquement via la console Firebase.

## 🚀 Déploiement

### Production (Firebase App Hosting)

Le système utilise Discord Interactions (slash commands), ce qui est parfaitement compatible avec Firebase App Hosting car :

- Pas besoin de processus continu
- Discord envoie des requêtes HTTP à notre API
- Compatible avec l'architecture stateless de Firebase

1. **Déployer l'application** sur Firebase App Hosting
2. **Configurer l'URL d'interaction** dans Discord Developer Portal
3. **Tester la commande** `/lier_licence` dans Discord

### Développement local

Pour tester localement, vous pouvez utiliser un tunnel (ngrok, Cloudflare Tunnel, etc.) :

```bash
# Installer ngrok
npm install -g ngrok

# Créer un tunnel vers votre serveur local
ngrok http 3000

# Utiliser l'URL ngrok dans Discord Developer Portal > Interactions Endpoint URL
# Exemple: https://abc123.ngrok.io/api/discord/interactions
```

## 🔒 Sécurité

- **Authentification API** : Utilisez `DISCORD_WEBHOOK_SECRET` pour authentifier les appels à l'API
- **Validation des messages** : Seuls les messages contenant uniquement des chiffres sont traités
- **Vérification du canal** : Seuls les messages du canal configuré sont traités
- **Un utilisateur = un joueur** : Un utilisateur Discord ne peut être associé qu'à un seul joueur

## 📝 Exemples d'utilisation

### Commandes disponibles

#### 1. Lier une licence (`/lier_licence`)

```
/lier_licence licence:1234567
```

→ L'utilisateur Discord sera associé à la licence 1234567

#### 2. Modifier l'association (`/modifier_licence`)

```
/modifier_licence licence:7654321
```

→ L'association existante sera supprimée et remplacée par la nouvelle licence

#### 3. Supprimer l'association (`/supprimer_licence`)

```
/supprimer_licence
```

→ L'association entre le compte Discord et la licence sera supprimée

#### 4. Afficher la licence associée (`/ma_licence`)

```
/ma_licence
```

→ Affiche la licence FFTT à laquelle votre compte Discord est actuellement associé

### Cas d'erreur

**Licence non trouvée** :

```
❌ Aucun joueur trouvé avec la licence 9999999. Vérifiez que le numéro de licence est correct.
```

**Utilisateur déjà associé** :

```
❌ Un utilisateur Discord ne peut être associé qu'à un seul joueur. Vous êtes déjà associé à la licence 1234567.
```

**Format invalide** :

```
❌ Le numéro de licence doit contenir uniquement des chiffres.
```

**Succès (lier)** :

```
✅ Votre compte Discord a été associé à la licence 1234567 (Jean DUPONT). Vous recevrez désormais les notifications pour ce joueur.
```

**Succès (modifier)** :

```
✅ Votre association a été modifiée de la licence 1234567 (Jean DUPONT) vers la licence 7654321 (Marie MARTIN).
```

**Succès (supprimer)** :

```
✅ Votre association avec la licence 1234567 (Jean DUPONT) a été supprimée.
```

**Affichage de la licence** :

```
📋 Vous êtes associé à la licence 1234567 (Jean DUPONT).
```

**Déjà associé (lier)** :

```
ℹ️ Vous êtes déjà associé à la licence 1234567 (Jean DUPONT). Aucune modification n'est nécessaire.
```

**Aucune association** :

```
ℹ️ Vous n'êtes actuellement associé à aucune licence. Utilisez /lier_licence pour créer une association.
```

**Note** : Les messages de réponse sont "ephemeral" (visibles uniquement par l'utilisateur qui a exécuté la commande).

## 🔧 Maintenance

### Vérifier les associations

Pour voir quels utilisateurs Discord sont associés à un joueur, consultez le champ `discordMentions` dans la collection `players` de Firestore.

### Retirer une association

Pour retirer une association, utilisez l'interface d'administration de l'application ou modifiez directement le document dans Firestore en retirant l'ID Discord du tableau `discordMentions`.

## 🐛 Dépannage

### La commande slash ne fonctionne pas

1. Vérifiez que l'URL d'interaction est correctement configurée dans Discord Developer Portal
2. Vérifiez que l'URL est accessible publiquement (pas de localhost en production)
3. Vérifiez les logs de l'application pour voir les erreurs
4. Vérifiez que `DISCORD_PUBLIC_KEY` est configuré correctement

### L'API retourne une erreur 401

- Vérifiez que `DISCORD_PUBLIC_KEY` est configuré et correspond à la clé publique du bot dans Discord Developer Portal
- La vérification de signature peut être désactivée temporairement pour le développement (mais doit être activée en production)

### La commande slash n'apparaît pas dans Discord

1. Attendez quelques minutes après la création de la commande (Discord peut prendre du temps)
2. Vérifiez que le bot est invité sur le serveur avec la permission `applications.commands`
3. Essayez de redémarrer Discord ou de rafraîchir la liste des commandes

### L'index Firestore n'existe pas

- Déployez les index : `firebase deploy --only firestore:indexes`
- Attendez quelques minutes que l'index soit créé

# 📊 Où voir les logs de synchronisation des matchs

## 🔍 **1. Terminal du serveur Next.js (Principal)**

**Localisation** : Le terminal où vous avez lancé `npm run dev`

**Ce que vous verrez** :
- ✅ Tous les `console.log()` du service de synchronisation
- ✅ Les logs détaillés de récupération des matchs
- ✅ Les informations d'enrichissement des licences
- ✅ Les erreurs et warnings

**Exemple de logs que vous verrez** :
```
🔄 Déclenchement de la synchronisation des matchs par équipe
🔄 Synchronisation des matchs pour toutes les équipes...
📋 26 équipes à traiter
🔄 Enrichissement des matchs avec les licences des joueurs...
✅ 150 matchs enrichis
🎾 Match joué détecté: VS Opponent - Joueurs: 4
  ✅ Joueur ajouté: NOM Prénom (licence: 7883092)
  ⚠️  Joueur sans licence ignoré: NOM Prénom - Date: 2024-10-11
💾 Sauvegarde de 150 matchs dans les sous-collections...
✅ 150 matchs sauvegardés
```

## 🌐 **2. Console du navigateur (Logs clients)**

**Localisation** : Outils de développement du navigateur (F12)

**Ce que vous verrez** :
- Les appels API (onglet Network)
- Les erreurs de réponse
- Les logs côté client de la page admin

**Pour accéder** :
1. Ouvrir http://localhost:3000/admin
2. Appuyer sur F12 (ou Cmd+Option+I sur Mac)
3. Onglet "Console" pour les logs
4. Onglet "Network" pour voir les requêtes API

## 📝 **3. Logs API Next.js (via réponse HTTP)**

**Localisation** : Dans la réponse de l'API `/api/admin/sync-team-matches`

**Ce que vous verrez** :
- Le résultat de la synchronisation
- Le nombre de matchs sauvegardés
- Les erreurs éventuelles

**Pour accéder** :
- Via l'interface admin (affiché dans l'interface)
- Ou via l'onglet Network du navigateur

## 🔥 **4. Logs Firebase Functions (Si déployé en production)**

**Localisation** : Firebase Console > Functions > Logs

**Pour accéder** :
```bash
firebase functions:log --only syncTeamMatchesManual
```

Ou via l'interface web :
https://console.firebase.google.com/project/sqyping-teamup/functions/logs

## 📋 **5. Logs détaillés dans le code**

Les logs principaux sont dans :
- `src/pages/api/admin/sync-team-matches.ts` (ligne 24)
- `src/lib/shared/team-matches-sync.ts` (plusieurs endroits)

**Types de logs** :
- `🔄` : Début d'une opération
- `✅` : Succès
- `⚠️` : Avertissement
- `❌` : Erreur
- `📊` : Statistiques
- `💾` : Sauvegarde
- `🔍` : Recherche/Enrichissement

## 🛠️ **Voir les logs en temps réel**

Si vous voulez voir uniquement les logs de synchronisation dans le terminal :

```bash
# Filtrer les logs dans le terminal
npm run dev | grep -E "🔄|✅|⚠️|❌|📊|💾|🔍|Joueur|Match|Synchro"
```

Ou créez un script pour voir uniquement les logs importants.

## 📌 **Note importante**

⚠️ **Les logs apparaissent dans le terminal où tourne `npm run dev`**

Si vous lancez la synchronisation depuis l'interface web, tous les logs `console.log()` du serveur Next.js s'affichent dans ce terminal.



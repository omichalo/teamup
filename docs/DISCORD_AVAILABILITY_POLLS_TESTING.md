# Guide de test - Discord Availability Polls (Interactions-First)

## Vue d'ensemble

Ce guide explique comment tester la nouvelle implémentation "Interactions-First" des sondages de disponibilité Discord.

## Architecture

### Message initial
- **1 seul message** dans le canal Discord
- **3 boutons** : "🟦 Répondre", "🟨 Modifier ma réponse", "📝 Commentaire"
- **Embed** : titre campagne + rappel créneaux + deadline

### Flux utilisateur

#### Hommes (M)
1. Cliquer sur "🟦 Répondre"
2. Voir **3 boutons éphémères** : ✅ Disponible / ❌ Indisponible / 🤔 À confirmer
3. Cliquer sur un bouton
4. Recevoir une **confirmation éphémère**

#### Femmes (F)
1. Cliquer sur "🟦 Répondre"
2. Voir **2 select menus** : VEN (Vendredi) et SAM (Samedi)
3. Sélectionner une option dans chaque menu (✅ Disponible / ❌ Indisponible / 🤔 À confirmer)
4. Cliquer sur "Valider"
5. Recevoir une **confirmation éphémère** "VEN: X / SAM: Y" + bouton "Modifier"

## Scénarios de test

### Test 1 : Homme répond pour la première fois

**Prérequis :**
- Utilisateur Discord avec compte lié à une licence d'un joueur masculin (genre = "M")
- Sondage actif dans un canal Discord

**Étapes :**
1. Aller dans le canal Discord avec le sondage
2. Cliquer sur "🟦 Répondre"
3. Vérifier que 3 boutons apparaissent (éphémère) : Disponible / Indisponible / À confirmer
4. Cliquer sur "✅ Disponible"
5. Vérifier la confirmation éphémère : "✅ **Votre disponibilité a été enregistrée : disponible**"

**Résultat attendu :**
- Réponse sauvegardée dans Firestore (`availabilities/{pollId}/players/{licenceId}.available = true`)
- Confirmation éphémère affichée
- Message principal inchangé

### Test 2 : Femme répond pour la première fois

**Prérequis :**
- Utilisateur Discord avec compte lié à une licence d'une joueuse (genre = "F")
- Sondage actif dans un canal Discord

**Étapes :**
1. Aller dans le canal Discord avec le sondage
2. Cliquer sur "🟦 Répondre"
3. Vérifier que 2 select menus apparaissent (éphémère) : VEN et SAM
4. Sélectionner "✅ Disponible" dans le menu VEN
5. Vérifier la confirmation : "✅ **Vendredi :** Disponible"
6. Sélectionner "❌ Indisponible" dans le menu SAM
7. Vérifier la confirmation : "❌ **Samedi :** Indisponible"
8. Cliquer sur "Valider"
9. Vérifier la confirmation finale : "✅ **Votre disponibilité a été enregistrée :** VEN: ✅ / SAM: ❌"

**Résultat attendu :**
- Réponse sauvegardée dans Firestore :
  - `availabilities/{pollId}/players/{licenceId}.fridayAvailable = true`
  - `availabilities/{pollId}/players/{licenceId}.saturdayAvailable = false`
- Confirmation éphémère affichée avec bouton "Modifier"
- Message principal inchangé

### Test 3 : Modifier sa réponse (Homme)

**Prérequis :**
- Utilisateur a déjà répondu au sondage
- Réponse actuelle : Disponible

**Étapes :**
1. Cliquer sur "🟨 Modifier ma réponse"
2. Vérifier que la réponse actuelle est affichée : "📋 **Votre réponse actuelle :** ✅ **Disponible**"
3. Vérifier que 3 boutons sont proposés pour modifier
4. Cliquer sur "❌ Indisponible"
5. Vérifier la confirmation : "❌ **Votre disponibilité a été enregistrée : indisponible**"

**Résultat attendu :**
- Réponse mise à jour dans Firestore (`available = false`)
- Confirmation éphémère affichée

### Test 4 : Modifier sa réponse (Femme)

**Prérequis :**
- Utilisateur a déjà répondu au sondage
- Réponse actuelle : VEN ✅ / SAM ❌

**Étapes :**
1. Cliquer sur "🟨 Modifier ma réponse"
2. Vérifier que la réponse actuelle est affichée : "📋 **Votre réponse actuelle :** VEN: ✅ / SAM: ❌"
3. Vérifier que les 2 select menus sont pré-remplis avec les valeurs actuelles
4. Modifier VEN à "❌ Indisponible"
5. Modifier SAM à "✅ Disponible"
6. Cliquer sur "Valider"
7. Vérifier la confirmation : "VEN: ❌ / SAM: ✅"

**Résultat attendu :**
- Réponse mise à jour dans Firestore
- Confirmation éphémère affichée

### Test 5 : Ajouter un commentaire

**Prérequis :**
- Utilisateur a une licence liée (peut être homme ou femme)

**Étapes :**
1. Cliquer sur "📝 Commentaire"
2. Vérifier qu'un modal s'ouvre avec un champ texte
3. Saisir un commentaire : "Je peux venir mais je dois partir à 20h"
4. Cliquer sur "Envoyer"
5. Vérifier la confirmation : "💬 Votre commentaire a été enregistré : \"Je peux venir mais je dois partir à 20h\""

**Résultat attendu :**
- Commentaire sauvegardé dans Firestore pour les deux catégories (masculin et féminin)
- Confirmation éphémère affichée

### Test 6 : Compte non lié

**Prérequis :**
- Utilisateur Discord **sans** licence liée

**Étapes :**
1. Cliquer sur "🟦 Répondre"
2. Vérifier le message d'erreur : "❌ Votre compte Discord n'est pas lié à une licence. Utilisez `/lier_licence <numéro>` pour associer votre compte."

**Résultat attendu :**
- Message d'erreur éphémère avec instructions
- Aucune réponse sauvegardée

### Test 7 : Sondage fermé

**Prérequis :**
- Sondage avec `isActive = false`

**Étapes :**
1. Cliquer sur "🟦 Répondre" sur un sondage fermé
2. Vérifier le message d'erreur : "❌ Ce sondage n'est plus actif."

**Résultat attendu :**
- Message d'erreur éphémère
- Aucune réponse sauvegardée

### Test 8 : Idempotence (cliquer plusieurs fois)

**Prérequis :**
- Utilisateur avec licence liée

**Étapes :**
1. Cliquer sur "🟦 Répondre"
2. Cliquer rapidement 5 fois sur "✅ Disponible"
3. Vérifier qu'une seule réponse est sauvegardée dans Firestore

**Résultat attendu :**
- Une seule réponse dans Firestore (pas de doublons)
- Confirmation éphémère affichée

## Vérifications Firestore

### Collection `availabilities`
- Document ID : `${phase}_${journee}_${championshipType}_${idEpreuve}`
- Structure :
  ```typescript
  {
    journee: number,
    phase: "aller" | "retour",
    championshipType: "masculin" | "feminin",
    idEpreuve?: number,
    players: {
      [licenceId]: {
        available?: boolean,           // Pour les hommes
        fridayAvailable?: boolean,      // Pour les femmes
        saturdayAvailable?: boolean,    // Pour les femmes
        comment?: string                // Partagé
      }
    }
  }
  ```

### Collection `discordAvailabilityTemp`
- Utilisée temporairement pour stocker les sélections des select menus (femmes)
- Document ID : `temp_${pollId}_${discordUserId}`
- Structure :
  ```typescript
  {
    pollId: string,
    discordUserId: string,
    ven?: "available" | "unavailable" | "maybe",
    sat?: "available" | "unavailable" | "maybe",
    updatedAt: Timestamp
  }
  ```
- **Note** : Ces documents sont supprimés après validation

## Points d'attention

1. **Select menus Discord** : Les valeurs sont stockées temporairement dans Firestore car Discord n'envoie pas les valeurs des select menus lors du clic sur "Valider"
2. **Genre** : Le genre est détecté depuis `players/{licenceId}.sexe` ou `players/{licenceId}.gender`
3. **Championnat par équipes** : Le commentaire est partagé entre masculin et féminin (même valeur dans les deux catégories)
4. **Réponses éphémères** : Toutes les réponses sont éphémères (flag 64) pour éviter le spam dans le canal

## Commandes utiles

### Vérifier un sondage dans Firestore
```bash
# Via Firebase Console ou CLI
firebase firestore:get availabilities/{pollId}
```

### Vérifier les sélections temporaires
```bash
firebase firestore:get discordAvailabilityTemp
```

### Nettoyer les sélections temporaires orphelines
```bash
# Les documents sont normalement supprimés après validation
# Mais en cas de problème, ils peuvent être nettoyés manuellement
```

## Dépannage

### Le bouton "Répondre" ne fonctionne pas
- Vérifier que le `custom_id` commence par `availability_`
- Vérifier que le pollId est correctement extrait
- Vérifier les logs : `[Discord Poll] Respond button clicked`

### Les select menus ne s'affichent pas pour les femmes
- Vérifier que le genre est bien "F" dans Firestore
- Vérifier les logs : `[Discord Poll] Gender detected: F`

### Les valeurs des select menus ne sont pas sauvegardées
- Vérifier que `storeWomenSelection` est appelé lors de la sélection
- Vérifier que `getWomenSelections` récupère les valeurs lors du clic sur "Valider"
- Vérifier les logs : `[Discord Poll] Response saved`

### Erreur "Sondage introuvable"
- Vérifier que le pollId est correctement formaté : `${phase}_${journee}_${championshipType}_${idEpreuve}`
- Vérifier que le sondage existe dans `discordAvailabilityPolls`


# Comment les .cursorrules appliquent le workflow Git/GitHub

Ce document explique comment les règles dans `.cursorrules` m'aident à vous guider vers le respect du workflow Git/GitHub.

## 🎯 Objectif

Les règles dans `.cursorrules` font en sorte que je (l'IA) :
- ✅ Vous rappelle toujours de créer une branche avant de développer
- ✅ Vous incite à utiliser des messages de commit conventionnels
- ✅ Vous rappelle de créer une PR avant de merge sur main
- ✅ Vérifie que le code est prêt avant commit/push

## 📋 Règles actives

### 1. Protection de la branche main

**Règle** : "NE JAMAIS commiter directement sur `main` ou `master`"

**Comportement** :
- Si vous me demandez de commiter/pousser sur main, je vais :
  - ❌ Refuser poliment
  - ✅ Vous rappeler de créer une branche d'abord
  - ✅ Vous proposer la commande pour créer la branche

**Exemple** :
```
Vous : "Commite et pousse sur main"
Moi : "Je ne peux pas pousser directement sur main. Créons d'abord une branche :
       git checkout -b feature/nom-fonctionnalite
       Ensuite on pourra créer une PR."
```

### 2. Structure des branches

**Règle** : "TOUJOURS créer une branche dédiée avant de développer"

**Comportement** :
- Je vais toujours suggérer de créer une branche avec le bon préfixe :
  - `feature/` pour les nouvelles fonctionnalités
  - `fix/` pour les bugs
  - `refactor/` pour les refactorings
  - `docs/` pour la documentation

**Exemple** :
```
Vous : "Je veux ajouter une fonctionnalité Discord"
Moi : "Créons d'abord une branche :
       git checkout -b feature/discord-integration
       Ensuite on développe la fonctionnalité."
```

### 3. Messages de commit conventionnels

**Règle** : "TOUJOURS utiliser le format Conventional Commits"

**Comportement** :
- Si vous proposez un message non conforme, je vais :
  - ✅ Vous suggérer un message conforme
  - ✅ Expliquer le format attendu

**Exemple** :
```
Vous : "git commit -m 'ajout discord'"
Moi : "Je suggère plutôt :
       git commit -m 'feat(discord): ajout de l'intégration Discord'
       Format : <type>(<scope>): <description>"
```

### 4. Pull Requests obligatoires

**Règle** : "AVANT de pousser sur main, TOUJOURS créer une Pull Request"

**Comportement** :
- Avant chaque push, je vais :
  - ✅ Vérifier que vous êtes sur une branche feature/fix/etc
  - ✅ Vous rappeler de créer une PR après le push
  - ✅ Vous donner les étapes pour créer la PR

**Exemple** :
```
Vous : "Pousse la branche"
Moi : "Je vais pousser la branche feature/xxx.
       Ensuite, créez une PR sur GitHub :
       1. Allez sur GitHub
       2. Cliquez sur 'Compare & pull request'
       3. Remplissez la description
       4. Attendez que les checks CI passent"
```

### 5. Vérifications avant commit/push

**Règle** : "AVANT chaque commit/push, vérifier que tout est OK"

**Comportement** :
- Je vais toujours :
  - ✅ Exécuter `npm run check:dev` avant commit
  - ✅ Exécuter `npm run check` avant push
  - ✅ Vérifier qu'il n'y a pas de TODO
  - ✅ Vérifier que les messages de commit sont conformes

**Exemple** :
```
Vous : "Commite les changements"
Moi : "Avant de commiter, vérifions que tout est OK :
       npm run check:dev
       [exécution...]
       ✅ Tout est bon ! Je peux commiter."
```

## 🔄 Workflow complet avec les règles

### Scénario 1 : Nouvelle fonctionnalité

```
1. Vous : "Je veux ajouter X"
   Moi : "Créons une branche feature/x d'abord"

2. Vous : "Développe la fonctionnalité"
   Moi : [développe sur la branche feature/x]

3. Vous : "Commite"
   Moi : "Quel message de commit ? Je suggère : feat(x): description"

4. Vous : "Pousse"
   Moi : "Je pousse sur feature/x. N'oubliez pas de créer une PR !"

5. Vous : "Merge sur main"
   Moi : "Attendez ! Créez d'abord une PR et attendez que les checks passent."
```

### Scénario 2 : Correction de bug

```
1. Vous : "Il y a un bug à corriger"
   Moi : "Créons une branche fix/nom-bug"

2. [correction...]

3. Vous : "Commite"
   Moi : "Message suggéré : fix(nom-bug): correction du problème X"

4. Vous : "Pousse et merge"
   Moi : "Je pousse sur fix/nom-bug. Créez une PR avant de merge !"
```

## 🛡️ Protection contre les erreurs

Les règles me permettent de vous protéger contre :

- ❌ **Commits directs sur main** : Je refuse et vous rappelle le workflow
- ❌ **Messages de commit non conformes** : Je suggère un message conforme
- ❌ **Push sans PR** : Je vous rappelle de créer une PR
- ❌ **Code non vérifié** : Je vérifie toujours avant commit/push
- ❌ **TODO dans le code** : Je refuse de commiter avec des TODO

## 💡 Comment utiliser ces règles

### Pour vous (l'utilisateur)

1. **Laissez-moi vous guider** : Si je vous rappelle de créer une branche, suivez mon conseil
2. **Acceptez mes suggestions** : Mes suggestions de messages de commit sont conformes
3. **Créez les PR** : Quand je vous rappelle de créer une PR, faites-le
4. **Faites confiance aux vérifications** : Si je dis que tout est OK, c'est que c'est OK

### Pour moi (l'IA)

1. **Je dois toujours vérifier** : Avant chaque action Git, je vérifie les règles
2. **Je dois toujours suggérer** : Si quelque chose n'est pas conforme, je suggère la bonne pratique
3. **Je dois toujours refuser** : Si c'est contre les règles, je refuse poliment
4. **Je dois toujours expliquer** : Si je refuse, j'explique pourquoi

## 🎓 Exemples concrets

### ✅ Bon comportement

```
Vous : "Je veux ajouter une fonctionnalité"
Moi : "Créons une branche : git checkout -b feature/nouvelle-fonctionnalite"
[Vous créez la branche]
Moi : "Parfait ! Maintenant développons la fonctionnalité."
```

### ❌ Mauvais comportement (que je vais corriger)

```
Vous : "Commite et pousse sur main"
Moi : "Je ne peux pas pousser directement sur main. Créons d'abord une branche :
       git checkout -b feature/nom-fonctionnalite
       Ensuite on pourra créer une PR pour merge sur main."
```

## 📚 Références

- [Guide du workflow Git/GitHub](./GIT_WORKFLOW.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)


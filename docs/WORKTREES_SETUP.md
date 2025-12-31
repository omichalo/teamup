# Setup Git Worktrees pour workflow multi-agent parallèle

> **⚠️ Option avancée** : Cette approche est recommandée uniquement pour des fonctionnalités **très complexes** avec des parties **vraiment indépendantes**. Pour 90% des cas, l'[approche séquentielle](./WORKFLOW.md#approche-séquentielle-recommandée---90-des-cas) est plus simple et efficace.

Ce guide explique comment configurer et utiliser les worktrees Git pour paralléliser le travail avec plusieurs agents Cursor.

## Quand utiliser les worktrees

**Utilisez les worktrees uniquement si** :

- ✅ Fonctionnalité très complexe avec parties vraiment indépendantes
- ✅ Besoin de tester plusieurs approches en parallèle
- ✅ Deadline très serrée nécessitant vraie parallélisation

**Ne PAS utiliser les worktrees si** :

- ❌ Tâche simple ou moyenne (utilisez l'approche séquentielle)
- ❌ Les agents ont des dépendances (la plupart du temps)
- ❌ Vous débutez avec le workflow multi-agent

## Qu'est-ce qu'un worktree Git ?

Un worktree Git permet d'avoir plusieurs copies du même repository dans des dossiers différents, chacune pouvant être sur une branche différente. C'est idéal pour travailler en parallèle sur plusieurs aspects d'une fonctionnalité.

## Setup initial

### 1. Créer les worktrees

```bash
# Depuis le repository principal
cd /Users/oliviermichalowicz/devs/teamup

# Créer des worktrees pour chaque agent (exemple pour une fonctionnalité "notifications")
git worktree add ../teamup-reposcout feature/notifications-reposcout
git worktree add ../teamup-architect feature/notifications-architect
git worktree add ../teamup-nextjs feature/notifications-nextjs
git worktree add ../teamup-firebase feature/notifications-firebase
git worktree add ../teamup-tester feature/notifications-tester
```

### 2. Ouvrir plusieurs instances de Cursor

1. Ouvrir Cursor
2. File → Open Folder → Sélectionner `../teamup-reposcout`
3. Ouvrir une nouvelle fenêtre Cursor (Cmd+Shift+N sur macOS)
4. File → Open Folder → Sélectionner `../teamup-architect`
5. Répéter pour chaque worktree

### 3. Configurer chaque instance avec un rôle

Dans chaque instance de Cursor, guider l'agent avec le rôle approprié :

**Instance RepoScout** :

```
Tu es l'agent RepoScout. Ton rôle est d'explorer le repository et identifier les patterns existants.
Travaille sur la branche feature/notifications-reposcout.
```

**Instance Architect** :

```
Tu es l'agent Architect. Ton rôle est de planifier l'architecture.
Travaille sur la branche feature/notifications-architect.
```

**Instance NextJS** :

```
Tu es l'agent NextJS. Ton rôle est d'implémenter les composants et routes Next.js.
Travaille sur la branche feature/notifications-nextjs.
```

**Instance Firebase** :

```
Tu es l'agent Firebase. Ton rôle est de configurer Firestore rules et Cloud Functions.
Travaille sur la branche feature/notifications-firebase.
```

**Instance Tester** :

```
Tu es l'agent Tester. Ton rôle est d'écrire les tests.
Travaille sur la branche feature/notifications-tester.
```

## Workflow parallèle typique

### Phase 1 : Exploration (RepoScout)

Dans l'instance RepoScout :

```
Explore le repository pour identifier:
- Comment les notifications sont actuellement gérées
- Quels hooks React existent pour Firebase
- Quels patterns sont utilisés pour le temps réel
Documente tes findings dans docs/temp/notifications-exploration.md
```

### Phase 2 : Planification (Architect)

Dans l'instance Architect (peut commencer en parallèle après que RepoScout ait commencé) :

```
Crée un plan d'architecture pour un système de notifications en temps réel:
- Structure Firestore pour les notifications
- Cloud Function pour créer les notifications
- Hook React pour écouter les notifications
- Composant UI pour afficher les notifications
Base-toi sur les patterns identifiés par RepoScout (voir docs/temp/notifications-exploration.md)
Documente le plan dans docs/temp/notifications-plan.md
```

### Phase 3 : Implémentation (NextJS, Firebase, Tester en parallèle)

**NextJS** (une fois le plan disponible) :

```
Implémente selon le plan dans docs/temp/notifications-plan.md:
- Le hook useNotifications
- Le composant NotificationCenter
- La route API pour marquer comme lues
```

**Firebase** (une fois le plan disponible) :

```
Configure selon le plan dans docs/temp/notifications-plan.md:
- Les Firestore rules pour les notifications (least privilege)
- La Cloud Function de création
- Les index Firestore nécessaires
```

**Tester** (une fois l'implémentation commencée) :

```
Écris les tests pour:
- Le hook useNotifications
- Le composant NotificationCenter
- La Cloud Function
```

### Phase 4 : Merge et Review

Une fois chaque agent terminé :

```bash
# Depuis le repository principal
git checkout feature/notifications-main

# Merger chaque branche
git merge feature/notifications-reposcout
git merge feature/notifications-architect
git merge feature/notifications-nextjs
git merge feature/notifications-firebase
git merge feature/notifications-tester

# Résoudre les conflits si nécessaire
# Puis créer une PR
```

## Gestion des worktrees

### Lister les worktrees

```bash
git worktree list
```

### Supprimer un worktree

```bash
# Supprimer un worktree spécifique
git worktree remove ../teamup-reposcout

# Supprimer tous les worktrees d'une fonctionnalité
git worktree remove ../teamup-reposcout
git worktree remove ../teamup-architect
git worktree remove ../teamup-nextjs
git worktree remove ../teamup-firebase
git worktree remove ../teamup-tester
```

### Nettoyer les branches supprimées

```bash
# Après avoir supprimé les worktrees, supprimer les branches locales
git branch -d feature/notifications-reposcout
git branch -d feature/notifications-architect
# etc.
```

## Bonnes pratiques

1. **Nommage cohérent** : Utiliser un préfixe commun pour les branches d'une même fonctionnalité

   - Exemple : `feature/notifications-*` pour toutes les branches liées aux notifications

2. **Documentation temporaire** : Utiliser `docs/temp/` pour les fichiers de coordination entre agents

   - À supprimer après merge

3. **Synchronisation** : Les agents peuvent se baser sur les mêmes fichiers de documentation

   - RepoScout écrit les findings
   - Architect lit les findings et écrit le plan
   - Les autres agents lisent le plan

4. **Validation** : Chaque agent peut valider son travail indépendamment

   - `npm run check:dev` dans chaque worktree

5. **Merge fréquent** : Merger régulièrement la branche principale dans les branches agents pour éviter les conflits

## Script de setup automatique

Un script est disponible pour automatiser la création des worktrees :

```bash
./scripts/setup-worktrees.sh notifications
```

Ce script :

- Crée les 5 worktrees nécessaires (reposcout, architect, nextjs, firebase, tester)
- Crée les branches correspondantes si elles n'existent pas
- Crée le dossier `docs/temp/` pour la coordination entre agents
- Affiche les instructions pour les prochaines étapes

Voir [scripts/setup-worktrees.sh](../scripts/setup-worktrees.sh) pour le code complet.

## Limitations et considérations

- **Ressources** : Plusieurs instances de Cursor peuvent être gourmandes en mémoire
- **Coordination** : Nécessite une bonne coordination entre les agents
- **Conflits** : Risque de conflits si plusieurs agents modifient les mêmes fichiers
- **Complexité** : Plus de setup et de maintenance

## Quand utiliser les worktrees

**Utilisez les worktrees pour** :

- Fonctionnalités très complexes nécessitant plusieurs aspects (UI + Backend + Firebase + Tests)
- Quand vous avez besoin de vraie parallélisation
- Quand les agents travaillent sur des parties très différentes du code

**Préférez l'approche séquentielle pour** :

- Tâches simples ou moyennes
- Quand les agents doivent se baser sur le travail des autres
- Pour débuter avec le workflow multi-agent

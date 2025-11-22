# Configuration des protections de branche GitHub

Ce guide vous explique comment configurer les protections de branche pour `main` sur GitHub.

## 📋 Étapes

### 1. Accéder aux paramètres de branche

1. Allez sur votre dépôt GitHub : `https://github.com/VOTRE_ORGANISATION/teamup`
2. Cliquez sur **Settings** (en haut à droite, dans le menu du dépôt)
3. Dans le menu de gauche, cliquez sur **Branches**

### 2. Ajouter une règle de protection pour `main`

1. Dans la section **Branch protection rules**, cliquez sur **Add rule** (ou **Add branch protection rule**)
2. Dans le champ **Branch name pattern**, entrez : `main`
3. Configurez les options suivantes :

#### ✅ Require a pull request before merging

- ✅ Cocher **Require a pull request before merging**
- Sous cette option, cocher :
  - ✅ **Require approvals** : `1` (minimum 1 approbation)
  - ✅ **Dismiss stale pull request approvals when new commits are pushed** (optionnel mais recommandé)
  - ✅ **Require review from Code Owners** (si vous avez un fichier CODEOWNERS, sinon laissez décoché)

#### ✅ Require status checks to pass before merging

- ✅ Cocher **Require status checks to pass before merging**
- Cocher **Require branches to be up to date before merging**
- Dans la liste des checks, cocher :
  - ✅ `check / check` (le job CI que nous avons créé)

#### ✅ Autres options recommandées

- ✅ **Require conversation resolution before merging** (optionnel : force la résolution de tous les commentaires)
- ✅ **Require linear history** (optionnel : force un historique linéaire, évite les merge commits)
- ✅ **Include administrators** (recommandé : applique les règles même aux admins)

#### ❌ Options à NE PAS cocher (pour le moment)

- ❌ **Do not allow bypassing the above settings** (laissez décoché pour permettre les hotfixes urgents si nécessaire)
- ❌ **Restrict who can push to matching branches** (laissez décoché pour permettre les pushes directs si nécessaire)

### 3. Sauvegarder la règle

1. Cliquez sur **Create** (ou **Save changes**)
2. La règle est maintenant active !

## 🔍 Vérification

Pour vérifier que la protection est active :

1. Créez une branche de test : `git checkout -b test-branch-protection`
2. Faites un commit : `git commit --allow-empty -m "test"`
3. Essayez de push directement sur `main` : `git push origin test-branch-protection:main`
4. GitHub devrait refuser le push ou vous demander de créer une PR

## 📝 Notes

- Les protections s'appliquent uniquement aux branches qui correspondent au pattern
- Vous pouvez créer plusieurs règles pour différentes branches
- Les administrateurs peuvent toujours bypasser les règles si l'option n'est pas cochée

## 🐛 Dépannage

### Je ne vois pas l'option "Settings"

- Vérifiez que vous avez les droits d'administration sur le dépôt
- Si c'est un dépôt d'organisation, vous devez être owner ou avoir les droits de gestion des paramètres

### Les checks ne s'affichent pas dans la liste

- Les checks n'apparaissent qu'après avoir été exécutés au moins une fois
- Créez une PR de test pour déclencher le workflow CI
- Une fois le workflow exécuté, les checks apparaîtront dans la liste

### Je veux permettre les pushes directs pour les hotfixes

- Laissez décoché **Do not allow bypassing the above settings**
- Les administrateurs pourront toujours bypasser les règles si nécessaire
- Ou créez une branche `hotfix/*` avec des règles moins strictes

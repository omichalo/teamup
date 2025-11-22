# Tester le workflow CI avec une PR de test

Ce guide vous explique comment créer une Pull Request de test pour valider que le workflow CI fonctionne correctement.

## 📋 Étapes

### 1. Créer une branche de test

```bash
# Assurez-vous d'être sur main et à jour
git checkout main
git pull origin main

# Créez une branche de test
git checkout -b test/ci-workflow-validation
```

### 2. Faire une modification de test

Vous pouvez faire une modification mineure, par exemple :

**Option A : Ajouter un commentaire dans un fichier existant**

```bash
# Ouvrez un fichier (par exemple README.md)
# Ajoutez une ligne de commentaire ou de documentation
# Sauvegardez
```

**Option B : Créer un fichier de test**

```bash
# Créez un fichier de test
echo "# Test CI Workflow" > .github/test-ci.md
git add .github/test-ci.md
```

**Option C : Modification dans le code (plus réaliste)**

```bash
# Par exemple, ajouter un commentaire dans un fichier TypeScript
# Ouvrez src/app/api/health/route.ts
# Ajoutez un commentaire explicatif
```

### 3. Commiter et pousser

```bash
# Ajoutez vos modifications
git add .

# Commitez avec un message clair
git commit -m "test: validation du workflow CI"

# Poussez la branche
git push origin test/ci-workflow-validation
```

### 4. Créer la Pull Request sur GitHub

1. Allez sur votre dépôt GitHub : `https://github.com/VOTRE_ORGANISATION/teamup`
2. GitHub devrait afficher une bannière en haut avec un bouton **Compare & pull request**
3. Cliquez sur **Compare & pull request**

**OU** manuellement :

1. Cliquez sur l'onglet **Pull requests**
2. Cliquez sur **New pull request**
3. Sélectionnez :
   - **base**: `main`
   - **compare**: `test/ci-workflow-validation`
4. Cliquez sur **Create pull request**

### 5. Remplir les informations de la PR

- **Titre** : `test: Validation du workflow CI`
- **Description** :
  ```markdown
  ## 🧪 PR de test
  
  Cette PR sert à valider que le workflow CI fonctionne correctement.
  
  ### Vérifications attendues
  - [ ] Lint passe
  - [ ] Type-check passe
  - [ ] Build passe
  - [ ] Aucun TODO détecté
  
  ### Actions après validation
  - Cette PR sera fermée sans merge
  ```

### 6. Vérifier l'exécution du workflow CI

1. Une fois la PR créée, allez dans l'onglet **Checks** (ou **Actions**)
2. Vous devriez voir le workflow **CI - Lint, Type-check and Build** en cours d'exécution
3. Attendez la fin de l'exécution (environ 2-3 minutes)

### 7. Vérifier les résultats

Le workflow devrait :
- ✅ Passer tous les checks (vert)
- ✅ Afficher les résultats de chaque étape :
  - Run linter
  - Run type-check
  - Build application
  - Check for TODO comments

### 8. Si tout passe ✅

1. Ajoutez un commentaire sur la PR : "✅ Workflow CI validé, tout fonctionne !"
2. Fermez la PR sans merge (cliquez sur **Close pull request**)

### 9. Si quelque chose échoue ❌

1. Cliquez sur le check qui a échoué pour voir les détails
2. Vérifiez les logs pour comprendre l'erreur
3. Corrigez le problème dans votre branche
4. Poussez à nouveau : `git push origin test/ci-workflow-validation`
5. Le workflow se relancera automatiquement

## 🔍 Vérifications détaillées

### Vérifier les logs du workflow

1. Allez dans l'onglet **Actions** de GitHub
2. Cliquez sur le workflow **CI - Lint, Type-check and Build**
3. Cliquez sur la dernière exécution
4. Cliquez sur le job **check**
5. Explorez chaque étape pour voir les détails

### Vérifier que les checks apparaissent dans la PR

1. Sur la page de la PR, vous devriez voir une section **Checks** en bas
2. Tous les checks doivent être ✅ verts
3. Si un check est ❌ rouge, cliquez dessus pour voir les détails

### Vérifier que la protection de branche fonctionne

1. Essayez de merge la PR directement (sans approbation)
2. GitHub devrait bloquer le merge avec un message indiquant que les checks doivent passer
3. Si vous avez configuré l'approbation obligatoire, vous verrez aussi un message indiquant qu'une approbation est requise

## 🐛 Dépannage

### Le workflow ne se déclenche pas

- Vérifiez que le fichier `.github/workflows/ci.yml` est bien présent dans le dépôt
- Vérifiez que la branche est bien poussée sur GitHub
- Vérifiez que la PR est bien créée (pas juste un push de branche)

### Les checks ne s'affichent pas dans la PR

- Attendez quelques secondes, GitHub peut prendre du temps pour afficher les checks
- Rafraîchissez la page
- Vérifiez dans l'onglet **Actions** que le workflow s'est bien exécuté

### Le workflow échoue avec une erreur de permission

- Vérifiez que les workflows GitHub Actions sont activés dans les paramètres du dépôt
- Settings → Actions → General → Vérifiez que "Allow all actions and reusable workflows" est sélectionné

## ✅ Checklist de validation

- [ ] La branche de test est créée
- [ ] La PR est créée sur GitHub
- [ ] Le workflow CI se déclenche automatiquement
- [ ] Tous les checks passent (lint, type-check, build)
- [ ] Aucun TODO n'est détecté
- [ ] Les checks apparaissent dans la PR
- [ ] La protection de branche bloque le merge si les checks échouent (test optionnel)

Une fois toutes ces étapes validées, votre workflow CI est opérationnel ! 🎉


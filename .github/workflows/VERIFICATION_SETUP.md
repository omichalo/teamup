# Vérification de la configuration du workflow Git/GitHub

Ce guide vous permet de vérifier que tout est correctement configuré pour le workflow Git/GitHub.

## ✅ Checklist de vérification

### 1. Protection de la branche main (✅ Vous l'avez déjà fait)

- [x] **Protection activée sur GitHub** (vous l'avez confirmé)
- [ ] Vérifier que les règles suivantes sont activées :
  - [ ] Require a pull request before merging
  - [ ] Require approvals (minimum 1)
  - [ ] Require status checks to pass before merging
  - [ ] Require branches to be up to date before merging

**Comment vérifier** :
1. GitHub → Settings → Branches
2. Cliquez sur la règle pour `main`
3. Vérifiez que les options ci-dessus sont cochées

---

### 2. Workflows GitHub Actions

#### 2.1 Workflow CI (`ci.yml`)

- [ ] Le fichier `.github/workflows/ci.yml` existe
- [ ] Le workflow se déclenche sur les Pull Requests
- [ ] Le workflow vérifie : lint, type-check, build, TODO

**Comment vérifier** :
```bash
# Vérifier que le fichier existe
ls -la .github/workflows/ci.yml

# Vérifier le contenu
cat .github/workflows/ci.yml
```

**Test** : Créer une PR de test et vérifier que le workflow CI s'exécute

---

#### 2.2 Workflow de déploiement (`deploy-production.yml`)

- [ ] Le fichier `.github/workflows/deploy-production.yml` existe
- [ ] Le workflow se déclenche sur les pushes sur `main`
- [ ] Le workflow déploie sur Firebase App Hosting

**Comment vérifier** :
```bash
# Vérifier que le fichier existe
ls -la .github/workflows/deploy-production.yml
```

**Test** : Après un merge sur main, vérifier dans l'onglet Actions que le workflow s'exécute

---

#### 2.3 Workflow Firestore (`deploy-firestore.yml`)

- [ ] Le fichier `.github/workflows/deploy-firestore.yml` existe
- [ ] Le workflow se déclenche quand `firestore.rules` ou `firestore.indexes.json` sont modifiés

**Comment vérifier** :
```bash
# Vérifier que le fichier existe
ls -la .github/workflows/deploy-firestore.yml
```

---

### 3. Secrets GitHub

#### 3.1 Secret `FIREBASE_SERVICE_ACCOUNT`

- [ ] Le secret existe dans GitHub
- [ ] Le secret contient un JSON valide de service account
- [ ] Le service account a les permissions nécessaires :
  - [ ] `roles/firebase.admin` (recommandé) OU
  - [ ] `roles/firebaserules.admin` + `roles/datastore.user` + `roles/datastore.indexAdmin` + `roles/serviceusage.serviceUsageAdmin`

**Comment vérifier** :
1. GitHub → Settings → Secrets and variables → Actions
2. Vérifier que `FIREBASE_SERVICE_ACCOUNT` existe
3. Vérifier dans Google Cloud Console que le service account a les bons rôles

**Test** : Déclencher manuellement le workflow Firestore pour vérifier

---

### 4. Configuration locale

#### 4.1 Fichier `.cursorrules`

- [ ] Le fichier `.cursorrules` contient les règles du workflow Git/GitHub
- [ ] Les règles sont à jour

**Comment vérifier** :
```bash
# Vérifier que le fichier existe et contient les règles
grep -i "workflow git" .cursorrules
grep -i "pull request" .cursorrules
```

---

#### 4.2 Scripts npm

- [ ] `npm run check` fonctionne (lint + type-check + build)
- [ ] `npm run check:dev` fonctionne (lint + type-check sans build)

**Comment vérifier** :
```bash
npm run check:dev
npm run check
```

---

### 5. Structure des fichiers

- [ ] Tous les fichiers de workflow sont présents :
  - [ ] `.github/workflows/ci.yml`
  - [ ] `.github/workflows/deploy-production.yml`
  - [ ] `.github/workflows/deploy-firestore.yml`
  - [ ] `.github/workflows/GIT_WORKFLOW.md`
  - [ ] `.github/workflows/README.md`

**Comment vérifier** :
```bash
ls -la .github/workflows/
```

---

## 🧪 Tests à effectuer

### Test 1 : Workflow CI sur une PR

1. Créer une branche de test :
   ```bash
   git checkout -b test/ci-workflow
   ```

2. Faire une petite modification (ex: ajouter un commentaire)

3. Commiter et pousser :
   ```bash
   git add .
   git commit -m "test: vérification du workflow CI"
   git push origin test/ci-workflow
   ```

4. Créer une PR sur GitHub

5. Vérifier que :
   - ✅ Le workflow CI se déclenche
   - ✅ Les checks apparaissent dans la PR
   - ✅ Tous les checks passent

---

### Test 2 : Protection de branche

1. Essayer de push directement sur main (devrait échouer) :
   ```bash
   git checkout main
   git checkout -b test-direct-push
   # Faire une modification
   git commit --allow-empty -m "test"
   git push origin test-direct-push:main
   ```

2. Vérifier que GitHub refuse le push ou demande une PR

---

### Test 3 : Déploiement automatique

1. Merge une PR sur main (après validation)

2. Vérifier dans l'onglet Actions que :
   - ✅ Le workflow CI s'exécute
   - ✅ Le workflow de déploiement s'exécute
   - ✅ Le déploiement réussit

---

## 🔍 Commandes de vérification rapide

```bash
# Vérifier tous les workflows
ls -la .github/workflows/*.yml

# Vérifier que les workflows sont valides (syntaxe YAML)
for file in .github/workflows/*.yml; do
  echo "Vérification de $file"
  python3 -c "import yaml; yaml.safe_load(open('$file'))" && echo "✅ OK" || echo "❌ Erreur"
done

# Vérifier les scripts npm
npm run check:dev
npm run check

# Vérifier les règles cursor
grep -i "workflow" .cursorrules
```

---

## 🐛 Problèmes courants

### Le workflow CI ne se déclenche pas

- Vérifier que le fichier `.github/workflows/ci.yml` est bien dans le dépôt
- Vérifier que GitHub Actions est activé (Settings → Actions → General)
- Vérifier que la PR est bien créée (pas juste un push de branche)

### Les checks ne s'affichent pas dans la PR

- Attendre quelques secondes (GitHub peut prendre du temps)
- Vérifier dans l'onglet Actions que le workflow s'est bien exécuté
- Les checks n'apparaissent qu'après la première exécution

### Le déploiement échoue

- Vérifier que le secret `FIREBASE_SERVICE_ACCOUNT` est bien configuré
- Vérifier que le service account a les permissions nécessaires
- Vérifier les logs dans l'onglet Actions

---

## ✅ Résumé

Une fois toutes les vérifications effectuées, vous devriez avoir :

- ✅ Protection de branche main activée
- ✅ Workflows GitHub Actions configurés et fonctionnels
- ✅ Secrets GitHub configurés
- ✅ `.cursorrules` à jour
- ✅ Scripts npm fonctionnels

Si tout est ✅, votre workflow est prêt ! 🎉


# Configuration des secrets FFTT avec Cloud Secret Manager

## 🔐 Sécurité

Pour sécuriser les identifiants FFTT, nous utilisons **Cloud Secret Manager** au lieu de les stocker en clair dans `apphosting.yaml`.

## 📋 Étapes de configuration

### 1. Créer les secrets dans Cloud Secret Manager

#### Via la console Google Cloud

1. **Accéder à Cloud Secret Manager**

   - Ouvrez : https://console.cloud.google.com/security/secret-manager?project=sqyping-teamup
   - Ou via Firebase Console → Project Settings → Service Accounts

2. **Créer le secret pour ID_FFTT**

   - Cliquez sur **"CREATE SECRET"** ou **"CRÉER UN SECRET"**
   - **Nom du secret** : `fftt-id-secret`
   - **Valeur du secret** : Votre numéro de licence FFTT (ex: `SW251`)
   - Cliquez sur **"CREATE SECRET"**

3. **Créer le secret pour PWD_FFTT**
   - Cliquez sur **"CREATE SECRET"**
   - **Nom du secret** : `fftt-pwd-secret`
   - **Valeur du secret** : Votre mot de passe FFTT (ex: `XpZ31v56Jr`)
   - Cliquez sur **"CREATE SECRET"**

#### Via la ligne de commande (gcloud CLI)

```bash
# S'assurer d'être connecté et sur le bon projet
gcloud config set project sqyping-teamup

# Créer le secret pour ID_FFTT
echo -n "SW251" | gcloud secrets create fftt-id-secret \
  --data-file=- \
  --replication-policy="automatic"

# Créer le secret pour PWD_FFTT
echo -n "XpZ31v56Jr" | gcloud secrets create fftt-pwd-secret \
  --data-file=- \
  --replication-policy="automatic"
```

### 2. Accorder les permissions à Firebase App Hosting (MÉTHODE OFFICIELLE - RECOMMANDÉE)

**⚠️ IMPORTANT : Utilisez la commande Firebase CLI officielle !**

Firebase App Hosting fournit une commande CLI dédiée pour accorder l'accès aux secrets. C'est la méthode recommandée et la plus simple.

#### Via Firebase CLI (Méthode recommandée)

1. **Trouver le nom du backend App Hosting** :

```bash
firebase apphosting:backends:list
```

2. **Accorder l'accès aux secrets** (remplacez `teamup` par le nom de votre backend) :

```bash
# Accorder l'accès aux deux secrets en une seule commande
firebase apphosting:secrets:grantaccess -b teamup fftt-id-secret,fftt-pwd-secret

# Ou séparément
firebase apphosting:secrets:grantaccess -b teamup fftt-id-secret
firebase apphosting:secrets:grantaccess -b teamup fftt-pwd-secret
```

**Note :** La syntaxe correcte est `firebase apphosting:secrets:grantaccess -b <backend> <secret1,secret2,...>` où les noms des secrets sont passés comme arguments, pas comme options.

Cette commande configure automatiquement toutes les permissions nécessaires pour que votre backend App Hosting puisse accéder aux secrets.

---

### 2b. Accorder les permissions manuellement (Alternative)

Firebase App Hosting doit avoir accès aux secrets pour pouvoir les lire au runtime.

#### Méthode 1 : Trouver le service account exact (Si la méthode CLI ne fonctionne pas)

Le service account Firebase App Hosting peut avoir différents noms selon la configuration. Pour trouver le bon :

**Via la console Google Cloud :**

1. Allez dans **IAM & Admin** → **Service Accounts**
   - URL : https://console.cloud.google.com/iam-admin/serviceaccounts?project=sqyping-teamup
2. Recherchez les comptes contenant `firebase-apphosting` ou `apphosting`
3. Notez le nom complet du service account (ex: `service-XXXXX@gcp-sa-firebase-apphosting.iam.gserviceaccount.com`)

**Via la ligne de commande (gcloud CLI) :**

```bash
# Lister tous les service accounts liés à Firebase App Hosting
gcloud iam service-accounts list --project=sqyping-teamup \
  --filter="email:*firebase-apphosting* OR email:*apphosting*"

# Ou chercher dans les IAM bindings
gcloud projects get-iam-policy sqyping-teamup \
  --flatten="bindings[].members" \
  --filter="bindings.members:*firebase* OR bindings.members:*apphosting*" \
  --format="table(bindings.members)"
```

#### Méthode 2 : Utiliser le service account par défaut de Cloud Run

Si Firebase App Hosting utilise Cloud Run (ce qui est généralement le cas), vous pouvez utiliser le service account par défaut du projet :

**Nom du service account :** `sqyping-teamup@appspot.gserviceaccount.com`

Ou le service account compute par défaut :
**Nom du service account :** `567392028186-compute@developer.gserviceaccount.com`
(Remplacez `567392028186` par votre project number)

#### Via la console Google Cloud

1. **Pour chaque secret créé** (`fftt-id-secret` et `fftt-pwd-secret`) :
   - Cliquez sur le secret
   - Allez dans l'onglet **"PERMISSIONS"** ou **"PERMISSIONS"**
   - Cliquez sur **"ADD PRINCIPAL"** ou **"AJOUTER UN PRINCIPAL"**
   - **Principal** : Essayez dans cet ordre :
     1. `service-567392028186@gcp-sa-firebase-apphosting.iam.gserviceaccount.com`
     2. `sqyping-teamup@appspot.gserviceaccount.com`
     3. `567392028186-compute@developer.gserviceaccount.com`
     4. Le service account que vous avez trouvé via la Méthode 1
   - **Rôle** : `Secret Manager Secret Accessor` (ou `roles/secretmanager.secretAccessor`)
   - Cliquez sur **"SAVE"**

#### Via la ligne de commande (gcloud CLI)

**Option 1 : Service account Firebase App Hosting spécifique**

```bash
# Accorder l'accès au secret ID_FFTT
gcloud secrets add-iam-policy-binding fftt-id-secret \
  --member="serviceAccount:service-567392028186@gcp-sa-firebase-apphosting.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup

# Accorder l'accès au secret PWD_FFTT
gcloud secrets add-iam-policy-binding fftt-pwd-secret \
  --member="serviceAccount:service-567392028186@gcp-sa-firebase-apphosting.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup
```

**Option 2 : Service account App Engine par défaut (si Option 1 ne fonctionne pas)**

```bash
# Accorder l'accès au secret ID_FFTT
gcloud secrets add-iam-policy-binding fftt-id-secret \
  --member="serviceAccount:sqyping-teamup@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup

# Accorder l'accès au secret PWD_FFTT
gcloud secrets add-iam-policy-binding fftt-pwd-secret \
  --member="serviceAccount:sqyping-teamup@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup
```

**Option 3 : Service account Compute Engine par défaut (si les autres ne fonctionnent pas)**

```bash
# Trouver d'abord le project number
PROJECT_NUMBER=$(gcloud projects describe sqyping-teamup --format="value(projectNumber)")

# Accorder l'accès au secret ID_FFTT
gcloud secrets add-iam-policy-binding fftt-id-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup

# Accorder l'accès au secret PWD_FFTT
gcloud secrets add-iam-policy-binding fftt-pwd-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup
```

#### Méthode 3 : Utiliser le compte de service actuel (si vous êtes connecté)

Si vous êtes connecté avec un compte qui a les droits, vous pouvez aussi utiliser votre compte :

```bash
# Accorder l'accès via votre compte actuel
gcloud secrets add-iam-policy-binding fftt-id-secret \
  --member="user:$(gcloud config get-value account)" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup

gcloud secrets add-iam-policy-binding fftt-pwd-secret \
  --member="user:$(gcloud config get-value account)" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup
```

#### Vérifier les permissions actuelles

Pour voir qui a accès à un secret :

```bash
# Voir les permissions du secret ID_FFTT
gcloud secrets get-iam-policy fftt-id-secret --project=sqyping-teamup

# Voir les permissions du secret PWD_FFTT
gcloud secrets get-iam-policy fftt-pwd-secret --project=sqyping-teamup
```

### 3. Vérifier la configuration dans `apphosting.yaml`

Le fichier `apphosting.yaml` est déjà configuré pour utiliser ces secrets :

```yaml
env:
  - variable: ID_FFTT
    secret: fftt-id-secret
    availability:
      - RUNTIME

  - variable: PWD_FFTT
    secret: fftt-pwd-secret
    availability:
      - RUNTIME
```

### 4. Déployer

Une fois les secrets créés et les permissions accordées :

1. Commitez le fichier `apphosting.yaml` (s'il a été modifié)
2. Poussez sur GitHub
3. Firebase App Hosting détectera automatiquement les changements et utilisera les secrets lors du prochain déploiement

## ✅ Vérification

Pour vérifier que les secrets sont bien accessibles :

1. **Vérifier dans Cloud Secret Manager**

   - Les secrets `fftt-id-secret` et `fftt-pwd-secret` doivent être visibles
   - Le statut doit être **"Enabled"**

2. **Vérifier les permissions**

   - Les secrets doivent avoir le service account Firebase App Hosting dans leurs permissions

3. **Vérifier les logs de déploiement**
   - Lors du déploiement, vérifiez les logs pour s'assurer qu'il n'y a pas d'erreur de permission
   - Les variables `ID_FFTT` et `PWD_FFTT` doivent être disponibles au runtime

## 🔄 Mettre à jour un secret

Si vous devez mettre à jour la valeur d'un secret :

```bash
# Mettre à jour ID_FFTT
echo -n "NOUVEAU_ID_FFTT" | gcloud secrets versions add fftt-id-secret \
  --data-file=-

# Mettre à jour PWD_FFTT
echo -n "NOUVEAU_PWD_FFTT" | gcloud secrets versions add fftt-pwd-secret \
  --data-file=-
```

Après la mise à jour, un nouveau déploiement sera nécessaire pour que les changements prennent effet.

## 🔗 Liens utiles

- [Cloud Secret Manager Console](https://console.cloud.google.com/security/secret-manager?project=sqyping-teamup)
- [Documentation Firebase App Hosting - Secrets](https://firebase.google.com/docs/app-hosting/configure#secret-parameters)
- [Documentation Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)

## ⚠️ Notes importantes

- Les secrets sont chiffrés et stockés de manière sécurisée
- Les valeurs des secrets ne sont jamais exposées dans les logs ou le code
- Les secrets sont accessibles uniquement au runtime (pas au build)
- Assurez-vous que le service account Firebase App Hosting a bien les permissions `Secret Manager Secret Accessor`

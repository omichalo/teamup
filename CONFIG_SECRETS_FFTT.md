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

### 2. Accorder les permissions à Firebase App Hosting

Firebase App Hosting doit avoir accès aux secrets pour pouvoir les lire au runtime.

#### Via la console Google Cloud

1. **Pour chaque secret créé** (`fftt-id-secret` et `fftt-pwd-secret`) :
   - Cliquez sur le secret
   - Allez dans l'onglet **"PERMISSIONS"** ou **"PERMISSIONS"**
   - Cliquez sur **"ADD PRINCIPAL"** ou **"AJOUTER UN PRINCIPAL"**
   - **Principal** : `service-567392028186@gcp-sa-firebase-apphosting.iam.gserviceaccount.com`
     - (Remplacez `567392028186` par votre `messagingSenderId` si différent)
   - **Rôle** : `Secret Manager Secret Accessor`
   - Cliquez sur **"SAVE"**

#### Via la ligne de commande (gcloud CLI)

```bash
# Accorder l'accès au secret ID_FFTT
gcloud secrets add-iam-policy-binding fftt-id-secret \
  --member="serviceAccount:service-567392028186@gcp-sa-firebase-apphosting.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Accorder l'accès au secret PWD_FFTT
gcloud secrets add-iam-policy-binding fftt-pwd-secret \
  --member="serviceAccount:service-567392028186@gcp-sa-firebase-apphosting.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Note** : Si vous ne connaissez pas le service account exact, vous pouvez le trouver via :
```bash
gcloud projects get-iam-policy sqyping-teamup \
  --flatten="bindings[].members" \
  --filter="bindings.members:*firebase-apphosting*"
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


# 🔧 Dépannage : Problèmes d'accès aux secrets Cloud Secret Manager

## ❌ Erreur : "Permission denied" ou "Service account not found"

Si vous rencontrez des erreurs lors de l'octroi des permissions, suivez ces étapes :

### 1. Vérifier que les secrets existent

```bash
# Lister tous les secrets
gcloud secrets list --project=sqyping-teamup

# Vérifier qu'ils sont bien créés
gcloud secrets describe fftt-id-secret --project=sqyping-teamup
gcloud secrets describe fftt-pwd-secret --project=sqyping-teamup
```

### 2. Trouver le service account Firebase App Hosting

Le service account peut avoir différents noms. Essayez de le trouver :

```bash
# Option A : Chercher dans les service accounts
gcloud iam service-accounts list --project=sqyping-teamup \
  --filter="email:*firebase* OR email:*apphosting*"

# Option B : Chercher dans les IAM bindings
gcloud projects get-iam-policy sqyping-teamup \
  --flatten="bindings[].members" \
  --format="table(bindings.members)" | grep -i firebase

# Option C : Vérifier les service accounts du projet
gcloud iam service-accounts list --project=sqyping-teamup
```

### 3. Solutions alternatives

#### Solution A : Utiliser le service account App Engine par défaut

C'est généralement le plus simple et le plus fiable :

```bash
gcloud secrets add-iam-policy-binding fftt-id-secret \
  --member="serviceAccount:sqyping-teamup@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup

gcloud secrets add-iam-policy-binding fftt-pwd-secret \
  --member="serviceAccount:sqyping-teamup@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup
```

#### Solution B : Utiliser le project number

```bash
# Récupérer le project number
PROJECT_NUMBER=$(gcloud projects describe sqyping-teamup --format="value(projectNumber)")
echo "Project Number: $PROJECT_NUMBER"

# Utiliser le service account compute par défaut
gcloud secrets add-iam-policy-binding fftt-id-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup

gcloud secrets add-iam-policy-binding fftt-pwd-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=sqyping-teamup
```

#### Solution C : Accorder les permissions au niveau du projet

Si les solutions ci-dessus ne fonctionnent pas, vous pouvez accorder les permissions au niveau du projet :

```bash
# Accorder le rôle Secret Manager Secret Accessor au niveau du projet
gcloud projects add-iam-policy-binding sqyping-teamup \
  --member="serviceAccount:sqyping-teamup@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Vérifier les permissions

Après avoir accordé les permissions, vérifiez qu'elles sont bien appliquées :

```bash
# Vérifier les permissions du secret ID_FFTT
gcloud secrets get-iam-policy fftt-id-secret --project=sqyping-teamup

# Vérifier les permissions du secret PWD_FFTT
gcloud secrets get-iam-policy fftt-pwd-secret --project=sqyping-teamup
```

Vous devriez voir une entrée avec `roles/secretmanager.secretAccessor` pour le service account.

### 5. Vérifier que vous avez les droits nécessaires

Assurez-vous que votre compte a les droits pour modifier les secrets :

```bash
# Vérifier vos rôles
gcloud projects get-iam-policy sqyping-teamup \
  --flatten="bindings[].members" \
  --filter="bindings.members:$(gcloud config get-value account)"

# Vous devez avoir au moins un de ces rôles :
# - Owner
# - Editor
# - Security Admin
# - Secret Manager Admin
```

### 6. Activer l'API Secret Manager

Assurez-vous que l'API Secret Manager est activée :

```bash
# Vérifier si l'API est activée
gcloud services list --enabled --project=sqyping-teamup | grep secretmanager

# Si elle n'est pas activée, l'activer
gcloud services enable secretmanager.googleapis.com --project=sqyping-teamup
```

### 7. Créer les secrets si nécessaire

Si les secrets n'existent pas, créez-les :

```bash
# Créer le secret ID_FFTT
echo -n "SW251" | gcloud secrets create fftt-id-secret \
  --data-file=- \
  --replication-policy="automatic" \
  --project=sqyping-teamup

# Créer le secret PWD_FFTT
echo -n "XpZ31v56Jr" | gcloud secrets create fftt-pwd-secret \
  --data-file=- \
  --replication-policy="automatic" \
  --project=sqyping-teamup
```

⚠️ **Remplacez `SW251` et `XpZ31v56Jr` par vos vraies valeurs !**

## 🔍 Vérification finale

Une fois les permissions accordées, testez l'accès :

```bash
# Tester l'accès au secret (en tant que service account)
gcloud secrets versions access latest --secret="fftt-id-secret" --project=sqyping-teamup
```

Si cette commande fonctionne, les permissions sont correctement configurées.

## 📞 Support supplémentaire

Si le problème persiste :

1. Vérifiez les logs de déploiement Firebase App Hosting pour voir l'erreur exacte
2. Consultez la documentation Firebase App Hosting : https://firebase.google.com/docs/app-hosting/configure#secret-parameters
3. Vérifiez que Firebase App Hosting est bien activé pour votre projet


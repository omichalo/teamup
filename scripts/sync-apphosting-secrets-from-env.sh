#!/usr/bin/env bash
# Synchronise les secrets App Hosting staging depuis .env.local (+ overrides staging).
# Ne logue jamais les valeurs. Ne pas committer .env.local / .env.staging.
#
# Usage:
#   ./scripts/sync-apphosting-secrets-from-env.sh
#   DRY_RUN=1 ./scripts/sync-apphosting-secrets-from-env.sh
#
# Fichiers:
#   .env.local   — secrets communs (local + base pour staging)
#   .env.staging — overrides staging uniquement (ex. STRIPE_WEBHOOK_SECRET différent du local)

set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.local}"
STAGING_OVERRIDES_FILE="${STAGING_OVERRIDES_FILE:-.env.staging}"
PROJECT="${PROJECT:-sqyping-teamup-dev}"
BACKEND="${BACKEND:-teamup-staging}"
LOCATION="${LOCATION:-us-east4}"
DRY_RUN="${DRY_RUN:-0}"

# Clés lues uniquement depuis .env.staging (jamais depuis .env.local)
STAGING_ONLY_KEYS=(
  STRIPE_WEBHOOK_SECRET
)

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Fichier introuvable: $ENV_FILE"
  exit 1
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "❌ firebase CLI requis (npm install -g firebase-tools)"
  exit 1
fi

read_env_from_file() {
  local file="$1"
  local key="$2"
  local line
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | head -1 || true)"
  if [ -z "$line" ]; then
    return 1
  fi
  local value="${line#*=}"
  value="${value#\"}"
  value="${value%\"}"
  printf '%s' "$value"
}

is_staging_only_key() {
  local key="$1"
  local k
  for k in "${STAGING_ONLY_KEYS[@]}"; do
    if [ "$k" = "$key" ]; then
      return 0
    fi
  done
  return 1
}

get_env() {
  local key="$1"
  local value=""

  if is_staging_only_key "$key"; then
    if [ -f "$STAGING_OVERRIDES_FILE" ]; then
      if value="$(read_env_from_file "$STAGING_OVERRIDES_FILE" "$key")"; then
        printf '%s' "$value"
        return 0
      fi
    fi
    return 1
  fi

  if value="$(read_env_from_file "$ENV_FILE" "$key")"; then
    printf '%s' "$value"
    return 0
  fi

  if [ -f "$STAGING_OVERRIDES_FILE" ]; then
    if value="$(read_env_from_file "$STAGING_OVERRIDES_FILE" "$key")"; then
      printf '%s' "$value"
      return 0
    fi
  fi

  return 1
}

set_secret_from_env() {
  local secret_name="$1"
  local env_key="$2"
  local value
  local source_hint="$ENV_FILE"

  if is_staging_only_key "$env_key"; then
    source_hint="$STAGING_OVERRIDES_FILE"
  fi

  if ! value="$(get_env "$env_key")"; then
    if is_staging_only_key "$env_key"; then
      echo "⚠️  $env_key absent de $STAGING_OVERRIDES_FILE — secret $secret_name ignoré"
      echo "    (volontairement séparé du local : ne pas le mettre dans .env.local)"
    else
      echo "⚠️  $env_key absent — secret $secret_name ignoré"
    fi
    return 0
  fi

  if [ -z "$value" ]; then
    echo "⚠️  $env_key vide — secret $secret_name ignoré"
    return 0
  fi

  if [ "$DRY_RUN" = "1" ]; then
    echo "🔍 [dry-run] $secret_name ← $env_key ($source_hint)"
    return 0
  fi

  echo -n "$value" | firebase apphosting:secrets:set "$secret_name" \
    --project "$PROJECT" \
    --data-file - \
    --non-interactive

  firebase apphosting:secrets:grantaccess "$secret_name" \
    --project "$PROJECT" \
    --backend "$BACKEND" \
    --location "$LOCATION" \
    --non-interactive

  echo "✅ $secret_name"
}

set_secret_from_value() {
  local secret_name="$1"
  local value="$2"

  if [ "$DRY_RUN" = "1" ]; then
    echo "🔍 [dry-run] $secret_name ← (valeur générée)"
    return 0
  fi

  echo -n "$value" | firebase apphosting:secrets:set "$secret_name" \
    --project "$PROJECT" \
    --data-file - \
    --non-interactive

  firebase apphosting:secrets:grantaccess "$secret_name" \
    --project "$PROJECT" \
    --backend "$BACKEND" \
    --location "$LOCATION" \
    --non-interactive

  echo "✅ $secret_name (généré)"
}

echo "🔐 Sync secrets App Hosting"
echo "   Projet:    $PROJECT"
echo "   Backend:   $BACKEND"
echo "   Source:    $ENV_FILE"
if [ -f "$STAGING_OVERRIDES_FILE" ]; then
  echo "   Overrides: $STAGING_OVERRIDES_FILE"
else
  echo "   Overrides: (aucun — créez $STAGING_OVERRIDES_FILE pour STRIPE_WEBHOOK_SECRET staging)"
fi
if [ "$DRY_RUN" = "1" ]; then
  echo "   Mode:      dry-run"
fi
echo ""

set_secret_from_env fftt-id-secret ID_FFTT
set_secret_from_env fftt-pwd-secret PWD_FFTT
set_secret_from_env SMTP_USER SMTP_USER
set_secret_from_env SMTP_PASS SMTP_PASS
set_secret_from_env SMTP_HOST SMTP_HOST
set_secret_from_env SMTP_PORT SMTP_PORT
set_secret_from_env DISCORD_TOKEN DISCORD_TOKEN
set_secret_from_env DISCORD_PUBLIC_KEY DISCORD_PUBLIC_KEY
set_secret_from_env DISCORD_APPLICATION_ID DISCORD_APPLICATION_ID
set_secret_from_env DISCORD_SERVER_ID DISCORD_SERVER_ID
set_secret_from_env STRIPE_SECRET_KEY STRIPE_SECRET_KEY
set_secret_from_env STRIPE_WEBHOOK_SECRET STRIPE_WEBHOOK_SECRET

if value="$(get_env CSRF_SECRET 2>/dev/null || true)" && [ -n "$value" ]; then
  set_secret_from_env CSRF_SECRET CSRF_SECRET
else
  echo "ℹ️  CSRF_SECRET absent — génération d'une nouvelle valeur"
  if [ "$DRY_RUN" = "1" ]; then
    set_secret_from_value CSRF_SECRET "(generated)"
  else
    csrf_value="$(openssl rand -hex 32)"
    set_secret_from_value CSRF_SECRET "$csrf_value"
    echo "   Ajoutez CSRF_SECRET dans $ENV_FILE si vous voulez la même valeur en local."
  fi
fi

echo ""
echo "✅ Synchronisation terminée."
echo ""
echo "Stripe webhook :"
echo "  - Local   → .env.local (whsec_ de « stripe listen »)"
echo "  - Staging → .env.staging (whsec_ du webhook Dashboard staging)"
echo "  - Ne pas mélanger les deux dans le même fichier."

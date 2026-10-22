#!/usr/bin/env bash
# Smoke lecture seule après déploiement staging (App Hosting).
# N'écrit aucune donnée ; ne cible jamais la production.

set -euo pipefail

STAGING_URL="${STAGING_URL:-https://teamup-staging--sqyping-teamup-dev.us-east4.hosted.app}"
HEALTH_URL="${STAGING_URL%/}/api/health"

echo "🔍 Smoke staging (lecture seule): ${HEALTH_URL}"

HTTP_CODE=$(curl -sS -o /tmp/teamup-staging-health.json -w "%{http_code}" --max-time 30 "${HEALTH_URL}" || true)

if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "❌ Health check failed (HTTP ${HTTP_CODE})"
  cat /tmp/teamup-staging-health.json 2>/dev/null || true
  exit 1
fi

echo "✅ Staging health OK (HTTP 200)"
cat /tmp/teamup-staging-health.json
echo

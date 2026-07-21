#!/usr/bin/env bash
# Hook Cursor (stop) : vérifie le serveur de dev et relance l'agent si besoin.
set -euo pipefail

input="$(cat)"
status="$(echo "$input" | jq -r '.status // "completed"')"
loop_count="$(echo "$input" | jq -r '.loop_count // 0')"

PORT="${TEAMUP_DEV_PORT:-3000}"
HEALTH_URL="http://localhost:${PORT}/api/health"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENSURE_SCRIPT="${SCRIPT_DIR}/../../scripts/ensure-dev-server.sh"

noop() {
  echo '{}'
}

if [[ "${TEAMUP_SKIP_DEV_AUTOSTART:-}" == "1" ]]; then
  noop
  exit 0
fi

if [[ "$status" != "completed" ]] || [[ "$loop_count" -ge 2 ]]; then
  noop
  exit 0
fi

if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
  noop
  exit 0
fi

if bash "$ENSURE_SCRIPT" > /dev/null 2>&1; then
  noop
  exit 0
fi

jq -n --arg port "$PORT" '{
  followup_message: (
    "Le serveur de dev ne répond pas sur le port " + $port + ". "
    + "Relance-le en arrière-plan dans un terminal dédié : "
    + "lsof -ti:" + $port + " | xargs kill -9 2>/dev/null; npm run dev. "
    + "Attends que /api/health réponde, puis arrête-toi."
  )
}'

#!/usr/bin/env bash
# Démarre npm run dev si le port 3000 ne répond pas encore.
# Utilisé par les hooks Cursor et manuellement via npm run dev:ensure.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${TEAMUP_DEV_PORT:-3000}"
HEALTH_URL="http://localhost:${PORT}/api/health"
PID_FILE="${ROOT_DIR}/.dev-server.pid"
LOG_FILE="${ROOT_DIR}/.dev-server.log"

if [[ "${TEAMUP_SKIP_DEV_AUTOSTART:-}" == "1" ]]; then
  exit 0
fi

is_healthy() {
  curl -sf "$HEALTH_URL" > /dev/null 2>&1
}

port_in_use() {
  lsof -ti:"${PORT}" > /dev/null 2>&1
}

wait_for_health() {
  local attempts="${1:-30}"
  for _ in $(seq 1 "$attempts"); do
    if is_healthy; then
      return 0
    fi
    sleep 1
  done
  return 1
}

cleanup_stale_pid() {
  if [[ ! -f "$PID_FILE" ]]; then
    return
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$PID_FILE"
  fi
}

cleanup_stale_pid

if is_healthy; then
  exit 0
fi

if port_in_use; then
  if wait_for_health 30; then
    exit 0
  fi
  echo "[ensure-dev-server] Port ${PORT} occupé mais /api/health ne répond pas."
  exit 1
fi

echo "[ensure-dev-server] Démarrage de npm run dev (port ${PORT})..."
nohup npm run dev >> "$LOG_FILE" 2>&1 &
echo "$!" > "$PID_FILE"

if wait_for_health 30; then
  echo "[ensure-dev-server] Prêt : http://localhost:${PORT}"
  exit 0
fi

echo "[ensure-dev-server] Timeout — voir ${LOG_FILE}"
exit 1

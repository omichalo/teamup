#!/usr/bin/env bash
# Hook Cursor : relance le serveur de dev si nécessaire.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/../../scripts/ensure-dev-server.sh"

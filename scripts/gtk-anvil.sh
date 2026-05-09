#!/usr/bin/env bash
# Persistent local chain: same contracts & accounts after restart.
# First run: empty chain → deploy (npm run gtk:bootstrap) → Ctrl+C here writes state.
# Later: loads game-token/anvil-state/state.json on start, re-saves on exit.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT/game-token/anvil-state"
mkdir -p "$STATE_DIR"
STATE_FILE="${GTK_ANVIL_STATE_FILE:-$STATE_DIR/state.json}"
exec anvil --state "$STATE_FILE" "$@"

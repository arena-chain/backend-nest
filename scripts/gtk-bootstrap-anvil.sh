#!/usr/bin/env bash
# Deploy GameToken to Anvil and sync API .env (run while `npm run gtk:anvil` is up).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RPC="${GTK_ANVIL_RPC_URL:-http://127.0.0.1:8545}"
KEY="${GTK_ANVIL_PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

if ! cast block-number --rpc-url "$RPC" &>/dev/null; then
  echo "Cannot reach JSON-RPC at $RPC — start Anvil first: npm run gtk:anvil" >&2
  exit 1
fi

cd "$ROOT/game-token"
forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" --broadcast --private-key "$KEY"
cd "$ROOT"
node scripts/gtk-sync-anvil-env.cjs
echo "Restart the Nest API if it is already running so it reloads .env."

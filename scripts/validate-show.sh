#!/usr/bin/env bash
# Pre-show validation: signup-sync.json + live relay health + API key
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${SHOW_CONFIG:-}"

if [[ -z "$CONFIG" ]]; then
  for candidate in \
    "$ROOT/config/signup-sync.json" \
    "$HOME/Library/Application Support/gudessence-tradeshow-app/signup-sync.json"; do
    if [[ -f "$candidate" ]]; then CONFIG="$candidate"; break; fi
  done
fi

if [[ -z "$CONFIG" || ! -f "$CONFIG" ]]; then
  echo "✗ No signup-sync.json found."
  echo "  Copy config/signup-sync.production.example.json → %AppData%\\gudessence-tradeshow-app\\signup-sync.json"
  exit 1
fi

echo "Config: $CONFIG"
node "$ROOT/scripts/validate-show-config.mjs" "$CONFIG"

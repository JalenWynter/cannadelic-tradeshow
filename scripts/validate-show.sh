#!/usr/bin/env bash
# Pre-show validation: signup-sync.json + live relay health + API key
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${SHOW_CONFIG:-}"

if [[ -z "$CONFIG" ]]; then
  WIN_APPDATA="${APPDATA:-}"
  [[ -n "$WIN_APPDATA" ]] && WIN_SIGNUP="$WIN_APPDATA/gudessence-tradeshow-app/signup-sync.json"
  for candidate in \
    "$ROOT/config/signup-sync.show.json" \
    "$ROOT/config/signup-sync.json" \
    "$HOME/Library/Application Support/gudessence-tradeshow-app/signup-sync.json" \
    ${WIN_SIGNUP:+"$WIN_SIGNUP"}; do
    if [[ -n "${candidate:-}" && -f "$candidate" ]]; then CONFIG="$candidate"; break; fi
  done
fi

if [[ -z "$CONFIG" || ! -f "$CONFIG" ]]; then
  echo "✗ No signup-sync.json found."
  echo "  Bundled config/signup-sync.show.json should exist after git clone."
  echo "  Run: npm run setup:show"
  exit 1
fi

echo "Config: $CONFIG"
node "$ROOT/scripts/validate-show-config.mjs" "$CONFIG"

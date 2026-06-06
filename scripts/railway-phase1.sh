#!/usr/bin/env bash
# Phase 1: Deploy signup relay to Railway + write signup-sync.json + validate
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELAY_DIR="$ROOT/server/signup-relay"
SECRETS="$ROOT/.railway-secrets.local.json"
PROD_CONFIG="$ROOT/config/signup-sync.production.json"

echo "=== Railway Phase 1 — GŪDESSENCE signup relay ==="

RAILWAY="npx --yes @railway/cli"

if ! $RAILWAY whoami >/dev/null 2>&1; then
  echo ""
  echo "Railway login required (opens browser once):"
  echo "  railway login"
  echo ""
  echo "Then re-run: ./scripts/railway-phase1.sh"
  exit 1
fi

echo "Logged in as: $($RAILWAY whoami)"

# Generate or reuse secrets
if [[ -f "$SECRETS" ]]; then
  RELAY_API_KEY="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SECRETS','utf8')).RELAY_API_KEY)")"
  STAFF_MONITOR_PIN="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SECRETS','utf8')).STAFF_MONITOR_PIN)")"
  echo "Using existing secrets from .railway-secrets.local.json"
else
  RELAY_API_KEY="$(openssl rand -hex 32)"
  STAFF_MONITOR_PIN=$((1000 + RANDOM % 9000))
  node -e "
    const fs = require('fs');
    fs.writeFileSync('$SECRETS', JSON.stringify({
      RELAY_API_KEY: '$RELAY_API_KEY',
      STAFF_MONITOR_PIN: '$STAFF_MONITOR_PIN',
      createdAt: new Date().toISOString()
    }, null, 2) + '\n');
  "
  echo "Generated secrets → .railway-secrets.local.json (gitignored — save a backup)"
  echo "  STAFF_MONITOR_PIN=$STAFF_MONITOR_PIN  (share with staff only)"
fi

cd "$RELAY_DIR"

PROJECT_ID="${RAILWAY_PROJECT_ID:-c263c591-689f-4f9a-a948-e9b5be8fc57f}"
SERVICE_NAME="${RAILWAY_SERVICE_NAME:-gudessence-cannadelic-relay}"

if [[ ! -f .railway/config.json ]]; then
  echo ""
  echo "Linking Railway project…"
  if [[ -d "$ROOT" ]] && [[ -f "$ROOT/.railway/config.json" ]]; then
    mkdir -p .railway
    cp "$ROOT/.railway/config.json" .railway/config.json 2>/dev/null || true
  fi
  $RAILWAY link -p "$PROJECT_ID" -s "$SERVICE_NAME" 2>/dev/null || $RAILWAY link -p "$PROJECT_ID" || $RAILWAY init --name gudessence-cannadelic-relay
fi

# Ensure a service exists before setting variables
if ! $RAILWAY status 2>/dev/null | grep -q "Linked service"; then
  echo "Creating service via deploy…"
  $RAILWAY up -y --detach
  $RAILWAY link -p "$PROJECT_ID" -s "$SERVICE_NAME" 2>/dev/null || true
fi

echo "Setting Railway variables…"
$RAILWAY variables set "RELAY_API_KEY=$RELAY_API_KEY" "STAFF_MONITOR_PIN=$STAFF_MONITOR_PIN" "NODE_ENV=production"

echo "Deploying relay…"
$RAILWAY up -y --detach

echo "Ensuring public HTTPS domain…"
DOMAIN="$($RAILWAY status 2>/dev/null | grep -oE 'https://[a-zA-Z0-9.-]+\.up\.railway\.app' | head -1 || true)"
if [[ -z "$DOMAIN" ]]; then
  DOMAIN="$($RAILWAY domain 2>/dev/null | grep -oE 'https://[a-zA-Z0-9.-]+\.up\.railway\.app' | head -1 || true)"
fi
if [[ -z "$DOMAIN" ]]; then
  $RAILWAY domain 2>/dev/null || true
  sleep 5
  DOMAIN="$($RAILWAY status 2>/dev/null | grep -oE 'https://[a-zA-Z0-9.-]+\.up\.railway\.app' | head -1 || true)"
fi

if [[ -z "$DOMAIN" ]]; then
  echo "Could not detect Railway domain. Copy it from the Railway dashboard → Settings → Networking"
  read -r -p "Paste your Railway HTTPS URL (e.g. https://xxx.up.railway.app): " DOMAIN
fi

DOMAIN="${DOMAIN%/}"
HOST="${DOMAIN#https://}"

echo ""
echo "Railway URL: $DOMAIN"

# Write production kiosk config
node -e "
const fs = require('fs');
const cfg = {
  eventId: 'cannadelic-2026-06-06',
  relayApiUrl: '$DOMAIN',
  relayApiKey: '$RELAY_API_KEY',
  publicSignupUrl: '$DOMAIN/signup/cannadelic-2026-06-06?title=Cannadelic%20Night%20Market',
  publicStaffUrl: '$DOMAIN/staff/cannadelic-2026-06-06',
  syncIntervalMs: 4000
};
fs.writeFileSync('$PROD_CONFIG', JSON.stringify(cfg, null, 2) + '\n');
fs.writeFileSync('$ROOT/config/signup-sync.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('Wrote config/signup-sync.production.json');
console.log('Wrote config/signup-sync.json (for dev test against Railway)');
"

echo "Waiting for deploy health check…"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "$DOMAIN/health" >/dev/null 2>&1; then
    echo "✓ Relay healthy"
    break
  fi
  sleep 3
  if [[ $i -eq 10 ]]; then
    echo "⚠ Health check timed out — deploy may still be starting. Re-run: npm run validate:show"
  fi
done

echo ""
cd "$ROOT"
npm run validate:show

echo ""
echo "=== Phase 1 complete ==="
echo "Copy to show PC: config/signup-sync.production.json"
echo "  → %AppData%\\gudessence-tradeshow-app\\signup-sync.json"
echo "Staff monitor PIN: $STAFF_MONITOR_PIN"
echo "Hotspot guide: docs/hotspot-show-setup.md"

#!/usr/bin/env bash
# Integration tests for signup relay + mobile staff monitor
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELAY_DIR="$ROOT/server/signup-relay"
PORT="${TEST_RELAY_PORT:-9876}"
BASE="http://127.0.0.1:${PORT}"
API_KEY="test-relay-key-$(openssl rand -hex 8)"
STAFF_PIN="5678"
EVENT_ID="test-event-$(date +%s)"
DATA_DIR="$(mktemp -d)"

cleanup() {
  if [[ -n "${RELAY_PID:-}" ]] && kill -0 "$RELAY_PID" 2>/dev/null; then
    kill "$RELAY_PID" 2>/dev/null || true
    wait "$RELAY_PID" 2>/dev/null || true
  fi
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

pass=0
fail=0
assert() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  ✓ $desc"
    pass=$((pass + 1))
  else
    echo "  ✗ $desc"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    fail=$((fail + 1))
  fi
}

echo "=== Signup relay integration tests ==="
echo "Port: $PORT | Event: $EVENT_ID"

cd "$RELAY_DIR"
npm install --silent >/dev/null 2>&1 || npm install --silent

PORT="$PORT" RELAY_API_KEY="$API_KEY" STAFF_MONITOR_PIN="$STAFF_PIN" DATA_DIR="$DATA_DIR" node index.js &
RELAY_PID=$!
sleep 1

echo ""
echo "[1] Health"
health=$(curl -sf "$BASE/health")
echo "$health" | grep -q '"ok":true' && pass=$((pass+1)) && echo "  ✓ GET /health" || { fail=$((fail+1)); echo "  ✗ GET /health"; }

echo ""
echo "[2] Guest signup"
signup_res=$(curl -sf -X POST "$BASE/api/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"firstName\":\"Test\",\"lastName\":\"Guest\",\"email\":\"test-$(date +%s)@example.com\",\"phone\":\"5559876543\"}")
SIGNUP_ID=$(echo "$signup_res" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).signupId))")
DISPLAY_ID=$(echo "$signup_res" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).displayId||''))")
[[ -n "$SIGNUP_ID" ]] && pass=$((pass+1)) && echo "  ✓ POST /api/signup → signupId=$SIGNUP_ID" || { fail=$((fail+1)); echo "  ✗ POST /api/signup"; }
[[ "$DISPLAY_ID" =~ ^GE- ]] && pass=$((pass+1)) && echo "  ✓ displayId assigned ($DISPLAY_ID)" || { fail=$((fail+1)); echo "  ✗ displayId missing or wrong: $DISPLAY_ID"; }

echo ""
echo "[2a] Invalid US phone rejected"
bad_phone=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"firstName\":\"Bad\",\"lastName\":\"Phone\",\"email\":\"bad-$(date +%s)@example.com\",\"phone\":\"5551234567\"}")
assert "invalid exchange (starts with 1) → 400" "400" "$bad_phone"

TEST_EMAIL="dup-$(date +%s)@example.com"
TEST_PHONE="5554443333"

echo ""
echo "[2b] Duplicate pending (same email)"
dup1=$(curl -sf -X POST "$BASE/api/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"firstName\":\"Dup\",\"lastName\":\"One\",\"email\":\"$TEST_EMAIL\",\"phone\":\"$TEST_PHONE\"}")
dup1_id=$(echo "$dup1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).signupId))")
dup2=$(curl -sf -X POST "$BASE/api/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"firstName\":\"Dup\",\"lastName\":\"Two\",\"email\":\"$TEST_EMAIL\",\"phone\":\"5552112222\"}")
dup2_id=$(echo "$dup2" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).signupId))")
assert "duplicate email returns same signupId" "$dup1_id" "$dup2_id"

echo ""
echo "[2c] Duplicate pending (same phone)"
dup3=$(curl -sf -X POST "$BASE/api/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"firstName\":\"Phone\",\"lastName\":\"Dup\",\"email\":\"other-$(date +%s)@example.com\",\"phone\":\"$TEST_PHONE\"}")
dup3_id=$(echo "$dup3" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).signupId))")
assert "duplicate phone returns same signupId" "$dup1_id" "$dup3_id"

echo ""
echo "[2d] Approve duplicate signup for confirmed test"
curl -sf -X POST "$BASE/api/signup/$dup1_id/approve-staff" \
  -H 'Content-Type: application/json' \
  -d '{"staffName":"Alice","confirmed":true}' >/dev/null

echo ""
echo "[2e] Duplicate after confirmed"
dup4=$(curl -sf -X POST "$BASE/api/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"firstName\":\"Again\",\"lastName\":\"Guest\",\"email\":\"$TEST_EMAIL\",\"phone\":\"$TEST_PHONE\"}")
dup4_status=$(echo "$dup4" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).status))")
dup4_id=$(echo "$dup4" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).signupId))")
assert "duplicate after confirmed → confirmed status" "confirmed" "$dup4_status"
assert "duplicate after confirmed → same signupId" "$dup1_id" "$dup4_id"

echo ""
echo "[3] Public pending list"
pending=$(curl -sf "$BASE/api/signup/pending/public?eventId=$EVENT_ID")
echo "$pending" | grep -q "$SIGNUP_ID" && pass=$((pass+1)) && echo "  ✓ GET pending/public includes signup" || { fail=$((fail+1)); echo "  ✗ GET pending/public"; }

echo ""
echo "[4] Kiosk pending (API key)"
kiosk_pending=$(curl -sf -H "Authorization: Bearer $API_KEY" "$BASE/api/signup/pending?eventId=$EVENT_ID")
echo "$kiosk_pending" | grep -q "$SIGNUP_ID" && pass=$((pass+1)) && echo "  ✓ GET pending (auth)" || { fail=$((fail+1)); echo "  ✗ GET pending (auth)"; }

echo ""
echo "[5] Staff monitor page (mobile HTML)"
staff_html=$(curl -sf "$BASE/staff/$EVENT_ID")
echo "$staff_html" | grep -q 'viewport' && pass=$((pass+1)) && echo "  ✓ GET /staff/:eventId has viewport meta" || { fail=$((fail+1)); echo "  ✗ viewport meta"; }
echo "$staff_html" | grep -q 'btn-approve' && pass=$((pass+1)) && echo "  ✓ Staff page has approve button" || { fail=$((fail+1)); echo "  ✗ approve button"; }
echo "$staff_html" | grep -q 'id="tabHistory"' && pass=$((pass+1)) && echo "  ✓ Staff page has history section" || { fail=$((fail+1)); echo "  ✗ history section"; }
echo "$staff_html" | grep -q 'btn-decline' && pass=$((pass+1)) && echo "  ✓ Staff page has decline button" || { fail=$((fail+1)); echo "  ✗ decline button"; }
echo "$staff_html" | grep -q 'data-action="deny"' && pass=$((pass+1)) && echo "  ✓ Staff page decline uses data-action" || { fail=$((fail+1)); echo "  ✗ decline data-action"; }
echo "$staff_html" | grep -q 'switchView' && pass=$((pass+1)) && echo "  ✓ Staff page has queue/history tabs" || { fail=$((fail+1)); echo "  ✗ queue/history tabs"; }
echo "$staff_html" | grep -q 'Copy all signups' && pass=$((pass+1)) && echo "  ✓ Staff page has copy all button" || { fail=$((fail+1)); echo "  ✗ copy all button"; }
echo "$staff_html" | grep -q 'Download JSON' && pass=$((pass+1)) && echo "  ✓ Staff page has download JSON button" || { fail=$((fail+1)); echo "  ✗ download JSON button"; }

echo ""
echo "[5b] Staff all/public API"
all_res=$(curl -sf "$BASE/api/signup/all/public?eventId=$EVENT_ID")
all_total=$(echo "$all_res" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).total||0))")
[[ "$all_total" -ge 2 ]] && pass=$((pass+1)) && echo "  ✓ GET all/public returns full DB ($all_total rows)" || { fail=$((fail+1)); echo "  ✗ all/public total=$all_total"; }
echo "$all_res" | grep -q '"confirmedByStaff"' && pass=$((pass+1)) && echo "  ✓ all/public includes confirmed metadata" || { fail=$((fail+1)); echo "  ✗ confirmed metadata"; }

echo ""
echo "[6] Phone staff approve (missing confirmation)"
bad=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/signup/$SIGNUP_ID/approve-staff" \
  -H 'Content-Type: application/json' \
  -d '{"staffName":"Alice"}')
assert "missing confirmed flag → 400" "400" "$bad"

echo ""
echo "[7b] Phone staff deny (missing confirmation)"
deny_bad=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/signup/$SIGNUP_ID/deny-staff" \
  -H 'Content-Type: application/json' \
  -d '{"staffName":"Alice"}')
assert "missing confirmed flag on deny → 400" "400" "$deny_bad"

echo ""
echo "[7c] Phone staff deny pending signup"
DENY_ID=$(curl -sf -X POST "$BASE/api/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"firstName\":\"Deny\",\"lastName\":\"Test\",\"email\":\"deny-$(date +%s)@example.com\",\"phone\":\"5557667788\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).signupId))")
deny_ok=$(curl -sf -X POST "$BASE/api/signup/$DENY_ID/deny-staff" \
  -H 'Content-Type: application/json' \
  -d '{"staffName":"Alice","confirmed":true}')
echo "$deny_ok" | grep -q '"status":"denied"' && pass=$((pass+1)) && echo "  ✓ POST deny-staff success" || { fail=$((fail+1)); echo "  ✗ POST deny-staff"; }

echo ""
echo "[7d] Denied signup removed from pending"
pending_after_deny=$(curl -sf "$BASE/api/signup/pending/public?eventId=$EVENT_ID")
echo "$pending_after_deny" | grep -q "$DENY_ID" && { fail=$((fail+1)); echo "  ✗ denied signup still in pending"; } || { pass=$((pass+1)); echo "  ✓ denied signup not in pending"; }

echo ""
echo "[7] Phone staff approve (double confirm)"
good=$(curl -sf -X POST "$BASE/api/signup/$SIGNUP_ID/approve-staff" \
  -H 'Content-Type: application/json' \
  -d '{"staffName":"Alice","confirmed":true}')
echo "$good" | grep -q '"success":true' && pass=$((pass+1)) && echo "  ✓ POST approve-staff success" || { fail=$((fail+1)); echo "  ✗ POST approve-staff"; }

echo ""
echo "[8] Guest status poll after approve"
status=$(curl -sf "$BASE/api/signup/$SIGNUP_ID/status/public")
echo "$status" | grep -q '"status":"confirmed"' && pass=$((pass+1)) && echo "  ✓ GET status/public shows confirmed" || { fail=$((fail+1)); echo "  ✗ GET status/public"; }
echo "$status" | grep -q '"displayId"' && pass=$((pass+1)) && echo "  ✓ GET status/public includes displayId" || { fail=$((fail+1)); echo "  ✗ displayId in status"; }
echo "$status" | grep -q '"firstName"' && pass=$((pass+1)) && echo "  ✓ GET status/public includes firstName" || { fail=$((fail+1)); echo "  ✗ firstName in status"; }

echo ""
echo "[9] Pending list empty after phone approve"
pending_after=$(curl -sf "$BASE/api/signup/pending/public?eventId=$EVENT_ID")
count=$(echo "$pending_after" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log((JSON.parse(d).signups||[]).length))")
assert "no pending after approve" "0" "$count"

echo ""
echo "[10] Kiosk confirmed-recent sync"
confirmed=$(curl -sf -H "Authorization: Bearer $API_KEY" "$BASE/api/signup/confirmed-recent?eventId=$EVENT_ID")
echo "$confirmed" | grep -q "$SIGNUP_ID" && pass=$((pass+1)) && echo "  ✓ GET confirmed-recent includes signup" || { fail=$((fail+1)); echo "  ✗ GET confirmed-recent"; }
echo "$confirmed" | grep -q 'Phone Staff Monitor' && pass=$((pass+1)) && echo "  ✓ confirmedByKiosk set" || { fail=$((fail+1)); echo "  ✗ confirmedByKiosk"; }

echo ""
echo "[11] Kiosk confirm endpoint (idempotent)"
confirm=$(curl -sf -X POST -H "Authorization: Bearer $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"staffName":"Bob","kioskLabel":"Kiosk 1"}' \
  "$BASE/api/signup/$SIGNUP_ID/confirm")
echo "$confirm" | grep -q '"success":true' && pass=$((pass+1)) && echo "  ✓ POST confirm (kiosk)" || { fail=$((fail+1)); echo "  ✗ POST confirm"; }

echo ""
echo "[12] Guest signup page HTML"
guest_html=$(curl -sf "$BASE/signup/$EVENT_ID")
echo "$guest_html" | grep -q 'Save reference image' && pass=$((pass+1)) && echo "  ✓ Guest page has save reference" || { fail=$((fail+1)); echo "  ✗ save reference button"; }
echo "$guest_html" | grep -q '#22c55e' && pass=$((pass+1)) && echo "  ✓ Guest page uses green approved color" || { fail=$((fail+1)); echo "  ✗ green approved color"; }
echo "$guest_html" | grep -q 'sessionStorage' && pass=$((pass+1)) && echo "  ✓ Guest page persists session" || { fail=$((fail+1)); echo "  ✗ sessionStorage"; }
echo "$guest_html" | grep -q 'deniedGlow' && pass=$((pass+1)) && echo "  ✓ Guest page has decline notification animation" || { fail=$((fail+1)); echo "  ✗ decline notification animation"; }
echo "$guest_html" | grep -q 'notifyStatusChange' && pass=$((pass+1)) && echo "  ✓ Guest page notifies on status change" || { fail=$((fail+1)); echo "  ✗ status change notify"; }
echo "$guest_html" | grep -q 'Sign up again' && pass=$((pass+1)) && echo "  ✓ Guest page returns to sign up after decline" || { fail=$((fail+1)); echo "  ✗ sign up again after decline"; }

echo ""
echo "[13] Security headers"
headers=$(curl -sI "$BASE/health")
echo "$headers" | grep -qi 'x-content-type-options: nosniff' && pass=$((pass+1)) && echo "  ✓ X-Content-Type-Options" || { fail=$((fail+1)); echo "  ✗ X-Content-Type-Options"; }
echo "$headers" | grep -qi 'x-frame-options: deny' && pass=$((pass+1)) && echo "  ✓ X-Frame-Options" || { fail=$((fail+1)); echo "  ✗ X-Frame-Options"; }

echo ""
echo "=== Results: $pass passed, $fail failed ==="
[[ "$fail" -eq 0 ]]

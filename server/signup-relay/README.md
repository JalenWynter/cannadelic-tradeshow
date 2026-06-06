# Signup relay (cloud)

Public HTTPS service for **mobile QR signups over LTE**. Kiosks poll this relay; phones never need to be on booth Wi‑Fi.

## Deploy

```bash
cd server/signup-relay
npm install
export RELAY_API_KEY="your-strong-random-key"
export STAFF_MONITOR_PIN="staff-phone-approve-pin"
export PORT=8787
npm start
```

Put HTTPS in front (nginx, Caddy, Railway, Render, etc.).

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | No | Health check |
| GET | `/signup/:eventId` | No | Mobile signup page (QR target) |
| GET | `/staff/:eventId` | No | **Mobile staff monitor** — pending queue, full DB history, copy/download |
| POST | `/api/signup` | No | Phone submits signup → `pending` |
| GET | `/api/signup/all/public?eventId=` | No | Full event signup list (all DB rows for staff history) |
| GET | `/api/signup/pending/public?eventId=` | No | Public pending list (staff monitor) |
| GET | `/api/signup/pending?eventId=` | Bearer API key | Kiosk sync pull |
| GET | `/api/signup/confirmed-recent?eventId=` | Bearer API key | Kiosk pulls phone-side approvals |
| POST | `/api/signup/:signupId/approve-staff` | Body: `staffPin` | Staff approves from phone monitor |
| POST | `/api/signup/:signupId/confirm` | Bearer API key | Kiosk confirms after in-app approval |

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `RELAY_API_KEY` | Yes | Kiosk ↔ relay auth |
| `STAFF_MONITOR_PIN` | Yes (show day) | PIN staff enter on phone monitor to approve |
| `PORT` | No (8787) | Listen port |
| `DATA_DIR` | No (`./data`) | Signup JSON storage |

## Kiosk config

Copy `config/signup-sync.example.json` → `%AppData%/gudessence-tradeshow-app/signup-sync.json` (or `config/signup-sync.json` for dev):

```json
{
  "eventId": "cannadelic-2026-06-06",
  "publicSignupUrl": "https://YOUR_HOST/signup/cannadelic-2026-06-06",
  "publicStaffUrl": "https://YOUR_HOST/staff/cannadelic-2026-06-06",
  "relayApiUrl": "https://YOUR_HOST",
  "relayApiKey": "same-as-RELAY_API_KEY",
  "syncIntervalMs": 4000
}
```

## Automated tests

From repo root:

```bash
chmod +x scripts/test-signup-relay.sh
./scripts/test-signup-relay.sh
```

See [Show-day setup](../../docs/show-day-setup.md) for the full manual checklist.

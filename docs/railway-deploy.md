# Deploy signup relay on Railway

Step-by-step for **Option A — permanent HTTPS relay** used with a **phone hotspot** kiosk (no venue Wi‑Fi).

## Prerequisites

- GitHub or GitLab repo containing this project
- Railway account ([railway.app](https://railway.app))
- 10–15 minutes

## Steps

### 1. Generate secrets

On your machine:

```bash
export RELAY_API_KEY="$(openssl rand -hex 32)"
echo "RELAY_API_KEY=$RELAY_API_KEY"
echo "STAFF_MONITOR_PIN=4829"   # pick your own — staff-only, not public
```

Save both in a password manager. You need them for Railway **and** kiosk `signup-sync.json`.

### 2. Create Railway project

1. Log in to Railway → **New Project**
2. **Deploy from GitHub repo** (or GitLab via mirror)
3. Select the Trade Show App repository

### 3. Configure the service

| Setting | Value |
|---------|--------|
| **Root Directory** | `gudessence-tradeshow-app/server/signup-relay` |
| **Start Command** | `npm start` (default from `package.json`) |
| **Watch Paths** | `server/signup-relay/**` (optional) |

Railway auto-detects Node.js via Nixpacks.

### 4. Environment variables

In the service **Variables** tab:

| Variable | Value |
|----------|--------|
| `RELAY_API_KEY` | Output from step 1 |
| `STAFF_MONITOR_PIN` | Staff phone approve PIN |
| `NODE_ENV` | `production` (optional) |

Do **not** hard-code `PORT` — Railway injects it; the relay reads `process.env.PORT`.

### 5. Public HTTPS URL

1. **Settings** → **Networking** → **Generate Domain**
2. Copy URL, e.g. `https://gudessence-relay-production.up.railway.app`

### 6. Verify deployment

```bash
curl https://YOUR_RAILWAY_DOMAIN/health
# {"ok":true,"service":"gudessence-signup-relay"}

curl -X POST https://YOUR_RAILWAY_DOMAIN/api/signup \
  -H 'Content-Type: application/json' \
  -d '{"eventId":"cannadelic-2026-06-06","firstName":"Test","email":"test@example.com"}'
```

### 7. Kiosk `signup-sync.json`

On the show laptop (`%AppData%\gudessence-tradeshow-app\signup-sync.json`):

```json
{
  "eventId": "cannadelic-2026-06-06",
  "relayApiUrl": "https://YOUR_RAILWAY_DOMAIN",
  "relayApiKey": "SAME_RELAY_API_KEY_AS_RAILWAY",
  "publicSignupUrl": "https://YOUR_RAILWAY_DOMAIN/signup/cannadelic-2026-06-06?title=Cannadelic%20Night%20Market",
  "publicStaffUrl": "https://YOUR_RAILWAY_DOMAIN/staff/cannadelic-2026-06-06",
  "syncIntervalMs": 4000
}
```

Validate:

```bash
cd gudessence-tradeshow-app
RELAY_API_KEY=your-key npm run validate:show
```

### 8. Hotspot rehearsal

Follow [hotspot-show-setup.md](./hotspot-show-setup.md) Phase 4 before the event.

## Persistence

Railway ephemeral filesystem: signup data lives in `data/signups.json` on the container. For a single-night event this is usually fine. For multi-day shows, attach a **Railway Volume** mounted at `/app/data` and set `DATA_DIR=/app/data`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 on health | Check deploy logs; confirm root directory |
| Kiosk 401 sync | `relayApiKey` must match Railway `RELAY_API_KEY` exactly |
| Phones can't load QR | Confirm Railway domain is HTTPS and public |
| Kiosk can't sync on hotspot | Hotspot phone needs LTE; laptop on hotspot Wi‑Fi |

## Cost

Railway hobby tier is typically sufficient for one event night (low traffic, polling every 4s per kiosk).

# GitHub + Railway workflow (best practice)

Mobile QR signup runs on a **permanent Railway HTTPS relay**. The Electron kiosk polls that relay; guest phones hit the same URL over LTE. This doc is the day-to-day git → deploy loop.

## Why dev felt inconsistent

| Symptom | Cause |
|---------|--------|
| `Mobile signup sync failed: fetch failed` every 4s | Kiosk is pointed at **Railway** (`config/signup-sync.json`) but the relay was unreachable (cold start, redeploy, or laptop offline) |
| `[dev] Production cloud relay — skipping local relay/tunnel` | Expected when using Railway URL — **no local fallback** in `npm run dev` |
| QR works sometimes, not others | Railway hobby tier can spin down; sync fails until the relay wakes up |

**Fix for local development:** use the self-contained stack:

```bash
npm run dev:local
```

This starts a **local relay on :8787** plus an optional HTTPS tunnel (cloudflared/ngrok) so phones on LTE can test without depending on Railway.

**Fix for production rehearsal:** use Railway (same as show night):

```bash
npm run dev:cloud   # same as npm run dev when signup-sync.json points at Railway
npm run validate:show
```

---

## Repository remotes

| Remote | URL | Role |
|--------|-----|------|
| `origin` | GitHub `JalenWynter/cannadelic-tradeshow` | Primary — CI/CD, Railway auto-deploy |
| `gitlab` | `gitlab.gudessence.dev/.../tradeshow-cannadelic-app` | Internal mirror / org CI |

Push feature work to GitHub first; mirror to GitLab when needed:

```bash
git push origin show/cannadelic-2026-06-06
git push gitlab show/cannadelic-2026-06-06
```

---

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable baseline |
| `show/cannadelic-2026-06-06` | Active show branch — merge fixes here before show night |

---

## Railway (production relay)

### One-time setup

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `JalenWynter/cannadelic-tradeshow`
2. Service **Root Directory**: `server/signup-relay`
3. **Variables**: `RELAY_API_KEY`, `STAFF_MONITOR_PIN` (see [railway-deploy.md](./railway-deploy.md))
4. **Networking** → generate public domain
5. Enable **Always On** (Settings) so the relay does not sleep between signups

Or run the scripted setup:

```bash
npm run deploy:railway
```

### Auto-deploy on push (GitHub Actions)

Add these **repository secrets** in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|--------|
| `RAILWAY_TOKEN` | Railway account token (Dashboard → Account → Tokens) |
| `RAILWAY_PUBLIC_URL` | `https://gudessence-cannadelic-relay-production.up.railway.app` |

When you push changes under `server/signup-relay/**` to `main` or `show/**`, `.github/workflows/deploy-relay.yml` runs `railway up` automatically.

Railway’s native **GitHub integration** (watch path `server/signup-relay/**`) can also deploy on push — use one or both; avoid duplicate deploys if both fire.

### Manual deploy

```bash
cd server/signup-relay
npx @railway/cli up --detach
curl https://YOUR_RAILWAY_DOMAIN/health
```

---

## Daily developer loop

```bash
# 1. Work on show branch
git checkout show/cannadelic-2026-06-06

# 2. Local dev (reliable — local relay + tunnel)
npm run dev:local

# 3. Test against production relay before pushing
npm run dev:cloud
npm run validate:show

# 4. Commit and push (triggers CI; relay deploy if server/signup-relay changed)
git add -A
git commit -m "fix: describe change"
git push origin show/cannadelic-2026-06-06
```

---

## CI (GitHub Actions)

`.github/workflows/ci.yml` on every push/PR:

- `npm ci` + unit tests
- `npm run build`
- Local relay integration tests (`scripts/test-signup-relay.sh`)

GitLab CI (`.gitlab-ci.yml`) still runs audit + build for the internal mirror.

---

## Secrets — never commit

These files are **gitignored**; keep them local or in a password manager:

- `config/signup-sync.json` (dev override with real API key)
- `config/signup-sync.production.json`
- `.railway-secrets.local.json`

Committed templates: `config/signup-sync.show.json`, `config/signup-sync.example.json`, `config/signup-sync.dev.json`.

---

## Show-night checklist

1. Railway `/health` returns `{"ok":true}`
2. `npm run validate:show` passes on the show PC
3. Kiosk `%AppData%/gudessence-tradeshow-app/signup-sync.json` matches Railway URL + API key
4. Staff hotspot on; kiosk shows **🟢 Cloud relay online**

See [hotspot-show-setup.md](./hotspot-show-setup.md) for the full rehearsal.

# GŪDESSENCE Tradeshow App — Internal Documentation

Documentation for systems engineering, networking, and internal IT teams operating the Cannadelic Night Market kiosk platform.

## Quick links

| Document | Audience | Purpose |
|----------|----------|---------|
| [Architecture](./architecture.md) | Engineering | System design, data flow, diagrams |
| [Security](./security.md) | Security / IT | Threat model, controls, secrets |
| [Network & infrastructure](./network-infrastructure.md) | Network / IT | Offline operation, firewall, endpoints |
| [Deployment](./deployment.md) | Ops | Build, install, show-day checklist |
| [Show-day setup](./show-day-setup.md) | Ops / on-site IT | Mobile QR (LTE), dual kiosk, pre-show checks |
| [Hotspot show setup](./hotspot-show-setup.md) | Ops / on-site IT | **No venue Wi‑Fi** — phone hotspot + Railway (Option A) |
| [Railway deploy](./railway-deploy.md) | Engineering / IT | One-time cloud relay deployment |
| [Runbook](./runbook.md) | On-site IT | Day-of troubleshooting |
| [Data & privacy](./data-privacy.md) | Compliance / IT | PII handling, retention, export |
| [Incident response](./incident-response.md) | All IT | Breach, loss, kiosk compromise |
| [Product specification](./specification.md) | Product / Eng | Feature requirements |
| [Contributing](./contributing.md) | Developers | Change process, CI |

## Repository layout

```
gudessence-tradeshow-app/
├── config/           # Example configs (no secrets in git)
├── docs/             # This documentation set
├── samples/          # Empty DB seed files (safe to commit)
├── src/              # Application source
│   ├── main.js       # Electron main process (data, IPC, kiosk)
│   ├── main.jsx      # React UI
│   ├── api.js        # Renderer data API
│   └── CannadelicData.json  # Static menu/content (no PII)
├── tests/            # Data generators for QA
└── .gitlab-ci.yml    # CI pipeline
```

## Support contacts

| Role | Responsibility |
|------|----------------|
| Application owner | Feature decisions, show configuration |
| On-site IT | Hardware, displays, touch calibration |
| Internal GitLab | `https://gitlab.gudessence.dev` (namespace ID 10) |

## Show-day summary

**No venue Wi‑Fi?** Use [Hotspot show setup](./hotspot-show-setup.md) — staff phone hotspot + Railway relay.

1. Deploy **Railway relay** → [railway-deploy.md](./railway-deploy.md)
2. Configure `signup-sync.json` on kiosk → run `npm run validate:show`
3. Kiosk laptop on **staff hotspot**; guests on **LTE** scan QR
4. Sync shows **🟢 Cloud relay live — hotspot + LTE ready**
5. Copy `config/staff.roster.example.json` → `%AppData%\gudessence-tradeshow-app\staff.roster.json` and set PINs
6. Run built `.exe` on show PC (not `npm run dev`)
7. After event: export backups from `%AppData%\gudessence-tradeshow-app\backups\`

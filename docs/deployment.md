# Deployment

## Environments

| Environment | Command | Kiosk lock | Data path |
|-------------|---------|------------|-----------|
| Development | `npm run dev` | Off (browser dev tools possible) | `userData` + `src/` merge |
| Production | Installed `.exe` | Fullscreen + kiosk mode | `%AppData%\gudessence-tradeshow-app` |

Set `NODE_ENV=production` for packaged builds (electron-builder sets this).

## Prerequisites

- Windows 10/11 64-bit
- [Node.js LTS](https://nodejs.org/) (dev/build only)
- [Git](https://git-scm.com/) (optional, for updates)

## Build pipeline (IT / release engineer)

```bash
git clone <gitlab-url>
cd gudessence-tradeshow-app
npm ci
npm audit --audit-level=high
npm run build:win
```

Installer output: `release/GŪDESSENCE Tradeshow App Setup *.exe`

## Pre-show checklist

- [ ] Clone or pull latest from GitLab internal project
- [ ] Create `staff.roster.json` in userData with event-specific PINs
- [ ] Copy empty seeds from `samples/` if starting fresh (or restore backup)
- [ ] Connect two touch displays; verify extended mode in Windows
- [ ] Calibrate touch (Tablet PC Settings)
- [ ] Run app; confirm **Kiosk 1** / **Kiosk 2** labels on correct screens
- [ ] Test staff login and one full attendee registration
- [ ] Confirm backup timer in Staff Dashboard
- [ ] Disable sleep; keep PC plugged in
- [ ] Optional: BitLocker or volume encryption enabled

## Install on show PC (production)

1. Run NSIS installer from `release/`
2. Launch from Start Menu
3. Place shortcuts only for IT — attendees use kiosk UI only

## Updating mid-season

1. Export backups from `%AppData%\gudessence-tradeshow-app\backups\`
2. Install new build over existing install
3. Verify merge on startup (userData takes precedence)

## Configuration files

| File | Purpose |
|------|---------|
| `staff.roster.json` | Staff names and PINs |
| `DB_*.json` | Live attendee database |
| `CannadelicData.json` | Menus, products (bundled; edit for content updates) |

## Rollback

1. Stop application
2. Restore `DB_*.json` from latest `.json.gz` backup (decompress with gunzip / 7-Zip)
3. Restart application

See [Runbook](./runbook.md) for on-site steps.

# Operations runbook

## Severity guide

| Level | Example | Response time |
|-------|---------|---------------|
| S1 | App won't start; both kiosks down | Immediate |
| S2 | One display blank; data not saving | < 15 min |
| S3 | Touch offset; sound missing | When convenient |
| S4 | Cosmetic UI issue | Next maintenance window |

## S1 — Application will not start

1. Reboot Windows.
2. Check disk space on `C:` (need > 1 GB free).
3. Run from dev terminal if available:
   ```bash
   cd gudessence-tradeshow-app
   npm run dev
   ```
4. Read console for JSON parse errors — corrupt file in `%AppData%\gudessence-tradeshow-app\`.
5. Restore from latest `backups\backup-*.json.gz` (see [Deployment — Rollback](./deployment.md#rollback)).

## S2 — Wrong monitor assignment

**Symptom:** Kiosk 1 label on wrong physical screen.

1. Windows → **Display settings** → **Identify**
2. Swap HDMI/DisplayPort cables between GPUs/ports
3. Restart app

## S2 — Data not persisting

1. Staff Dashboard → check **Last Backup** updates every ~5 minutes
2. Verify `%AppData%\gudessence-tradeshow-app\` is writable
3. Check antivirus is not blocking `.tmp` writes
4. Free disk space

## S3 — Touch inaccurate

1. Control Panel → **Tablet PC Settings** → Calibrate
2. Clean screen; retest edges

## S3 — No sound

1. Windows volume > 0; default playback device correct
2. Files exist: `public/sounds/*.mp3`
3. Restart app

## Staff PIN lockout

1. IT edits `%AppData%\gudessence-tradeshow-app\staff.roster.json`
2. Restart application (PINs loaded at main process start)

## End-of-event — data export

1. Close app gracefully if possible
2. Copy entire folder:
   ```
   %AppData%\gudessence-tradeshow-app\
   ```
   including `backups\`, `DB_*.json`, `StaffLogs.json`
3. Store on encrypted USB or approved internal share
4. **Wipe Data** in Staff Dashboard only when leadership approves clean slate for next show

## End-of-event — wipe for next show

1. Staff Dashboard → **Wipe Data**
2. Enter PIN twice (logged as `SYSTEM_WIPE`)
3. App reloads with empty attendee tables
4. Settings/actions/giveaways remain in `DB_Settings.json`

## Health checks (Staff Dashboard)

| Indicator | Healthy | Action if unhealthy |
|-----------|---------|---------------------|
| Data Health | ✅ Data Healthy | Run auto-fix or manual raffle adjustment |
| Last Backup | Updates every ~5 min | See disk / permissions |
| Backup size | Stable growth | Purge old backups manually if disk full |
| Mobile QR sync | 🟢 Cloud sync live (LTE OK) | See [Show-day setup](./show-day-setup.md) |
| Pending signups | Cleared after staff Approve | Verify guest info before approving |

## Mobile QR signups (LTE)

Full checklist: **[Show-day setup](./show-day-setup.md)**.

Quick test: phone on LTE → scan Check-In QR → submit → pending card on Staff Dashboard within ~4s → Approve.

## Escalation

| Step | Contact |
|------|---------|
| 1 | On-site IT |
| 2 | Application owner |
| 3 | Development (via GitLab issue — no PII in ticket) |

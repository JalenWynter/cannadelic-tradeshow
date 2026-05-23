# Security

## Threat model (summary)

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Physical kiosk access | High | Medium | Kiosk mode, staff PIN, no desktop escape |
| PII on stolen disk | Medium | High | Encrypt OS volume; export/delete after event |
| Staff PIN guessing | Medium | Medium | Unique 4-digit PINs; rotate per event |
| Malicious IPC abuse | Low | Medium | Collection allow-list; main-process validation |
| Network exfiltration | Low (offline) | High | No cloud by default; block egress if online |
| Secrets in git | Medium | High | `staff.roster.json` only on device; see `.gitignore` |

## Controls implemented

### Electron hardening

- `contextIsolation: true`, `nodeIntegration: false`
- Context menu disabled on kiosk windows
- Pinch-to-zoom disabled
- `powerSaveBlocker` prevents sleep during events
- `session.clearStorageData` on boot (fresh attendee sessions)

### Data integrity

- Email lowercased; phone digits-only at write time
- Atomic writes: write `.tmp` then `rename`
- Serialized write queue prevents concurrent corruption
- `uniqueCheck` on insert prevents duplicate email/phone races

### Authorization

- Staff actions require PIN validated in **main process** (`validate-staff-pin` IPC)
- `wipe-all-data` requires double PIN confirmation in UI + logged `SYSTEM_WIPE`
- Only `EDITABLE_COLLECTIONS` can be modified via `json-db-run`

### External links

- `openURL` should only open `https://` URLs (allow-list in main process)

## Secrets management

| Secret | Location | In git? |
|--------|----------|---------|
| Staff PINs | `%AppData%\gudessence-tradeshow-app\staff.roster.json` | **Never** |
| Attendee PII | `DB_*.json` under userData | **Never** |
| API keys | N/A (offline app) | N/A |

### First-time staff roster setup

```powershell
# Windows — copy example and edit PINs on the kiosk only
copy config\staff.roster.example.json %APPDATA%\gudessence-tradeshow-app\staff.roster.json
notepad %APPDATA%\gudessence-tradeshow-app\staff.roster.json
```

On first launch, if `staff.roster.json` is missing, the app seeds from `config/staff.roster.example.json` into userData (change PINs immediately).

## Repository hygiene

**Do not commit:**

- `src/DB_Attendees.json`, `DB_Engagement.json`, `StaffLogs.json` with real attendees
- `src/backups/**` with production snapshots
- `staff.roster.json` with production PINs

Use `samples/` for empty seed data in CI and fresh clones.

## Reporting vulnerabilities

Contact the application owner and internal IT. Do not open public issues with exploit details or live PII.

## Compliance notes

- Treat all `Contacts` records as **PII** (name, email, phone, tickets).
- `StaffLogs` may contain staff names and action types — restrict access.
- See [Data & privacy](./data-privacy.md) for retention and export.

# Incident response

## Incident types

1. **Lost or stolen kiosk PC** — device contains PII at rest
2. **Suspected unauthorized staff access** — fraudulent VIP / raffle changes
3. **Accidental data wipe** — premature `SYSTEM_WIPE`
4. **Malware on kiosk** — unlikely if offline; possible if browsing on same PC

## Immediate actions

### Lost / stolen device

| Step | Action |
|------|--------|
| 1 | Report to IT and leadership |
| 2 | Document last known backup export location |
| 3 | If BitLocker enabled, note recovery key custody |
| 4 | Assess breach notification requirements with legal |
| 5 | Do not reuse device until forensic wipe |

### Unauthorized staff actions

| Step | Action |
|------|--------|
| 1 | Review `StaffLogs.json` for timestamps and `staff_name` |
| 2 | Rotate all PINs in `staff.roster.json` |
| 3 | Reconcile raffle/VIP in Staff Dashboard |
| 4 | Change PINs for affected staff members |

### Accidental wipe

| Step | Action |
|------|--------|
| 1 | Stop using kiosk to avoid overwriting backups |
| 2 | Restore from latest `backup-*.json.gz` in `backups\` |
| 3 | If no backup, check secondary `src/backups` (dev machines only) |

## Evidence preservation

- Copy full `%AppData%\gudessence-tradeshow-app\` before repairs
- Screenshot Staff Dashboard health and logs
- Record kiosk ID (`Kiosk 1` / `Kiosk 2`) from UI label

## Communication template (internal)

```
Incident: [type]
Time detected: [UTC/local]
Systems: GŪDESSENCE Tradeshow Kiosk
Data involved: [PII yes/no, approximate record count]
Actions taken: [list]
Next steps: [owner + deadline]
```

## Post-incident

- [ ] Root cause documented in GitLab (no PII)
- [ ] Controls updated (PIN rotation, encryption, offline policy)
- [ ] Runbook gaps filed as merge request to `docs/`

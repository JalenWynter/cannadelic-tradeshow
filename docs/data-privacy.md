# Data & privacy

## Data classification

| Data type | Examples | Classification |
|-----------|----------|----------------|
| Attendee PII | Name, email, phone, physical ticket numbers | **Confidential** |
| Engagement | Points, raffle entries, votes | **Internal** |
| Staff audit | `StaffLogs` (staff name, action type, timestamp) | **Internal** |
| Static content | Menus, product copy in `CannadelicData.json` | **Public** |

## Storage locations

**Production (Windows):**

```
%AppData%\gudessence-tradeshow-app\
├── DB_Attendees.json      # Contacts
├── DB_Settings.json       # Actions, giveaways
├── DB_Engagement.json     # Entries, votes, tickets
├── StaffLogs.json
├── staff.roster.json      # Staff credentials
└── backups\               # Compressed full snapshots
```

## Retention

| Data | Default retention | Notes |
|------|-------------------|-------|
| Live DB | Until staff wipe | Export before wipe |
| Gzip backups | 7 days auto-delete | Increase by policy if needed |
| Git repository | No attendee data | Only `samples/` |

## Lawful basis & use

Use attendee data only for:

- Event engagement and giveaway administration
- Operational analytics approved by GŪDESSENCE leadership

Do not use kiosk exports for unrelated marketing without separate consent process.

## Subject requests

There is no self-service deletion UI for attendees. For deletion requests:

1. Locate contact in Staff Dashboard or `DB_Attendees.json`
2. Manual removal requires engineering guidance (referential entries in `DB_Engagement.json`)
3. Prefer export + documented deletion after event if bulk cleanup is needed

## Export procedure

1. Stop app (optional, for consistent snapshot)
2. Copy `userData` folder or latest `backup-*.json.gz`
3. Transfer via encrypted USB or IT-approved channel
4. Log who received the export (ticket or internal log)

## Minimization

- Collect only fields required by the UI (name, email and/or phone, tickets)
- Do not commit production exports to GitLab
- Rotate staff PINs per event

## Breach response

See [Incident response](./incident-response.md).

# Architecture

## Overview

The GŪDESSENCE Tradeshow App is an **offline-first, dual-monitor Electron kiosk** for lead capture, engagement points, VIP perks, and raffle management at live events. All attendee data is stored **locally on the kiosk PC** as JSON files; there is no cloud database or API in the default deployment.

## Technology stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 41 |
| UI | React 19 + Vite 8 |
| Persistence | JSON files (in-memory cache + atomic disk writes) |
| Audio | Howler |
| Packaging | electron-builder (Windows NSIS) |

> **Note:** Early product docs referenced SQLite. The shipped implementation uses a multi-file JSON store merged at startup. See [Data model](#data-model).

## System context

```mermaid
flowchart TB
    subgraph Booth["Trade show booth — air-gapped LAN optional"]
        K1["Kiosk display 1\n(React renderer)"]
        K2["Kiosk display 2\n(React renderer)"]
        EP["Electron main process\nIPC + JSON DB + backups"]
        DISK[("Local disk\n%AppData%/gudessence-tradeshow-app")]
        K1 --> EP
        K2 --> EP
        EP --> DISK
    end
    STAFF["Staff (PIN)"] --> K1
    STAFF --> K2
    ATT["Attendees (touch)"] --> K1
    ATT --> K2
```

## Process architecture

```mermaid
flowchart LR
    subgraph Renderer["Renderer (sandboxed)"]
        UI[main.jsx]
        API[api.js]
        UI --> API
    end
    subgraph Main["Main process (trusted)"]
        IPC[IPC handlers]
        MEM[(IN_MEMORY_DB)]
        WQ[Write queue]
        BK[Backup scheduler]
        STAFF[Staff PIN validation]
        IPC --> MEM
        MEM --> WQ
        MEM --> BK
        STAFF --> IPC
    end
  API -->|contextBridge| IPC
```

### Security boundaries

- **contextIsolation: true**, **nodeIntegration: false** in renderer.
- Only `preload.js` exposes a fixed `electronAPI` surface.
- Writable collections are allow-listed in `json-db-run` (`EDITABLE_COLLECTIONS`).
- Staff PINs are validated in the **main process**; PINs are not shipped in the UI bundle.

## Data model

Physical files (under Electron `userData` in production):

| File | Collections |
|------|-------------|
| `DB_Attendees.json` | `Contacts` |
| `DB_Settings.json` | `Actions`, `Giveaways` |
| `DB_Engagement.json` | `UserActions`, `GiveawayEntries`, `Votes`, `SupportTickets` |
| `StaffLogs.json` | Array of audit log entries |
| `staff.roster.json` | Staff names + PINs (not in git) |

### Startup merge priority (low → high)

1. Bundled `src/*.json` (seed / defaults)
2. Latest folder in `src/backups/` (dev) or project backups
3. `%AppData%\gudessence-tradeshow-app\` (authoritative at runtime)

## Data flow — attendee check-in

```mermaid
sequenceDiagram
    participant U as Attendee UI
    participant A as api.js
    participant M as Main process
    participant D as Disk

    U->>A: checkInOrRegister()
    A->>M: json-db-get / json-db-run
    M->>M: Normalize email/phone
    M->>M: Unique check (email/phone/tickets)
    M->>D: Atomic write (.tmp → rename)
    M-->>A: contact_id
    A-->>U: Success + points
```

## Backup subsystem

- Interval: **5 minutes** (`setInterval` 300000 ms)
- Format: gzip-compressed full DB snapshot (`backup-<timestamp>.json.gz`)
- Locations: `userData/backups/` (primary) and `src/backups/` (secondary, dev)
- Retention: files older than **7 days** deleted automatically

## Dual-kiosk behavior

- One `BrowserWindow` per connected display (`screen.getAllDisplays()`).
- Each window gets a `source_kiosk` label (`Kiosk 1`, `Kiosk 2`) on writes.
- Session storage is cleared on boot; per-kiosk `localStorage` keys isolate attendee sessions.

## Build artifacts

| Command | Output |
|---------|--------|
| `npm run dev` | Vite dev server + Electron |
| `npm run build` | `dist/`, `dist-electron/` |
| `npm run build:win` | `release/*.exe` (NSIS installer) |

## Related documents

- [Security](./security.md)
- [Network & infrastructure](./network-infrastructure.md)
- [Deployment](./deployment.md)

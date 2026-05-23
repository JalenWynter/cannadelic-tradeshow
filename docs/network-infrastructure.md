# Network & infrastructure

## Deployment model: offline-first

The kiosk is designed to run **without internet**. No inbound or outbound application traffic is required for core features (registration, points, VIP, raffle, backups).

```mermaid
flowchart LR
    subgraph Required["Required connectivity"]
        NONE[None for app operation]
    end
    subgraph Optional["Optional — not required"]
        WIFI[Wi-Fi / Ethernet]
        UPD[Windows Update]
        GIT[Git pull for updates]
    end
```

## Recommended network posture

| Scenario | Recommendation |
|----------|----------------|
| Show floor (production) | Disconnect network cable / disable Wi-Fi **or** isolate on guest VLAN with **no route to corporate LAN** |
| Dev / staging | Standard corporate network; no production PII on dev machines |
| Post-event data export | USB drive or approved secure file transfer — not email |

### Firewall (if kiosk stays online)

Allow only what IT explicitly needs:

| Direction | Port | Purpose | Required? |
|-----------|------|---------|-----------|
| Outbound | 443 | Windows Update, optional GitLab | Optional |
| Outbound | 53 | DNS | Only if online |
| Inbound | — | **Deny all** to kiosk | Recommended |

No application listens on network ports.

## Hardware specification (reference)

| Component | Guidance |
|-----------|----------|
| OS | Windows 10/11 64-bit |
| Displays | 2× touch monitors (extended desktop) |
| RAM | 8 GB minimum |
| Storage | 50 GB+ free for backups |
| USB | Keyboard for IT setup only (remove or hide for show) |

## GitLab (source control)

| Item | Value |
|------|-------|
| Host | `https://gitlab.gudessence.dev` |
| Internal group | Namespace ID `10` (see GitLab group settings) |
| CI | `.gitlab-ci.yml` — install, audit, build |

Clone (after project is created):

```bash
git clone https://gitlab.gudessence.dev/<group>/gudessence-tradeshow-app.git
```

Use deploy keys or personal access tokens per org policy — never commit tokens.

## DNS and TLS

Not applicable at runtime. GitLab clone/build uses TLS to `gitlab.gudessence.dev` when updating software.

## Monitoring

No central telemetry is built in. Operational signals are local:

- Staff Dashboard: backup time, backup size, data health
- `StaffLogs.json` audit trail
- Windows Event Viewer for OS-level issues

## Disaster recovery

| Failure | Recovery |
|---------|----------|
| App crash | Relaunch; data persisted in userData |
| Corrupt JSON | Restore latest `backup-*.json.gz` from `backups/` |
| Lost PC | Restore from USB copy of backups taken at end of day |
| Wrong monitor mapping | Swap display cables; see [Runbook](./runbook.md) |

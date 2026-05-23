# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a vulnerability

Email or message the application owner and internal IT at GŪDESSENCE. Include:

- Description and reproduction steps
- Affected version / commit
- Impact assessment

**Do not** include live attendee PII or staff PINs in reports.

## Expected response

- Acknowledgment within 2 business days
- Fix or mitigation plan for confirmed issues affecting show operations

## Scope

In scope:

- Electron IPC and preload exposure
- Local data tampering or exfiltration paths
- Staff authentication bypass
- Unsafe external URL handling

Out of scope:

- Physical theft of kiosk (handled operationally — see `docs/incident-response.md`)
- Social engineering of staff at booth

## Secure development

See [docs/security.md](./docs/security.md) for controls and secrets handling.

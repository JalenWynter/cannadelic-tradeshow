# GitLab project setup

## Create the project (one-time)

1. Open [New project — namespace 10](https://gitlab.gudessence.dev/projects/new?namespace_id=10).
2. Project name: `tradeshow-cannadelic-app` (subgroup `gudessence-tech/app-sandbox`)
3. Visibility: **Private**
4. Uncheck “Initialize repository with a README” if pushing an existing repo.

## Push from this machine

```bash
cd gudessence-tradeshow-app
git remote add gitlab git@gitlab.gudessence.dev:gudessence-tech/app-sandbox/tradeshow-cannadelic-app.git
git push -u gitlab main
```

Replace `<your-group>` with the path shown in GitLab after creation (e.g. `gud-essence` or internal group slug).

## Authentication

| Method | Use when |
|--------|----------|
| Personal Access Token | HTTPS clone/push (`glpat-...` as password) |
| SSH key | `git@gitlab.gudessence.dev:group/gudessence-tradeshow-app.git` |
| Deploy key | CI runners or kiosk build server (read-only recommended) |

## CI/CD

Pipeline defined in [`.gitlab-ci.yml`](../.gitlab-ci.yml):

- `validate:audit` — `npm audit`
- `validate:lint-docs` — required doc files present
- `build:vite` — production asset build on `main`

Enable shared runners in **Settings → CI/CD → Runners** if pipelines stay pending.

## Branch protection (recommended)

- `main`: maintainers merge only
- Require pipeline success before merge
- No force-push

## What must not be pushed

- `staff.roster.json` with real PINs
- `src/backups/` or `%AppData%` database exports with attendee PII
- `.env` with secrets

 - [ ] No PII in diff (`DB_Attendees`, real backups, `staff.roster.json`)
- [ ] `npm run build` succeeds
- [ ] Staff PINs not added to `main.jsx` or renderer
- [ ] Docs updated if behavior or paths change
- [ ] GitLab CI green

## Local development

```bash
npm install
npm run dev
```

## Testing data

Use `tests/data_generator.js` — output stays local; do not commit generated files.

## Code review focus

- IPC surface changes (`preload.js`, `main.js`)
- Collection allow-list for writes
- PII normalization (email, phone)

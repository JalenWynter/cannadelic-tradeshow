import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

app.whenReady().then(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config', 'signup-sync.json'), 'utf8'));
  const url = new URL('/api/signup/pending', cfg.relayApiUrl);
  url.searchParams.set('eventId', cfg.eventId);
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${cfg.relayApiKey}` } });
    console.log('electron-fetch-ok', r.status);
  } catch (e) {
    console.log('electron-fetch-fail', e.message, e.cause?.code || e.cause?.message || String(e.cause || ''));
  }
  app.quit();
});

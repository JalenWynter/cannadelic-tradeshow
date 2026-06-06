/** Dev-only: ensure local signup relay is running with keys from signup-sync.dev.json */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import waitOn from 'wait-on';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

let relayChild = null;

function loadDevConfig() {
  const configPath = path.join(root, 'config', 'signup-sync.dev.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

async function relayHealthOk(origin) {
  try {
    const res = await fetch(`${origin}/health`);
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function relayAuthOk(origin, eventId, apiKey) {
  try {
    const url = `${origin}/api/signup/pending?eventId=${encodeURIComponent(eventId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    return res.status === 200;
  } catch (_) {
    return false;
  }
}

function killPort(port) {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
  } catch (_) {
    /* port already free */
  }
}

export function stopDevRelay() {
  if (relayChild && !relayChild.killed) {
    relayChild.kill();
    relayChild = null;
  }
}

export async function ensureDevRelay() {
  if (process.env.SKIP_DEV_RELAY === '1') return null;

  const config = loadDevConfig();
  const origin = new URL(config.relayApiUrl).origin;
  const port = new URL(config.relayApiUrl).port || '8787';

  const healthy = await relayHealthOk(origin);
  if (healthy && (await relayAuthOk(origin, config.eventId, config.relayApiKey))) {
    console.log(`[dev-relay] Already running at ${origin}`);
    return null;
  }

  if (healthy) {
    console.warn(`[dev-relay] Stale relay on :${port} (API key mismatch) — restarting…`);
    killPort(port);
    await new Promise((r) => setTimeout(r, 400));
  }

  relayChild = spawn('node', ['index.js'], {
    cwd: path.join(root, 'server', 'signup-relay'),
    env: {
      ...process.env,
      PORT: port,
      RELAY_API_KEY: config.relayApiKey,
      STAFF_MONITOR_PIN: process.env.STAFF_MONITOR_PIN || '1234',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  relayChild.stdout?.on('data', (chunk) => {
    process.stdout.write(`[relay] ${chunk}`);
  });
  relayChild.stderr?.on('data', (chunk) => {
    process.stderr.write(`[relay] ${chunk}`);
  });
  relayChild.on('exit', () => {
    relayChild = null;
  });

  await waitOn({ resources: [`${origin}/health`], timeout: 15000 });
  const { getLanHost } = await import('../src/signupConfig.js');
  const lan = getLanHost();
  console.log(`[dev-relay] Ready at ${origin}`);
  if (lan !== '127.0.0.1') {
    console.log(`[dev-relay] Phone test URL (same Wi‑Fi): http://${lan}:${port}/signup/${config.eventId}`);
  }
  return relayChild;
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    stopDevRelay();
  });
}

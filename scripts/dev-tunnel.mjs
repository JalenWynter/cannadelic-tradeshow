/**
 * Dev HTTPS tunnel so phones on LTE / any Wi‑Fi can reach the local signup relay.
 * Priority: ngrok (NGROK_AUTHTOKEN) → cloudflared → ngrok CLI → skip (LAN fallback)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import waitOn from 'wait-on';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const TUNNEL_CONFIG = path.join(root, 'config', 'signup-sync.tunnel.json');

let tunnelHandle = null;
let tunnelChild = null;

function loadDevConfig() {
  return JSON.parse(fs.readFileSync(path.join(root, 'config', 'signup-sync.dev.json'), 'utf-8'));
}

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function writeTunnelConfig(publicBase, provider, eventId) {
  const base = publicBase.replace(/\/$/, '');
  const payload = {
    tunnelProvider: provider,
    tunnelBaseUrl: base,
    tunnelActive: true,
    publicSignupUrl: `${base}/signup/${eventId}?title=Cannadelic%20Night%20Market`,
    publicStaffUrl: `${base}/staff/${eventId}`,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(TUNNEL_CONFIG, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  return payload;
}

function clearTunnelConfig() {
  try {
    if (fs.existsSync(TUNNEL_CONFIG)) fs.unlinkSync(TUNNEL_CONFIG);
  } catch (_) {
    /* ignore */
  }
}

async function startNgrokSdk(port) {
  const ngrok = await import('@ngrok/ngrok');
  const listener = await ngrok.default.forward({
    addr: Number(port),
    authtoken: process.env.NGROK_AUTHTOKEN,
  });
  tunnelHandle = listener;
  return listener.url();
}

async function startNgrokCli(port) {
  tunnelChild = spawn('ngrok', ['http', port, '--log=stdout'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitOn({ resources: ['http-get://127.0.0.1:4040/api/tunnels'], timeout: 20000 });
  const res = await fetch('http://127.0.0.1:4040/api/tunnels');
  const data = await res.json();
  const https = (data.tunnels || []).find((t) => t.public_url?.startsWith('https://'));
  if (!https?.public_url) throw new Error('ngrok CLI did not expose an HTTPS URL');
  return https.public_url;
}

function startCloudflared(port) {
  return new Promise((resolve, reject) => {
    tunnelChild = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const tryParse = (chunk) => {
      const text = chunk.toString();
      process.stderr.write(`[tunnel] ${text}`);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match) resolve(match[0]);
    };
    tunnelChild.stdout?.on('data', tryParse);
    tunnelChild.stderr?.on('data', tryParse);
    tunnelChild.on('error', reject);
    tunnelChild.on('exit', (code) => {
      if (code !== 0 && code !== null) reject(new Error(`cloudflared exited (${code})`));
    });
    setTimeout(() => reject(new Error('cloudflared tunnel URL timeout')), 45000);
  });
}

export function stopDevTunnel() {
  clearTunnelConfig();
  if (tunnelHandle) {
    tunnelHandle.close?.();
    tunnelHandle = null;
  }
  if (tunnelChild && !tunnelChild.killed) {
    tunnelChild.kill();
    tunnelChild = null;
  }
}

export async function ensureDevTunnel(port = '8787') {
  if (process.env.SKIP_DEV_TUNNEL === '1') {
    clearTunnelConfig();
    return null;
  }

  clearTunnelConfig();
  const { eventId } = loadDevConfig();
  let publicBase = null;
  let provider = null;

  try {
    if (process.env.NGROK_AUTHTOKEN) {
      publicBase = await startNgrokSdk(port);
      provider = 'ngrok';
    } else if (commandExists('cloudflared')) {
      console.log('[dev-tunnel] Starting cloudflared (free, no account)…');
      publicBase = await startCloudflared(port);
      provider = 'cloudflared';
    } else if (commandExists('ngrok')) {
      console.log('[dev-tunnel] Starting ngrok CLI…');
      publicBase = await startNgrokCli(port);
      provider = 'ngrok-cli';
    } else {
      console.warn(
        '[dev-tunnel] No tunnel tool found. For LTE/any-network phone signup install one of:\n' +
          '  • cloudflared: brew install cloudflared\n' +
          '  • ngrok: set NGROK_AUTHTOKEN (https://ngrok.com) or brew install ngrok\n' +
          '  Falling back to same-WiFi LAN URLs only.'
      );
      return null;
    }

    const config = writeTunnelConfig(publicBase, provider, eventId);
    console.log(`[dev-tunnel] ${provider} HTTPS → ${publicBase}`);
    console.log(`[dev-tunnel] Phone signup (LTE/any Wi‑Fi): ${config.publicSignupUrl}`);
    return config;
  } catch (err) {
    console.error('[dev-tunnel] Failed:', err.message);
    stopDevTunnel();
    return null;
  }
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => stopDevTunnel());
}

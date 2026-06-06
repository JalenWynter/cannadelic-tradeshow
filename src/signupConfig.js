import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  defaultColombiaEventId,
} from './retreatInterest.js';

const CONFIG_FILENAME = 'signup-sync.json';

export function getLanHost() {
  if (process.env.DEV_LAN_IP) return process.env.DEV_LAN_IP;
  try {
    const nets = os.networkInterfaces();
    const prefer = ['en0', 'en1', 'wlan0', 'eth0'];
    const pick = (name) => {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
      return null;
    };
    for (const name of prefer) {
      const ip = pick(name);
      if (ip) return ip;
    }
    for (const name of Object.keys(nets)) {
      const ip = pick(name);
      if (ip) return ip;
    }
  } catch (err) {
    console.warn('Could not detect LAN IP:', err.message);
  }
  return '127.0.0.1';
}

export function isLocalRelayHost(relayApiUrl) {
  try {
    const host = new URL(relayApiUrl).hostname;
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch (_) {
    return false;
  }
}

function publicRelayBase(relayApiUrl) {
  const base = relayApiUrl.replace(/\/$/, '');
  if (!isLocalRelayHost(base)) return base;
  const port = new URL(base).port || '8787';
  return `http://${getLanHost()}:${port}`;
}

function rewriteLocalhostUrl(url, publicBase) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1') {
      const pub = new URL(publicBase);
      parsed.hostname = pub.hostname;
      parsed.port = pub.port;
      return parsed.toString();
    }
  } catch (_) {
    /* keep original */
  }
  return url;
}

export function resolveSignupConfigPaths(projectRoot, userDataPath) {
  return {
    user: path.join(userDataPath, CONFIG_FILENAME),
    project: path.join(projectRoot, 'config', CONFIG_FILENAME),
    show: path.join(projectRoot, 'config', 'signup-sync.show.json'),
    dev: path.join(projectRoot, 'config', 'signup-sync.dev.json'),
    example: path.join(projectRoot, 'config', 'signup-sync.example.json'),
  };
}

/** Seed signup-sync.json on first run (same pattern as staff.roster.json). */
export function ensureSignupConfig(projectRoot, userDataPath) {
  const paths = resolveSignupConfigPaths(projectRoot, userDataPath);
  if (fs.existsSync(paths.user) || fs.existsSync(paths.project)) return null;

  const seedSource = [paths.show, paths.example].find((p) => fs.existsSync(p));
  if (!seedSource) return null;

  try {
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.copyFileSync(seedSource, paths.user);
    const label = seedSource.endsWith('signup-sync.show.json') ? 'bundled show config' : 'example template';
    console.log(`Created signup-sync.json at ${paths.user} (${label})`);
    return paths.user;
  } catch (err) {
    console.error('Failed to seed signup-sync.json:', err.message);
    return null;
  }
}

/** Env override for dev: `SIGNUP_SYNC_CONFIG=config/signup-sync.dev.json` */
function resolveConfigOverridePath(projectRoot) {
  const raw = process.env.SIGNUP_SYNC_CONFIG?.trim();
  if (!raw) return null;
  return path.isAbsolute(raw) ? raw : path.join(projectRoot, raw);
}

export function loadSignupConfig(projectRoot, userDataPath) {
  ensureSignupConfig(projectRoot, userDataPath);
  const paths = resolveSignupConfigPaths(projectRoot, userDataPath);
  const overridePath = resolveConfigOverridePath(projectRoot);

  let config = null;
  const configCandidates = overridePath
    ? [overridePath]
    : [paths.user, paths.project, paths.show];
  for (const configPath of configCandidates) {
    try {
      if (!fs.existsSync(configPath)) continue;
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (parsed?.relayApiUrl && parsed?.eventId) {
        config = {
          ...parsed,
          syncIntervalMs: parsed.syncIntervalMs || 4000,
          configPath,
        };
        break;
      }
    } catch (err) {
      console.error(`Failed to load signup config at ${configPath}:`, err.message);
    }
  }

  if (!config) return null;

  const tunnelPath = path.join(projectRoot, 'config', 'signup-sync.tunnel.json');
  if (fs.existsSync(tunnelPath) && !isProductionCloudConfig(config)) {
    try {
      const tunnel = JSON.parse(fs.readFileSync(tunnelPath, 'utf-8'));
      if (tunnel.tunnelActive && tunnel.publicSignupUrl) {
        config = { ...config, ...tunnel };
      }
    } catch (err) {
      console.error('Failed to load tunnel overlay:', err.message);
    }
  }

  return config;
}

export function resolveSignupUrls(config) {
  if (!config?.relayApiUrl || !config?.eventId) return null;

  const colombiaEventId = config.colombiaEventId || defaultColombiaEventId(config.eventId);

  if (config.tunnelActive && config.publicSignupUrl) {
    return {
      publicSignupUrl: config.publicSignupUrl,
      publicStaffUrl: config.publicStaffUrl,
      colombiaEventId,
      publicColombiaSignupUrl: config.publicColombiaSignupUrl || null,
      publicColombiaStaffUrl: config.publicColombiaStaffUrl || null,
      localDev: false,
      tunnelActive: true,
      tunnelProvider: config.tunnelProvider || 'tunnel',
      deploymentMode: 'dev-tunnel',
      phoneNetworkHint: 'HTTPS tunnel — phones work on LTE or any Wi‑Fi (dev only)',
    };
  }

  const publicBase = publicRelayBase(config.relayApiUrl);
  const localDev = isLocalRelayHost(config.relayApiUrl);
  const productionCloud = isProductionCloudConfig(config);
  const colombiaTitle = encodeURIComponent('Colombia Retreat Early Bird');
  return {
    publicSignupUrl: rewriteLocalhostUrl(
      config.publicSignupUrl ||
        `${publicBase}/signup/${config.eventId}?title=Cannadelic%20Night%20Market`,
      publicBase
    ),
    publicStaffUrl: rewriteLocalhostUrl(
      config.publicStaffUrl || `${publicBase}/staff/all`,
      publicBase
    ),
    colombiaEventId,
    publicColombiaSignupUrl: rewriteLocalhostUrl(
      config.publicColombiaSignupUrl ||
        `${publicBase}/signup/${colombiaEventId}?title=${colombiaTitle}`,
      publicBase
    ),
    publicColombiaStaffUrl: rewriteLocalhostUrl(
      config.publicColombiaStaffUrl || `${publicBase}/staff/all`,
      publicBase
    ),
    localDev,
    tunnelActive: false,
    deploymentMode: productionCloud ? 'production-cloud' : localDev ? 'dev-local' : 'cloud',
    phoneNetworkHint: productionCloud
      ? 'Cloud relay — kiosk on hotspot, guests on LTE (see docs/hotspot-show-setup.md)'
      : localDev
        ? 'Phone must be on the same Wi‑Fi as this kiosk (dev rehearsal only)'
        : 'Phone works on LTE or any Wi‑Fi',
  };
}

export function isCloudSignupEnabled(config) {
  if (!config?.relayApiUrl || !config?.eventId || !config?.relayApiKey) return false;
  const urls = resolveSignupUrls(config);
  return Boolean(urls?.publicSignupUrl);
}

export function shouldUseDevRelayStack(config) {
  if (!config) return true;
  if (isProductionCloudConfig(config)) return false;
  return isLocalRelayHost(config.relayApiUrl);
}

export function isProductionCloudConfig(config) {
  if (!config?.relayApiUrl) return false;
  try {
    const u = new URL(config.relayApiUrl);
    return u.protocol === 'https:' && !isLocalRelayHost(config.relayApiUrl);
  } catch (_) {
    return false;
  }
}

export function getDeploymentMode(config) {
  if (!config?.relayApiUrl || !config?.eventId) return 'disabled';
  if (config.tunnelActive) return 'dev-tunnel';
  if (isProductionCloudConfig(config)) return 'production-cloud';
  if (isLocalRelayHost(config.relayApiUrl)) return 'dev-local';
  return 'cloud';
}

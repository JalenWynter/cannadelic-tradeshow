/** Dev startup: only run local relay + tunnel when config is localhost (not production Railway). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

export function readProjectSignupConfig() {
  const configPath = path.join(root, 'config', 'signup-sync.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function shouldStartDevRelayStack() {
  const config = readProjectSignupConfig();
  if (!config?.relayApiUrl) return true;
  try {
    const host = new URL(config.relayApiUrl).hostname;
    if (host === '127.0.0.1' || host === 'localhost') return true;
    if (config.relayApiUrl.startsWith('https://')) {
      console.log('[dev] Production cloud relay in signup-sync.json — skipping local relay/tunnel');
      return false;
    }
  } catch {
    return true;
  }
  return true;
}

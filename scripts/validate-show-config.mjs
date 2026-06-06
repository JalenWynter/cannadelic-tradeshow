/** Validate production show config against live Railway relay */
import fs from 'node:fs';

const configPath = process.argv[2];
if (!configPath || !fs.existsSync(configPath)) {
  console.error('Usage: node validate-show-config.mjs <path-to-signup-sync.json>');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const errors = [];
const warnings = [];

function req(field, test, msg) {
  if (!test) errors.push(msg || `Missing or invalid: ${field}`);
}

req('eventId', config.eventId);
req('relayApiKey', config.relayApiKey && config.relayApiKey.length >= 8, 'relayApiKey too short');
req('relayApiUrl', config.relayApiUrl, 'relayApiUrl required');

let relayHost = '';
try {
  relayHost = new URL(config.relayApiUrl).hostname;
} catch (_) {
  errors.push('relayApiUrl is not a valid URL');
}

if (relayHost === '127.0.0.1' || relayHost === 'localhost') {
  errors.push('relayApiUrl is localhost — use Railway HTTPS URL for show day (see docs/hotspot-show-setup.md)');
}

if (config.relayApiUrl && !config.relayApiUrl.startsWith('https://')) {
  warnings.push('relayApiUrl should use HTTPS for show day');
}

if (config.relayApiKey === 'dev-change-me-before-show' || config.relayApiKey === 'REPLACE_WITH_STRONG_RANDOM_KEY') {
  errors.push('relayApiKey is still a placeholder');
}

if (errors.length) {
  console.error('\n✗ Config errors:');
  errors.forEach((e) => console.error(`  • ${e}`));
  process.exit(1);
}

if (warnings.length) {
  console.warn('\n⚠ Warnings:');
  warnings.forEach((w) => console.warn(`  • ${w}`));
}

const base = config.relayApiUrl.replace(/\/$/, '');

const TIMEOUT_MS = 10_000;

const withTimeout = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });

console.log('\nChecking relay health…');
let healthRes;
try {
  healthRes = await withTimeout(`${base}/health`);
} catch (e) {
  if (e.name === 'TimeoutError') {
    console.error(`✗ Health check timed out after ${TIMEOUT_MS / 1000}s — relay unreachable`);
  } else {
    console.error(`✗ Health check failed: ${e.message}`);
  }
  console.error('  Check: is the Railway relay deployed? Run: npm run deploy:railway');
  process.exit(1);
}
if (!healthRes.ok) {
  console.error(`✗ Health check failed (${healthRes.status}) — is Railway deployed?`);
  process.exit(1);
}
console.log('✓ Relay health OK');

console.log('Checking API key…');
const pendingUrl = `${base}/api/signup/pending?eventId=${encodeURIComponent(config.eventId)}`;
let authRes;
try {
  authRes = await withTimeout(pendingUrl, {
    headers: { Authorization: `Bearer ${config.relayApiKey}` },
  });
} catch (e) {
  if (e.name === 'TimeoutError') {
    console.error(`✗ API key check timed out after ${TIMEOUT_MS / 1000}s`);
  } else {
    console.error(`✗ API key check failed: ${e.message}`);
  }
  process.exit(1);
}
if (authRes.status === 401) {
  console.error('✗ API key mismatch — relayApiKey must match Railway RELAY_API_KEY');
  process.exit(1);
}
if (!authRes.ok) {
  console.error(`✗ Pending endpoint failed (${authRes.status})`);
  process.exit(1);
}
console.log('✓ API key OK');

console.log('\n✓ Show config ready for hotspot + LTE operation');
console.log(`  Signup QR: ${config.publicSignupUrl || `${base}/signup/${config.eventId}`}`);
console.log(`  Staff URL: ${config.publicStaffUrl || `${base}/staff/${config.eventId}`}`);
console.log('\nNext: hotspot rehearsal — docs/hotspot-show-setup.md Phase 4');

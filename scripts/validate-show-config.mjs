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
} catch {
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

console.log('\nChecking relay health…');
const healthRes = await fetch(`${base}/health`);
if (!healthRes.ok) {
  console.error(`✗ Health check failed (${healthRes.status}) — is Railway deployed?`);
  process.exit(1);
}
console.log('✓ Relay health OK');

console.log('Checking API key…');
const pendingUrl = `${base}/api/signup/pending?eventId=${encodeURIComponent(config.eventId)}`;
const authRes = await fetch(pendingUrl, {
  headers: { Authorization: `Bearer ${config.relayApiKey}` },
});
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

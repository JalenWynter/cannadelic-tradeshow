#!/usr/bin/env node
/** One-command show PC setup: verify bundled config, validate Railway relay, build Windows installer. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const showConfig = path.join(root, 'config', 'signup-sync.show.json');
const showRoster = path.join(root, 'config', 'staff.roster.show.json');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, shell: process.platform === 'win32', ...opts });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\n=== GŪDESSENCE Show PC Setup ===\n');

const missing = [showConfig, showRoster].filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error('✗ Missing bundled show files after clone:');
  missing.forEach((p) => console.error(`  • ${path.relative(root, p)}`));
  console.error('\nPull latest from GitLab/GitHub and retry.');
  process.exit(1);
}
console.log('✓ Bundled show config present (signup-sync.show.json, staff.roster.show.json)');
console.log('  First app launch auto-copies these to AppData — no manual JSON editing.\n');

console.log('Installing dependencies…');
run('npm', ['ci']);

console.log('\nValidating Railway relay…');
run('node', [path.join(root, 'scripts', 'validate-show-config.mjs'), showConfig]);

const isWin = process.platform === 'win32';
if (isWin) {
  console.log('\nBuilding Windows installer…');
  run('npm', ['run', 'build:win']);
  console.log('\n✓ Setup complete');
  console.log('  Install: release\\GŪDESSENCE Tradeshow App Setup *.exe');
  console.log('  Then follow SHOW-FLOOR-SETUP.md on the booth floor.\n');
} else {
  console.log('\n✓ Config validated (non-Windows — skipping build:win here)');
  console.log('  On the show PC (Windows), run: npm run setup:show');
  console.log('  Or build locally: npm run build:win\n');
}

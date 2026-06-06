#Requires -Version 5.1
<#
.SYNOPSIS
  GŪDESSENCE tradeshow — one-command Windows setup after git clone.

.DESCRIPTION
  Installs deps, validates bundled Railway config, builds the Windows installer.
  No manual signup-sync.json or staff.roster.json editing — those ship in the repo
  and auto-seed on first app launch.

.EXAMPLE
  cd gudessence-tradeshow-app
  .\scripts\show-pc-setup.ps1
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host ""
Write-Host "=== GŪDESSENCE Show PC Setup (Windows) ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "config\signup-sync.show.json")) {
  Write-Host "✗ config\signup-sync.show.json missing — git pull latest" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path "config\staff.roster.show.json")) {
  Write-Host "✗ config\staff.roster.show.json missing — git pull latest" -ForegroundColor Red
  exit 1
}

Write-Host "✓ Bundled show config found (auto-seeds on first launch)" -ForegroundColor Green
Write-Host ""

Write-Host "Installing dependencies…"
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Validating Railway relay…"
node scripts\validate-show-config.mjs config\signup-sync.show.json
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Building Windows installer…"
npm run build:win
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "✓ Setup complete" -ForegroundColor Green
Write-Host "  1. Run installer in release\"
Write-Host "  2. Open SHOW-FLOOR-SETUP.md for booth checklist"
Write-Host ""

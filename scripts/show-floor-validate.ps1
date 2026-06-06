#Requires -Version 5.1
<#
.SYNOPSIS
  Quick show-floor validation — Railway relay + bundled config (no full rebuild).

.EXAMPLE
  cd gudessence-tradeshow-app
  .\scripts\show-floor-validate.ps1
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$ShowConfig = "config\signup-sync.show.json"
if (-not (Test-Path $ShowConfig)) {
  Write-Host "✗ $ShowConfig missing — git pull latest" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Show floor validation ===" -ForegroundColor Cyan
Write-Host ""

node scripts\validate-show-config.mjs $ShowConfig
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$AppData = Join-Path $env:APPDATA "gudessence-tradeshow-app"
if (Test-Path $AppData) {
  Write-Host ""
  Write-Host "✓ AppData found: $AppData" -ForegroundColor Green
  $db = Join-Path $AppData "DB_Attendees.json"
  if (Test-Path $db) {
    $size = (Get-Item $db).Length
    Write-Host "  Attendee DB: $size bytes"
  }
  $backups = Join-Path $AppData "backups"
  if (Test-Path $backups) {
    $count = (Get-ChildItem $backups -Filter "backup-*.json.gz" -ErrorAction SilentlyContinue).Count
    Write-Host "  Backups on disk: $count file(s)"
  }
} else {
  Write-Host ""
  Write-Host "ℹ AppData not created yet — normal before first app launch" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✓ Ready for booth checklist (SHOW-FLOOR-SETUP.md Phase 2)" -ForegroundColor Green
Write-Host ""

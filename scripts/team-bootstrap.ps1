# 组员一键引导：模板 + Docker 依赖 + 本地后端
# 用法（仓库根目录）:
#   powershell -ExecutionPolicy Bypass -File scripts\team-bootstrap.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\team-bootstrap.ps1 -SkipRun
#   powershell -ExecutionPolicy Bypass -File scripts\team-bootstrap.ps1 -FrontendOnly

param(
    [switch]$SkipRun,
    [switch]$FrontendOnly,
    [switch]$SkipDocker
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Ensure-Copy($src, $dst, $label) {
    if (Test-Path $dst) {
        Write-Host "[ok] $label already exists: $dst" -ForegroundColor DarkGray
        return
    }
    if (-not (Test-Path $src)) {
        Write-Warning "Missing template: $src"
        return
    }
    $dir = Split-Path $dst -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    Copy-Item $src $dst
    Write-Host "[new] $label <- $(Split-Path $src -Leaf)" -ForegroundColor Green
}

Write-Host "=== team-bootstrap (智慧光棚) ===" -ForegroundColor Cyan
Write-Host "Repo: $Root"

Write-Host "`n--- 1) Local config templates ---" -ForegroundColor Cyan
Ensure-Copy `
    (Join-Path $Root 'smart-street-light-master\src\main\resources\application-secret-example.yml') `
    (Join-Path $Root 'smart-street-light-master\src\main\resources\application-secret.yml') `
    'backend secret'
Ensure-Copy `
    (Join-Path $Root 'web\.env.example') `
    (Join-Path $Root 'web\.env.local') `
    'frontend .env.local'

if ($FrontendOnly) {
    Write-Host "`n--- Frontend only ---" -ForegroundColor Cyan
    Set-Location (Join-Path $Root 'web')
    if (-not (Test-Path 'node_modules')) {
        npm install
    }
    Write-Host "Run: npm run dev  -> http://localhost:5173"
    exit 0
}

Write-Host "`n--- 2) Prerequisites ---" -ForegroundColor Cyan
$ok = $true
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[fail] Docker not found. Install Docker Desktop." -ForegroundColor Red
    $ok = $false
} else {
    docker info 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[fail] Docker daemon not running. Start Docker Desktop." -ForegroundColor Red
        $ok = $false
    } else {
        Write-Host "[ok] Docker"
    }
}
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "[fail] Java not found. Install JDK 21." -ForegroundColor Red
    $ok = $false
} else {
    Write-Host "[ok] Java"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[warn] npm not found — skip frontend until Node.js installed." -ForegroundColor Yellow
} else {
    Write-Host "[ok] npm"
}

if (-not $ok) {
    Write-Error "Fix prerequisites above, then re-run team-bootstrap.ps1"
}

if (-not $SkipDocker) {
    Write-Host "`n--- 3) Docker PG + EMQX ---" -ForegroundColor Cyan
    Set-Location (Join-Path $Root 'smart-street-light-master')
    docker compose up -d
    Start-Sleep -Seconds 5
    powershell -ExecutionPolicy Bypass -File (Join-Path $Root 'smart-street-light-master\scripts\init-db.ps1')
}

Write-Host "`n--- Next steps ---" -ForegroundColor Cyan
Write-Host @"
Web (another terminal):
  cd web
  npm install
  npm run dev
  -> http://localhost:5173   admin / admin123

Hardware (optional):
  docs\collab\TEAM-ONBOARDING.md
  docs\hardware\HARDWARE-E2E.md

Hotspot MQTT firewall (admin once):
  smart-street-light-master\scripts\allow-mqtt-hotspot.ps1
"@

if ($SkipRun) {
    Write-Host "`nSkipRun: not starting Spring Boot. Use run-local.ps1 when ready." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n--- 4) Start backend (foreground, Ctrl+C to stop) ---" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File (Join-Path $Root 'smart-street-light-master\scripts\run-local.ps1')

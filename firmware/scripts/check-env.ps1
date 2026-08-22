# BearPi + local cloud environment check
# Usage: powershell -ExecutionPolicy Bypass -File firmware\scripts\check-env.ps1

$ErrorActionPreference = 'Continue'
$ok = 0
$fail = 0

function Pass($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green; $script:ok++ }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:fail++ }
function Hint($msg) { Write-Host "[....] $msg" -ForegroundColor Yellow }

Write-Host "=== BearPi / streetlight env check ===" -ForegroundColor Cyan

$bearpi = 'D:\ohos\bearpi-hm_nano'
if (Test-Path $bearpi) { Pass "BearPi source: $bearpi" } else { Fail "Missing BearPi clone at $bearpi" }

$devecoPaths = @(
    "$env:ProgramFiles\Huawei\DevEco Studio",
    "$env:LocalAppData\Programs\Huawei\DevEco Studio"
)
$deveco = $devecoPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($deveco) { Pass "DevEco Studio: $deveco" } else { Fail "DevEco Studio not found - install for Build/Upload" }

$ports = Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue
if ($ports) { Pass ("Serial ports: " + ($ports.DeviceID -join ', ')) } else { Hint "No serial port detected" }

try {
    $docker = docker ps --format '{{.Names}}' 2>$null
    if ($docker -match 'streetlight-emqx') { Pass 'EMQX container running' } else { Fail 'EMQX not running' }
    if ($docker -match 'streetlight-pg') { Pass 'PostgreSQL container running' } else { Fail 'PG not running' }
} catch {
    Fail 'Docker not available'
}

try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/users/login' -Method POST -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 3
    if ($r.code -eq 200) { Pass 'Backend :8080 login OK' } else { Fail "Backend code=$($r.code)" }
} catch {
    Fail 'Backend :8080 not responding'
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress
if ($ip) { Pass "LAN IP for D5 MQTT broker: $ip" } else { Hint 'Could not detect LAN IP' }

Write-Host ""
Write-Host "Passed $ok, failed $fail"
if ($fail -gt 0) {
    Write-Host "See docs/hardware/BEARPI-PLAN.md"
    exit 1
}

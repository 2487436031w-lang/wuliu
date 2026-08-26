# 多路模拟路灯持续上报（MQTT → EMQX → 后端）
# 用法:
#   powershell -ExecutionPolicy Bypass -File scripts\mqtt-simulate-fleet.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\mqtt-simulate-fleet.ps1 -IntervalSec 5
#   powershell -ExecutionPolicy Bypass -File scripts\mqtt-simulate-fleet.ps1 -Stop

param(
    [int]$IntervalSec = 8,
    [string]$EmqxContainer = "streetlight-emqx",
    [string]$SimName = "streetlight-fleet-sim",
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$LoopSh = Join-Path $ScriptDir "mqtt-fleet-loop.sh"

if (-not (Test-Path $LoopSh)) {
    throw "Missing $LoopSh"
}

$existing = docker ps -aq -f "name=^/${SimName}$" 2>$null
if ($existing) {
    Write-Host "Stopping existing $SimName ..."
    docker rm -f $SimName | Out-Null
}

if ($Stop) {
    Write-Host "Fleet simulator stopped."
    exit 0
}

$emqx = docker ps -q -f "name=^/${EmqxContainer}$"
if (-not $emqx) {
    throw "EMQX container '$EmqxContainer' is not running. Start Docker compose first."
}

# Docker Desktop on Windows: mount host path into Linux container
$loopMount = ($LoopSh -replace '\\', '/')
if ($loopMount -match '^([A-Za-z]):') {
    $drive = $Matches[1].ToLower()
    $loopMount = "/$drive" + $loopMount.Substring(2)
}

Write-Host "Starting fleet simulator → EMQX ($EmqxContainer), interval ${IntervalSec}s"
Write-Host "  Devices: SN-RM-002/003, SN-JF-001/002, SN-BJ-001/002, SN-XQ-001"
Write-Host "  (SN-RM-001 left for real BearPi)"
Write-Host "  Stop: powershell -ExecutionPolicy Bypass -File scripts\mqtt-simulate-fleet.ps1 -Stop"

docker run -d --name $SimName `
    --network "container:$EmqxContainer" `
    -e INTERVAL_SEC="$IntervalSec" `
    -e BROKER_HOST="127.0.0.1" `
    -e BROKER_PORT="1883" `
    -e TZ="Asia/Shanghai" `
    -v "${loopMount}:/fleet-loop.sh:ro" `
    eclipse-mosquitto:2 `
    sh /fleet-loop.sh | Out-Null

Start-Sleep -Seconds 2
$running = docker ps -q -f "name=^/${SimName}$"
if (-not $running) {
    Write-Host "Container exited; logs:" -ForegroundColor Red
    docker logs $SimName 2>&1
    throw "Fleet simulator failed to start"
}

Write-Host "OK. Tail logs: docker logs -f $SimName"
docker logs --tail 20 $SimName

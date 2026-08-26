# 硬件 ↔ 主程序 一键准备（阶段 D/E）
# 用法:
#   powershell -ExecutionPolicy Bypass -File firmware\scripts\setup-hardware-e2e.ps1 `
#     -WifiSsid "实验室WiFi" -WifiPsk "密码"

param(
    [Parameter(Mandatory = $true)]
    [string]$WifiSsid,
    [Parameter(Mandatory = $true)]
    [string]$WifiPsk,
    [string]$DeviceSn = 'SN-RM-001',
    [string]$BrokerIp = '',
    [string]$BearPiRoot = 'D:\ohos\bearpi-hm_nano'
)

$ErrorActionPreference = 'Stop'
$scripts = $PSScriptRoot

Write-Host '=== 1/5 环境检查 ===' -ForegroundColor Cyan
& (Join-Path $scripts 'check-env.ps1')
if ($LASTEXITCODE -ne 0) {
    Write-Host '环境检查有失败项，请先修复 Docker/后端后再继续' -ForegroundColor Yellow
}

Write-Host "`n=== 2/5 生成固件配置 ===" -ForegroundColor Cyan
$configArgs = @{
    WifiSsid = $WifiSsid
    WifiPsk  = $WifiPsk
    DeviceSn = $DeviceSn
}
if ($BrokerIp) { $configArgs.BrokerIp = $BrokerIp }
& (Join-Path $scripts 'configure-streetlight.ps1') @configArgs

Write-Host "`n=== 3/5 同步 STREETLIGHT 固件到 BearPi ===" -ForegroundColor Cyan
& (Join-Path $scripts 'sync-streetlight-sample.ps1')

Write-Host "`n=== 4/5 注册并启用 BUILD.gn ===" -ForegroundColor Cyan
& (Join-Path $scripts 'register-streetlight-build.ps1') -BearPiRoot $BearPiRoot
& (Join-Path $scripts 'enable-sample.ps1') -Sample STREETLIGHT -BearPiRoot $BearPiRoot

Write-Host "`n=== 5/5 后续手动步骤 ===" -ForegroundColor Cyan
Write-Host @"

[编译] WSL:
  bash /mnt/d/ohos/tools/compile-c3.sh

[烧录] PowerShell (COM 口按设备管理器修改):
  powershell -ExecutionPolicy Bypass -File D:\ohos\tools\flash-c3.ps1 -Port COM3

[串口] 115200，期望日志:
  WiFi connect succeed
  MQTT connected, subscribed smart-light/$DeviceSn/command
  published light xx.xx

[Web] http://localhost:5173
  1. 设备页确认存在 deviceSn = $DeviceSn（人民路001号路灯）
  2. 板子上电后 Dashboard 光照应更新
  3. 点「开灯/关灯」→ 板子 GPIO_7 动作 + status 回传

[EMQX 控制台] http://localhost:18083 可查看 smart-light/$DeviceSn/* 消息

详见 docs/hardware/HARDWARE-E2E.md
"@

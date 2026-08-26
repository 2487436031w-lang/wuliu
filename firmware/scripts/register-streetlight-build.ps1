# Register E_streetlight_mqtt in BearPi sample/BUILD.gn if missing.
param(
    [string]$BearPiRoot = 'D:\ohos\bearpi-hm_nano'
)

$ErrorActionPreference = 'Stop'
$buildGn = Join-Path $BearPiRoot 'applications\BearPi\BearPi-HM_Nano\sample\BUILD.gn'
if (-not (Test-Path $buildGn)) {
    throw "BUILD.gn not found: $buildGn"
}

$entry = 'E_streetlight_mqtt:streetlight_mqtt'
$raw = Get-Content $buildGn -Raw -Encoding UTF8
if ($raw -match [regex]::Escape($entry)) {
    Write-Host "BUILD.gn already lists $entry"
    exit 0
}

$line = '        #"E_streetlight_mqtt:streetlight_mqtt",'
$anchor = '        #"D5_iot_mqtt:iot_mqtt",'
if ($raw -notmatch 'D5_iot_mqtt:iot_mqtt') {
    $anchor = '        #"Zx_Developer:zx_develop_sample"'
}
$newRaw = $raw.Replace($anchor, "$anchor`r`n$line")
if ($newRaw -eq $raw) {
    throw 'Could not insert E_streetlight_mqtt entry into BUILD.gn'
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($buildGn, $newRaw, $utf8NoBom)
Write-Host "Added commented entry to BUILD.gn: $entry"

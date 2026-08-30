# 仅应用智能光棚迁移（需 streetlight-pg 已运行）
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Sql = Join-Path $Root "sql\migrations\V20260830_greenhouse.sql"

if (-not (docker ps --filter name=streetlight-pg --format "{{.Names}}")) {
  Write-Error "streetlight-pg 未运行。请先: docker compose up -d"
}

Write-Host "Applying V20260830_greenhouse.sql ..."
docker cp $Sql streetlight-pg:/tmp/V20260830_greenhouse.sql
docker exec streetlight-pg psql -U postgres -d smart-street-light -v ON_ERROR_STOP=1 -f /tmp/V20260830_greenhouse.sql
Write-Host "Done. Greenhouse tables + seed ready."

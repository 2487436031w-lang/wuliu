# 智慧光棚 · 本地实施说明

## 一次启动

1. `docker compose up -d`（PG `:5433` + EMQX `:1883`）  
   清理：`.\scripts\docker-cleanup.ps1 -AlsoImages`
2. 库已存在：`.\scripts\apply-greenhouse.ps1`；全新库：`.\scripts\init-db.ps1`
3. 后端：`local,secret`（Docker Maven 打 jar 或 IDE）
4. 前端：`cd ../web && npm run dev` → 登录后默认 **冠层光场** `/greenhouse`

## 已实现

| 能力 | 说明 |
|------|------|
| 产品壳层 | 品牌「智慧光棚」；无路灯地图/阈值页 |
| 表结构 | `gh_*` + 石斛/草莓/金线莲配方、ZONE-A/B |
| 仿真 | `day-compress-sec: 120`（一天→2 分钟），1s tick ≈ 12 仿真分钟；`POST /greenhouse/sim/reset-day` |
| 光场 | 自然光×透光×遮阳 + 灯具衰减 → **32×16** 冠层网格；`naturalPpfd` / `series` |
| 规则 | 硬限补/遮、目标带微调、大开度→工单 |
| MQTT | `smart-greenhouse/+/telemetry\|status`；下行 command |
| API | `/greenhouse/**` |
| 前端 | Three.js 空间棚体 + 冠层热力；光照/温湿度日曲线；工单审批 |

登录：`admin` / `admin123`。需求对照见仓库根 [HANDOFF.md](../../HANDOFF.md)。

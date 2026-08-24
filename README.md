# 智慧路灯「灯廊」

BearPi 上报光照 → EMQX MQTT → Spring Boot → WebSocket → Vue 控制台。

## 组员最快上手

```powershell
git clone <本仓地址>
cd wuliu   # 目录名以实际为准
powershell -ExecutionPolicy Bypass -File scripts\team-bootstrap.ps1
```

另开终端：

```powershell
cd web
npm install
npm run dev
```

- Web：http://localhost:5173 （`admin` / `admin123`）  
- 后端：http://localhost:8080  
- EMQX 控制台：http://localhost:18083 （`admin` / `public`）

**完整说明（配置分工、板端、避免重复踩坑）：**  
[`docs/collab/TEAM-ONBOARDING.md`](docs/collab/TEAM-ONBOARDING.md)

## 目录

| 路径 | 说明 |
|------|------|
| `smart-street-light-master/` | 后端 + `docker-compose.yml` + [`LOCAL-RUN.md`](smart-street-light-master/LOCAL-RUN.md) |
| `web/` | 前端「灯廊」 |
| `firmware/streetlight/` | **本仓跟踪的**路灯固件源码 |
| `firmware/scripts/` | 同步/启用 sample、一键硬件准备 |
| `docs/hardware/` | BearPi 规划与 [HARDWARE-E2E](docs/hardware/HARDWARE-E2E.md) |
| `docs/collab/` | 协作与联调说明 |

BearPi 完整 SDK **不在本仓**，默认放在 `D:\ohos\bearpi-hm_nano`（见 [`firmware/README.md`](firmware/README.md)）。

## 本地 Docker（云端依赖）

```powershell
cd smart-street-light-master
docker compose up -d          # PG:5433  EMQX:1883
# 或一键编译跑后端：
powershell -ExecutionPolicy Bypass -File scripts\run-local.ps1
```

勿提交：`application-secret.yml`、`web/.env.local`、`firmware/streetlight/streetlight_config.h`。

## 硬件（可选）

```powershell
powershell -ExecutionPolicy Bypass -File firmware\scripts\setup-hardware-e2e.ps1 `
  -WifiSsid "..." -WifiPsk "..." -DeviceSn "SN-RM-001" -BrokerIp "<PC局域网IP>"
```

详情：[`docs/hardware/HARDWARE-E2E.md`](docs/hardware/HARDWARE-E2E.md)

## 契约

真源：[`smart-street-light-master/API文档.md`](smart-street-light-master/API文档.md)  
索引：[`docs/contracts/`](docs/contracts/)

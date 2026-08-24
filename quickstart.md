# Quick Start · 智慧路灯

组员只读这一页即可上手。细节见文末链接。

---

## 规矩（必守）

1. **代码用 Git 同步**，不要互相拷贝工程目录或 `node_modules` / `target`。
2. **实验室 WiFi 名/密码、Broker IP 只放班群或私聊**，不要提交进仓库。
3. **勿提交**（已在 `.gitignore`）：
   - `application-secret.yml`
   - `web/.env.local`
   - `firmware/streetlight/streetlight_config.h`
4. **只同步固件源码** `firmware/streetlight/`；板端配置每人本地用脚本生成，不要互传 `streetlight_config.h`。
5. **端口以 compose 为准**：PostgreSQL `5433`，EMQX `1883` / 控制台 `18083`，后端 `8080`，前端 `5173`。不要用旧文档里的 `5432` / `docker.sh`。
6. **真机默认设备** `SN-RM-001`（与测试数据一致）；多板子再新开 SN，并在 Web 设备页登记。
7. 改完推上游分支 / 开 PR；合作者可直接往 `xikunn/wuliu` 推。

---

## 一、云端 + Web（每人）

### 首次

```powershell
git clone https://github.com/xikunn/wuliu.git
cd wuliu
powershell -ExecutionPolicy Bypass -File scripts\team-bootstrap.ps1
```

（SSH 可用时：`git clone git@github.com:xikunn/wuliu.git`）

另开终端：

```powershell
cd web
npm install
npm run dev
```

| 地址 | 账号 |
|------|------|
| http://localhost:5173 | `admin` / `admin123` |
| http://localhost:8080 | API |
| http://localhost:18083 | EMQX：`admin` / `public` |

`team-bootstrap` 会自动生成本机 `application-secret.yml`、`web/.env.local`（若尚不存在），并起 Docker + 后端。

### 日常同步与启动

```powershell
cd wuliu
git checkout main
git pull origin main

# 后端（含 Docker 依赖）
cd smart-street-light-master
powershell -ExecutionPolicy Bypass -File scripts\run-local.ps1

# 前端（另一终端，仍在仓库根下）
cd ..\web
npm run dev
```

仓库：https://github.com/xikunn/wuliu

只要依赖、不跑 jar：

```powershell
cd smart-street-light-master
docker compose up -d
powershell -ExecutionPolicy Bypass -File scripts\init-db.ps1
```

只要模板、不起服务：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\team-bootstrap.ps1 -SkipRun
```

### 手机热点联调 MQTT（管理员本机跑一次）

```powershell
powershell -ExecutionPolicy Bypass -File smart-street-light-master\scripts\allow-mqtt-hotspot.ps1
```

---

## 二、硬件（有 BearPi 的人）

### 一次性环境

- BearPi SDK：`D:\ohos\bearpi-hm_nano`（**不在本仓**）
- 说明：[`firmware/README.md`](firmware/README.md)
- 需：DevEco Device Tool / WSL 编译链、板子 COM 口

### 配置 + 同步 sample（WiFi/IP 写本机）

```powershell
powershell -ExecutionPolicy Bypass -File firmware\scripts\setup-hardware-e2e.ps1 `
  -WifiSsid "实验室2.4G" `
  -WifiPsk "密码勿提交" `
  -DeviceSn "SN-RM-001" `
  -BrokerIp "你的PC局域网IP"
```

- Hi3861 **仅 2.4GHz WiFi**
- `BrokerIp` = 板子能访问到的 PC IP（热点时常为 `172.20.10.x`）

### 编译 / 烧录

```bash
# WSL
bash /mnt/d/ohos/tools/compile-c3.sh
```

```powershell
# 先关串口监视器，再烧录
powershell -ExecutionPolicy Bypass -File D:\ohos\tools\flash-c3.ps1 -Port COM3 -StopMonitor
```

串口 **115200**：期望 `MQTT connected` + 周期性 `published light`。

无板测 MQTT：

```powershell
cd smart-street-light-master
powershell -ExecutionPolicy Bypass -File scripts\mqtt-simulate.ps1 -DeviceSn SN-RM-001 -Intensity 25
```

---

## 三、验收最短路径

1. 侧栏显示 `HTTP 后端 · LIVE`
2. 总览光照有数（板子或 simulate）
3. 设备页对 `SN-RM-001` 开/关灯有效
4. **阈值**页可改开灯/关灯 lux；遮光低于开灯阈值 → 自动开灯
5. 告警页「处理」可变已处理

---

## 四、文档地图

| 文档 | 用途 |
|------|------|
| [README.md](README.md) | 仓库入口 |
| [docs/collab/TEAM-ONBOARDING.md](docs/collab/TEAM-ONBOARDING.md) | 配置分工（共享 vs 本机） |
| [smart-street-light-master/LOCAL-RUN.md](smart-street-light-master/LOCAL-RUN.md) | Docker / jar 细节 |
| [docs/hardware/HARDWARE-E2E.md](docs/hardware/HARDWARE-E2E.md) | 板端端到端 |
| [docs/collab/发件箱/2026-08-23-端到端联调-变更说明.md](docs/collab/发件箱/2026-08-23-端到端联调-变更说明.md) | 配置 + 用法 + 改动说明 |
| [smart-street-light-master/API文档.md](smart-street-light-master/API文档.md) | 契约真源 |

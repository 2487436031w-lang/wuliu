# 组员上手：少重复配置

目标：**从 Git 拉代码后，云端侧尽量一条命令；板端每人只做一次工具链安装。**

## 谁负责什么

| 类别 | 谁做 | 怎么共享 |
|------|------|----------|
| 业务代码、compose、脚本、固件源码 | Git 推送 | `git pull` 即可 |
| DB 密码 / JWT / 前端模式 | **本机模板自动生成** | 模板在仓内，生成物 gitignore |
| 实验室 WiFi 名/密码、Broker IP | 每人本地或班群私密消息 | **勿提交** `streetlight_config.h` |
| BearPi SDK（`D:\ohos\bearpi-hm_nano`） | 每人装一次 | 不入库；仓内只跟踪 `firmware/streetlight/` |
| DevEco / WSL 编译链 | 每人装一次 | 见 `firmware/README.md` |

## 新组员 10 分钟（只跑云端 + Web）

```powershell
git clone https://github.com/xikunn/wuliu.git
cd wuliu
powershell -ExecutionPolicy Bypass -File scripts\team-bootstrap.ps1
```

已有仓库时：

```powershell
cd wuliu
git checkout main
git pull origin main
powershell -ExecutionPolicy Bypass -File scripts\team-bootstrap.ps1
```

脚本会：

1. 检查 Docker / JDK  
2. 若缺少则复制 `application-secret.yml`、`web/.env.local`  
3. `docker compose up` + 建库 + 编译并启动后端（前台）  

另开终端：

```powershell
cd web
npm install
npm run dev
```

浏览器 http://localhost:5173 → `admin` / `admin123`

日常再开：

```powershell
# 已 bootstrap 过：只起依赖 + 后端
cd smart-street-light-master
powershell -ExecutionPolicy Bypass -File scripts\run-local.ps1
```

## 板端（有 BearPi 的人）

**只需一次：** 克隆 BearPi 源码到 `D:\ohos\bearpi-hm_nano`，装 DevEco Device Tool / WSL 工具链。

**每次改固件：**

```powershell
# WiFi / Broker 写在本机，不进 Git
powershell -ExecutionPolicy Bypass -File firmware\scripts\setup-hardware-e2e.ps1 `
  -WifiSsid "实验室2.4G" -WifiPsk "****" -DeviceSn "SN-RM-001" -BrokerIp "你的PC局域网IP"
```

然后按 [`docs/hardware/HARDWARE-E2E.md`](../hardware/HARDWARE-E2E.md) 编译烧录。

组内约定：**只同步 `firmware/streetlight/` 源码**；每人自己的 `streetlight_config.h` 用脚本生成。

## 减少踩坑的约定

1. **一律用 compose 端口**：PG `5433`、EMQX `1883`，不要再用旧文档里的 `5432` / `docker.sh`。  
2. **手机热点联调**：管理员跑一次 `smart-street-light-master\scripts\allow-mqtt-hotspot.ps1`。  
3. **真机设备 SN**：默认 `SN-RM-001`，与 `sql/test-data.sql` 一致；多板子再开新 SN。  
4. **改完阈值/前端**：直接 `git pull`，不要互相拷贝 `.env.local`。  
5. 详细配置与验收：[`发件箱/2026-08-23-端到端联调-变更说明.md`](发件箱/2026-08-23-端到端联调-变更说明.md)

## 文档入口（只记这一页即可）

| 要做什么 | 打开 |
|----------|------|
| 仓库总览 | 根目录 [`README.md`](../../README.md) |
| Docker / jar | [`LOCAL-RUN.md`](../../smart-street-light-master/LOCAL-RUN.md) |
| 硬件闭环 | [`HARDWARE-E2E.md`](../hardware/HARDWARE-E2E.md) |
| 板端路径 | [`firmware/README.md`](../../firmware/README.md) |

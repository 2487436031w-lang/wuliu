# 硬件 ↔ 主程序端到端联调（阶段 D/E）

> 前置：C3 传感器已验收（串口 `Lux data`）；Docker EMQX + Spring Boot + Web 已跑通。

## 快速开始

```powershell
cd wuliu
powershell -ExecutionPolicy Bypass -File firmware\scripts\setup-hardware-e2e.ps1 `
  -WifiSsid "实验室2.4G_WiFi" `
  -WifiPsk "班群告知的密码" `
  -DeviceSn "SN-RM-001"
```

脚本会：检查环境 → 生成 `streetlight_config.h` → 同步固件 → 启用 `E_streetlight_mqtt` sample。

## 分步说明

### 1. 网络与配置对齐

| 项 | 板端 | 云端 |
|----|------|------|
| deviceSn | `streetlight_config.h` → `DEVICE_SN` | Web 设备页 `SN-RM-001` |
| WiFi | `WIFI_SSID` / `WIFI_PSK` | 板与 PC **同一局域网** |
| EMQX | `MQTT_BROKER_IP` = **PC 局域网 IP** | Docker `1883:1883` |
| 阈值 | 不配置 | Web 阈值页 / 数据库 |

**Broker IP 怎么选：** 运行 `check-env.ps1` 看 `LAN IP`。板子连 WiFi 时，优先用 PC 的 **WLAN IP**（如 `10.x.x.x`），不要用 `127.0.0.1` 或 WSL 虚拟网卡 IP。

### 2. 编译（WSL）

```bash
bash /mnt/d/ohos/tools/compile-c3.sh
```

成功输出：`out/BearPi-HM_Nano/Hi3861_wifiiot_app_allinone.bin`

### 3. 烧录

DevEco Device Tool **Upload**，或：

```powershell
powershell -ExecutionPolicy Bypass -File D:\ohos\tools\flash-c3.ps1 -Port COM3
```

### 4. 串口验收（115200）

期望顺序：

1. `WiFi connect succeed`
2. `MQTT connected, subscribed smart-light/SN-RM-001/command`
3. 每约 1s：`Lux: xx.xx` + `published light xx.xx`

失败排查：

| 现象 | 处理 |
|------|------|
| WiFi failed | 检查 SSID/密码；2.4GHz WiFi（Hi3861 不支持 5G） |
| MQTTConnect failed | Broker IP 错误；PC 防火墙拦 1883；`docker ps` 确认 emqx |
| 无 published light | 串口是否卡死在 MQTT；重启板子 |

### 5. Web 闭环

1. 登录 http://localhost:5173（`admin` / `admin123`）
2. **设备**页确认 `SN-RM-001` 存在（`sql/test-data.sql` 已预置人民路001号）
3. **总览** → 实时光照随板子上报变化（WebSocket LIVE）
4. **设备** → 对 `SN-RM-001` 点「开灯/关灯」→ 板子灯亮/灭，状态列更新
5. 遮光传感器（lux 低于开灯阈值）→ 云端自动 `AUTO_ON`（**阈值**页可修改，总览/光照页可查看当前值）

### 6. 无板调试（可选）

```powershell
cd smart-street-light-master
powershell -ExecutionPolicy Bypass -File scripts\mqtt-simulate.ps1 -DeviceSn SN-RM-001 -Intensity 25
```

可验证 Web 收 MQTT，但**不能**验证 GPIO。

## MQTT Topic 契约

| 方向 | Topic | 说明 |
|------|-------|------|
| 上行 | `smart-light/{sn}/light` | 光照 JSON |
| 上行 | `smart-light/{sn}/status` | ON/OFF |
| 下行 | `smart-light/{sn}/command` | MANUAL_ON/OFF, AUTO_ON/OFF |

真源：`smart-street-light-master/API文档.md`、`docs/contracts/mqtt.md`

## 相关脚本

| 脚本 | 作用 |
|------|------|
| `setup-hardware-e2e.ps1` | 一键准备联调 |
| `configure-streetlight.ps1` | 仅生成 config.h |
| `sync-streetlight-sample.ps1` | 同步到 `D:\ohos\...` |
| `enable-sample.ps1 -Sample STREETLIGHT` | 切换编译目标 |
| `check-env.ps1` | 环境检查 |

# 灯廊 · 架构速览图（答辩一页纸 / Onboarding）

> 给评委/新组员 60 秒建立心智模型。细节见 [TECH-STACK-AND-DESIGN.md](TECH-STACK-AND-DESIGN.md)。

## 一句话

BearPi 采光照、控灯 → EMQX → Spring Boot 规则与持久化 → Vue「灯廊」监视与干预；可选 RAG 运维助手。

## 仓库入口

| 路径 | 职责 |
|------|------|
| `firmware/streetlight/` | 板端业务固件（MQTT 上报/订阅） |
| `smart-street-light-master/` | 后端 API、MQTT 网关、规则、SQL |
| `web/` | 灯廊前端 |
| `docs/defense/` | 答辩材料 |
| `docs/hardware/` | 真机联调 |
| `quickstart.md` | 组员首读 |

## 关键入口（代码）

| 端 | 从这里读 |
|----|----------|
| 板端主循环 / MQTT | `firmware/streetlight/streetlight_mqtt.c` |
| 传感器/灯控 | `firmware/streetlight/src/E53_SC1.c` |
| 后端 MQTT 接入 | `…/config/MqttConfig.java` |
| 自动开关规则 | `LightReadingsServiceImpl`（阈值判定） |
| 手动开关 | `DevicesServiceImpl` → command |
| 前端实时 | `web/src/stores/*` + STOMP 订阅 |
| 契约真源 | `smart-street-light-master/API文档.md` |

## 运行面（本机默认）

| 服务 | 端口 |
|------|------|
| Web | http://localhost:5173（admin / admin123） |
| API | 8080 |
| EMQX MQTT / 控制台 | 1883 / 18083 |
| PostgreSQL | 5433 |

## 数据纽带

`deviceSn`（例：`SN-RM-001`）贯穿：MQTT topic、设备表、Web 展示。

## 闭环（口播 20 秒）

```text
lux 上报 → 入库 + 在线刷新 → 阈值判定 → MQTT command
→ 板端 GPIO → status 回传 → WS 推灯廊
```

## 约定

- HTTP 成功：`code=200`；鉴权 Header：`token`
- Agent/RAG：可选模块；**不得**无人确认自动下发 MQTT
- 密钥不入库：`application-secret.yml`、`web/.env.local`、`streetlight_config.h`

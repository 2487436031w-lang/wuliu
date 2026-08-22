# MQTT 摘要（智慧路灯）

> 真源：[`smart-street-light-master/API文档.md`](../../smart-street-light-master/API文档.md) § MQTT。

| Topic | 方向 | 说明 |
|-------|------|------|
| `smart-light/{deviceSn}/light` | 上行 | 光照上报 |
| `smart-light/{deviceSn}/status` | 上行 | 开关状态回传 |
| `smart-light/{deviceSn}/alarm` | 上行 | 告警 |
| `smart-light/{deviceSn}/command` | 下行 | `AUTO_ON/OFF` `MANUAL_ON/OFF` |

前端不直连 MQTT；经后端再 STOMP/HTTP 到 Web。

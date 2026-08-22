# MQTT 契约（draft）

> Status: draft · Version: v0 · 对齐智慧物流 MVP

| Topic | Dir | Publisher | Subscriber | Payload | Notes |
|-------|-----|-----------|------------|---------|-------|
| `logistics/{deviceId}/telemetry` | up | device | cloud | deviceId, ts, source, lat, lon, fix | 周期位置/心跳可同包或拆分 |
| `logistics/{deviceId}/event` | up | device | cloud | type, ts, data | UNSEAL 等 |
| `logistics/{deviceId}/command` | down | cloud | device | cmdId, type, args | 调度指令 |
| `logistics/{deviceId}/command/ack` | up | device | cloud | cmdId, result | ok/fail |

字段细则待 PRD 冻结后升为 v1 frozen。

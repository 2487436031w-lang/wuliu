# 收件箱 → 后端+端侧：统一 MQTT Topic 命名

| 状态 | 待回复 |
| 日期 | 2026-08-22 |
| 发起部门 | 前端 / 协作区 |
| 目标部门 | 后端、端侧 |
| 优先级 | P1（联调前必须） |

## 要什么

在下列两套命名中**选定一套**并写入 `接口文档.md` + `docs/contracts/mqtt.md`（二者一致），状态升到 `review`/`frozen`。

## 选项

**A. 接口文档现行**

- `device/{deviceId}/gps|alarm|status`
- `server/{deviceId}/dispatch|command`

**B. contracts 草案**

- `logistics/{deviceId}/telemetry|event|command|command/ack`

## 为什么

前端 WS/REST 不依赖 MQTT 字符串，但后端与端侧必须一致；文档分叉会导致联调翻车。

## 建议

课程与现有 `接口文档.md` 已传播 → 优先 **A**，把 B 标为 superseded，或 B 作为 v2。

## 对方回复

| 日期 | 结论 | 签名 |
|------|------|------|
| | | |

# HTTP / WS 摘要（智慧路灯）

> 细节与示例以 [`smart-street-light-master/API文档.md`](../../smart-street-light-master/API文档.md) 为准。

## 约定

- Base：`http://localhost:8080`
- 成功：`code=200`；失败常见 `500` + `errorMsg`
- 认证：Header **`token`**（JWT）
- 分页：`page` / `pageSize` → `{ total, records }`

## 前端使用的 REST

| 域 | 路径 |
|----|------|
| 用户 | `POST /users/register` `POST /users/login` |
| 设备 | `/devices` CRUD、`/statistics`、`/{id}/switch`、`/{id}/location` |
| 光照 | `/light-readings`、`/latest/{id}`、`/trend` |
| 告警 | `/alarm-logs`、`/{id}/resolve`、`/statistics` |
| 阈值 | `GET/PUT /threshold-config` |
| 控制日志 | `/control-logs` |

## WebSocket（STOMP）

- 端点：`ws://host:8080/ws?token={jwt}`
- 主题：`/topic/light-readings` `/topic/device-status` `/topic/device-online` `/topic/alarms`

前端实现：`web/src/api/*`、`web/src/stores/realtime.ts`。

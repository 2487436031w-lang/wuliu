# HTTP / WS 契约（前端对齐稿 · review）

> Status: review · 对齐根目录 `接口文档.md`；物流后端未实现前，`web/` 用 Mock Adapter。

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/login` | `{ username, password }` → `{ token, userId, username, role }` |
| POST | `/api/auth/logout` | Header `Authorization: Bearer {token}` |

角色：`shipper` | `warehouse` | `dispatcher` | `driver` | `admin`

## REST（MVP）

| Method | Path | Role |
|--------|------|------|
| GET/POST/PUT/DELETE | `/api/vehicles`… | warehouse |
| GET/POST | `/api/cargos`… | shipper / warehouse |
| GET/POST/DELETE | `/api/bindings`… | warehouse |
| GET | `/api/vehicles/positions` | dispatcher |
| GET | `/api/cargos/{id}/position\|track\|eta` | shipper |
| GET/POST resolve | `/api/alarms`… | dispatcher / admin |
| POST/GET | `/api/dispatch` | dispatcher |
| POST | `/api/cargos/{id}/status` | driver |

统一响应：`{ code: 0, message, data }`（见接口文档）。

## WebSocket

| Endpoint | Payload type | Consumers |
|----------|--------------|-----------|
| `/ws/positions` | `{ type:"position", data:{ vehicleId, cargoId, longitude, latitude, speed, timestamp } }` | shipper, dispatcher |
| `/ws/alarms` | `{ type:"alarm", data:{ alarmId, vehicleId, alarmType, alarmLevel, description, timestamp } }` | shipper, dispatcher |

前端模块 seam：`api/client`（HTTP）+ `stores/realtime`（WS）；Mock 实现可替换为真实 Adapter，不改页面。

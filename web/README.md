# 灯廊 · 智慧路灯前端

对齐 [`smart-street-light-master`](../smart-street-light-master/) 与 [`API文档.md`](../smart-street-light-master/API文档.md)。

**当前仓库交付仅为智慧路灯**（智慧物流相关设计文档已移除）。

## 运行

```bash
cd web
npm install
npm run dev
```

- Mock（默认）：http://localhost:5173  
  - 账号：`admin` / `admin123` 或 `staff` / `staff123`  
  - 支持注册（`POST /users/register` 契约）
- 真后端：

```bash
# .env.local
VITE_API_MODE=http
VITE_API_BASE=http://localhost:8080
VITE_WS_BASE=ws://localhost:8080
```

请求头：`token: <JWT>`（与路灯后端一致，成功 `code=200`）。

## 页面

| 路由 | 功能 |
|------|------|
| `/login` | 登录 / 注册 |
| `/dashboard` | 设备统计 + 实时光照 |
| `/devices` | 设备 CRUD + 手动开关 |
| `/lights` | 光照列表与趋势 |
| `/alarms` | 告警解决 |
| `/threshold` | 阈值（ADMIN） |
| `/logs` | 控制日志 |

## 模块 seam

- `src/api/client.ts`：`mock` | `http` Adapter  
- `src/stores/realtime.ts`：Mock 定时 / STOMP `/ws?token=`

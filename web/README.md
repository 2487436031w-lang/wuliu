# 智慧物流 Web（MVP）

Vue 3 + Vite + Pinia + Vue Router + Leaflet。视觉遵循项目内 `/frontend-design`；接口对齐根目录 `接口文档.md`。

## 运行

```bash
cd web
npm install
npm run dev
```

打开 http://localhost:5173 ，任意密码，选择角色进入。默认 **Mock**（无后端也可演示闭环）。

## 设计方向

- 品牌：**在途**（Barlow Condensed 显示 + Source Sans 3 正文 + IBM Plex Mono 数据）
- 色板：混凝土灰纸面 + 墨青字 + 信号琥珀 + 轨迹青绿
- 签名元素：全幅地图为主视觉，车辆琥珀脉冲点

## 模块 seam

| Module | Path | 可替换 |
|--------|------|--------|
| HTTP | `src/api/client.ts` + `mock.ts` | 将来 `http.ts` 接真后端 |
| Realtime | `src/stores/realtime.ts` | 接 `/ws/positions` `/ws/alarms` |
| Auth | `src/stores/auth.ts` | JWT |

## 角色路由

| 角色 | 首页 |
|------|------|
| warehouse | `/warehouse` |
| shipper | `/track` |
| dispatcher | `/dispatch` |
| driver | `/driver` |
| admin | `/alarms` |

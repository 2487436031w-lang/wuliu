# 工作流与 RACI（draft）

## RACI（待填人名）

| Surface | R | A | C |
|---------|---|---|---|
| 端侧固件 | | 组长 | 后端 |
| 接入与规则 | | 组长 | 端侧、前端 |
| Web 五角色 | 前端 Agent / 同学 | 组长 | 后端 |
| AI 认知层 | | 组长 | 前端、后端 |
| 需求/契约文档 | | 组长 | 全员 |

## 默认流水线

需求片段 frozen → 接口 review/frozen → 并行实现 → 联调清单 → 演示脚本

## 当前 Sprint 契约（2026-08-22 FE-W1）

- **Must in-sprint：** 登录与角色切换；仓库绑定；货主位置/轨迹/ETA；调度地图+下发；司机状态；告警列表；Mock 可脱机演示
- **blocked：** 真后端 / 真 MQTT（前端用 Mock + 契约路径）
- **next：** 接真实 REST/WS；AI 问答页
- **Interfaces：** 以根目录 `接口文档.md` 为准（HTTP/WS）；MQTT 命名见 `docs/collab/收件箱/` 待确认
- **注册：** MVP 不做开放注册（`docs/collab/决策/`）
- **AI：** MVP out
- **Collab：** `docs/collab/` 跨部门沟通入口
- **Demo gate：** 绑定 → 看轨迹 → 告警 → 下发 → 送达（Mock 可走通）
- **FE path：** `web/`
- **Skills：** `/frontend-design` + `/team-contract-align` + `/codebase-design` + `/implement`

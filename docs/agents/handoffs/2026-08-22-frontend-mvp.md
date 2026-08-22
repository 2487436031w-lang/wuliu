# Handoff — 2026-08-22 前端 MVP 脚手架

**下一会话建议焦点：** `cd web && npm run dev` 走查五角色；或接真后端 HTTP Adapter；或继续 `/team-contract-align` 统一 MQTT topic 命名。  
**本步：** 安装 A1 `frontend-design`；用现有 coding skills 规范流程；按 `接口文档.md` + MVP 分期落地 `web/`。

---

## 1. Skills 选用

| Skill | 用途 |
|-------|------|
| `/frontend-design`（A1，已装） | 视觉方向：品牌「在途」、地图主视觉、琥珀脉冲 |
| `/team-contract-align` | Sprint 契约写入 `docs/contracts/workflow.md`；HTTP 升 review |
| `/codebase-design` | seam：`api/client`、`stores/realtime`、页面不直连 Mock 细节 |
| `/implement` | 实现五角色页 |

安装说明：GitHub HTTPS:443 不通时用 SSH clone `anthropics/skills`，拷到 `.cursor/skills/frontend-design/`。

---

## 2. 已交付

- `web/` Vue3 + Vite + Pinia + Router + Leaflet（Element Plus 已引入）
- Mock 可脱机演示：登录角色切换、绑定、追踪地图、调度下发、司机状态、告警
- `npm run build` **已通过**
- 契约：`docs/contracts/http.md`、`workflow.md` 更新

## 3. 如何跑

```bash
cd web
npm run dev
```

任意密码 + 选角色 → 控制台。

## 4. 未做 / 风险

- 真 REST/WS 未接（`VITE_API_MODE` 仍 mock）
- `接口文档.md` MQTT topic 与 `docs/contracts/mqtt.md` 不一致
- Element Plus 全量引入导致主 chunk 偏大（可后续按需）
- AI 问答页未做（MVP out）

## 5. Suggested skills

1. `/frontend-design` — 继续打磨视觉  
2. `/team-contract-align` — 冻 MQTT/HTTP v1  
3. `/implement` — HTTP Adapter  
4. `/code-review` — 合入前  

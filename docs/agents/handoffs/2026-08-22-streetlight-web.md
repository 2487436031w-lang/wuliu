# Handoff — 智慧路灯 Web（当前）

**下一会话建议焦点：** Mock 走查灯廊；或起 `smart-street-light-master` + PG/EMQX 用 `VITE_API_MODE=http` 联调。

---

## 1. 已对齐（勿推翻）

1. **当前交付 = 智慧路灯**，不是智慧物流。  
2. 契约真源：`smart-street-light-master/API文档.md`（`code=200`，Header `token`）。  
3. 前端：`web/` 品牌「灯廊」；支持登录/注册；ADMIN 可改阈值。  
4. 物流设计文档、旧物流 handoff、根目录 `接口文档.md` / `项目任务.md` / `技术栈与开发流程.md` **已移除**。

## 2. 已完成

| 项 | 指针 |
|----|------|
| 路灯后端参考 | `smart-street-light-master/` |
| 路灯前端 MVP | `web/`（`npm run build` 曾通过） |
| 协作决策（对齐路灯） | `docs/collab/决策/2026-08-22-前端对齐路灯后端.md` |
| CONTEXT | 仓库根 `CONTEXT.md` |

## 3. 未完成

| 项 | 说明 |
|----|------|
| 本机跑通后端 | 需 JDK21、Maven、Docker PG(pgvector)+EMQX、`application-secret.yml` |
| 真 WS 联调 | STOMP `ws://host:8080/ws?token=` |
| 板端对接路灯 topic | `smart-light/{sn}/light\|status\|alarm\|command` |
| PR 同步删物流文档 | 本地已删，需再 commit/PR |

## 4. 建议下一步

1. `cd web && npm run dev` — `admin` / `admin123`  
2. 起后端联调（见 `smart-street-light-master/docker.sh` + README）  
3. 端侧：官方 MQTT sample → 改 `smart-light/…` topic  

## 5. Suggested skills

1. `/frontend-design` — 继续打磨灯廊 UI  
2. `/team-contract-align` — 联调前冻结联调清单  
3. `/implement` — HTTP/WS 真联调  
4. `/handoff` — 上下文将满时  

# Contracts index（协作对齐入口）

> 由 skill `team-contract-align` 维护。状态：`draft` → `review` → `frozen` → `superseded`

| Doc | Path | Status | Owner |
|-----|------|--------|-------|
| 概念设计（主） | [../智慧物流-概念设计.md](../智慧物流-概念设计.md) | review | 待定 |
| 概念设计（基础版冻结） | [../智慧物流-概念设计-基础版.md](../智慧物流-概念设计-基础版.md) | frozen | — |
| AI 深化 | [../智慧物流-AI智能模块深化设计.md](../智慧物流-AI智能模块深化设计.md) | review | 待定 |
| 功能分期与工作流 | [../智慧物流-功能分期与工作流.md](../智慧物流-功能分期与工作流.md) | review | 待定 |
| 需求 PRD | （待建） | draft | 待定 |
| MQTT 契约 | [mqtt.md](mqtt.md) | draft | 待定 |
| HTTP 契约 | [http.md](http.md) | review | 前端 Agent |
| 工作流与 RACI | [workflow.md](workflow.md) | review | 前端 Agent |
| Web 前端 | [../../web/README.md](../../web/README.md) | draft | 前端 Agent |
| **跨部门协作** | [../collab/README.md](../collab/README.md) | active | 全员 |
| 变更日志 | [changelog.md](changelog.md) | draft | 待定 |

**规则：** 并行开发前，MQTT/HTTP 至少到 `review`；联调前到 `frozen`。改字段先走 changelog。
